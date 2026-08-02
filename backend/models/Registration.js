const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    seminarId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Seminar',
        required: true
    },
    rewardClaimed: {
        type: Boolean,
        default: false
    },
    rewardAmount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// A user should only be able to register once for a specific seminar
registrationSchema.index({ userId: 1, seminarId: 1 }, { unique: true });

module.exports = mongoose.model('Registration', registrationSchema);
