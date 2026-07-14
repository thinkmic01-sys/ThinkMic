const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
    referrerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    referredName: {
        type: String,
        required: true
    },
    referredEmail: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Invited', 'Active', 'Premium'],
        default: 'Invited'
    },
    rewards: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('Referral', referralSchema);
