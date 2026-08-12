const User = require('../models/User');
const Recording = require('../models/Recording');
const Report = require('../models/Report');
const Note = require('../models/Note');
const Project = require('../models/Project');
const Seminar = require('../models/Seminar');
const Registration = require('../models/Registration');
const CollaborationSubmission = require('../models/CollaborationSubmission');
const Submission = require('../models/Submission');
const Transaction = require('../models/Transaction');
const Referral = require('../models/Referral');
const TimelineEvent = require('../models/TimelineEvent');
const Ticket = require('../models/Ticket');
const AuditLog = require('../models/AuditLog');
const profileDocumentsService = require('../services/profileDocumentsService');

const PAGE_SIZE = 25;
const paginate = (query) => {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    return { page, skip: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE };
};

// @desc    Full profile for the admin "view full access" page. Logs the access to AuditLog -
//          this is the entry point into everything a user has ever recorded, written, or
//          said on the platform, so who looked at it and when is worth keeping a trail of.
// @route   GET /api/v1/admin/users/:id
// @access  Private/Admin
exports.getUserProfile = async (req, res) => {
    try {
        // Both exclusion and forced inclusion must be in a single .select() call - chaining
        // two separate .select() calls silently drops the '+kyc.idNumberEncrypted' inclusion.
        const user = await User.findById(req.params.id)
            .select('-passwordHash +kyc.idNumberEncrypted')
            .populate('referredBy', 'fullName email');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await AuditLog.create({
            actorId: req.user._id,
            actorRole: req.user.role,
            action: 'admin_viewed_user_profile',
            targetId: user._id,
            targetType: 'User',
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        // Admin sees the full, unmasked ID number (per product decision) plus presigned
        // document/certificate URLs - same shaping used for the user's own profile so the
        // two views never drift out of sync.
        const plain = user.toObject();
        const [kyc, certifications] = await Promise.all([
            profileDocumentsService.shapeKyc(user),
            profileDocumentsService.shapeCertifications(user.certifications)
        ]);

        res.status(200).json({ user: { ...plain, kyc, certifications } });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @route   GET /api/v1/admin/users/:id/research
exports.getUserResearch = async (req, res) => {
    try {
        const { page, skip, limit } = paginate(req.query);
        const filter = { userId: req.params.id };
        const [recordings, total] = await Promise.all([
            Recording.find(filter)
                .sort({ createdAt: -1 }).skip(skip).limit(limit)
                .populate('transcriptId', 'text editedText segments')
                .populate('summaryId', 'summaryText editedSummaryText tags'),
            Recording.countDocuments(filter)
        ]);
        res.status(200).json({ recordings, total, page });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @route   GET /api/v1/admin/users/:id/reports
exports.getUserReports = async (req, res) => {
    try {
        const { page, skip, limit } = paginate(req.query);
        const filter = { userId: req.params.id };
        const [reports, total] = await Promise.all([
            Report.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Report.countDocuments(filter)
        ]);
        res.status(200).json({ reports, total, page });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @route   GET /api/v1/admin/users/:id/notes
exports.getUserNotes = async (req, res) => {
    try {
        const filter = { userId: req.params.id };
        const [notes, projects] = await Promise.all([
            Note.find(filter).sort({ createdAt: -1 }).limit(100),
            Project.find(filter).sort({ createdAt: -1 })
        ]);
        res.status(200).json({ notes, projects });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @route   GET /api/v1/admin/users/:id/seminars
exports.getUserSeminars = async (req, res) => {
    try {
        const [hosted, registrations] = await Promise.all([
            Seminar.find({ hostId: req.params.id }).sort({ createdAt: -1 }),
            Registration.find({ userId: req.params.id })
                .sort({ createdAt: -1 })
                .populate('seminarId', 'title date location hostName')
        ]);
        res.status(200).json({ hosted, registrations });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @route   GET /api/v1/admin/users/:id/collaboration
exports.getUserCollaboration = async (req, res) => {
    try {
        const filter = { userId: req.params.id };
        const [collaborationSubmissions, submissions] = await Promise.all([
            CollaborationSubmission.find(filter).sort({ createdAt: -1 }),
            Submission.find(filter).sort({ createdAt: -1 }).populate('schemaId', 'title')
        ]);
        res.status(200).json({ collaborationSubmissions, submissions });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @route   GET /api/v1/admin/users/:id/coins
exports.getUserCoins = async (req, res) => {
    try {
        const { page, skip, limit } = paginate(req.query);
        const [transactions, total, referralsGiven, referralsReceived] = await Promise.all([
            Transaction.find({ userId: req.params.id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Transaction.countDocuments({ userId: req.params.id }),
            // Referrals this user earned coins from (people they referred)
            Referral.find({ beneficiaryId: req.params.id }).sort({ createdAt: -1 }),
            // The referral that brought this user in, if any
            Referral.find({ referredUserId: req.params.id }).sort({ createdAt: -1 }).populate('beneficiaryId', 'fullName email')
        ]);
        res.status(200).json({ transactions, total, page, referralsGiven, referralsReceived });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @route   GET /api/v1/admin/users/:id/timeline
exports.getUserTimeline = async (req, res) => {
    try {
        const events = await TimelineEvent.find({ userId: req.params.id }).sort({ createdAt: -1 }).limit(100);
        res.status(200).json({ events });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @route   GET /api/v1/admin/users/:id/tickets
exports.getUserTickets = async (req, res) => {
    try {
        const tickets = await Ticket.find({ user: req.params.id }).sort({ createdAt: -1 });
        res.status(200).json({ tickets });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
