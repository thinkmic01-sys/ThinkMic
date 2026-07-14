const Submission = require('../models/Submission');

exports.submitForm = async (req, res) => {
    try {
        const { schemaId, answers, status } = req.body;

        const submission = await Submission.create({
            schemaId,
            schemaVersion: 1, // Ideally we pull this from the schema
            userId: req.user._id,
            answers,
            status,
            submittedAt: status === 'submitted' ? new Date() : null
        });

        res.status(201).json({ submission });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.listSubmissions = async (req, res) => {
    try {
        const { schemaId, userId, status } = req.query;
        const query = {};
        
        if (schemaId) query.schemaId = schemaId;
        if (userId) query.userId = userId;
        if (status) query.status = status;

        const submissions = await Submission.find(query).sort({ submittedAt: -1 }).limit(50);
        res.status(200).json({ submissions, total: submissions.length });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getSubmissionDetail = async (req, res) => {
    try {
        const submission = await Submission.findById(req.params.id);
        if (!submission) return res.status(404).json({ message: 'Submission not found' });
        
        res.status(200).json({ submission, answers: Object.fromEntries(submission.answers) });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
