// workers/searchWorker.js
const { Worker } = require('bullmq');
const connection = require('./config/redis');

// Import shared models from backend
const SearchResult = require('../backend/models/SearchResult');
const socketUtil = require('../backend/utils/socket');

// Tavily API integration
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

async function tavilySearch(query, config = {}) {
    const isMock = !TAVILY_API_KEY || TAVILY_API_KEY === 'MOCK';

    if (isMock) {
        console.log(`[MOCK] Searching Tavily for: "${query}"`);
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    results: [
                        { title: `Mock Result for "${query}"`, url: 'https://example.com/result1', content: 'This is a mock search result from the Tavily API mock layer. Real results will appear once your TAVILY_API_KEY is configured.' },
                        { title: `Secondary Result for "${query}"`, url: 'https://example.com/result2', content: 'Another mock result demonstrating the search pipeline is fully functional end-to-end.' }
                    ]
                });
            }, 1000);
        });
    }

    // Production Tavily API call
    const axios = require('axios');
    const response = await axios.post('https://api.tavily.com/search', {
        api_key: TAVILY_API_KEY,
        query,
        search_depth: config.depth || 'basic',
        max_results: config.maxResults || 10,
        include_answer: true,
        include_raw_content: false
    });

    return response.data;
}

const worker = new Worker('search', async (job) => {
    const { sessionId, userId, query, config, resultId } = job.data;
    console.log(`[Worker] Processing search job for query: "${query}"`);

    try {
        const io = socketUtil.getIO();
        io.to(userId).emit('job_progress', { type: 'search', status: 'processing', query });

        // 1. Call Tavily API
        const searchData = await tavilySearch(query, config);

        // 2. Save results to DB (Update the pre-created document)
        let searchResult;
        if (resultId) {
            searchResult = await SearchResult.findByIdAndUpdate(resultId, {
                results: searchData.results.map(r => ({
                    title: r.title,
                    url: r.url,
                    snippet: r.content || r.snippet || '',
                    score: r.score || 0
                })),
                answer: searchData.answer || null
            }, { new: true });
        } else {
            // Fallback just in case
            searchResult = await SearchResult.create({
                sessionId,
                userId,
                query,
                results: searchData.results.map(r => ({
                    title: r.title,
                    url: r.url,
                    snippet: r.content || r.snippet || '',
                    score: r.score || 0
                })),
                answer: searchData.answer || null
            });
        }

        // 3. Emit to user
        io.to(userId).emit('search_complete', { 
            sessionId, 
            query, 
            resultId: searchResult._id,
            resultsCount: searchData.results.length 
        });

        console.log(`[Worker] Finished search for query: "${query}"`);
        return { resultId: searchResult._id };
    } catch (error) {
        console.error(`[Worker] Search failed:`, error);
        try {
            const io = socketUtil.getIO();
            io.to(userId).emit('job_progress', { type: 'search', status: 'error', query, error: error.message });
        } catch(e) {}
        
        throw error;
    }
}, { connection });

worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job.id} failed:`, err);
});

module.exports = worker;
