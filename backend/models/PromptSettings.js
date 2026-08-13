const mongoose = require('mongoose');

// Single source of truth for the defaults - both the Mongoose schema defaults below and
// promptSettingsService.getDefaultPrompts() (used by the admin UI's "Reset to Default"
// button) read from this same object, so they can never drift out of sync.
const DEFAULT_PROMPTS = {
    summaryPrompt: 'Your job is to provide a comprehensive summary of the meeting transcript, capturing the key points, decisions, and context accurately.',
    queryExtractionPrompt: 'Also extract key topics/tags discussed, and suggest insightful follow-up research questions/queries that would help the user learn more about the topics raised.',
    reportPrompt: 'You are a highly skilled AI research analyst who writes publication-ready professional reports by synthesizing meeting audio transcripts, AI-generated summaries, and live web research.'
};

// Singleton (one document, fetched/created via promptSettingsService.getPromptSettings) -
// admin-editable "mission" sentence for each AI generation step. Deliberately NOT the whole
// prompt: the technical scaffolding each step depends on to function (the JSON-schema
// contract for summary/queries, the HTML-only output contract for reports, language
// instructions) stays hardcoded in openaiService.js so an admin editing these fields can't
// break parsing - only the persona/instructional sentence is swappable.
const promptSettingsSchema = new mongoose.Schema({
    summaryPrompt: {
        type: String,
        default: DEFAULT_PROMPTS.summaryPrompt
    },
    queryExtractionPrompt: {
        type: String,
        default: DEFAULT_PROMPTS.queryExtractionPrompt
    },
    reportPrompt: {
        type: String,
        default: DEFAULT_PROMPTS.reportPrompt
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

const PromptSettings = mongoose.model('PromptSettings', promptSettingsSchema);
module.exports = PromptSettings;
module.exports.DEFAULT_PROMPTS = DEFAULT_PROMPTS;
