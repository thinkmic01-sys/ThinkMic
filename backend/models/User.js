const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    passwordHash: {
        type: String,
        // Not required for pure Google OAuth accounts (no googleId => password is mandatory)
        required: function () {
            return !this.googleId;
        }
    },
    googleId: {
        type: String,
        sparse: true,
        unique: true
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationCode: {
        type: String,
        select: false
    },
    emailVerificationExpires: {
        type: Date,
        select: false
    },
    passwordResetCode: {
        type: String,
        select: false
    },
    passwordResetExpires: {
        type: Date,
        select: false
    },
    fullName: {
        type: String,
        required: true,
        text: true // Text index for search
    },
    role: {
        type: String,
        enum: ['admin', 'manager', 'user'],
        required: true,
        default: 'user'
    },
    status: {
        type: String,
        enum: ['active', 'invited', 'pending_verification', 'inactive'],
        required: true,
        default: 'pending_verification'
    },
    avatarUrl: String,
    title: String,
    // Named to avoid colliding with MongoDB's text-index language_override field (default name "language")
    preferredLanguage: String,
    lastLoginAt: Date,
    inviteToken: { type: String, sparse: true },
    inviteExpiresAt: Date,
    notificationPrefs: Object,
    coins: {
        type: Number,
        default: 0
    },
    lifetimeCoins: {
        type: Number,
        default: 0
    },
    referralCode: {
        type: String,
        unique: true,
        sparse: true
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },
    heldCoins: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true,
    strict: true
});

// Hash password before saving (Cost 12 per security spec)[cite: 1]
UserSchema.pre('save', async function () {
    // If the password hasn't been modified, or there's no password to hash
    // (pure Google OAuth accounts), just exit the function
    if (!this.isModified('passwordHash') || !this.passwordHash) return;

    // Otherwise, hash the password
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
    if (!this.passwordHash) return false; // Google-only account, no password set
    return await bcrypt.compare(enteredPassword, this.passwordHash);
};

module.exports = mongoose.model('User', UserSchema);