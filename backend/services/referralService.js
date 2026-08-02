const User = require('../models/User');
const Referral = require('../models/Referral');
const Notification = require('../models/Notification');
const coinWalletService = require('./coinWalletService');

const MAX_LEVEL = 3;

// Sets `user.referredBy` once, if a valid referralCode was supplied and the user
// doesn't already have a referrer. Immutable thereafter - no other code path updates this field.
async function attachReferrer(user, referralCode) {
    if (user.referredBy || !referralCode) return null;

    const referrer = await User.findOne({ referralCode });
    if (!referrer) return null;
    if (referrer._id.equals(user._id)) return null; // self-referral guard

    user.referredBy = referrer._id;
    await user.save();
    return referrer;
}

// Walks up to 3 hops via `referredBy` and creates a pending Referral reward row
// for each existing ancestor, locking in the coin amount from current RewardSettings.
// Safe to call more than once for the same user - the unique {referredUserId, level}
// index on Referral makes duplicate rows a no-op.
async function createPendingRewardsForNewUser(user) {
    const settings = await coinWalletService.getRewardSettings();
    const levelAmounts = [settings.l1Amount, settings.l2Amount, settings.l3Amount];

    const created = [];
    let current = user;

    for (let level = 1; level <= MAX_LEVEL; level++) {
        if (!current.referredBy) break;

        const ancestor = await User.findById(current.referredBy);
        if (!ancestor) break;

        const coinAmount = levelAmounts[level - 1];
        if (coinAmount > 0) {
            try {
                const referral = await Referral.create({
                    beneficiaryId: ancestor._id,
                    referredUserId: user._id,
                    referredName: user.fullName,
                    referredEmail: user.email,
                    level,
                    coinAmount,
                    approvalStatus: 'pending'
                });
                created.push(referral);

                await Notification.create({
                    userId: ancestor._id,
                    type: 'referral_pending',
                    message: `Your L${level} referral reward of ${coinAmount} coins is pending admin approval.`,
                    link: '/app/forms'
                });
            } catch (err) {
                if (err.code !== 11000) throw err; // ignore duplicate-key races, keep walking
            }
        }

        current = ancestor;
    }

    return created;
}

module.exports = {
    attachReferrer,
    createPendingRewardsForNewUser
};
