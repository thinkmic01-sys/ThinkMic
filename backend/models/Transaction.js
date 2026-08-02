const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    action: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    icon: {
        type: String,
        default: 'toll'
    },
    type: {
        type: String,
        enum: ['referral_l1', 'referral_l2', 'referral_l3', 'seminar_reward_reserved', 'seminar_reward_received', 'seminar_reward_refunded', 'coin_purchase', 'admin_adjustment', 'other'],
        default: 'other'
    },
    relatedUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    relatedEntityType: {
        type: String,
        enum: ['Referral', 'Seminar', 'Registration']
    },
    relatedEntityId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'relatedEntityType'
    },
    status: {
        type: String,
        enum: ['completed', 'reversed'],
        default: 'completed'
    }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
