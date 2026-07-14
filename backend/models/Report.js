const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true
    },
    recordingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Recording'
    },
    summaryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Summary'
    },
    searchSessionIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SearchResult'
    }],
    template: {
        type: String,
        enum: ['standard', 'executive', 'academic'],
        required: true
    },
    sections: {
        type: {
            summary: Boolean,
            transcript: Boolean,
            research: Boolean,
            sources: Boolean
        },
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'generating', 'ready', 'failed'],
        required: true,
        index: true
    },
    pdfLocalPath: { // Adapted from pdfS3Key
        type: String
    },
    docxLocalPath: { // Adapted from docxS3Key
        type: String
    },
    shareToken: {
        type: String,
        sparse: true
    },
    shareExpiresAt: {
        type: Date
    }
}, { timestamps: true });

module.exports = mongoose.model('Report', ReportSchema);
