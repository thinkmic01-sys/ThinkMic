const AuditLog = require('../models/AuditLog');
const promptSettingsService = require('../services/promptSettingsService');

exports.getSettings = async (req, res) => {
    try {
        const settings = await promptSettingsService.getPromptSettings();
        res.status(200).json({ settings, defaults: promptSettingsService.getDefaultPrompts() });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const { summaryPrompt, queryExtractionPrompt, reportPrompt } = req.body;
        for (const [key, val] of Object.entries({ summaryPrompt, queryExtractionPrompt, reportPrompt })) {
            if (val !== undefined && (typeof val !== 'string' || !val.trim())) {
                return res.status(400).json({ message: `${key} must be a non-empty string` });
            }
        }

        const settings = await promptSettingsService.getPromptSettings();
        const before = {
            summaryPrompt: settings.summaryPrompt,
            queryExtractionPrompt: settings.queryExtractionPrompt,
            reportPrompt: settings.reportPrompt
        };

        if (summaryPrompt !== undefined) settings.summaryPrompt = summaryPrompt.trim();
        if (queryExtractionPrompt !== undefined) settings.queryExtractionPrompt = queryExtractionPrompt.trim();
        if (reportPrompt !== undefined) settings.reportPrompt = reportPrompt.trim();
        settings.updatedBy = req.user._id;
        await settings.save();

        await AuditLog.create({
            actorId: req.user._id,
            actorRole: req.user.role,
            action: 'prompt_settings_updated',
            targetId: settings._id,
            targetType: 'PromptSettings',
            metadata: {
                before,
                after: {
                    summaryPrompt: settings.summaryPrompt,
                    queryExtractionPrompt: settings.queryExtractionPrompt,
                    reportPrompt: settings.reportPrompt
                }
            }
        });

        res.status(200).json({ settings });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
