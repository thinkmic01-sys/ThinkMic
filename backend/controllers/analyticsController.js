const Recording = require('../models/Recording');
const Report = require('../models/Report');
const SearchResult = require('../models/SearchResult');
const User = require('../models/User');

exports.getUsageKPIs = async (req, res) => {
    try {
        const userId = req.user._id;

        const [recordings, reports, searchesRun, activeUsers] = await Promise.all([
            Recording.countDocuments({ userId }),
            Report.countDocuments({ userId }),
            SearchResult.countDocuments({ userId }),
            User.countDocuments({ lastLoginAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } })
        ]);

        res.status(200).json({
            kpis: {
                submissions: recordings,
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
