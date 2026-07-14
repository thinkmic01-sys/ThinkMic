const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    desc: {
        type: String
    },
    tag: {
        type: String
    },
    time: {
        type: String
    },
    status: {
        type: String,
        enum: ['LIVE', 'UPCOMING', 'RECORDED', 'LIVE NOW'],
        default: 'RECORDED'
    },
    host: {
        type: String
    },
    hostTitle: {
        type: String
    },
    img: {
        type: String
    },
    bullets: {
        type: [String],
        default: []
    }
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);
