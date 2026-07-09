const User = require('../models/User');

// @desc    Get current user profile
// @route   GET /api/v1/users/me
// @access  Private (Requires Token)
exports.getMe = async (req, res) => {
    try {
        // req.user is populated by our authMiddleware
        const user = await User.findById(req.user._id).select('-passwordHash');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ user });
    } catch (error) {
        console.error('Get Me Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};