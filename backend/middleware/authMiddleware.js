const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    // Check if the authorization header exists and starts with 'Bearer'
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Extract the token from the header
            token = req.headers.authorization.split(' ')[1];

            // Verify token using the secret key
            const decoded = jwt.verify(token, process.env.JWT_PRIVATE_KEY);

            // Fetch the user from the database (excluding the password) and attach to req.user
            // We use decoded.sub because we defined { sub: user._id } in the authController.
            // roleId is populated fresh on every request (never cached in the JWT) so a
            // permission change takes effect immediately, without waiting for token refresh.
            req.user = await User.findById(decoded.sub).select('-passwordHash').populate('roleId', 'slug name permissions');
            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, account no longer exists.' });
            }
            req.user.permissions = req.user.roleId ? req.user.roleId.permissions : [];

            next(); // Move to the next middleware or controller
        } catch (error) {
            console.error('JWT Verification Error:', error.message);
            return res.status(401).json({ message: 'Not authorized, token failed or expired.' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token provided.' });
    }
};

// Passes if the caller's role carries ANY of the given permission keys. Permissions are
// read fresh off req.user (populated by protect() on every request from the DB, never
// cached in the JWT), so revoking a permission takes effect on the caller's very next request.
const checkPermission = (...keys) => {
    return (req, res, next) => {
        const userPermissions = (req.user && req.user.permissions) || [];
        if (!keys.some((key) => userPermissions.includes(key))) {
            return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
        }
        next();
    };
};

module.exports = { protect, checkPermission };