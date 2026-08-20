const User = require('../models/User');
const Role = require('../models/Role');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const referralService = require('../services/referralService');
const emailService = require('../services/emailService');
const googleAuthService = require('../services/googleAuthService');

// Helper to generate access token - short-lived by design (the dual-token model's whole
// point is that only the HttpOnly refreshToken cookie lives for 7 days; this one must match
// what exports.refresh already mints, or every session carries a week-long exposure window
// if this token ever leaks).
const generateAccessToken = (id, role) => {
    return jwt.sign({ sub: id, role }, process.env.JWT_PRIVATE_KEY, { expiresIn: '15m' });
};

// Every new signup lands on the "User" system role. It used to be permanently protected
// (isSystem roles couldn't be edited/deleted), so its _id was cached for the process
// lifetime as a safe assumption - now that only the Admin role is actually protected
// (roleController.js), an admin can delete the User role from the Roles page, which would
// silently orphan every new registration's roleId. No caching, and self-healing: if the
// role is missing, recreate it with the same defaults seedRoles.js uses rather than let
// registration hand out a dangling/null roleId.
const getDefaultUserRoleId = async () => {
    let role = await Role.findOne({ slug: 'user' }).select('_id');
    if (!role) {
        role = await Role.create({
            name: 'User',
            slug: 'user',
            description: 'Standard platform access, no admin permissions.',
            permissions: [],
            isSystem: true
        });
    }
    return role._id;
};

const VERIFICATION_CODE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESEND_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESET_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const generateOTP = () => crypto.randomInt(0, 1000000).toString().padStart(6, '0');

// Temporary: no verified sending domain yet (Resend can't deliver to real users
// without one), so skip the OTP gate and auto-verify on registration. Flip this
// off once a domain is verified in Resend to restore normal email verification.
const SKIP_EMAIL_VERIFICATION = process.env.SKIP_EMAIL_VERIFICATION === 'true';

// Shared response shape for anything that logs a user in (login, verify-email
// auto-login, google auth): sets the HttpOnly refresh cookie and returns the
// access token + public user fields.
const issueAuthSession = async (res, user) => {
    // roleId is never populated by the callers above this point - populate() only fetches
    // if the field still holds a raw ObjectId, so this is a no-op if it somehow already is.
    await user.populate({ path: 'roleId', select: 'name slug permissions' });

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = jwt.sign({ sub: user._id }, process.env.JWT_PRIVATE_KEY, { expiresIn: '7d' });

    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        // Frontend and backend are on different registrable domains in production
        // (e.g. vercel.app vs railway.app) - a genuinely cross-site relationship, and
        // SameSite=Strict blocks the browser from ever attaching the cookie to those
        // requests at all. None (paired with Secure, already true in production) is
        // required for cross-site; Strict is kept for local dev where frontend/backend
        // ports on localhost count as same-site anyway.
        sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return {
        accessToken,
        user: {
            id: user._id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            roleName: user.roleId ? user.roleId.name : undefined,
            permissions: user.roleId ? user.roleId.permissions : [],
            coins: user.coins,
            referralCode: user.referralCode,
            avatarUrl: user.avatarUrl,
            title: user.title,
            purchasedPackageId: user.purchasedPackageId
        }
    };
};

