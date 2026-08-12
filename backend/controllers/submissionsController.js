const Submission = require('../models/Submission');
const FieldSchema = require('../models/FieldSchema');

// A caller with the blanket submissions.view_all permission sees every submission; anyone
// with only submissions.view_own (e.g. a Lecturer) is restricted to submissions against
// schemas they created themselves.
const scopeToOwnSubmissions = (req) => !req.user.permissions.includes('submissions.view_all') && req.user.permissions.includes('submissions.view_own');

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
        const { schemaId, userId, status, page = 1 } = req.query;
        const query = {};

        if (schemaId) query.schemaId = schemaId;
        if (userId) query.userId = userId;
        if (status) query.status = status;

        if (scopeToOwnSubmissions(req)) {
            const ownSchemaIds = await FieldSchema.find({ createdBy: req.user._id }).distinct('_id');
            // If a specific schemaId was requested but it isn't one of the caller's own, force
            // an impossible match rather than leaking whether that schema exists at all.
            query.schemaId = schemaId
                ? (ownSchemaIds.some((sid) => sid.toString() === schemaId) ? schemaId : null)
                : { $in: ownSchemaIds };
        }

        const limit = 25;
        const currentPage = Math.max(1, parseInt(page, 10) || 1);

        const [submissions, total] = await Promise.all([
            Submission.find(query)
                .sort({ submittedAt: -1, createdAt: -1 })
                .skip((currentPage - 1) * limit)
                .limit(limit)
                .populate('userId', 'fullName email'),
            Submission.countDocuments(query)
        ]);

        res.status(200).json({ submissions, total, page: currentPage, pages: Math.ceil(total / limit) || 1 });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getSubmissionDetail = async (req, res) => {
    try {
        const submission = await Submission.findById(req.params.id)
            .populate('userId', 'fullName email')
            .populate('schemaId', 'name fields createdBy');
        if (!submission) return res.status(404).json({ message: 'Submission not found' });
        if (scopeToOwnSubmissions(req) && submission.schemaId?.createdBy?.toString() !== req.user._id.toString()) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        res.status(200).json({ submission, answers: Object.fromEntries(submission.answers) });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
