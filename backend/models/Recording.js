const mongoose = require('mongoose');

const RecordingSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        text: true // For search functionality
    },
    s3Key: {
        type: String,
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    durationSeconds: Number,
    fileSizeBytes: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['uploaded', 'processing', 'transcribed', 'failed'],
        required: true,
        default: 'uploaded'
    },
    transcriptId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transcript'
    },
    summaryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Summary'
    }
}, { timestamps: true });

module.exports = mongoose.model('Recording', RecordingSchema);