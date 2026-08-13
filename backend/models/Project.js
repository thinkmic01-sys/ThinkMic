const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    notesHtml: {
        type: String,
        default: ''
    },
    // Optional at creation, mirrors User.learningKeywords - lets this project surface on
    // other users' My Learning List when shared (see isShared below) and they follow one
    // of these same keywords.
    keywords: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Keyword'
    }],
    // Sharing is a project-level toggle set by its owner (see projectsController.shareProject/
    // unshareProject) - while on, any user following a matching keyword can see this project
    // listed (title/description/price only, not the full recordings/reports) on their My
    // Learning List, and pay sharePriceCoins to unlock full read access via unlockProject.
    isShared: {
        type: Boolean,
        default: false
    },
    sharePriceCoins: {
        type: Number,
        min: 0
    },
    sharedAt: Date,
    // Users who've paid sharePriceCoins to unlock this project - checked by
    // projectsController.getProject to decide between the full response and the locked
    // preview. Membership is permanent (no re-charging on a later visit).
    unlockedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
