const { Worker } = require('bullmq');
const connection = require('./config/redis');

// In a real app, this would use OpenAI Whisper API
// For now, it's a mock that waits 5 seconds and updates DB
const transcriptionWorker = new Worker('transcription', async job => {
    console.log(`Processing transcription job ${job.id} for recording ${job.data.recordingId}`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log(`Transcription job ${job.id} completed`);
    return { transcript: 'This is a mock transcript of the audio.' };
}, { connection });

transcriptionWorker.on('completed', job => {
    console.log(`${job.id} has completed!`);
});

transcriptionWorker.on('failed', (job, err) => {
    console.log(`${job.id} has failed with ${err.message}`);
});

module.exports = transcriptionWorker;
