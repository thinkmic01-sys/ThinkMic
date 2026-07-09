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
        required: true
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
    lastLoginAt: Date,
    inviteToken: { type: String, sparse: true },
    inviteExpiresAt: Date,
    notificationPrefs: Object
}, {
    timestamps: true,
    strict: true
});

// Hash password before saving (Cost 12 per security spec)[cite: 1]
UserSchema.pre('save', async function () {
    // If the password hasn't been modified, just exit the function
    if (!this.isModified('passwordHash')) return;

    // Otherwise, hash the password
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.passwordHash);
};

module.exports = mongoose.model('User', UserSchema);