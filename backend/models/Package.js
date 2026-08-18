const mongoose = require('mongoose');

// Admin-defined purchasable package (Admin > Packages) - what a user gets: storage,
// transcription minutes, and searches, at a set USD price. Purely a catalog/definition at
// this stage - no payment gateway is wired up yet (see CLAUDE.md's "Planned" list), so
// nothing currently debits against these limits or marks a user as having bought one. This
// is the groundwork the purchase flow and usage metering will build on later.
const packageSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    storageGB: {
        type: Number,
        required: true,
        min: 0
    },
    transcriptionMinutes: {
        type: Number,
        required: true,
        min: 0
    },
    searches: {
        type: Number,
        required: true,
        min: 0
    },
    priceUSD: {
        type: Number,
        required: true,
        min: 0
    },
    // Inactive packages are kept (not deleted) for historical reference but excluded from
    // the user-facing prompt/list - lets an admin retire a package without breaking anyone
    // who already "has" it once a purchase flow exists.
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Package', packageSchema);
