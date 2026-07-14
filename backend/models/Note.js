const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        default: 'Untitled Note'
    },
    content: {
        type: String,
        default: ''
    },
    preview: {
        type: String,
        default: ''
    },
    tags: {
        type: [String],
        default: []
    },
    outline: {
        type: [String],
        default: []
    },
    links: {
        type: [String],
        default: []
    }
}, { timestamps: true });

module.exports = mongoose.model('Note', noteSchema);