// @desc    Register new user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res) => {
    try {
        const { email, password, fullName, referralCode } = req.body;

        // Matches the same 8-character minimum resetPassword/changePassword already enforce -
        // registration was the one path that let this through unchecked.
        if (!password || password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long' });
        }

        const newReferralCode = crypto.randomBytes(4).toString('hex');
        const verificationCode = generateOTP();
        const verificationExpires = new Date(Date.now() + VERIFICATION_CODE_TTL_MS);

        let user = await User.findOne({ email });

        if (user) {
            if (user.status === 'invited') {
                // Update the invited user record
                user.passwordHash = password;
                user.fullName = fullName;
                user.referralCode = newReferralCode;
                user.status = 'pending_verification';
                user.isEmailVerified = false;
                user.emailVerificationCode = verificationCode;
                user.emailVerificationExpires = verificationExpires;
                await user.save();
            } else if (!user.isEmailVerified && user.status === 'pending_verification') {
                // User already started registration but hasn't verified yet:
                // Refresh their credentials, generate a fresh OTP code, and re-send the email
                user.passwordHash = password;
                if (fullName) user.fullName = fullName;
                user.emailVerificationCode = verificationCode;
                user.emailVerificationExpires = verificationExpires;
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
                referralCode: newReferralCode,
                status: 'pending_verification',
                isEmailVerified: false,
                emailVerificationCode: verificationCode,
                emailVerificationExpires: verificationExpires,
                roleId: await getDefaultUserRoleId()
            });
        }

        if (referralCode) {
            await referralService.attachReferrer(user, referralCode);
            await referralService.createPendingRewardsForNewUser(user);
        }

        if (SKIP_EMAIL_VERIFICATION) {
            user.isEmailVerified = true;
            user.status = 'active';
            user.emailVerificationCode = undefined;
            user.emailVerificationExpires = undefined;
            await user.save();
            return res.status(201).json(await issueAuthSession(res, user));
        }

        try {
            await emailService.sendVerificationEmail(user, verificationCode);
        } catch (emailError) {
            console.error('REGISTER: verification email failed to send:', emailError.message);
            // The account/OTP are already persisted - don't claim success when the user
            // has no way to receive the code, and don't leak raw SMTP internals either.
            return res.status(502).json({
                message: 'Your account was created, but we could not send the verification email right now. Please try "Resend code" in a moment.',
                userId: user._id,
                email: user.email,
                requiresVerification: true,
                emailDelivered: false
            });
        }

        res.status(201).json({
            userId: user._id,
            email: user.email,
            requiresVerification: true,
            message: 'Verification code sent to your email.'
        });
    } catch (error) {
        console.error("REGISTER ERROR: ", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Verify a registered account's email via OTP and auto-login
// @route   POST /api/v1/auth/verify-email
// @access  Public
exports.verifyEmail = async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) {
            return res.status(400).json({ message: 'Email and verification code are required' });
        }

        const user = await User.findOne({ email }).select('+emailVerificationCode +emailVerificationExpires');
        if (!user || !user.emailVerificationCode) {
            return res.status(400).json({ message: 'Invalid or expired verification code' });
        }

        if (user.emailVerificationExpires < new Date()) {
            return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
        }

        if (user.emailVerificationCode !== code) {
            return res.status(400).json({ message: 'Invalid verification code' });
        }

        user.isEmailVerified = true;
        user.status = 'active';
        user.emailVerificationCode = undefined;
        user.emailVerificationExpires = undefined;
        user.lastLoginAt = Date.now();
        await user.save();

        res.status(200).json(await issueAuthSession(res, user));
    } catch (error) {
        console.error('Verify Email Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Resend the email verification OTP
// @route   POST /api/v1/auth/resend-verification
// @access  Public
exports.resendVerification = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await User.findOne({ email });

        // Generic response either way, to avoid leaking whether an email is registered
        if (!user || user.isEmailVerified) {
            return res.status(200).json({ message: 'If an account exists and needs verification, a new code has been sent.' });
        }

        const verificationCode = generateOTP();
        user.emailVerificationCode = verificationCode;
        user.emailVerificationExpires = new Date(Date.now() + RESEND_CODE_TTL_MS);
        await user.save();

        try {
            await emailService.sendVerificationEmail(user, verificationCode);
        } catch (emailError) {
            console.error('RESEND VERIFICATION: email failed to send:', emailError.message);
            // The refreshed OTP is already persisted - be explicit that delivery failed
            // rather than returning the generic "a new code has been sent" success message.
            return res.status(502).json({
                message: 'We generated a new code, but could not send the email right now. Please try again in a moment.',
                emailDelivered: false
            });
        }

        res.status(200).json({ message: 'If an account exists and needs verification, a new code has been sent.' });
    } catch (error) {
        console.error('Resend Verification Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Sign in / sign up via Google Identity Services ID token
// @route   POST /api/v1/auth/google
// @access  Public
exports.googleAuth = async (req, res) => {
    try {
        const { credential, referralCode } = req.body;
        if (!credential) {
            return res.status(400).json({ message: 'Google credential is required' });
        }

        let profile;
        try {
            profile = await googleAuthService.verifyGoogleToken(credential);
        } catch (err) {
            return res.status(401).json({ message: 'Invalid Google credential' });
        }

        let user = await User.findOne({ $or: [{ googleId: profile.googleId }, { email: profile.email }] });
        let isNewUser = false;

        if (user) {
            if (!user.googleId) user.googleId = profile.googleId;
            if (!user.avatarUrl) user.avatarUrl = profile.avatarUrl;
            user.isEmailVerified = true;
            if (user.status === 'pending_verification') user.status = 'active';
            user.lastLoginAt = Date.now();
            await user.save();
        } else {
            isNewUser = true;
            user = await User.create({
                email: profile.email,
                fullName: profile.fullName,
                avatarUrl: profile.avatarUrl,
                googleId: profile.googleId,
                isEmailVerified: true,
                status: 'active',
                referralCode: crypto.randomBytes(4).toString('hex'),
                roleId: await getDefaultUserRoleId()
            });
        }

        if (isNewUser && referralCode) {
            await referralService.attachReferrer(user, referralCode);
            await referralService.createPendingRewardsForNewUser(user);
        }

        res.status(200).json(await issueAuthSession(res, user));
    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Request a password reset code
// @route   POST /api/v1/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await User.findOne({ email });
        const genericMessage = 'If an account with that email exists, a password reset code has been sent.';

        // Google-only accounts have no password to reset
        if (!user || !user.passwordHash) {
            return res.status(200).json({ message: genericMessage });
        }

        const resetCode = generateOTP();
        user.passwordResetCode = resetCode;
        user.passwordResetExpires = new Date(Date.now() + RESET_CODE_TTL_MS);
        await user.save();

        await emailService.sendPasswordResetEmail(user, resetCode);

        res.status(200).json({ message: genericMessage });
    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Reset password using a valid reset code
// @route   POST /api/v1/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;
        if (!email || !code || !newPassword) {
            return res.status(400).json({ message: 'Email, code, and new password are required' });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'New password must be at least 8 characters long' });
        }

        const user = await User.findOne({ email }).select('+passwordResetCode +passwordResetExpires');
        if (!user || !user.passwordResetCode) {
            return res.status(400).json({ message: 'Invalid or expired reset code' });
        }

        if (user.passwordResetExpires < new Date()) {
            return res.status(400).json({ message: 'Reset code has expired. Please request a new one.' });
        }

        if (user.passwordResetCode !== code) {
            return res.status(400).json({ message: 'Invalid reset code' });
        }

        user.passwordHash = newPassword; // re-hashed by the pre('save') hook
        user.passwordResetCode = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        res.status(200).json({ message: 'Password reset successfully. Please sign in with your new password.' });
    } catch (error) {
        console.error('Reset Password Error:', error);
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

        if (!user.isEmailVerified && !user.googleId) {
            return res.status(403).json({
                requiresVerification: true,
                email: user.email,
                message: 'Please verify your email before logging in.'
            });
        }

        // Generate referral code for legacy users if they don't have one
        if (!user.referralCode) {
            user.referralCode = crypto.randomBytes(4).toString('hex');
        }

        // Update last login
        user.lastLoginAt = Date.now();
        await user.save();

        res.status(200).json(await issueAuthSession(res, user));
    } catch (error) {
        console.error("LOGIN ERROR: ", error);
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
        const user = await User.findById(decoded.sub).select('-passwordHash').populate('roleId', 'name slug permissions');
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
                roleName: user.roleId ? user.roleId.name : undefined,
                permissions: user.roleId ? user.roleId.permissions : [],
                coins: user.coins,
                referralCode: user.referralCode,
                avatarUrl: user.avatarUrl,
                title: user.title,
                purchasedPackageId: user.purchasedPackageId
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
        sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Strict'
    });
    res.status(200).json({ message: 'Logged out successfully' });
};