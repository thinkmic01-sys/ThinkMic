// workers/reportGenWorker.js
const { Worker } = require('bullmq');
const connection = require('./config/redis');

// Import shared models and services from backend
const openaiService = require('../backend/services/openaiService');
const anthropicService = require('../backend/services/anthropicService');
const Report = require('../backend/models/Report');
const Summary = require('../backend/models/Summary');
const Transcript = require('../backend/models/Transcript');
const socketUtil = require('../backend/utils/socket');

const worker = new Worker('report-generation', async (job) => {
    const { reportId, userId, templateType } = job.data;
    console.log(`[Worker] Starting report generation for report ${reportId}`);

    try {
        const io = socketUtil.getIO();
        io.to(userId).emit('job_progress', { type: 'report', status: 'processing', reportId });

        // 1. Fetch report with its linked data
        const report = await Report.findById(reportId);
        if (!report) throw new Error("Report not found");

        // 2. Gather source material
        let summaryText = '';
        let transcriptText = '';

        if (report.summaryIds && report.summaryIds.length > 0) {
            const summaries = await Summary.find({ _id: { $in: report.summaryIds } });
            summaryText = summaries.map(s => s.summaryText).join('\n\n---\n\n');
        }

        if (report.transcriptIds && report.transcriptIds.length > 0) {
            const transcripts = await Transcript.find({ _id: { $in: report.transcriptIds } });
            transcriptText = transcripts.map(t => t.text).join('\n\n---\n\n');
        }

        // 3. Generate report content — Try ChatGPT first, fallback to Claude
        let reportContent;
        try {
            const result = await anthropicService.generateReport(summaryText, transcriptText, templateType || 'comprehensive');
            reportContent = result.reportContent;
            console.log(`[Worker] Report generated via Anthropic (Claude)`);
        } catch (claudeError) {
            console.warn(`[Worker] Anthropic failed, falling back to OpenAI:`, claudeError.message);
            const result = await openaiService.generateSummary(
                `Generate a ${templateType || 'comprehensive'} report from the following:\n\nSummaries:\n${summaryText}\n\nTranscripts:\n${transcriptText}`
            );
            reportContent = result.summary;
            console.log(`[Worker] Report generated via OpenAI fallback`);
        }

        // 4. Update report in DB
        await Report.findByIdAndUpdate(reportId, {
            content: reportContent,
            status: 'completed',
            completedAt: new Date()
        });

        // 5. Emit success to user
        io.to(userId).emit('report_complete', { reportId, status: 'completed' });

        console.log(`[Worker] Finished report generation for report ${reportId}`);
        return { reportId };
    } catch (error) {
        console.error(`[Worker] Report generation failed:`, error);
        await Report.findByIdAndUpdate(reportId, { status: 'failed' });

        try {
            const io = socketUtil.getIO();
            io.to(userId).emit('job_progress', { type: 'report', status: 'error', reportId, error: error.message });
        } catch(e) {}
        
        throw error;
    }
}, { connection });

worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job.id} failed:`, err);
});

module.exports = worker;
