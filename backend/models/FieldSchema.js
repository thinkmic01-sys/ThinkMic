const mongoose = require('mongoose');

const FieldDefSchema = new mongoose.Schema({
    id: { type: String, required: true },
    type: {
        type: String,
        enum: ['text', 'textarea', 'voice', 'select', 'checkbox', 'rating', 'date', 'file', 'number'],
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
    },
    allowMultiple: { type: Boolean, default: true }
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
    // The literal 'all' (visible to everyone), the literal 'own-students' (visible only to
    // students who carry this schema's createdBy in their User.assignedLecturers - forced by
    // schemasController.createSchema for anyone without the blanket schemas.manage
    // permission, e.g. a Lecturer), or a User.title value (professional title, e.g.
    // "Cardiologist") matched case-insensitively - not an access-role enum, so no fixed
    // enum constraint here.
    targetRole: {
        type: String,
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
