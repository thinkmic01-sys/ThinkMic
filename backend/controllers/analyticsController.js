const Recording = require('../models/Recording');
const Report = require('../models/Report');
const SearchResult = require('../models/SearchResult');
const Submission = require('../models/Submission');
const User = require('../models/User');

exports.getUsageKPIs = async (req, res) => {
    try {
        // Admins see platform-wide totals (used by AdminDashboard); regular users see their own (used by Dashboard).
        const scope = req.user.role === 'admin' ? {} : { userId: req.user._id };

        const [recordings, reports, searchesRun, submissions, activeUsers] = await Promise.all([
            Recording.countDocuments(scope),
            Report.countDocuments(scope),
            SearchResult.countDocuments(scope),
            Submission.countDocuments(scope),
            User.countDocuments({ lastLoginAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } })
        ]);

        res.status(200).json({
            kpis: {
                submissions,
                recordings,
                reports,
                activeUsers,
                searchesRun
            },
            chartData: []
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getSubmissionAnalytics = async (req, res) => {
    try {
        res.status(200).json({
            aggregated: {
                completionRate: 85,
                averageTime: '5m'
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
