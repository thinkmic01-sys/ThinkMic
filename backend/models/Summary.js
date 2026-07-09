const mongoose = require('mongoose');

const SummarySchema = new mongoose.Schema({
    transcriptId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transcript',
        required: true,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    summaryText: {
        type: String,
        required: true
    },
    tags: [{
        type: String,
        index: true
    }],
    queries: [String],
    aiModel: {
        type: String,
        required: true,
        default: 'gpt-4o'
    },
    promptVersion: {
        type: String,
        required: true,
        default: 'v1.0'
    },
    editedSummaryText: String,
    approved: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Summary', SummarySchema);