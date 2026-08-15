const mongoose = require('mongoose');

const rewardSettingsSchema = new mongoose.Schema({
    l1Amount: {
        type: Number,
        default: 100,
        min: 0
    },
    l2Amount: {
        type: Number,
        default: 40,
        min: 0
    },
    l3Amount: {
        type: Number,
        default: 20,
        min: 0
    },
    // Admin-defined coin-based rank tiers (e.g. Bronze from 0, Silver from 501, ...) shown
    // on the Achievements page in place of a plain numeric leaderboard position - fully
    // admin-authored, both the name and the coin threshold. Sorted ascending by minCoins
    // when resolving which tier a user's lifetimeCoins falls into (see
    // achievementsController.resolveRankTier).
    rankTiers: {
        type: [{
            name: { type: String, required: true, trim: true },
            minCoins: { type: Number, required: true, min: 0 }
        }],
        default: [
            { name: 'Bronze', minCoins: 0 },
            { name: 'Silver', minCoins: 501 },
            { name: 'Gold', minCoins: 1501 }
        ]
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

module.exports = mongoose.model('RewardSettings', rewardSettingsSchema);
