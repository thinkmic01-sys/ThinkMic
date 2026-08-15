const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        // AI auto-replies have no human sender - see isBot below
        required: function () { return !this.isBot; }
    },
    text: {
        type: String,
        required: true
    },
    // Set at write time (supportController.sendMessage already knows isSupportStaff(req))
    // so "has staff already engaged with this ticket" can be checked with a cheap
    // ticket.messages.some(m => m.isStaff) instead of re-resolving each sender's permissions.
    isStaff: {
        type: Boolean,
        default: false
    },
    // True for AI auto-replies (backend/services/openaiService.answerSupportQuestion,
    // triggered from supportController.sendMessage) - always sent by the 24/7 assistant
    // that answers before/between human staff replies, never a real User.
    isBot: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const TicketSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['open', 'closed'],
        default: 'open'
    },
    category: {
        type: String,
        default: 'General'
    },
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    feedback: {
        type: String
    },
    messages: [MessageSchema]
}, { timestamps: true });

module.exports = mongoose.model('Ticket', TicketSchema);
