const mongoose = require('mongoose');

const collaborationSubmissionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    researcherName: {
        type: String,
        required: true
    },
    category: {
        type: String
    },
    submissionId: {
        type: String,
        required: true
    },
    summary: {
        type: String,
        required: true
    },
    dataSources: {
        type: Object, // Stores e.g. { generatedData: true, surveyResults: false }
        default: {}
    },
    status: {
        type: String,
        enum: ['draft', 'submitted'],
        default: 'draft'
    }
}, { timestamps: true });

module.exports = mongoose.model('CollaborationSubmission', collaborationSubmissionSchema);
