const Transcript = require('../models/Transcript');
const Recording = require('../models/Recording');
const openaiService = require('../services/openaiService');

exports.getTranscriptStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const recording = await Recording.findOne({ _id: id, userId: req.user._id }).select('status transcriptId');
        
        if (!recording) {
            return res.status(404).json({ message: 'Recording not found' });
        }

        res.status(200).json({
            status: recording.status,
            transcriptId: recording.transcriptId
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.updateTranscript = async (req, res) => {
    try {
        const { id } = req.params;
        const { text, editedText } = req.body;

        // `text` is the raw/live field (used by SpeechWorkspace's periodic autosave while
        // recording is in progress); `editedText` is the user's manual correction layer.
        // Both go through this same endpoint but are kept separate fields.
        const update = {};
        if (text !== undefined) update.text = text;
        if (editedText !== undefined) update.editedText = editedText;

        if (Object.keys(update).length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        const transcript = await Transcript.findOneAndUpdate(
            { _id: id, userId: req.user._id },
            update,
            { new: true }
        );

        if (!transcript) {
            return res.status(404).json({ message: 'Transcript not found' });
        }

        res.status(200).json({ transcript });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Translate a transcript into another language for display purposes only -
//          deliberately never persisted, so switching the language selector back and
//          forth never overwrites the real transcript.text/editedText
// @route   POST /api/v1/transcriptions/:id/translate
// @access  Private
exports.translateTranscript = async (req, res) => {
    try {
        const { id } = req.params;
        const { targetLanguage } = req.body;

        if (!targetLanguage) {
            return res.status(400).json({ message: 'targetLanguage is required' });
        }

        const transcript = await Transcript.findOne({ _id: id, userId: req.user._id });
        if (!transcript) {
            return res.status(404).json({ message: 'Transcript not found' });
        }

        const sourceText = transcript.editedText || transcript.text;
        const translatedText = await openaiService.translateText(sourceText, targetLanguage);

        res.status(200).json({ translatedText });
    } catch (error) {
        console.error('Translate Transcript Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
