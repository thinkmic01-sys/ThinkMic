const mongoose = require('mongoose');

// Admin-defined purchasable coin bundle (Admin > Packages, alongside the storage/minutes/
// searches Package catalog) - how many coins a user gets for a set USD price. Same
// initial-stage scope as Package: purely a catalog/definition, no payment gateway wired up
// yet, so nothing currently credits coins or marks a purchase. Shown to the user via the
// coin balance in Navbar.jsx (CoinPackagesModal), mirroring PackagesPromptModal's UX.
const coinPackageSchema = new mongoose.Schema({
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
    coins: {
        type: Number,
        required: true,
        min: 0
    },
    priceUSD: {
        type: Number,
        required: true,
        min: 0
    },
    // Inactive bundles are kept (not deleted) for historical reference but excluded from the
    // user-facing dialog - lets an admin retire one without breaking anyone who already
    // "has" it once a purchase flow exists.
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

module.exports = mongoose.model('CoinPackage', coinPackageSchema);
