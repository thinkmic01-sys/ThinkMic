const { Worker } = require('bullmq');
const connection = require('./config/redis');

const reportGenWorker = new Worker('report-generation', async job => {
    console.log(`Processing report generation job ${job.id} for report ${job.data.reportId}`);
    
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    console.log(`Report generation job ${job.id} completed`);
    return { pdfUrl: 'http://localhost:5000/uploads/mock-report.pdf' };
}, { connection });

module.exports = reportGenWorker;
