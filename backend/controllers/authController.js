const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Helper to generate access token
const generateAccessToken = (id, role) => {
    return jwt.sign({ sub: id, role }, process.env.JWT_PRIVATE_KEY, { expiresIn: '15m' }); // 15-min expiry[cite: 1]
};

// @desc    Register new user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res) => {
    try {
        const { email, password, fullName } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: 'User already exists' });

        const user = await User.create({
            email,
            passwordHash: password,
            fullName
        });

        res.status(201).json({ userId: user._id, message: 'User registered successfully. Please verify your email.' }); // 201 per spec[cite: 1]
    } catch (error) {
        console.error("REGISTER ERROR: ", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Login user & get tokens
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate Tokens[cite: 1]
        const accessToken = generateAccessToken(user._id, user.role);
        const refreshToken = jwt.sign({ sub: user._id }, process.env.JWT_PRIVATE_KEY, { expiresIn: '7d' }); // 7-day TTL[cite: 1]

        // Set refresh token in HttpOnly cookie[cite: 1]
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Update last login
        user.lastLoginAt = Date.now();
        await user.save();

        res.status(200).json({
            accessToken,
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                role: user.role
            }
        });
    } catch (error) {
        console.error("REGISTER ERROR: ", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Refresh access token & get user
// @route   POST /api/v1/auth/refresh
// @access  Public (Requires HttpOnly Cookie)
exports.refresh = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({ message: 'Not authorized, no refresh token' });
        }

        // Verify the refresh token[cite: 1]
        const decoded = jwt.verify(refreshToken, process.env.JWT_PRIVATE_KEY);

        // Find the user[cite: 1]
        const user = await User.findById(decoded.sub).select('-passwordHash');
        if (!user) {
            return res.status(401).json({ message: 'User no longer exists' });
        }

        // Generate a fresh short-lived access token[cite: 1]
        const newAccessToken = jwt.sign(
            { sub: user._id, role: user.role },
            process.env.JWT_PRIVATE_KEY,
            { expiresIn: '15m' }
        );

        res.status(200).json({
            accessToken: newAccessToken,
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Refresh Error:', error.message);
        res.status(401).json({ message: 'Invalid or expired refresh token' });
    }
};