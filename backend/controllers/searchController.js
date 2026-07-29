const SearchResult = require('../models/SearchResult');
const { searchQueue } = require('../queues');

exports.createSearchSession = async (req, res) => {
    try {
        const { queries, config } = req.body;
        
        // Let BullMQ worker create the session and return the ID, or we create the session here
        // Usually better to create a generic session document or multiple SearchResult docs here.
        // As per PDF: POST /search/sessions -> returns { sessionId, jobIds[] }
        
        const mongoose = require('mongoose');
        const sessionId = req.body.sessionId || new mongoose.Types.ObjectId();
        
        const jobIds = [];
        for (const q of queries) {
            // Frontend might send objects {text, ...} or strings
            const queryText = typeof q === 'string' ? q : q.text;
            if (!queryText) continue;

            // Pre-create the search result so the frontend can immediately see the session
            const searchResult = await SearchResult.create({
                sessionId,
                userId: req.user._id,
                query: queryText,
                results: []
            });

            const job = await searchQueue.add('search', {
                sessionId,
                userId: req.user._id,
                query: queryText,
                config,
                resultId: searchResult._id
            });
            jobIds.push(job.id);
        }

        res.status(202).json({ sessionId, jobIds });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getUserSearchSessions = async (req, res) => {
    try {
        const mongoose = require('mongoose');
        // Group SearchResults by sessionId to recreate the sessions
        const sessions = await SearchResult.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(req.user._id) } },
            { $group: {
                _id: "$sessionId",
                queries: { $push: { id: "$_id", text: "$query", resultsCount: { $size: { $ifNull: ["$results", []] } } } },
                createdAt: { $first: "$createdAt" }
            }},
            { $sort: { createdAt: -1 } }
        ]);

        const formattedSessions = sessions.map(session => ({
            id: session._id,
            queries: session.queries.map((q, idx) => ({
                id: q.id,
                text: q.text,
                status: "done",
                results: q.resultsCount
            }))
        }));

        res.status(200).json({ sessions: formattedSessions });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getSearchSessionResults = async (req, res) => {
    try {
        const { id } = req.params;
        const results = await SearchResult.find({ sessionId: id });
        
        res.status(200).json({ session: id, results });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.updateSelectedResults = async (req, res) => {
    try {
        const { id } = req.params;
        const { selections } = req.body; // { selections: { queryId: [idx] } }
        
        // Loop through and update each SearchResult by queryId
        for (const [queryId, selectedIndexes] of Object.entries(selections)) {
            await SearchResult.findByIdAndUpdate(queryId, { selectedIndexes });
        }
        
        const updatedResults = await SearchResult.find({ sessionId: id });

        res.status(200).json({ session: id, results: updatedResults });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
