const PromptSettings = require('../models/PromptSettings');

// Same fetch-or-create singleton idiom as coinWalletService.getRewardSettings() - schema
// defaults apply automatically on first creation, so this always returns a usable document.
async function getPromptSettings() {
    let settings = await PromptSettings.findOne();
    if (!settings) {
        settings = await PromptSettings.create({});
    }
    return settings;
}

// Backs the admin UI's "Reset to Default" button - same values the schema itself defaults
// to, re-exported here so the frontend never has to hardcode a second copy.
function getDefaultPrompts() {
    return { ...PromptSettings.DEFAULT_PROMPTS };
}

module.exports = { getPromptSettings, getDefaultPrompts };
