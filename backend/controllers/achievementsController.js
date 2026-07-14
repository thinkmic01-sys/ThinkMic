const Transaction = require('../models/Transaction');
const User = require('../models/User');
const TimelineEvent = require('../models/TimelineEvent');
const Recording = require('../models/Recording');
const Report = require('../models/Report');

exports.getTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find({ userId: req.user.id }).sort({ date: -1 });
        
        if (transactions.length === 0) {
            return res.status(200).json([]);
        }

        res.status(200).json(transactions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.addTransaction = async (req, res) => {
    try {
        const { action, amount, icon } = req.body;
        
        const newTransaction = new Transaction({
            userId: req.user.id,
            action,
            amount,
            icon
        });

        await newTransaction.save();

        // Update user coins
        const updateQuery = { $inc: { coins: amount } };
        if (amount > 0) {
            updateQuery.$inc.lifetimeCoins = amount;
        }
        await User.findByIdAndUpdate(req.user.id, updateQuery);

        res.status(201).json(newTransaction);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getLeaderboard = async (req, res) => {
    try {
        const topUsers = await User.find({ role: { $ne: 'admin' } })
            .sort({ lifetimeCoins: -1 })
            .limit(10)
            .select('fullName avatarUrl lifetimeCoins coins');
        res.status(200).json(topUsers);
    } catch (err) {
        console.error("Leaderboard Error:", err);
        res.status(500).json({ message: 'Server error fetching leaderboard' });
    }
};

exports.getTimelineEvents = async (req, res) => {
    try {
        const events = await TimelineEvent.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50);
        res.status(200).json(events);
    } catch (err) {
        console.error("Timeline Error:", err);
        res.status(500).json({ message: 'Server error fetching timeline events' });
    }
};

exports.getStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Week Earned
        const recentTransactions = await Transaction.find({
            userId,
            date: { $gte: sevenDaysAgo },
            amount: { $gt: 0 }
        });
        const weekEarned = recentTransactions.reduce((acc, curr) => acc + curr.amount, 0);

        // Rank
        const userDoc = await User.findById(userId);
        const lifetime = userDoc ? userDoc.lifetimeCoins : 0;
        const higherRankedCount = await User.countDocuments({
            role: { $ne: 'admin' },
            lifetimeCoins: { $gt: lifetime }
        });
        const rank = higherRankedCount + 1;

        // Reports Generated
        const reportsGenerated = await Report.countDocuments({
            userId,
            createdAt: { $gte: sevenDaysAgo }
        });

        // Hours Recorded
        const recentRecordings = await Recording.find({
            userId,
            createdAt: { $gte: sevenDaysAgo }
        });
        const totalDurationSeconds = recentRecordings.reduce((acc, curr) => acc + (curr.durationSeconds || 0), 0);
        const hoursRecorded = (totalDurationSeconds / 3600).toFixed(1);

        res.status(200).json({
            weekEarned,
            lifetime,
            rank,
            streak: 14, // Basic static streak logic for now
            hoursRecorded: parseFloat(hoursRecorded),
            reportsGenerated
        });
    } catch (err) {
        console.error("Stats Error:", err);
        res.status(500).json({ message: 'Server error fetching stats' });
    }
};
