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

        if (report.summaryId) {
            const summary = await Summary.findById(report.summaryId);
            if (summary) {
                summaryText = summary.summaryText;
            }
        }

        if (report.searchSessionIds && report.searchSessionIds.length > 0) {
            const SearchResult = require('../backend/models/SearchResult');
            const searchResults = await SearchResult.find({ _id: { $in: report.searchSessionIds } });
            
            transcriptText = searchResults.map(sr => {
                let context = `Query: ${sr.query}\n`;
                sr.results.forEach(res => {
                    context += `- ${res.title}: ${res.snippet}\n`;
                });
                return context;
            }).join('\n\n---\n\n');
        }

        // 3. Generate report content — Try ChatGPT first, fallback to Claude
        let reportContent;
        try {
            const result = await anthropicService.generateReport(summaryText, transcriptText, templateType || 'comprehensive');
            reportContent = result.reportContent;
            console.log(`[Worker] Report generated via Anthropic (Claude)`);
        } catch (claudeError) {
            console.warn(`[Worker] Anthropic failed, falling back to OpenAI:`, claudeError.message);
            const result = await openaiService.generateReport(
                summaryText,
                transcriptText,
                templateType || 'comprehensive',
                report.sections
            );
            reportContent = result.reportContent;
            console.log(`[Worker] Report generated via OpenAI fallback`);
        }

        // 4. Generate PDF and DOCX
        const { generatePDF, generateDOCX } = require('./utils/documentGenerator');
        const pdfLocalPath = await generatePDF(reportId, report.title, reportContent);
        const docxLocalPath = await generateDOCX(reportId, report.title, reportContent);

        // 5. Update report in DB
        await Report.findByIdAndUpdate(reportId, {
            content: reportContent,
            pdfLocalPath,
            docxLocalPath,
            status: 'completed',
            completedAt: new Date()
        });

        // 6. Emit success to user
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
