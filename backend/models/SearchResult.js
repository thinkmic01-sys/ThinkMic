const mongoose = require('mongoose');

const SearchResultSchema = new mongoose.Schema({
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    query: {
        type: String,
        required: true
    },
    results: [{
        title: String,
        url: String,
        snippet: String,
        favicon: String
    }],
    selectedIndexes: {
        type: [Number]
    },
    serpApiParams: {
        type: Object
    }
}, { timestamps: true });

module.exports = mongoose.model('SearchResult', SearchResultSchema);
