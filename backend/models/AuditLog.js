const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
    actorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    actorRole: {
        type: String,
        required: true
    },
    action: {
        type: String,
        required: true,
        index: true
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true
    },
    targetType: {
        type: String
    },
    metadata: {
        type: Object
    },
    ip: {
        type: String
    },
    userAgent: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
