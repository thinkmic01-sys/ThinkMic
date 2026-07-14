// backend/workers/transcriptionWorker.js
const { Worker } = require('bullmq');
const connection = require('../config/redis');
const openaiService = require('../services/openaiService');
const Recording = require('../models/Recording');
const Transcript = require('../models/Transcript');
const socketUtil = require('../utils/socket');
const { summarizationQueue } = require('../queues');
const path = require('path');

const worker = new Worker('transcription', async (job) => {
    const { recordingId, s3Key, userId } = job.data;
    console.log(`[Worker] Starting transcription for recording ${recordingId}`);

    try {
        const io = socketUtil.getIO();
        io.to(userId).emit('job_progress', { type: 'transcription', status: 'processing', recordingId });

        // Build the file path from the local uploads folder
        const filePath = path.join(__dirname, '..', 'uploads', s3Key);

        // 1. Call OpenAI Service
        const transcriptionResult = await openaiService.transcribeAudio(filePath);

        // 2. Save Transcript to DB
        const transcript = await Transcript.create({
            recordingId,
            userId,
            text: transcriptionResult.text,
            segments: transcriptionResult.segments,
            language: transcriptionResult.language,
            whisperModel: 'whisper-1'
        });

        // 3. Update Recording Status
        await Recording.findByIdAndUpdate(recordingId, { 
            status: 'transcribed',
            transcriptId: transcript._id
        });

        // 4. Emit Success to User
        io.to(userId).emit('transcription_complete', { recordingId, transcriptId: transcript._id, text: transcript.text });

        // 5. Automatically enqueue summarization
        await summarizationQueue.add('summarize', {
            transcriptId: transcript._id,
            userId
        });

        console.log(`[Worker] Finished transcription for recording ${recordingId}`);
        return { transcriptId: transcript._id };
    } catch (error) {
        console.error(`[Worker] Transcription failed:`, error);
        await Recording.findByIdAndUpdate(recordingId, { status: 'failed' });
        
        try {
            const io = socketUtil.getIO();
            io.to(userId).emit('job_progress', { type: 'transcription', status: 'error', recordingId, error: error.message });
        } catch(e) {}
        
        throw error;
    }
}, { connection });

worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job.id} failed:`, err);
});

module.exports = worker;
