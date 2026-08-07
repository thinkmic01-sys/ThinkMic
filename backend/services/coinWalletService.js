const User = require('../models/User');
const Transaction = require('../models/Transaction');
const AuditLog = require('../models/AuditLog');
const RewardSettings = require('../models/RewardSettings');
const TimelineEvent = require('../models/TimelineEvent');

class InsufficientBalanceError extends Error {
    constructor(message = 'Insufficient coin balance') {
        super(message);
        this.name = 'InsufficientBalanceError';
    }
}

// meta: { type, action, relatedUserId, relatedEntityType, relatedEntityId, icon,
//         actorId, actorRole, auditAction, ip, userAgent }
async function writeTransaction(userId, amount, meta, session) {
    const [tx] = await Transaction.create([{
        userId,
        amount,
        action: meta.action,
        icon: meta.icon || 'toll',
        type: meta.type || 'other',
        relatedUserId: meta.relatedUserId,
        relatedEntityType: meta.relatedEntityType,
        relatedEntityId: meta.relatedEntityId
    }], { session });
    return tx;
}

async function writeAuditLog(userId, meta, session) {
    await AuditLog.create([{
        actorId: meta.actorId || userId,
        actorRole: meta.actorRole || 'system',
        action: meta.auditAction || meta.type || 'coin_movement',
        targetId: meta.relatedEntityId || userId,
        targetType: meta.relatedEntityType || 'User',
        metadata: { userId, ...(meta.auditMetadata || {}) },
        ip: meta.ip,
        userAgent: meta.userAgent
    }], { session });
}

// Credits `amount` (must be >= 0) to a user's spendable balance.
async function creditCoins(userId, amount, meta = {}, session) {
    if (amount < 0) throw new Error('creditCoins amount must be >= 0');
    const update = { $inc: { coins: amount } };
    if (amount > 0) update.$inc.lifetimeCoins = amount;

    const user = await User.findByIdAndUpdate(userId, update, { new: true, session }).select('-passwordHash');
    if (!user) throw new Error('User not found');

    const tx = await writeTransaction(userId, amount, meta, session);
    await writeAuditLog(userId, meta, session);

    // My Timeline entry - only for real credits, not zero-amount bookkeeping calls
    if (amount > 0) {
        await TimelineEvent.create([{
            userId,
            type: 'Rewards',
            title: 'Coins Earned',
            description: meta.action || 'You earned coins.',
            icon: meta.icon || 'toll',
            color: 'text-[#006e73]',
            borderColor: 'border-[#3edae3]',
            coinReward: `+${amount}`
        }], { session });
    }

    return { user, transaction: tx };
}

// Debits `amount` (must be >= 0) from a user's spendable balance. Guarded against negative balance.
async function debitCoins(userId, amount, meta = {}, session) {
    if (amount < 0) throw new Error('debitCoins amount must be >= 0');

    const user = await User.findOneAndUpdate(
        { _id: userId, coins: { $gte: amount } },
        { $inc: { coins: -amount } },
        { new: true, session }
    ).select('-passwordHash');
    if (!user) throw new InsufficientBalanceError();

    const tx = await writeTransaction(userId, -amount, meta, session);
    await writeAuditLog(userId, meta, session);
    return { user, transaction: tx };
}

// Moves `amount` from a user's spendable balance into escrow (heldCoins). Guarded against negative balance.
async function holdCoins(userId, amount, meta = {}, session) {
    if (amount < 0) throw new Error('holdCoins amount must be >= 0');

    const user = await User.findOneAndUpdate(
        { _id: userId, coins: { $gte: amount } },
        { $inc: { coins: -amount, heldCoins: amount } },
        { new: true, session }
    ).select('-passwordHash');
    if (!user) throw new InsufficientBalanceError();

    const tx = await writeTransaction(userId, -amount, meta, session);
    await writeAuditLog(userId, meta, session);
    return { user, transaction: tx };
}

// Consumes `amount` out of a user's escrowed heldCoins (e.g. paid out to a reward recipient).
// Does not credit the spender's `coins` - pair with creditCoins() for the recipient.
async function spendHeldCoins(userId, amount, meta = {}, session) {
    if (amount < 0) throw new Error('spendHeldCoins amount must be >= 0');

    const user = await User.findOneAndUpdate(
        { _id: userId, heldCoins: { $gte: amount } },
        { $inc: { heldCoins: -amount } },
        { new: true, session }
    ).select('-passwordHash');
    if (!user) throw new InsufficientBalanceError('Insufficient held coins');

    await writeAuditLog(userId, meta, session);
    return { user };
}

// Releases `amount` from escrow back into the user's spendable balance (unused reward funds).
async function refundHeldCoins(userId, amount, meta = {}, session) {
    if (amount < 0) throw new Error('refundHeldCoins amount must be >= 0');

    const user = await User.findOneAndUpdate(
        { _id: userId, heldCoins: { $gte: amount } },
        { $inc: { heldCoins: -amount, coins: amount } },
        { new: true, session }
    ).select('-passwordHash');
    if (!user) throw new InsufficientBalanceError('Insufficient held coins to refund');

    const tx = await writeTransaction(userId, amount, meta, session);
    await writeAuditLog(userId, meta, session);
    return { user, transaction: tx };
}

async function getRewardSettings() {
    let settings = await RewardSettings.findOne();
    if (!settings) {
        settings = await RewardSettings.create({});
    }
    return settings;
}

module.exports = {
    InsufficientBalanceError,
    creditCoins,
    debitCoins,
    holdCoins,
    spendHeldCoins,
    refundHeldCoins,
    getRewardSettings
};
