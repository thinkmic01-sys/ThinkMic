const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
    beneficiaryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    referredUserId: {
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
    level: {
        type: Number,
        enum: [1, 2, 3],
        required: true
    },
    coinAmount: {
        type: Number,
        required: true,
        min: 0
    },
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
        index: true
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectedAt: Date,
    rejectionReason: String
}, { timestamps: true });

referralSchema.index({ referredUserId: 1, level: 1 }, { unique: true });

module.exports = mongoose.model('Referral', referralSchema);
