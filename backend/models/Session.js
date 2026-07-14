const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    refreshToken: {
        type: String,
        required: true,
        unique: true
    },
    userAgent: {
        type: String
    },
    ip: {
        type: String
    },
    expiresAt: {
        type: Date,
        required: true,
        expires: 0 // TTL index
    }
}, { timestamps: true });

module.exports = mongoose.model('Session', SessionSchema);
