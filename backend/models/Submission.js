const mongoose = require('mongoose');

const SubmissionSchema = new mongoose.Schema({
    schemaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FieldSchema',
        required: true,
        index: true
    },
    schemaVersion: {
        type: Number,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    answers: {
        type: Map,
        of: {
            type: { type: String, enum: ['text', 'voice'], required: true },
            value: String,
            s3Key: String, // Or local file path
            transcriptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transcript' }
        },
        required: true
    },
    status: {
        type: String,
        enum: ['draft', 'submitted'],
        required: true,
        index: true
    },
    submittedAt: {
        type: Date,
        index: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Submission', SubmissionSchema);
