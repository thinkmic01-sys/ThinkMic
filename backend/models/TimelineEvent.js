const mongoose = require('mongoose');

const timelineEventSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['Recording', 'Rewards', 'Reports', 'Seminars', 'Notes'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    icon: {
        type: String,
        default: 'check_circle'
    },
    color: {
        type: String,
        default: 'text-[#222777]'
    },
    borderColor: {
        type: String,
        default: 'border-[#222777]'
    },
    coinReward: {
        type: String, // e.g. "+500"
    },
    hasLink: {
        type: Boolean,
        default: false
    },
    isLive: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('TimelineEvent', timelineEventSchema);
