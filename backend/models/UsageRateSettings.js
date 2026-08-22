const mongoose = require('mongoose');

// Admin-configurable singleton (Admin > Packages) - how many coins buy one extra unit of
// each package dimension via usageService.purchaseTopUp, letting a user push past a full
// package allowance without switching to a bigger package.
const usageRateSettingsSchema = new mongoose.Schema({
    coinsPerStorageGB: {
        type: Number,
        default: 20,
        min: 0
    },
    coinsPerTranscriptionMinute: {
        type: Number,
        default: 5,
        min: 0
    },
    coinsPerSearch: {
        type: Number,
        default: 2,
        min: 0
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

module.exports = mongoose.model('UsageRateSettings', usageRateSettingsSchema);
