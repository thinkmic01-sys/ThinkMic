const mongoose = require('mongoose');
const Recording = require('../models/Recording');
const Report = require('../models/Report');
const SearchResult = require('../models/SearchResult');
const Submission = require('../models/Submission');
const FieldSchema = require('../models/FieldSchema');
const User = require('../models/User');

// Full per-day count series for `Model` (grouped in UTC) over [startUTC, todayUTC], keyed by
// `dateField` and optionally narrowed by `matchExtra`. Missing days are filled with 0 - the
// caller downsamples/labels as needed rather than this returning a fixed-size bucket count.
async function dailyCountTrend(Model, dateField, matchExtra, startUTC, todayUTC, days) {
    const raw = await Model.aggregate([
        { $match: { ...matchExtra, [dateField]: { $gte: startUTC } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: `$${dateField}`, timezone: 'UTC' } }, count: { $sum: 1 } } }
    ]);
    const countsByDate = Object.fromEntries(raw.map((d) => [d._id, d.count]));
    const series = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(todayUTC);
        d.setUTCDate(d.getUTCDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        series.push({
            date: dateStr,
            label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
            count: countsByDate[dateStr] || 0
        });
    }
    return series;
}

const sumCounts = (series) => series.reduce((s, d) => s + d.count, 0);

// % change between the second half and first half of the range - a simple, dependency-free
// trend-direction signal for the KPI card delta badges.
function trendDeltaPct(series) {
    const half = Math.floor(series.length / 2);
    const firstHalf = sumCounts(series.slice(0, half));
    const secondHalf = sumCounts(series.slice(half));
    if (firstHalf === 0) return secondHalf > 0 ? 100 : 0;
    return Math.round(((secondHalf - firstHalf) / firstHalf) * 100);
}

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
        const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
        const userId = req.query.userId || null;

        const now = new Date();
        const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const startUTC = new Date(todayUTC);
        startUTC.setUTCDate(startUTC.getUTCDate() - (days - 1));

        const userObjectId = userId ? new mongoose.Types.ObjectId(userId) : null;
        const submissionUserMatch = userObjectId ? { userId: userObjectId } : {};
        const selfUserMatch = userObjectId ? { _id: userObjectId } : {};

        const [
            submissionsTrend, recordingsTrend, reportsTrend, searchesTrend, activeUsersTrend,
            completionAgg, topUsersAgg, recentSubs
        ] = await Promise.all([
            dailyCountTrend(Submission, 'createdAt', submissionUserMatch, startUTC, todayUTC, days),
            dailyCountTrend(Recording, 'createdAt', submissionUserMatch, startUTC, todayUTC, days),
            dailyCountTrend(Report, 'createdAt', submissionUserMatch, startUTC, todayUTC, days),
            dailyCountTrend(SearchResult, 'createdAt', submissionUserMatch, startUTC, todayUTC, days),
            dailyCountTrend(User, 'lastLoginAt', selfUserMatch, startUTC, todayUTC, days),
            Submission.aggregate([
                { $match: { ...submissionUserMatch, createdAt: { $gte: startUTC } } },
                { $group: {
                    _id: '$schemaId',
                    total: { $sum: 1 },
                    submitted: { $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] } }
                } },
                { $sort: { total: -1 } },
                { $limit: 5 },
                { $lookup: { from: 'fieldschemas', localField: '_id', foreignField: '_id', as: 'schema' } },
                { $unwind: { path: '$schema', preserveNullAndEmptyArrays: true } }
            ]),
            Submission.aggregate([
                { $match: { ...submissionUserMatch, createdAt: { $gte: startUTC } } },
                { $group: { _id: '$userId', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 4 },
                { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
                { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } }
            ]),
            Submission.find({ ...submissionUserMatch, createdAt: { $gte: startUTC } })
                .sort({ createdAt: -1 })
                .limit(10)
                .populate('userId', 'fullName email')
                .populate('schemaId', 'name deadline')
        ]);

        const kpis = {
            submissions: { total: sumCounts(submissionsTrend), deltaPct: trendDeltaPct(submissionsTrend), trend: submissionsTrend },
            recordings: { total: sumCounts(recordingsTrend), deltaPct: trendDeltaPct(recordingsTrend), trend: recordingsTrend },
            reports: { total: sumCounts(reportsTrend), deltaPct: trendDeltaPct(reportsTrend), trend: reportsTrend },
            activeUsers: { total: sumCounts(activeUsersTrend), deltaPct: trendDeltaPct(activeUsersTrend), trend: activeUsersTrend },
            searchesRun: { total: sumCounts(searchesTrend), deltaPct: trendDeltaPct(searchesTrend), trend: searchesTrend }
        };

        const completionByForm = completionAgg.map((c) => ({
            schemaId: c._id,
            name: c.schema?.name || 'Untitled Form',
            percentage: c.total > 0 ? Math.round((c.submitted / c.total) * 100) : 0,
            totalSubmissions: c.total
        }));

        // Per-required-field fill rate for the single highest-volume form in range - completion
        // doesn't generalize cleanly across forms with different field sets, so this focuses on
        // the one form with the most data to actually say something meaningful.
        let fieldCompletions = [];
        if (completionAgg.length > 0) {
            const topSchemaId = completionAgg[0]._id;
            const topSchema = await FieldSchema.findById(topSchemaId).select('fields');
            if (topSchema) {
                const requiredFields = topSchema.fields.filter((f) => f.required);
                const topSchemaSubs = await Submission.find({
                    schemaId: topSchemaId, ...submissionUserMatch, createdAt: { $gte: startUTC }
                }).select('answers');
                fieldCompletions = requiredFields
                    .map((f) => ({
                        label: f.label,
                        percentage: topSchemaSubs.length > 0
                            ? Math.round((topSchemaSubs.filter((s) => s.answers?.has(f.id)).length / topSchemaSubs.length) * 100)
                            : 0
                    }))
                    .sort((a, b) => b.percentage - a.percentage)
                    .slice(0, 4);
            }
        }

        const initialsOf = (name) => (name || '?').split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();

        const topUsers = topUsersAgg.map((u) => {
            const name = u.user?.fullName || 'Unknown User';
            return { userId: u._id, name, initials: initialsOf(name), submissions: u.count };
        });

        const recentActivity = recentSubs.map((s) => {
            const name = s.userId?.fullName || 'Unknown User';
            let status = s.status === 'submitted' ? 'Submitted' : 'Draft';
            if (s.status === 'draft' && s.schemaId?.deadline && new Date(s.schemaId.deadline) < now) {
                status = 'Overdue';
            }
            return {
                id: s._id,
                user: name,
                email: s.userId?.email || '',
                form: s.schemaId?.name || 'Untitled Form',
                submittedAt: (s.submittedAt || s.createdAt).toISOString(),
                status,
                initials: initialsOf(name)
            };
        });

        res.status(200).json({
            range: { days, startDate: startUTC.toISOString().slice(0, 10), endDate: todayUTC.toISOString().slice(0, 10) },
            kpis,
            completionByForm,
            fieldCompletions,
            topUsers,
            recentActivity
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
