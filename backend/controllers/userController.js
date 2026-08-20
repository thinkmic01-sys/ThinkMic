const User = require('../models/User');
const Package = require('../models/Package');
const { encrypt } = require('../utils/encryption');
const profileDocumentsService = require('../services/profileDocumentsService');
const usageService = require('../services/usageService');

// Builds the response-safe user object: decrypts kyc.idNumber and resolves private R2 keys
// (ID document, certification files) into short-lived presigned URLs. `user` must have been
// fetched with .select('+kyc.idNumberEncrypted') for idNumber to come through.
const shapeUserResponse = async (user) => {
    const plain = user.toObject();
    const [kyc, certifications] = await Promise.all([
        profileDocumentsService.shapeKyc(user),
        profileDocumentsService.shapeCertifications(user.certifications)
    ]);
    return { ...plain, kyc, certifications };
};

// @desc    Get current user profile
// @route   GET /api/v1/users/me
// @access  Private (Requires Token)
exports.getMe = async (req, res) => {
    try {
        // req.user is populated by our authMiddleware
        // Chaining two .select() calls here silently drops the '+kyc.idNumberEncrypted'
        // inclusion (a chained exclusion select followed by an inclusion select does not
        // merge the way separate .select(' -x +y') tokens in one call do) - verified live,
        // so the exclusion and forced inclusion must be passed in a single .select() call.
        const user = await User.findById(req.user._id)
            .select('-passwordHash +kyc.idNumberEncrypted')
            .populate('roleId', 'name slug permissions')
            .populate('learningKeywords', 'text');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ user: await shapeUserResponse(user) });
    } catch (error) {
        console.error('Get Me Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update current user's own profile
// @route   PATCH /api/v1/users/me
// @access  Private (Requires Token)
exports.updateMe = async (req, res) => {
    try {
        // Explicit allowlist - never let a user change their own role/status/email/coins via this route
        const {
            fullName, title, language, avatarUrl, notificationPrefs,
            workPhone, personalPhone, address,
            kycIdType, kycIdNumber, kycIdDocumentKey, certifications, learningKeywords
        } = req.body;
        const update = {};
        if (fullName !== undefined) update.fullName = fullName;
        if (title !== undefined) update.title = title;
        // Stored as preferredLanguage - "language" is MongoDB's reserved text-index language_override field name
        if (language !== undefined) update.preferredLanguage = language;
        if (avatarUrl !== undefined) update.avatarUrl = avatarUrl;
        if (notificationPrefs !== undefined) update.notificationPrefs = notificationPrefs;
        if (workPhone !== undefined) update.workPhone = workPhone;
        if (personalPhone !== undefined) update.personalPhone = personalPhone;
        if (address !== undefined) update.address = address;
        if (kycIdType !== undefined) update['kyc.idType'] = kycIdType;
        // Only re-encrypt and overwrite when a new number was actually submitted - an empty
        // string means "leave the stored number as-is" (the client never sees the decrypted
        // value change, so it can't round-trip an already-masked/empty field back in).
        if (kycIdNumber) update['kyc.idNumberEncrypted'] = encrypt(kycIdNumber);

        // A presigned PUT (getDocumentUploadUrl) has no server-enforced size cap the way a
        // multer route does, so any genuinely new kycIdDocumentKey/certificateKey needs its
        // real uploaded size verified here before being trusted - one lookup covers both,
        // only fetched when either field is actually present in this request.
        if (kycIdDocumentKey !== undefined || certifications !== undefined) {
            const current = await User.findById(req.user._id).select('kyc.idDocumentKey certifications');
            const keysToVerify = [];
            if (kycIdDocumentKey && kycIdDocumentKey !== current?.kyc?.idDocumentKey) {
                keysToVerify.push(kycIdDocumentKey);
            }
            if (certifications !== undefined) {
                const existingKeys = new Set((current?.certifications || []).map((c) => c.certificateKey).filter(Boolean));
                keysToVerify.push(...certifications.map((c) => c.certificateKey).filter((k) => k && !existingKeys.has(k)));
            }
            try {
                for (const key of keysToVerify) {
                    await profileDocumentsService.verifyUploadedDocumentSize(key);
                }
            } catch (sizeError) {
                return res.status(400).json({ message: sizeError.message });
            }
        }
        // Set after a successful presigned upload - the key of the scan/photo just placed in R2.
        if (kycIdDocumentKey !== undefined) update['kyc.idDocumentKey'] = kycIdDocumentKey;
        // Full-array replace, same convention as notificationPrefs - the frontend already
        // has the complete list (including certificateKey from a prior document upload) and
        // sends it back whole rather than patching individual entries.
        if (certifications !== undefined) update.certifications = certifications;
        // Full-array replace of keyword ids - My Learning List sends its complete current
        // selection back whole (add/remove both just resend the new full list), same
        // convention as certifications/notificationPrefs above.
        if (learningKeywords !== undefined) update.learningKeywords = learningKeywords;

        const user = await User.findByIdAndUpdate(req.user._id, update, { new: true, runValidators: true })
            .select('-passwordHash +kyc.idNumberEncrypted')
            .populate('roleId', 'name slug permissions')
            .populate('learningKeywords', 'text');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ user: await shapeUserResponse(user) });
    } catch (error) {
        console.error('Update Me Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Presigned upload URL for a KYC document or certification file (private R2
//          storage) - the browser PUTs directly to R2, then a follow-up PATCH /users/me
//          persists the returned key into kyc.idDocumentKey or a certifications[] entry.
// @route   GET /api/v1/users/me/documents/upload-url
// @access  Private (Requires Token)
exports.getDocumentUploadUrl = async (req, res) => {
    try {
        const { mimeType, purpose } = req.query;
        if (!mimeType) {
            return res.status(400).json({ message: 'mimeType is required' });
        }
        const result = await profileDocumentsService.getProfileDocumentUploadUrl(req.user._id, mimeType, purpose);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Self-service roster for a Lecturer-style user (schemas.manage_own) - same
//          add/remove-a-student mechanics as the admin-only adminController equivalents,
//          but always scoped to the caller's own _id so a lecturer can only ever touch
//          their own roster, never another lecturer's.
// @route   GET /api/v1/users/me/students
// @access  Private (schemas.manage_own or schemas.manage)
exports.getMyStudents = async (req, res) => {
    try {
        const students = await User.find({ assignedLecturers: req.user._id })
            .select('fullName email')
            .sort({ fullName: 1 });
        res.status(200).json({ students });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @route   PATCH /api/v1/users/me/students
// @access  Private (schemas.manage_own or schemas.manage)
exports.updateMyStudents = async (req, res) => {
    try {
        const { studentIds } = req.body;
        if (!Array.isArray(studentIds)) {
            return res.status(400).json({ message: 'studentIds must be an array.' });
        }

        await User.updateMany(
            { assignedLecturers: req.user._id, _id: { $nin: studentIds } },
            { $pull: { assignedLecturers: req.user._id } }
        );
        await User.updateMany(
            { _id: { $in: studentIds } },
            { $addToSet: { assignedLecturers: req.user._id } }
        );

        const students = await User.find({ assignedLecturers: req.user._id })
            .select('fullName email')
            .sort({ fullName: 1 });
        res.status(200).json({ students });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Minimal user search backing the "Add a Student" picker above - deliberately
//          narrower than the admin users.view search (adminController.listUsers): only
//          matches plain role:'user' accounts (never other lecturers/admins/managers) and
//          returns just name+email, so a Lecturer without users.view can find students to
//          add without being handed the full user-directory search capability.
// @route   GET /api/v1/users/search-students?search=...
// @access  Private (schemas.manage_own or schemas.manage)
exports.searchStudents = async (req, res) => {
    try {
        const { search } = req.query;
        if (!search || search.trim().length < 2) {
            return res.status(200).json({ users: [] });
        }
        const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const users = await User.find({
            role: 'user',
            $or: [
                { fullName: new RegExp(escaped, 'i') },
                { email: new RegExp(escaped, 'i') }
            ]
        }).select('fullName email').limit(10);
        res.status(200).json({ users });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Current user's usage against their selected package (storage/transcription
//          minutes/searches, percentages, and which dimensions if any are full) - drives the
//          Dashboard's storage widget and the upgrade-prompt trigger. When any dimension is
//          full, also returns the active packages that exceed the user's current one so the
//          frontend can offer them as upgrade options.
// @route   GET /api/v1/users/me/usage
// @access  Private
exports.getMyUsage = async (req, res) => {
    try {
        const status = await usageService.getUsageStatus(req.user._id);

        let upgradeOptions = [];
        if (status.hasPackage && status.maxPct >= 100) {
            const pkg = status.package;
            upgradeOptions = await Package.find({
                isActive: true,
                _id: { $ne: pkg._id },
                $or: [
                    { storageGB: { $gt: pkg.storageGB } },
                    { transcriptionMinutes: { $gt: pkg.transcriptionMinutes } },
                    { searches: { $gt: pkg.searches } }
                ]
            }).sort({ priceUSD: 1 });
        }

        res.status(200).json({ ...status, upgradeOptions });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
