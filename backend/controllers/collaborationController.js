const CollaborationSubmission = require('../models/CollaborationSubmission');
const Referral = require('../models/Referral');
const User = require('../models/User');

exports.getReferralDashboard = async (req, res) => {
    try {
        const userId = req.user.id;
        const referrals = await Referral.find({ beneficiaryId: userId }).sort({ createdAt: -1 });

        let l1Count = 0, l2Count = 0, l3Count = 0;
        let pendingCoins = 0, approvedCoins = 0, rejectedCoins = 0;
        let approvedCount = 0;

        referrals.forEach(r => {
            if (r.level === 1) l1Count++;
            else if (r.level === 2) l2Count++;
            else if (r.level === 3) l3Count++;

            if (r.approvalStatus === 'pending') pendingCoins += r.coinAmount;
            else if (r.approvalStatus === 'approved') { approvedCoins += r.coinAmount; approvedCount++; }
            else if (r.approvalStatus === 'rejected') rejectedCoins += r.coinAmount;
        });

        const totalReferrals = referrals.length;
        const conversionRate = totalReferrals > 0 ? Number(((approvedCount / totalReferrals) * 100).toFixed(1)) : 0;

        res.status(200).json({
            referralCode: req.user.referralCode,
            stats: {
                totalReferrals,
                l1Count, l2Count, l3Count,
                pendingCoins,
                approvedCoins,
                rejectedCoins,
                lifetimeReferralCoins: approvedCoins,
                conversionRate
            },
            pendingRewards: referrals.filter(r => r.approvalStatus === 'pending'),
            recentReferrals: referrals.slice(0, 10)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Returns the caller's referral hierarchy up to 3 levels deep, nested via `children`,
// independent of reward approval state (reflects actual User.referredBy relationships).
exports.getReferralNetwork = async (req, res) => {
    try {
        const buildLevel = async (parentIds, level) => {
            if (parentIds.length === 0) return [];

            const users = await User.find({ referredBy: { $in: parentIds } })
                .select('fullName email avatarUrl createdAt referredBy');
            if (users.length === 0) return [];

            const userIds = users.map(u => u._id);
            const rewards = await Referral.find({ referredUserId: { $in: userIds }, level })
                .select('referredUserId coinAmount approvalStatus');
            const rewardMap = new Map(rewards.map(r => [String(r.referredUserId), r]));

            const childNodes = level < 3 ? await buildLevel(userIds, level + 1) : [];
            const childrenByParent = {};
            childNodes.forEach(c => {
                if (!childrenByParent[c.parentId]) childrenByParent[c.parentId] = [];
                childrenByParent[c.parentId].push(c);
            });

            return users.map(u => ({
                user: { _id: u._id, fullName: u.fullName, avatarUrl: u.avatarUrl, createdAt: u.createdAt },
                parentId: String(u.referredBy),
                level,
                reward: rewardMap.get(String(u._id)) || null,
                children: childrenByParent[String(u._id)] || []
            }));
        };

        const network = await buildLevel([req.user.id], 1);
        res.status(200).json({ network });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getSubmissions = async (req, res) => {
    try {
        const submissions = await CollaborationSubmission.find({ userId: req.user.id }).sort({ updatedAt: -1 });
        res.status(200).json(submissions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.createSubmission = async (req, res) => {
    try {
        const newSubmission = new CollaborationSubmission({
            userId: req.user.id,
            researcherName: req.body.researcherName,
            category: req.body.category,
            submissionId: req.body.submissionId,
            summary: req.body.summary,
            dataSources: req.body.dataSources,
            status: req.body.status || 'draft'
        });
        const savedSubmission = await newSubmission.save();
        res.status(201).json(savedSubmission);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateSubmission = async (req, res) => {
    try {
        const updatedSubmission = await CollaborationSubmission.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            { $set: req.body },
            { new: true }
        );
        if (!updatedSubmission) {
            return res.status(404).json({ message: 'Submission not found or unauthorized' });
        }
        res.status(200).json(updatedSubmission);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
