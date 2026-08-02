const mongoose = require('mongoose');
const Referral = require('../models/Referral');
const RewardSettings = require('../models/RewardSettings');
const Transaction = require('../models/Transaction');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const coinWalletService = require('../services/coinWalletService');

exports.getSettings = async (req, res) => {
    try {
        const settings = await coinWalletService.getRewardSettings();
        res.status(200).json({ settings });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const { l1Amount, l2Amount, l3Amount } = req.body;
        for (const [key, val] of Object.entries({ l1Amount, l2Amount, l3Amount })) {
            if (val !== undefined && (typeof val !== 'number' || val < 0)) {
                return res.status(400).json({ message: `${key} must be a non-negative number` });
            }
        }

        const settings = await coinWalletService.getRewardSettings();
        const before = { l1Amount: settings.l1Amount, l2Amount: settings.l2Amount, l3Amount: settings.l3Amount };

        if (l1Amount !== undefined) settings.l1Amount = l1Amount;
        if (l2Amount !== undefined) settings.l2Amount = l2Amount;
        if (l3Amount !== undefined) settings.l3Amount = l3Amount;
        settings.updatedBy = req.user._id;
        await settings.save();

        await AuditLog.create({
            actorId: req.user._id,
            actorRole: req.user.role,
            action: 'reward_settings_updated',
            targetId: settings._id,
            targetType: 'RewardSettings',
            metadata: { before, after: { l1Amount: settings.l1Amount, l2Amount: settings.l2Amount, l3Amount: settings.l3Amount } }
        });

        res.status(200).json({ settings });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.listPendingRewards = async (req, res) => {
    try {
        const { level, page = 1, search } = req.query;
        const query = { approvalStatus: 'pending' };
        if (level) query.level = Number(level);
        if (search) {
            query.$or = [
                { referredName: new RegExp(search, 'i') },
                { referredEmail: new RegExp(search, 'i') }
            ];
        }

        const rewards = await Referral.find(query)
            .populate('beneficiaryId', 'fullName email avatarUrl')
            .sort({ createdAt: -1 })
            .limit(25)
            .skip((page - 1) * 25);

        const total = await Referral.countDocuments(query);
        res.status(200).json({ rewards, total });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.updatePendingReward = async (req, res) => {
    try {
        const { coinAmount } = req.body;
        if (typeof coinAmount !== 'number' || coinAmount <= 0) {
            return res.status(400).json({ message: 'coinAmount must be a positive number. To award no coins, reject this reward instead.' });
        }

        const referral = await Referral.findById(req.params.id);
        if (!referral) return res.status(404).json({ message: 'Reward not found' });
        if (referral.approvalStatus !== 'pending') {
            return res.status(400).json({ message: 'Only pending rewards can be edited' });
        }

        const oldAmount = referral.coinAmount;
        referral.coinAmount = coinAmount;
        await referral.save();

        await AuditLog.create({
            actorId: req.user._id,
            actorRole: req.user.role,
            action: 'referral_reward_amount_edited',
            targetId: referral._id,
            targetType: 'Referral',
            metadata: { oldAmount, newAmount: coinAmount }
        });

        res.status(200).json({ referral });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.approveReward = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        let referralOut;
        await session.withTransaction(async () => {
            const referral = await Referral.findById(req.params.id).session(session);
            if (!referral) throw Object.assign(new Error('Reward not found'), { status: 404 });
            if (referral.approvalStatus !== 'pending') {
                throw Object.assign(new Error('Reward already processed'), { status: 400 });
            }

            await coinWalletService.creditCoins(referral.beneficiaryId, referral.coinAmount, {
                type: `referral_l${referral.level}`,
                action: `Referral L${referral.level} Approved`,
                relatedUserId: referral.referredUserId,
                relatedEntityType: 'Referral',
                relatedEntityId: referral._id,
                actorId: req.user._id,
                actorRole: req.user.role,
                auditAction: 'referral_reward_approved'
            }, session);

            referral.approvalStatus = 'approved';
            referral.approvedBy = req.user._id;
            referral.approvedAt = new Date();
            await referral.save({ session });

            await Notification.create([{
                userId: referral.beneficiaryId,
                type: 'referral_approved',
                message: `Your L${referral.level} referral reward of ${referral.coinAmount} coins was approved!`,
                link: '/app/forms'
            }], { session });

            referralOut = referral;
        });

        res.status(200).json({ referral: referralOut });
    } catch (error) {
        res.status(error.status || 500).json({ message: error.status ? error.message : 'Server Error', error: error.status ? undefined : error.message });
    } finally {
        session.endSession();
    }
};

exports.rejectReward = async (req, res) => {
    try {
        const { reason } = req.body;
        const referral = await Referral.findById(req.params.id);
        if (!referral) return res.status(404).json({ message: 'Reward not found' });
        if (referral.approvalStatus !== 'pending') {
            return res.status(400).json({ message: 'Reward already processed' });
        }

        referral.approvalStatus = 'rejected';
        referral.rejectedBy = req.user._id;
        referral.rejectedAt = new Date();
        referral.rejectionReason = reason || '';
        await referral.save();

        await AuditLog.create({
            actorId: req.user._id,
            actorRole: req.user.role,
            action: 'referral_reward_rejected',
            targetId: referral._id,
            targetType: 'Referral',
            metadata: { reason: referral.rejectionReason }
        });

        await Notification.create({
            userId: referral.beneficiaryId,
            type: 'referral_rejected',
            message: `Your L${referral.level} referral reward was rejected.${reason ? ` Reason: ${reason}` : ''}`,
            link: '/app/forms'
        });

        res.status(200).json({ referral });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getApprovalHistory = async (req, res) => {
    try {
        const { status, page = 1 } = req.query;
        const query = { approvalStatus: { $in: ['approved', 'rejected'] } };
        if (status && ['approved', 'rejected'].includes(status)) query.approvalStatus = status;

        const history = await Referral.find(query)
            .populate('beneficiaryId', 'fullName email avatarUrl')
            .populate('approvedBy', 'fullName email')
            .populate('rejectedBy', 'fullName email')
            .sort({ updatedAt: -1 })
            .limit(25)
            .skip((page - 1) * 25);

        const total = await Referral.countDocuments(query);
        res.status(200).json({ history, total });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getStats = async (req, res) => {
    try {
        const [topReferrersAgg, pendingAgg, seminarDistributedAgg, approvedCount, rejectedCount, pendingCount] = await Promise.all([
            Referral.aggregate([
                { $match: { approvalStatus: 'approved' } },
                { $group: { _id: '$beneficiaryId', totalCoins: { $sum: '$coinAmount' }, count: { $sum: 1 } } },
                { $sort: { totalCoins: -1 } },
                { $limit: 10 },
                { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
                { $unwind: '$user' },
                { $project: { totalCoins: 1, count: 1, 'user.fullName': 1, 'user.avatarUrl': 1, 'user.email': 1 } }
            ]),
            Referral.aggregate([
                { $match: { approvalStatus: 'pending' } },
                { $group: { _id: null, total: { $sum: '$coinAmount' } } }
            ]),
            Transaction.aggregate([
                { $match: { type: 'seminar_reward_received' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
            Referral.countDocuments({ approvalStatus: 'approved' }),
            Referral.countDocuments({ approvalStatus: 'rejected' }),
            Referral.countDocuments({ approvalStatus: 'pending' })
        ]);

        const totalApprovedAgg = await Referral.aggregate([
            { $match: { approvalStatus: 'approved' } },
            { $group: { _id: null, total: { $sum: '$coinAmount' } } }
        ]);

        const totalPendingCoins = pendingAgg[0]?.total || 0;
        const totalReferralDistributed = totalApprovedAgg[0]?.total || 0;
        const totalSeminarDistributed = seminarDistributedAgg[0]?.total || 0;
        const totalReferrals = approvedCount + rejectedCount + pendingCount;
        const conversionRate = totalReferrals > 0 ? Number(((approvedCount / totalReferrals) * 100).toFixed(1)) : 0;

        res.status(200).json({
            topReferrers: topReferrersAgg,
            totalCoinsDistributed: totalReferralDistributed + totalSeminarDistributed,
            totalPendingCoins,
            conversionRate,
            approvedCount,
            rejectedCount,
            pendingCount
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.adjustUserCoins = async (req, res) => {
    try {
        const { amount, reason } = req.body;
        if (typeof amount !== 'number' || amount === 0) {
            return res.status(400).json({ message: 'amount must be a non-zero number' });
        }

        const meta = {
            type: 'admin_adjustment',
            action: reason || 'Admin coin adjustment',
            actorId: req.user._id,
            actorRole: req.user.role,
            auditAction: 'admin_coin_adjustment',
            auditMetadata: { reason }
        };

        const result = amount > 0
            ? await coinWalletService.creditCoins(req.params.userId, amount, meta)
            : await coinWalletService.debitCoins(req.params.userId, Math.abs(amount), meta);

        res.status(200).json({ user: result.user, transaction: result.transaction });
    } catch (error) {
        if (error instanceof coinWalletService.InsufficientBalanceError) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
