// workers/reportGenWorker.js
const { Worker } = require('bullmq');
const connection = require('./config/redis');

// Import shared models and services from backend
const openaiService = require('../backend/services/openaiService');
const anthropicService = require('../backend/services/anthropicService');
const Report = require('../backend/models/Report');
const Summary = require('../backend/models/Summary');
const Transcript = require('../backend/models/Transcript');
const Recording = require('../backend/models/Recording');
const SearchResult = require('../backend/models/SearchResult');
const socketUtil = require('../backend/utils/socket');

const formatTimestamp = (seconds) => {
    if (typeof seconds !== 'number' || isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const worker = new Worker('report-generation', async (job) => {
    const { reportId, userId, templateType } = job.data;
    console.log(`[Worker] Starting report generation for report ${reportId}`);

    try {
        const io = socketUtil.getIO();
        io.to(userId).emit('job_progress', { type: 'report', status: 'processing', reportId });

        // 1. Fetch report with its linked data
        const report = await Report.findById(reportId);
        if (!report) throw new Error("Report not found");

        // 2. Resolve source ids - if the report has no direct summary/recording link but does
        // belong to a project, fall back to that project's most recent recording/summary
        let summaryId = report.summaryId;
        let recordingId = report.recordingId;
        if (!summaryId && !recordingId && report.projectId) {
            const fallbackRecording = await Recording.findOne({ projectId: report.projectId }).sort({ createdAt: -1 });
            if (fallbackRecording) {
                recordingId = recordingId || fallbackRecording._id;
                summaryId = summaryId || fallbackRecording.summaryId;
            }
        }

        // 3a. Summary material
        let summary = null;
        let summaryText = '';
        if (summaryId) {
            summary = await Summary.findById(summaryId);
            if (summary) {
                summaryText = summary.editedSummaryText || summary.summaryText || '';
            }
        }

        // 3b. Web search research material - supports both SearchResult._id and SearchResult.sessionId
        // being stored in report.searchSessionIds, since different pages have historically passed either
        let researchText = '';
        if (report.searchSessionIds && report.searchSessionIds.length > 0) {
            const searchResults = await SearchResult.find({
                $or: [
                    { _id: { $in: report.searchSessionIds } },
                    { sessionId: { $in: report.searchSessionIds } }
                ]
            });

            researchText = searchResults
                .filter(sr => Array.isArray(sr.results) && sr.results.length > 0)
                .map(sr => {
                    let context = `Query: ${sr.query}\n`;
                    sr.results.forEach(res => {
                        context += `- ${res.title}: ${res.snippet} (${res.url})\n`;
                    });
                    return context;
                }).join('\n\n---\n\n');
        }

        // 3c. Audio transcript material - only gathered when the transcript section is requested
        let transcriptText = '';
        if (report.sections?.transcript && (recordingId || summary?.transcriptId)) {
            const orConditions = [];
            if (summary?.transcriptId) orConditions.push({ _id: summary.transcriptId });
            if (recordingId) orConditions.push({ recordingId });

            const transcript = orConditions.length > 0
                ? await Transcript.findOne({ $or: orConditions })
                : null;

            if (transcript) {
                if (Array.isArray(transcript.segments) && transcript.segments.length > 0) {
                    transcriptText = transcript.segments
                        .map(seg => `[${formatTimestamp(seg.start)}] ${seg.text}`)
                        .join('\n');
                } else {
                    transcriptText = transcript.editedText || transcript.text || '';
                }
            }
        }

        // Claude and GPT both take a single "transcriptText" slot alongside summaryText - combine the
        // web research and audio transcript into one clearly-delimited block so neither source is lost
        const combinedContext = [
            researchText ? `=== WEB RESEARCH FINDINGS ===\n${researchText}` : '',
            transcriptText ? `=== AUDIO TRANSCRIPT ===\n${transcriptText}` : ''
        ].filter(Boolean).join('\n\n');

        const resolvedTemplate = templateType || report.template || 'standard';

        // 4. Generate report content - try Claude first, fallback to ChatGPT
        let reportContent;
        try {
            const result = await anthropicService.generateReport(summaryText, combinedContext, resolvedTemplate);
            reportContent = result.reportContent;
            console.log(`[Worker] Report generated via Anthropic (Claude)`);
        } catch (claudeError) {
            console.warn(`[Worker] Anthropic failed, falling back to OpenAI:`, claudeError.message);
            const result = await openaiService.generateReport(
                summaryText,
                combinedContext,
                resolvedTemplate,
                report.sections
            );
            reportContent = result.reportContent;
            console.log(`[Worker] Report generated via OpenAI fallback`);
        }

        // 5. Generate PDF and DOCX with the report's current title/subtitle/template/sections
        const { generatePDF, generateDOCX } = require('./utils/documentGenerator');
        const pdfResult = await generatePDF(reportId, report.title, reportContent, report.subtitle, resolvedTemplate, report.sections);
        const docxResult = await generateDOCX(reportId, report.title, reportContent, report.subtitle, resolvedTemplate, report.sections);

        // 6. Update report in DB
        await Report.findByIdAndUpdate(reportId, {
            content: reportContent,
            pdfLocalPath: pdfResult.localPath,
            docxLocalPath: docxResult.localPath,
            pdfR2Key: pdfResult.r2Key,
            docxR2Key: docxResult.r2Key,
            status: 'completed',
            completedAt: new Date()
        });

        // 7. Emit success to user
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
