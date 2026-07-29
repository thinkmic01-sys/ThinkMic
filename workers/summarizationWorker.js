// workers/summarizationWorker.js
const { Worker } = require('bullmq');
const connection = require('./config/redis');

// Import shared models and services from backend
const openaiService = require('../backend/services/openaiService');
const anthropicService = require('../backend/services/anthropicService');
const Transcript = require('../backend/models/Transcript');
const Summary = require('../backend/models/Summary');
const Recording = require('../backend/models/Recording');
const socketUtil = require('../backend/utils/socket');

const worker = new Worker('summarization', async (job) => {
    const { transcriptId, userId, customPrompt, length, style, language } = job.data;
    console.log(`[Worker] Starting summarization for transcript ${transcriptId}`);

    try {
        const io = socketUtil.getIO();
        io.to(userId).emit('job_progress', { type: 'summarization', status: 'processing', transcriptId });

        // 1. Fetch transcript from DB
        const transcript = await Transcript.findById(transcriptId);
        if (!transcript) throw new Error("Transcript not found");

        // 2. Try OpenAI (ChatGPT) first, fallback to Anthropic (Claude) on failure
        let summaryResult;
        try {
            summaryResult = await openaiService.generateSummary(transcript.text, customPrompt, length, style, language);
            console.log(`[Worker] Summary generated via OpenAI (ChatGPT)`);
        } catch (openaiError) {
            console.warn(`[Worker] OpenAI failed, falling back to Anthropic Claude:`, openaiError.message);
            try {
                const claudeResult = await anthropicService.generateReport(
                    '', // no prior summary
                    transcript.text,
                    'summary'
                );
                summaryResult = {
                    summary: claudeResult.reportContent,
                    tags: [],
                    queries: []
                };
                console.log(`[Worker] Summary generated via Anthropic (Claude) fallback`);
            } catch (claudeError) {
                console.error(`[Worker] Both OpenAI and Anthropic failed:`, claudeError.message);
                throw new Error('All AI providers failed to generate summary');
            }
        }

        // 3. Save or Update Summary in DB
        const summary = await Summary.findOneAndUpdate(
            { transcriptId },
            {
                userId,
                summaryText: summaryResult.summary,
                tags: summaryResult.tags,
                queries: summaryResult.queries
            },
            { upsert: true, new: true }
        );

        // 4. Link summary to recording
        await Recording.findOneAndUpdate({ transcriptId }, { summaryId: summary._id });

        // 5. Emit Success to User
        io.to(userId).emit('summarization_complete', { 
            transcriptId, 
            summaryId: summary._id,
            summary: summary.summaryText,
            tags: summary.tags
        });

        console.log(`[Worker] Finished summarization for transcript ${transcriptId}`);
        return { summaryId: summary._id };
    } catch (error) {
        console.error(`[Worker] Summarization failed:`, error);
        try {
            const io = socketUtil.getIO();
            io.to(userId).emit('job_progress', { type: 'summarization', status: 'error', transcriptId, error: error.message });
        } catch(e) {}
        
        throw error;
    }
}, { connection });

worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job.id} failed:`, err);
});

module.exports = worker;
