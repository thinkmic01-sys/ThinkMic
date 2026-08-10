const mongoose = require('mongoose');

const TranscriptSchema = new mongoose.Schema({
    recordingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Recording',
        required: true,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    text: {
        type: String,
        required: true
        // Text index defined explicitly below (not via inline `text: true`) so we can pass
        // language_override: 'none' - see the index() call below for why.
    },
    segments: [{
        start: Number,
        end: Number,
        text: String
    }],
    language: String,
    whisperModel: {
        type: String,
        required: true,
        default: 'whisper-1'
    },
    processingMs: Number,
    editedText: String
}, { timestamps: true });

// recordingId already has a unique index (one transcript per recording); add the
// compound index for a user's transcript history feed (newest first).
TranscriptSchema.index({ userId: 1, createdAt: -1 });

// language_override: 'none' disables MongoDB's default behavior of treating any field
// literally named `language` on a text-indexed document as the reserved per-document
// stemming-language override. Without this, saving a Transcript with e.g. language: 'urdu'
// (Whisper's detected-language output) or 'en-US' (a BCP-47 locale) throws "language
// override unsupported" and the whole write fails, since neither is one of MongoDB's
// recognized stemmer languages - this silently crashed every Whisper-transcribed Urdu
// recording. `language` here is just a plain descriptive field, never meant to control
// search stemming.
TranscriptSchema.index({ text: 'text' }, { language_override: 'none' });

module.exports = mongoose.model('Transcript', TranscriptSchema);