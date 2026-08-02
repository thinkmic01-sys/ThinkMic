const Report = require('../models/Report');
const { reportGenerationQueue } = require('../queues');

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
        const { title, summaryId, sessionIds, template, sections } = req.body;
        
        const reportData = {
            userId: req.user._id,
            title,
            summaryId,
            searchSessionIds: sessionIds,
            template,
            sections,
            status: 'pending'
        };

        if (req.body.projectId) {
            reportData.projectId = req.body.projectId;
        }

        const report = await Report.create(reportData);

        const job = await reportGenerationQueue.add('generate', {
            reportId: report._id,
            userId: req.user._id,
            templateType: template
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
        
        // In a real scenario, this might return pre-rendered HTML.
        res.status(200).json({ report, previewHtml: '<p>Report Preview</p>' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getReportStatus = async (req, res) => {
    try {
        const report = await Report.findOne({ _id: req.params.id, userId: req.user._id }).select('status pdfLocalPath docxLocalPath');
        if (!report) return res.status(404).json({ message: 'Report not found' });
        
        res.status(200).json({
            status: report.status,
            pdfUrl: report.pdfLocalPath,
            docxUrl: report.docxLocalPath
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.regenerateReport = async (req, res) => {
    try {
        const { title, template, sections } = req.body;
        
        const report = await Report.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { title, template, sections, status: 'pending' },
            { new: true }
        );

        if (!report) return res.status(404).json({ message: 'Report not found' });

        const { reportGenerationQueue } = require('../queues');
        const job = await reportGenerationQueue.add('generate', {
            reportId: report._id,
            userId: req.user._id,
            templateType: template
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
        
        let fileUrl;
        if (type === 'pdf') {
            fileUrl = await generatePDF(report._id, title || report.title, report.content, subtitle);
        } else if (type === 'docx') {
            fileUrl = await generateDOCX(report._id, title || report.title, report.content, subtitle);
        } else {
            return res.status(400).json({ message: 'Invalid export type' });
        }
        
        res.status(200).json({ url: fileUrl });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.deleteReport = async (req, res) => {
    try {
        const report = await Report.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        if (!report) return res.status(404).json({ message: 'Report not found' });
        res.status(200).json({ message: 'Report deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
