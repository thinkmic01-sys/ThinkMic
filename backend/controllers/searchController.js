const SearchResult = require('../models/SearchResult');
const { searchQueue } = require('../queues');
const usageService = require('../services/usageService');

exports.createSearchSession = async (req, res) => {
    try {
        const { queries, config } = req.body;

        // Let BullMQ worker create the session and return the ID, or we create the session here
        // Usually better to create a generic session document or multiple SearchResult docs here.
        // As per PDF: POST /search/sessions -> returns { sessionId, jobIds[] }

        const mongoose = require('mongoose');
        const sessionId = req.body.sessionId || new mongoose.Types.ObjectId();

        // Reserve the exact number of valid queries atomically before creating anything -
        // the real, race-proof enforcement point (see usageService.reserveUsage). Filtering
        // to valid query text first so the reserved count always matches what actually gets
        // created below.
        const validQueryTexts = queries.map((q) => (typeof q === 'string' ? q : q.text)).filter(Boolean);
        try {
            await usageService.reserveUsage(req.user._id, 'searches', validQueryTexts.length);
        } catch (err) {
            if (err.code === 'NO_PACKAGE' || err.code === 'LIMIT_REACHED') {
                return res.status(403).json({ message: err.message, code: err.code, dimension: err.dimension });
            }
            throw err;
        }

        console.log(`[searchController] Creating session ${sessionId} with queries:`, queries);
        const jobIds = [];
        let completedCount = 0;
        try {
            for (const queryText of validQueryTexts) {
                console.log(`[searchController] Pre-creating SearchResult for query: ${queryText}`);
                const searchResult = await SearchResult.create({
                    sessionId,
                    userId: req.user._id,
                    query: queryText,
                    results: []
                });
                console.log(`[searchController] Created SearchResult ${searchResult._id}`);

                const job = await searchQueue.add('search', {
                    sessionId,
                    userId: req.user._id,
                    query: queryText,
                    config,
                    resultId: searchResult._id
                });
                jobIds.push(job.id);
                completedCount++;
            }
        } catch (err) {
            // The reservation above covered the whole batch upfront - release whatever wasn't
            // actually fulfilled, so a mid-batch failure doesn't permanently charge the user
            // for search slots that never turned into a real SearchResult/job.
            const unfulfilled = validQueryTexts.length - completedCount;
            if (unfulfilled > 0) {
                await usageService.releaseUsage(req.user._id, 'searches', unfulfilled).catch(() => {});
            }
            throw err;
        }

        console.log(`[searchController] Finished enqueuing, sending 202`);
        await usageService.checkAndNotify(req.user._id);
        res.status(202).json({ sessionId, jobIds });
    } catch (error) {
        console.error(`[searchController] Error in createSearchSession:`, error);
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
