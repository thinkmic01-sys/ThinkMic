const mongoose = require('mongoose');

const TranscriptSchema = new mongoose.Schema({
    recordingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Recording',
        required: true,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    text: {
        type: String,
        required: true,
        text: true
    },
    segments: [{
        start: Number,
        end: Number,
        text: String
    }],
    language: String,
    whisperModel: {
        type: String,
        required: true,
        default: 'whisper-1'
    },
    processingMs: Number,
    editedText: String
}, { timestamps: true });

// recordingId already has a unique index (one transcript per recording); add the
// compound index for a user's transcript history feed (newest first).
TranscriptSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Transcript', TranscriptSchema);