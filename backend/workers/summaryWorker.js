// backend/workers/summaryWorker.js
const { Worker } = require('bullmq');
const connection = require('../config/redis');
const openaiService = require('../services/openaiService');
const Transcript = require('../models/Transcript');
const Summary = require('../models/Summary');
const Recording = require('../models/Recording');
const socketUtil = require('../utils/socket');

const worker = new Worker('summarization', async (job) => {
    const { transcriptId, userId } = job.data;
    console.log(`[Worker] Starting summarization for transcript ${transcriptId}`);

    try {
        const io = socketUtil.getIO();
        io.to(userId).emit('job_progress', { type: 'summarization', status: 'processing', transcriptId });

        // 1. Fetch transcript from DB
        const transcript = await Transcript.findById(transcriptId);
        if (!transcript) throw new Error("Transcript not found");

        // 2. Call OpenAI Service
        const summaryResult = await openaiService.generateSummary(transcript.text);

        // 3. Save Summary to DB
        const summary = await Summary.create({
            transcriptId,
            userId,
            summaryText: summaryResult.summary,
            tags: summaryResult.tags,
            queries: summaryResult.queries
        });

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
