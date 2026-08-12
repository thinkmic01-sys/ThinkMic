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
    // Admin/Manager/User are seeded once via seedRoles.js. Of the three, only the one with
    // slug 'admin' is actually protected from editing/deleting (see roleController.js) - the
    // safety rail that guarantees a known-good full-access role always exists. Manager and
    // User are editable/deletable like any custom role despite isSystem being true here;
    // this flag now only affects the "System" badge/sort order in the Roles admin page, not
    // edit/delete permission.
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
