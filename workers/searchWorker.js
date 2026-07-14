const { Worker } = require('bullmq');
const connection = require('./config/redis');

const searchWorker = new Worker('search', async job => {
    console.log(`Processing search job ${job.id} for query: ${job.data.query}`);
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log(`Search job ${job.id} completed`);
    return { results: [{ title: 'Mock Result', url: 'http://example.com', snippet: 'Mock snippet' }] };
}, { connection });

module.exports = searchWorker;
