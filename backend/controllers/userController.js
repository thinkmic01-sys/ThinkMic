const User = require('../models/User');

// @desc    Get current user profile
// @route   GET /api/v1/users/me
// @access  Private (Requires Token)
exports.getMe = async (req, res) => {
    try {
        // req.user is populated by our authMiddleware
        const user = await User.findById(req.user._id).select('-passwordHash').populate('roleId', 'name slug permissions');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ user });
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
        const { fullName, title, language, avatarUrl, notificationPrefs } = req.body;
        const update = {};
        if (fullName !== undefined) update.fullName = fullName;
        if (title !== undefined) update.title = title;
        // Stored as preferredLanguage - "language" is MongoDB's reserved text-index language_override field name
        if (language !== undefined) update.preferredLanguage = language;
        if (avatarUrl !== undefined) update.avatarUrl = avatarUrl;
        if (notificationPrefs !== undefined) update.notificationPrefs = notificationPrefs;

        const user = await User.findByIdAndUpdate(req.user._id, update, { new: true, runValidators: true })
            .select('-passwordHash')
            .populate('roleId', 'name slug permissions');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ user });
    } catch (error) {
        console.error('Update Me Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};