const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
    register,
    login,
    refresh,
    logout,
    changePassword,
    verifyEmail,
    resendVerification,
    googleAuth,
    forgotPassword,
    resetPassword
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Generic limiter for auth endpoints that are prime brute-force/spam targets
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests. Please try again later.' }
});

// Tighter limiter for OTP resend / password reset requests specifically
const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests. Please try again later.' }
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.patch('/change-password', protect, changePassword);

router.post('/verify-email', authLimiter, verifyEmail);
router.post('/resend-verification', otpLimiter, resendVerification);
router.post('/google', authLimiter, googleAuth);
router.post('/forgot-password', otpLimiter, forgotPassword);
router.post('/reset-password', otpLimiter, resetPassword);

module.exports = router;
