const mongoose = require('mongoose');

// Admin-curated topic tags. Shown to users on My Learning List (follow to get notified),
// and used as the seminar creation "Category" dropdown's options - a seminar's category
// matching a followed keyword is what triggers the notification in seminarsController.
const KeywordSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Keyword', KeywordSchema);
