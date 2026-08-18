const mongoose = require('mongoose');

const seminarSchema = new mongoose.Schema({
    hostId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true
    },
    hostName: {
        type: String,
        default: ''
    },
    hostImageUrl: {
        type: String,
        default: ''
    },
    abstract: {
        type: String
    },
    category: {
        type: String
    },
    tags: {
        type: [String],
        default: []
    },
    imageUrl: {
        type: String,
        default: ''
    },
    location: {
        type: String,
        default: ''
    },
    date: {
        type: Date
    },
    startTime: {
        type: String
    },
    endTime: {
        type: String
    },
    format: {
        type: String,
        enum: ['Live Broadcast', 'Pre-Recorded', 'In-Person'],
        default: 'Live Broadcast'
    },
    status: {
        type: String,
        enum: ['draft', 'scheduled', 'live', 'completed', 'cancelled'],
        default: 'scheduled'
    },
    rewardEnabled: {
        type: Boolean,
        default: false
    },
    rewardPerUser: {
        type: Number,
        default: 0,
        min: 0
    },
    rewardMaxRecipients: {
        type: Number,
        default: 0,
        min: 0
    },
    rewardRecipientsCount: {
        type: Number,
        default: 0,
        min: 0
    },
    rewardHeldAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    // Optional coin price to register/access this seminar - entirely separate from the
    // rewardEnabled campaign above (that pays attendees; this charges them). Both can be
    // set at once, though a host normally wouldn't. 0 = free to register.
    registrationPriceCoins: {
        type: Number,
        default: 0,
        min: 0
    },
    // Optional cap the host sets when going live (POST /seminars/:id/start) on how long
    // after starting new attendees may still join - 0/unset means unlimited (current
    // behavior, unchanged). joinWindowClosesAt is the actual deadline computed at start time.
    joinWindowMinutes: {
        type: Number,
        default: 0,
        min: 0
    },
    joinWindowClosesAt: {
        type: Date
    },
    // Optional, separate from registrationPriceCoins: the host may set this when ending
    // the broadcast (POST /seminars/:id/end) to charge coins for post-hoc replay access to
    // users who didn't attend/register. 0 = free replay (default, opt-in only).
    replayPriceCoins: {
        type: Number,
        default: 0,
        min: 0
    },
    // Optional supporting file (slides, notes, any document) the host attaches at creation -
    // stored locally under /uploads like seminar cover images, but any file type rather than
    // images only. Visible only to the host and registered attendees (see getSeminarById).
    documentUrl: {
        type: String,
        default: ''
    },
    documentName: {
        type: String,
        default: ''
    },
    // Set when the host starts/ends the live broadcast (POST /seminars/:id/start|end).
    actualStartTime: {
        type: Date
    },
    actualEndTime: {
        type: Date
    },
    // Linked once the broadcast ends: the finalized audio, its live-transcript text,
    // and the AI summary generated from it - reuses the same models the recordings
    // pipeline already uses, rather than duplicating them for seminars.
    recordingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Recording'
    },
    transcriptId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transcript'
    },
    summaryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Summary'
    }
}, { timestamps: true });

module.exports = mongoose.model('Seminar', seminarSchema);
