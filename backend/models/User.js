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
    // Denormalized from roleId.slug for cheap filtering/display (e.g. adminController's
    // ?role= query param) - roleId is the actual source of truth for permissions. Kept in
    // sync every time a user's role is (re)assigned. Free text (not an enum) since custom
    // roles can use any slug, not just 'admin'/'manager'/'user'.
    role: {
        type: String,
        required: true,
        default: 'user'
    },
    roleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
        index: true
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
    },
    workPhone: String,
    personalPhone: String,
    // Free-text, deliberately matching Seminar.location's convention (either a "lat, lng"
    // string from a map click, or a geocoded display name from search) rather than a
    // structured address schema - reuses the same map-picker UX already built for seminars.
    address: String,
    kyc: {
        idType: { type: String, enum: ['id_card', 'passport'] },
        // AES-256-GCM ciphertext (see backend/utils/encryption.js) - select: false so it
        // never appears in a query by accident; only the two controllers that explicitly
        // .select('+kyc.idNumberEncrypted') and decrypt it ever see the real number.
        idNumberEncrypted: { type: String, select: false },
        // Private R2 object key for the uploaded scan/photo - never a public URL directly;
        // always resolved to a short-lived presigned GET URL on read (see
        // profileDocumentsService.js), same pattern as recording playback URLs.
        idDocumentKey: String
    },
    certifications: [{
        title: { type: String, required: true },
        issuer: String,
        issueDate: Date,
        // Private R2 object key for an optional uploaded certificate file/scan
        certificateKey: String,
        description: String
    }],
    // The user's "My Learning List" - admin-curated keywords they've chosen to follow.
    // Creating a non-draft seminar whose category matches a followed keyword's text
    // notifies everyone following it (see seminarsController.createSeminar).
    learningKeywords: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Keyword'
    }],
    // Set once this user selects a package from the Admin > Packages catalog (no payment
    // gateway wired up yet, see CLAUDE.md's "Planned" list - selection is currently free).
    // PackagesPromptModal.jsx forces selection on login while this is null, and
    // usageService.js meters this user's storage/transcription/searches against whichever
    // package is referenced here.
    purchasedPackageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Package',
        default: null
    },
    // Tracks which package the 80%-usage warning notification has already been sent for,
    // so usageService.checkAndNotify never sends it twice for the same package - selecting
    // a new/upgraded package naturally re-arms the warning since this won't match anymore.
    usage80NotifiedForPackageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Package',
        default: null
    },
    // Atomically-maintained running totals of this user's package usage - the source of
    // truth usageService.reserveUsage() checks-and-increments in one indivisible MongoDB
    // operation, which is what actually closes the race two concurrent uploads/searches could
    // otherwise exploit (the same class of guarantee coinWalletService.js already relies on
    // for coin balances). Kept in sync by reserveUsage (on create) and releaseUsage (on
    // delete) - never recomputed by re-aggregating Recording/SearchResult on every check.
    usage: {
        storageBytes: { type: Number, default: 0, min: 0 },
        transcriptionSeconds: { type: Number, default: 0, min: 0 },
        searchesCount: { type: Number, default: 0, min: 0 },
        // Coin-purchased bonus allowance (usageService.purchaseTopUp) - additive on top of
        // whatever package is currently selected, and persists across package changes/
        // upgrades (buying a top-up doesn't get wiped out by switching plans).
        extraStorageBytes: { type: Number, default: 0, min: 0 },
        extraTranscriptionSeconds: { type: Number, default: 0, min: 0 },
        extraSearches: { type: Number, default: 0, min: 0 }
    },
    // Which Lecturer-role user(s) (schemas.manage_own permission) this student has been
    // assigned to by an admin (see adminController.updateLecturerStudents) - a student can
    // be assigned to multiple lecturers, which is what lets different lecturers share some
    // students while keeping distinct rosters overall. A lecturer's own schemas
    // (FieldSchema.targetRole === 'own-students') are only ever visible/fillable by students
    // who carry that lecturer's _id here (see schemasController.listPublishedForms).
    assignedLecturers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
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