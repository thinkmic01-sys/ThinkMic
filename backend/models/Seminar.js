const mongoose = require('mongoose');

const seminarSchema = new mongoose.Schema({
    hostId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true
    },
    hostName: {
        type: String,
        default: ''
    },
    hostImageUrl: {
        type: String,
        default: ''
    },
    abstract: {
        type: String
    },
    category: {
        type: String
    },
    tags: {
        type: [String],
        default: []
    },
    imageUrl: {
        type: String,
        default: ''
    },
    location: {
        type: String,
        default: ''
    },
    date: {
        type: Date
    },
    startTime: {
        type: String
    },
    endTime: {
        type: String
    },
    format: {
        type: String,
        enum: ['Live Broadcast', 'Pre-Recorded', 'In-Person'],
        default: 'Live Broadcast'
    },
    status: {
        type: String,
        enum: ['draft', 'scheduled', 'live', 'completed', 'cancelled'],
        default: 'scheduled'
    },
    rewardEnabled: {
        type: Boolean,
        default: false
    },
    rewardPerUser: {
        type: Number,
        default: 0,
        min: 0
    },
    rewardMaxRecipients: {
        type: Number,
        default: 0,
        min: 0
    },
    rewardRecipientsCount: {
        type: Number,
        default: 0,
        min: 0
    },
    rewardHeldAmount: {
        type: Number,
        default: 0,
        min: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('Seminar', seminarSchema);
