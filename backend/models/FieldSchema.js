const mongoose = require('mongoose');

const FieldDefSchema = new mongoose.Schema({
    id: { type: String, required: true },
    type: {
        type: String,
        enum: ['text', 'textarea', 'voice', 'select', 'checkbox', 'rating', 'date', 'file'],
        required: true
    },
    label: { type: String, required: true },
    required: { type: Boolean, required: true },
    voicePrompt: String,
    options: [String],
    validation: {
        min: Number,
        max: Number,
        regex: String
    }
}, { _id: false });

const FieldSchemaSchema = new mongoose.Schema({
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: String,
    targetRole: {
        type: String,
        enum: ['user', 'manager', 'all'],
        required: true
    },
    fields: [FieldDefSchema],
    version: {
        type: Number,
        required: true,
        default: 1
    },
    status: {
        type: String,
        enum: ['draft', 'active', 'archived'],
        required: true,
        index: true
    },
    deadline: Date
}, { timestamps: true });

module.exports = mongoose.model('FieldSchema', FieldSchemaSchema);
