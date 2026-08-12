const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: [
            'reminder', 'system', 'update',
            'referral_pending', 'referral_approved', 'referral_rejected',
            'seminar_reward_received', 'seminar_coins_reserved', 'seminar_coins_refunded',
            'seminar_live', 'form_published', 'keyword_seminar_match'
        ],
        default: 'reminder'
    },
    isRead: {
        type: Boolean,
        default: false
    },
    link: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);
