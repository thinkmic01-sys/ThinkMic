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
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

module.exports = mongoose.model('RewardSettings', rewardSettingsSchema);
