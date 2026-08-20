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
        favicon: String,
        // Tavily's own relevance score (0-1) for this result - searchWorker.js has always
        // tried to save this, but it was silently dropped on every write since this field
        // didn't exist on the schema yet.
        score: Number
    }],
    selectedIndexes: {
        type: [Number]
    },
    serpApiParams: {
        type: Object
    }
}, { timestamps: true });

module.exports = mongoose.model('SearchResult', SearchResultSchema);
