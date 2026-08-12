const mongoose = require('mongoose');
const { PERMISSION_KEYS } = require('../config/permissions');

const RoleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    // Stable identifier used for User.role denormalization and lookups - lowercase,
    // hyphenated, unique. System roles use fixed slugs ('admin'/'manager'/'user') so
    // existing code that still reads User.role as a plain string keeps working.
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    permissions: {
        type: [String],
        enum: PERMISSION_KEYS,
        default: []
    },
    // System roles (Admin/Manager/User) are seeded once and permanently protected -
    // not editable or deletable via the Roles admin page. This is the safety rail that
    // guarantees there's always a known-good Admin role no custom-role misconfiguration
    // can ever touch. Only custom roles (isSystem: false) are user-editable.
    isSystem: {
        type: Boolean,
        default: false
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

module.exports = mongoose.model('Role', RoleSchema);
