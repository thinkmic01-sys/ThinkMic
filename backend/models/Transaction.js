const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    action: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    icon: {
        type: String,
        default: 'toll'
    }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
