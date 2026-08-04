const mongoose = require('mongoose');

const RecordingSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
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
    r2Key: {
        type: String,
        sparse: true
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

// Compound indexes for high-volume retrieval: a user's recordings feed (newest first)
// and the worker/admin queues that scan by status across all users.
RecordingSchema.index({ userId: 1, createdAt: -1 });
RecordingSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Recording', RecordingSchema);