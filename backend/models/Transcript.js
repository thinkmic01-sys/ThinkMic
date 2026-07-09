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

module.exports = mongoose.model('Transcript', TranscriptSchema);