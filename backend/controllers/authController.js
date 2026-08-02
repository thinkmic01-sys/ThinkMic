const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const referralService = require('../services/referralService');

// Helper to generate access token
const generateAccessToken = (id, role) => {
    return jwt.sign({ sub: id, role }, process.env.JWT_PRIVATE_KEY, { expiresIn: '7d' }); // 7-day expiry
};

// @desc    Register new user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res) => {
    try {
        const { email, password, fullName, referralCode } = req.body;

        const newReferralCode = crypto.randomBytes(4).toString('hex');

        let user = await User.findOne({ email });

        if (user) {
            if (user.status === 'invited') {
                // Update the invited user record
                user.passwordHash = password;
                user.fullName = fullName;
                user.referralCode = newReferralCode;
                user.status = 'active'; // Or 'pending_verification'
                await user.save();
            } else {
                return res.status(400).json({ message: 'User already exists' });
            }
        } else {
            // Create brand new user
            user = await User.create({
                email,
                passwordHash: password,
                fullName,
                referralCode: newReferralCode
            });
        }

        if (referralCode) {
            await referralService.attachReferrer(user, referralCode);
            await referralService.createPendingRewardsForNewUser(user);
        }

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

        // Generate referral code for legacy users if they don't have one
        if (!user.referralCode) {
            user.referralCode = crypto.randomBytes(4).toString('hex');
        }

        // Update last login
        user.lastLoginAt = Date.now();
        await user.save();

        res.status(200).json({
            accessToken,
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                coins: user.coins,
                referralCode: user.referralCode,
                avatarUrl: user.avatarUrl,
                title: user.title
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

        // Generate referral code for legacy users if they don't have one
        if (!user.referralCode) {
            user.referralCode = crypto.randomBytes(4).toString('hex');
            await user.save();
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
                role: user.role,
                coins: user.coins,
                referralCode: user.referralCode,
                avatarUrl: user.avatarUrl,
                title: user.title
            }
        });
    } catch (error) {
        console.error('Refresh Error:', error.message);
        res.status(401).json({ message: 'Invalid or expired refresh token' });
    }
};

// @desc    Change current user's password
// @route   PATCH /api/v1/auth/change-password
// @access  Private (Requires Token)
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current and new password are required' });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'New password must be at least 8 characters long' });
        }

        const user = await User.findById(req.user._id);
        if (!user || !(await user.matchPassword(currentPassword))) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        user.passwordHash = newPassword; // re-hashed by the pre('save') hook
        await user.save();

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Change Password Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Logout user & clear cookie
// @route   POST /api/v1/auth/logout
// @access  Public
exports.logout = (req, res) => {
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict'
    });
    res.status(200).json({ message: 'Logged out successfully' });
};