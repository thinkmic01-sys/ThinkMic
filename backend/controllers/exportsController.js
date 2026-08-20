const Submission = require('../models/Submission');
const FieldSchema = require('../models/FieldSchema');
const Transcript = require('../models/Transcript');

// Mirrors the same view_all/view_own split submissionsController.js already enforces, so a
// Lecturer can only export results for schemas they created themselves.
const scopeToOwnSubmissions = (req) => !req.user.permissions.includes('submissions.view_all') && req.user.permissions.includes('submissions.view_own');

const escapeCsvCell = (value) => {
    const str = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

// @desc    Export a schema's submissions as CSV - synchronous (no BullMQ job) since submission
//          volumes are bounded form responses, not audio/report-scale workloads.
// @route   GET /api/v1/exports/submissions/:schemaId
exports.exportSubmissionsCsv = async (req, res) => {
    try {
        const { schemaId } = req.params;
        const { status } = req.query;

        const schema = await FieldSchema.findById(schemaId);
        if (!schema) {
            return res.status(404).json({ message: 'Schema not found.' });
        }
        if (scopeToOwnSubmissions(req) && schema.createdBy.toString() !== req.user._id.toString()) {
            return res.status(404).json({ message: 'Schema not found.' });
        }

        const query = { schemaId };
        if (status) query.status = status;

        const submissions = await Submission.find(query)
            .sort({ submittedAt: -1, createdAt: -1 })
            .populate('userId', 'fullName email');

        // A voice answer's own value already holds transcribed text from the client
        // (Collaboration.jsx submits it that way) - transcriptId is only a fallback for
        // answers that were persisted without one.
        const voiceTranscriptIds = [];
        submissions.forEach((sub) => {
            sub.answers.forEach((answer) => {
                if (answer.type === 'voice' && !answer.value && answer.transcriptId) voiceTranscriptIds.push(answer.transcriptId);
            });
        });
        const transcriptTextById = voiceTranscriptIds.length
            ? Object.fromEntries(
                (await Transcript.find({ _id: { $in: voiceTranscriptIds } }).select('text editedText'))
                    .map((t) => [t._id.toString(), t.editedText || t.text || ''])
            )
            : {};

        const headers = ['Submitted By', 'Email', 'Status', 'Submitted At', ...schema.fields.map((f) => f.label)];
        const rows = submissions.map((sub) => {
            const base = [
                sub.userId?.fullName || '',
                sub.userId?.email || '',
                sub.status,
                sub.submittedAt ? sub.submittedAt.toISOString() : ''
            ];
            const fieldValues = schema.fields.map((field) => {
                const answer = sub.answers.get(field.id);
                if (!answer) return '';
                if (answer.value) return answer.value;
                if (answer.type === 'voice' && answer.transcriptId) return transcriptTextById[answer.transcriptId.toString()] || '';
                return '';
            });
            return [...base, ...fieldValues];
        });

        const csv = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
        const filenameSafe = schema.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();

        res.status(200)
            .set({
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="${filenameSafe}-submissions.csv"`
            })
            .send(csv);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
