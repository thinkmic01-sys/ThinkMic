const { assertCanUse } = require('../services/usageService');

// Blocks the request if the user has no package selected, or if the given dimension
// ('storage' | 'transcription' | 'searches') is already at/over 100% of their package's
// allowance. Applied to the endpoints that actually consume that dimension.
const requireCapacity = (dimension) => async (req, res, next) => {
    try {
        await assertCanUse(req.user._id, dimension);
        next();
    } catch (err) {
        if (err.code === 'NO_PACKAGE' || err.code === 'LIMIT_REACHED') {
            return res.status(403).json({ message: err.message, code: err.code, dimension: err.dimension });
        }
        console.error('usageGuard error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { requireCapacity };
