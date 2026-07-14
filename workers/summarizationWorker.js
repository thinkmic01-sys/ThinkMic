const { Worker } = require('bullmq');
const connection = require('./config/redis');

const summarizationWorker = new Worker('summarization', async job => {
    console.log(`Processing summarization job ${job.id} for transcript ${job.data.transcriptId}`);
    
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    console.log(`Summarization job ${job.id} completed`);
    return { summary: 'Mock summary', tags: ['mock', 'data'] };
}, { connection });

module.exports = summarizationWorker;
