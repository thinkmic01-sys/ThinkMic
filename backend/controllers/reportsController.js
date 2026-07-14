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
        
        const report = await Report.create({
            userId: req.user._id,
            title,
            summaryId,
            searchSessionIds: sessionIds,
            template,
            sections,
            status: 'pending'
        });

        const job = await reportGenerationQueue.add('generate', {
            reportId: report._id,
            userId: req.user._id
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
