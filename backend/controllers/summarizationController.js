const Summary = require('../models/Summary');
const Transcript = require('../models/Transcript');
const { summarizationQueue } = require('../queues');

exports.getSummary = async (req, res) => {
    try {
        const { transcriptId } = req.params;
        const summary = await Summary.findOne({ transcriptId, userId: req.user._id });

        if (!summary) {
            return res.status(404).json({ message: 'Summary not found' });
        }

        res.status(200).json({ summary });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.regenerateSummary = async (req, res) => {
    try {
        const { transcriptId } = req.params;
        const { customPrompt, length, style, language } = req.body;

        // Confirm the transcript actually belongs to the caller before queuing an AI job
        // against it - otherwise anyone could trigger (and get billed/notified for)
        // regeneration on another user's private transcript.
        const transcript = await Transcript.findOne({ _id: transcriptId, userId: req.user._id });
        if (!transcript) {
            return res.status(404).json({ message: 'Transcript not found' });
        }

        const job = await summarizationQueue.add('summarize', {
            transcriptId,
            userId: req.user._id,
            customPrompt,
            length,
            style,
            language
        });

        res.status(202).json({ jobId: job.id, message: 'Summarization job queued' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.updateSummary = async (req, res) => {
    try {
        const { id } = req.params;
        const { editedSummaryText, tags, approved } = req.body;

        const summary = await Summary.findOneAndUpdate(
            { _id: id, userId: req.user._id },
            { editedSummaryText, tags, approved },
            { new: true }
        );

        if (!summary) {
            return res.status(404).json({ message: 'Summary not found' });
        }

        res.status(200).json({ summary });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
