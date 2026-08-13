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
const TimelineEvent = require('../backend/models/TimelineEvent');
const socketUtil = require('../backend/utils/socket');

const formatTimestamp = (seconds) => {
    if (typeof seconds !== 'number' || isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const escapeHtml = (s) => (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const worker = new Worker('report-generation', async (job) => {
    const { reportId, userId, templateType, language } = job.data;
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

        // 3c. Audio transcript material - only gathered when the transcript section is requested.
        // report.transcriptId (set at creation from whatever transcript the source research
        // session came from - see ResearchResults.jsx) is the direct, reliable link; fall back
        // to resolving via summaryId/recordingId for reports created before that field existed.
        let transcriptText = '';
        if (report.sections?.transcript && (report.transcriptId || recordingId || summary?.transcriptId)) {
            let transcript = null;
            if (report.transcriptId) {
                transcript = await Transcript.findById(report.transcriptId);
            } else {
                const orConditions = [];
                if (summary?.transcriptId) orConditions.push({ _id: summary.transcriptId });
                if (recordingId) orConditions.push({ recordingId });
                transcript = orConditions.length > 0
                    ? await Transcript.findOne({ $or: orConditions })
                    : null;
            }

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
        const resolvedLanguage = language || report.language || null;

        // 4. Generate report content - try Claude first, fallback to ChatGPT
        let reportContent;
        try {
            const result = await anthropicService.generateReport(summaryText, combinedContext, resolvedTemplate, resolvedLanguage);
            reportContent = result.reportContent;
            console.log(`[Worker] Report generated via Anthropic (Claude)`);
        } catch (claudeError) {
            console.warn(`[Worker] Anthropic failed, falling back to OpenAI:`, claudeError.message);
            const result = await openaiService.generateReport(
                summaryText,
                combinedContext,
                resolvedTemplate,
                report.sections,
                resolvedLanguage
            );
            reportContent = result.reportContent;
            console.log(`[Worker] Report generated via OpenAI fallback`);
        }

        // 4b. Guarantee the complete transcript appears in the report - the AI is only asked
        // for a handful of illustrative quotes (see the system prompt), so append the full,
        // verbatim transcript as its own appendix here rather than trusting the model to
        // reproduce it faithfully (risks paraphrasing, truncation, or skipping content).
        if (report.sections?.transcript && transcriptText) {
            const appendixHeading = resolvedLanguage && resolvedLanguage.toLowerCase().startsWith('urdu') ? 'مکمل ٹرانسکرپٹ' : 'Full Transcript';
            const transcriptParagraphs = transcriptText.split('\n')
                .filter((line) => line.trim() !== '')
                .map((line) => `<p>${escapeHtml(line)}</p>`)
                .join('');
            reportContent += `<h2>${appendixHeading}</h2>${transcriptParagraphs}`;
        }

        // 5. Generate PDF and DOCX with the report's current title/subtitle/template/sections
        const { generatePDF, generateDOCX } = require('./utils/documentGenerator');
        const pdfResult = await generatePDF(reportId, report.title, reportContent, report.subtitle, resolvedTemplate, report.sections, resolvedLanguage);
        const docxResult = await generateDOCX(reportId, report.title, reportContent, report.subtitle, resolvedTemplate, report.sections, resolvedLanguage);

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

        // 8. My Timeline entry
        await TimelineEvent.create({
            userId,
            type: 'Reports',
            title: 'Report Generated',
            description: `"${report.title || 'Untitled Report'}" was synthesized and is ready to view.`,
            icon: 'description',
            color: 'text-[#222777]',
            borderColor: 'border-[#222777]',
            hasLink: true,
            link: `/app/reports/${reportId}`
        });

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
