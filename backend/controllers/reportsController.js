const fs = require('fs');
const path = require('path');
const Report = require('../models/Report');
const { reportGenerationQueue } = require('../queues');
const r2StorageService = require('../services/r2StorageService');

// Accepts either the raw frontend labels/keys or the already-normalized backend enum/keys
const TEMPLATE_ALIASES = {
    'standard academic': 'academic',
    'academic': 'academic',
    'executive brief': 'executive',
    'executive': 'executive',
    'data dense': 'standard',
    'standard': 'standard'
};

function normalizeTemplate(value) {
    const key = (value || '').toString().trim().toLowerCase();
    return TEMPLATE_ALIASES[key] || 'standard';
}

function normalizeSections(rawSections) {
    const s = rawSections || {};
    return {
        summary: s.summary !== undefined ? !!s.summary : !!s.execSummary,
        research: s.research !== undefined ? !!s.research : !!s.findings,
        transcript: s.transcript !== undefined ? !!s.transcript : !!s.transcripts,
        sources: s.sources !== undefined ? !!s.sources : false
    };
}

exports.listUserReports = async (req, res) => {
    try {
        const { page = 1, status } = req.query;
        const query = { userId: req.user._id };
        if (status) query.status = status;

        const reports = await Report.find(query)
            .sort({ createdAt: -1 })
            .limit(20)
            .skip((page - 1) * 20);

        res.status(200).json({ reports });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.createAndGenerateReport = async (req, res) => {
    try {
        const { title, subtitle, summaryId, sessionIds, template, sections } = req.body;

        const reportData = {
            userId: req.user._id,
            title,
            summaryId,
            searchSessionIds: sessionIds,
            template: normalizeTemplate(template),
            sections: normalizeSections(sections),
            status: 'pending'
        };
        if (subtitle !== undefined) reportData.subtitle = subtitle;

        if (req.body.projectId) {
            reportData.projectId = req.body.projectId;
        }

        const report = await Report.create(reportData);

        const job = await reportGenerationQueue.add('generate', {
            reportId: report._id,
            userId: req.user._id,
            templateType: report.template
        });

        res.status(202).json({ reportId: report._id, jobId: job.id });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getReport = async (req, res) => {
    try {
        const report = await Report.findOne({ _id: req.params.id, userId: req.user._id });
        if (!report) return res.status(404).json({ message: 'Report not found' });

        const previewHtml = report.content || '<p>Report content is still being generated...</p>';

        res.status(200).json({ report, previewHtml });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getReportStatus = async (req, res) => {
    try {
        const report = await Report.findOne({ _id: req.params.id, userId: req.user._id })
            .select('status pdfLocalPath docxLocalPath pdfR2Key docxR2Key');
        if (!report) return res.status(404).json({ message: 'Report not found' });

        // Prefer a presigned R2 URL (secure, zero server bandwidth) when the file was
        // mirrored to R2; fall back to the local static path otherwise.
        const [pdfUrl, docxUrl] = await Promise.all([
            report.pdfR2Key ? r2StorageService.getR2DownloadPresignedUrl(report.pdfR2Key) : report.pdfLocalPath,
            report.docxR2Key ? r2StorageService.getR2DownloadPresignedUrl(report.docxR2Key) : report.docxLocalPath
        ]);

        res.status(200).json({
            status: report.status,
            pdfUrl,
            docxUrl
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Download the canonical (already-generated) PDF/DOCX for a report -
//          redirects to a presigned R2 URL if mirrored there, else the local file
// @route   GET /api/v1/reports/:id/download/:type
// @access  Private
exports.downloadReportFile = async (req, res) => {
    try {
        const { type } = req.params;
        if (type !== 'pdf' && type !== 'docx') {
            return res.status(400).json({ message: 'Invalid file type. Use pdf or docx.' });
        }

        const report = await Report.findOne({ _id: req.params.id, userId: req.user._id });
        if (!report) return res.status(404).json({ message: 'Report not found' });

        const r2Key = type === 'pdf' ? report.pdfR2Key : report.docxR2Key;
        const localPath = type === 'pdf' ? report.pdfLocalPath : report.docxLocalPath;

        if (r2Key) {
            const downloadUrl = await r2StorageService.getR2DownloadPresignedUrl(r2Key);
            return res.redirect(downloadUrl);
        }

        if (localPath) {
            return res.redirect(localPath);
        }

        return res.status(404).json({ message: 'File not yet generated for this report.' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.regenerateReport = async (req, res) => {
    try {
        const { title, subtitle, template, sections } = req.body;

        const update = { status: 'pending' };
        if (title !== undefined) update.title = title;
        if (subtitle !== undefined) update.subtitle = subtitle;
        if (template !== undefined) update.template = normalizeTemplate(template);
        if (sections !== undefined) update.sections = normalizeSections(sections);

        const report = await Report.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            update,
            { new: true }
        );

        if (!report) return res.status(404).json({ message: 'Report not found' });

        const { reportGenerationQueue } = require('../queues');
        const job = await reportGenerationQueue.add('generate', {
            reportId: report._id,
            userId: req.user._id,
            templateType: report.template
        });

        res.status(202).json({ reportId: report._id, jobId: job.id });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.exportReport = async (req, res) => {
    try {
        const { type, title, subtitle } = req.query;
        const report = await Report.findOne({ _id: req.params.id, userId: req.user._id });
        if (!report) return res.status(404).json({ message: 'Report not found' });

        const { generatePDF, generateDOCX } = require('../../workers/utils/documentGenerator');

        const resolvedTitle = title || report.title;
        const resolvedSubtitle = subtitle || report.subtitle;

        let result;
        if (type === 'pdf') {
            result = await generatePDF(report._id, resolvedTitle, report.content, resolvedSubtitle);
        } else if (type === 'docx') {
            result = await generateDOCX(report._id, resolvedTitle, report.content, resolvedSubtitle);
        } else {
            return res.status(400).json({ message: 'Invalid export type' });
        }

        // Preserve the existing response shape - the frontend prepends its own
        // backend origin to this path, so it must stay a local /uploads/... path.
        res.status(200).json({ url: result.localPath });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.deleteReport = async (req, res) => {
    try {
        const report = await Report.findOne({ _id: req.params.id, userId: req.user._id });
        if (!report) return res.status(404).json({ message: 'Report not found' });

        // Clean up the generated files (R2 and/or local) so deleting a report never
        // leaves an orphaned PDF/DOCX behind.
        if (report.pdfR2Key) await r2StorageService.deleteR2Object(report.pdfR2Key).catch((err) =>
            console.error('R2 report PDF delete failed:', err.message));
        if (report.docxR2Key) await r2StorageService.deleteR2Object(report.docxR2Key).catch((err) =>
            console.error('R2 report DOCX delete failed:', err.message));
        if (report.pdfLocalPath) fs.unlink(path.join(__dirname, '..', report.pdfLocalPath), () => {});
        if (report.docxLocalPath) fs.unlink(path.join(__dirname, '..', report.docxLocalPath), () => {});

        await Report.deleteOne({ _id: report._id });
        res.status(200).json({ message: 'Report deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
