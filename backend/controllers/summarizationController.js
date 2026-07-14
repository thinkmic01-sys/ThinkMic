const Summary = require('../models/Summary');
const { summarizationQueue } = require('../queues');

exports.getSummary = async (req, res) => {
    try {
        const { transcriptId } = req.params;
        const summary = await Summary.findOne({ transcriptId });
        
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
        const { customPrompt } = req.body;
        
        const job = await summarizationQueue.add('summarize', {
            transcriptId,
            userId: req.user._id,
            customPrompt
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

        const summary = await Summary.findByIdAndUpdate(
            id,
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
