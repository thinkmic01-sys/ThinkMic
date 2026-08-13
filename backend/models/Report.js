const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
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
        required: true
    },
    subtitle: {
        type: String,
        default: 'Prepared by ThinkMic AI'
    },
    recordingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Recording'
    },
    summaryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Summary'
    },
    // Direct link to the transcript this report's "Full Transcript" section should pull
    // from - set at creation time from whatever transcript the source research session
    // came from (see ResearchResults.jsx/SpeechWorkspace.jsx). Optional: reportGenWorker.js
    // falls back to resolving via summaryId/recordingId when this isn't set (e.g. reports
    // created before this field existed).
    transcriptId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transcript'
    },
    searchSessionIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SearchResult'
    }],
    template: {
        type: String,
        enum: ['standard', 'executive', 'academic', 'clinical', 'narrative', 'technical'],
        required: true
    },
    // Natural-language instruction to the AI ("English"/"Urdu"), not a locale code - mirrors
    // the same convention already used by Summary generation (openaiService.generateSummary).
    // Undefined/null means auto-detect from the source material, same as before this field existed.
    language: {
        type: String
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
        enum: ['pending', 'generating', 'ready', 'failed', 'completed'],
        required: true,
        index: true
    },
    content: {
        type: String
    },
    pdfLocalPath: { // Adapted from pdfS3Key
        type: String
    },
    docxLocalPath: { // Adapted from docxS3Key
        type: String
    },
    pdfR2Key: {
        type: String
    },
    docxR2Key: {
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

// Compound indexes for high-volume retrieval: a user's reports feed (newest first)
// and looking up every report generated for a given recording (cascade deletion, history).
ReportSchema.index({ userId: 1, createdAt: -1 });
ReportSchema.index({ recordingId: 1 });

module.exports = mongoose.model('Report', ReportSchema);
