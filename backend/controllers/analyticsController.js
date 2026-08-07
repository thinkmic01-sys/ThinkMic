const Recording = require('../models/Recording');
const Report = require('../models/Report');
const SearchResult = require('../models/SearchResult');
const Submission = require('../models/Submission');
const User = require('../models/User');

exports.getUsageKPIs = async (req, res) => {
    try {
        // Admins see platform-wide totals (used by AdminDashboard); regular users see their own (used by Dashboard).
        const scope = req.user.role === 'admin' ? {} : { userId: req.user._id };

        // Rolling 7-day window (today + 6 prior days), computed in UTC so the
        // MongoDB $dateToString grouping and the JS day loop agree on day boundaries.
        const now = new Date();
        const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const startUTC = new Date(todayUTC);
        startUTC.setUTCDate(startUTC.getUTCDate() - 6);

        const [recordings, reports, searchesRun, submissions, activeUsers, dailyCounts] = await Promise.all([
            Recording.countDocuments(scope),
            Report.countDocuments(scope),
            SearchResult.countDocuments(scope),
            Submission.countDocuments(scope),
            User.countDocuments({ lastLoginAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
            Recording.aggregate([
                { $match: { ...scope, createdAt: { $gte: startUTC } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } }, count: { $sum: 1 } } }
            ])
        ]);

        const countsByDate = Object.fromEntries(dailyCounts.map((d) => [d._id, d.count]));
        const chartData = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(todayUTC);
            d.setUTCDate(d.getUTCDate() - i);
            const dateStr = d.toISOString().slice(0, 10);
            chartData.push({
                date: dateStr,
                label: d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
                count: countsByDate[dateStr] || 0
            });
        }

        res.status(200).json({
            kpis: {
                submissions,
                recordings,
                reports,
                activeUsers,
                searchesRun
            },
            chartData
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
