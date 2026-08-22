const usageService = require('../services/usageService');

// @desc    Current coin-per-unit top-up rates (storage/transcription/searches) - read by any
//          authenticated user (drives the Dashboard top-up modal's live cost preview) and by
//          the admin Packages page to prefill its settings form.
// @route   GET /api/v1/usage-rates
// @access  Private
exports.getRates = async (req, res) => {
    try {
        const settings = await usageService.getUsageRateSettings();
        res.status(200).json({ settings });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update the coin-per-unit top-up rates
// @route   PATCH /api/v1/admin/usage-rates
// @access  Private (packages.manage)
exports.updateRates = async (req, res) => {
    try {
        const { coinsPerStorageGB, coinsPerTranscriptionMinute, coinsPerSearch } = req.body;
        for (const [key, val] of Object.entries({ coinsPerStorageGB, coinsPerTranscriptionMinute, coinsPerSearch })) {
            if (val !== undefined && (typeof val !== 'number' || !Number.isFinite(val) || val < 0)) {
                return res.status(400).json({ message: `${key} must be a non-negative number` });
            }
        }

        const settings = await usageService.getUsageRateSettings();
        if (coinsPerStorageGB !== undefined) settings.coinsPerStorageGB = coinsPerStorageGB;
        if (coinsPerTranscriptionMinute !== undefined) settings.coinsPerTranscriptionMinute = coinsPerTranscriptionMinute;
        if (coinsPerSearch !== undefined) settings.coinsPerSearch = coinsPerSearch;
        settings.updatedBy = req.user._id;
        await settings.save();

        res.status(200).json({ settings });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
