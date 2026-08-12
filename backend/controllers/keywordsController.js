const Keyword = require('../models/Keyword');

// @desc    List every keyword - used by My Learning List (browse/follow) and the seminar
//          creation category dropdown. Any authenticated user can read this list.
// @route   GET /api/v1/keywords
// @access  Private
exports.listKeywords = async (req, res) => {
    try {
        const keywords = await Keyword.find().sort({ text: 1 });
        res.status(200).json({ keywords });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create a new keyword
// @route   POST /api/v1/admin/keywords
// @access  Private (keywords.manage)
exports.createKeyword = async (req, res) => {
    try {
        const text = (req.body.text || '').trim();
        if (!text) {
            return res.status(400).json({ message: 'Keyword text is required.' });
        }

        const existing = await Keyword.findOne({ text: { $regex: `^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });
        if (existing) {
            return res.status(409).json({ message: 'This keyword already exists.' });
        }

        const keyword = await Keyword.create({ text, createdBy: req.user._id });
        res.status(201).json({ keyword });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete a keyword - also pulls it out of every user's learning list so no one
//          is left following a keyword that no longer exists.
// @route   DELETE /api/v1/admin/keywords/:id
// @access  Private (keywords.manage)
exports.deleteKeyword = async (req, res) => {
    try {
        const keyword = await Keyword.findByIdAndDelete(req.params.id);
        if (!keyword) {
            return res.status(404).json({ message: 'Keyword not found' });
        }

        const User = require('../models/User');
        await User.updateMany({ learningKeywords: keyword._id }, { $pull: { learningKeywords: keyword._id } });

        res.status(200).json({ message: 'Keyword deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
