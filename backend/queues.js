const { Queue } = require('bullmq');
const connection = require('./config/redis');

const transcriptionQueue = new Queue('transcription', { connection });
const summarizationQueue = new Queue('summarization', { connection });
const searchQueue = new Queue('search', { connection });
const reportGenerationQueue = new Queue('report-generation', { connection });

module.exports = {
    transcriptionQueue,
    summarizationQueue,
    searchQueue,
    reportGenerationQueue,
    connection
};
