const Transcript = require('../models/Transcript');
const Recording = require('../models/Recording');

exports.getTranscriptStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const recording = await Recording.findById(id).select('status transcriptId');
        
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
        const { editedText } = req.body;
        
        const transcript = await Transcript.findByIdAndUpdate(
            id,
            { editedText },
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
