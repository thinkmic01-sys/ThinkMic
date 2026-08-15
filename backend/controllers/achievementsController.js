const Transaction = require('../models/Transaction');
const User = require('../models/User');
const TimelineEvent = require('../models/TimelineEvent');
const Recording = require('../models/Recording');
const Report = require('../models/Report');
const coinWalletService = require('../services/coinWalletService');

// --- LEVEL PROGRESSION ENGINE ---
// 10-tier progressive curve based on lifetimeCoins (a permanent, never-decreasing metric -
// unlike `coins`, which is the spendable balance and can go down when redeemed).
const LEVELS = [
    { level: 1, name: 'Novice Researcher', min: 0, next: 500 },
    { level: 2, name: 'Junior Scholar', min: 501, next: 1500 },
    { level: 3, name: 'Research Associate', min: 1501, next: 3000 },
    { level: 4, name: 'Senior Analyst', min: 3001, next: 5500 },
    { level: 5, name: 'Lead Investigator', min: 5501, next: 9000 },
    { level: 6, name: 'Principal Scholar', min: 9001, next: 14000 },
    { level: 7, name: 'Research Fellow', min: 14001, next: 21000 },
    { level: 8, name: 'Distinguished Fellow', min: 21001, next: 30000 },
    { level: 9, name: 'Grandmaster', min: 30001, next: 45000 },
    { level: 10, name: 'Legendary Scholar', min: 45001, next: 45001 }
];

// Never returns NaN/negative values, even for missing/invalid input.
function getLevelInfo(lifetimeCoinsRaw) {
    const lifetimeCoins = Math.max(0, Number(lifetimeCoinsRaw) || 0);

    let tier = LEVELS[0];
    for (const l of LEVELS) {
        if (lifetimeCoins >= l.min) tier = l;
        else break;
    }

    const isMaxLevel = tier.level === 10;
    const currentLevelMin = tier.min;
    const nextLevelThreshold = isMaxLevel ? currentLevelMin : tier.next;

    let progressPercent;
    if (isMaxLevel) {
        progressPercent = 100;
    } else {
        const span = nextLevelThreshold - currentLevelMin;
        progressPercent = span > 0 ? ((lifetimeCoins - currentLevelMin) / span) * 100 : 0;
        progressPercent = Math.min(100, Math.max(0, progressPercent));
    }

    return {
        currentLevel: tier.level,
        levelName: tier.name,
        currentLevelMin,
        nextLevelThreshold,
        progressPercent: Number(progressPercent.toFixed(1)),
        isMaxLevel,
        lifetimeCoins
    };
}

// --- RANK TIERS (admin-configurable via RewardSettings.rankTiers) ---
// Returns the highest tier whose minCoins the user's lifetimeCoins meets or exceeds, or
// null if no tier's threshold is met (e.g. an admin removed the 0-coin tier).
function resolveRankTier(lifetimeCoins, tiers) {
    if (!Array.isArray(tiers) || tiers.length === 0) return null;
    let match = null;
    for (const t of tiers) {
        if (lifetimeCoins >= t.minCoins && (!match || t.minCoins > match.minCoins)) match = t;
    }
    return match;
}

// --- STREAK CALCULATION ---
// Consecutive-day streak, counting backward from today (or yesterday, if today has no
// activity yet - so the streak isn't zeroed out just because the user hasn't acted yet today).
// A day counts as "active" if it has a Transaction OR a TimelineEvent for this user.
const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

async function getActiveDaySet(userId, lookbackDays) {
    const since = new Date();
    since.setDate(since.getDate() - lookbackDays);
    since.setHours(0, 0, 0, 0);

    const [transactions, events] = await Promise.all([
        Transaction.find({ userId, date: { $gte: since } }).select('date'),
        TimelineEvent.find({ userId, createdAt: { $gte: since } }).select('createdAt')
    ]);

    const activeDays = new Set();
    transactions.forEach(t => { if (t.date) activeDays.add(dayKey(t.date)); });
    events.forEach(e => { if (e.createdAt) activeDays.add(dayKey(e.createdAt)); });
    return activeDays;
}

function calculateStreakFromSet(activeDays) {
    let streak = 0;
    const cursor = new Date();
    if (!activeDays.has(dayKey(cursor))) {
        cursor.setDate(cursor.getDate() - 1);
    }
    while (activeDays.has(dayKey(cursor))) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
}

// Last 7 days (oldest -> today) with an `active` flag, for the Activity Streak mini-calendar.
function buildWeekActivity(activeDays) {
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push({
            date: dayKey(d),
            label: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
            active: activeDays.has(dayKey(d)),
            isToday: i === 0
        });
    }
    return days;
}

exports.getTransactions = async (req, res) => {
    try {
        // Bounded so a long-lived power user's ledger can't return an unbounded scan.
        const transactions = await Transaction.find({ userId: req.user.id })
            .sort({ date: -1 })
            .limit(100);

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

        if (typeof amount !== 'number' || !Number.isInteger(amount) || amount === 0) {
            return res.status(400).json({ message: 'amount must be a non-zero integer' });
        }

        // Debits only increment lifetimeCoins on the way up (never down) and can never
        // push `coins` negative - guarded atomically so this can't race with itself.
        const updateQuery = { $inc: { coins: amount } };
        if (amount > 0) {
            updateQuery.$inc.lifetimeCoins = amount;
        }
        const filter = amount < 0
            ? { _id: req.user.id, coins: { $gte: -amount } }
            : { _id: req.user.id };

        const updatedUser = await User.findOneAndUpdate(filter, updateQuery, { new: true });
        if (!updatedUser) {
            return res.status(400).json({ message: 'Insufficient coin balance' });
        }

        const newTransaction = new Transaction({ userId: req.user.id, action, amount, icon });
        await newTransaction.save();

        res.status(201).json(newTransaction);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getLeaderboard = async (req, res) => {
    try {
        const [topUsers, settings] = await Promise.all([
            // Tie-break by account age so equal-coin users get a stable, consistent order.
            User.find({ role: { $ne: 'admin' } })
                .sort({ lifetimeCoins: -1, createdAt: 1 })
                .limit(10)
                .select('fullName avatarUrl lifetimeCoins coins'),
            coinWalletService.getRewardSettings()
        ]);

        const withTiers = topUsers.map(u => {
            const tier = resolveRankTier(u.lifetimeCoins, settings.rankTiers);
            return { ...u.toObject(), rankTierName: tier ? tier.name : null };
        });

        res.status(200).json(withTiers);
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

        // Rank + Level (based on lifetimeCoins, which never decreases on spend)
        const userDoc = await User.findById(userId);
        const lifetime = userDoc ? userDoc.lifetimeCoins : 0;
        const higherRankedCount = await User.countDocuments({
            role: { $ne: 'admin' },
            lifetimeCoins: { $gt: lifetime }
        });
        const rank = higherRankedCount + 1;
        const levelInfo = getLevelInfo(lifetime);

        // Admin-configurable named tier (Bronze/Silver/Gold/...) shown instead of the plain
        // numeric position on the Achievements page - see RewardSettings.rankTiers.
        const rewardSettings = await coinWalletService.getRewardSettings();
        const rankTier = resolveRankTier(lifetime, rewardSettings.rankTiers);
        const rankTierName = rankTier ? rankTier.name : null;

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

        // Streak + weekly activity calendar (share the same active-day lookup)
        const activeDays = await getActiveDaySet(userId, 60);
        const streak = calculateStreakFromSet(activeDays);
        const weekActivity = buildWeekActivity(activeDays);

        res.status(200).json({
            weekEarned,
            lifetime,
            rank,
            rankTierName,
            streak,
            hoursRecorded: parseFloat(hoursRecorded),
            reportsGenerated,
            levelInfo,
            weekActivity
        });
    } catch (err) {
        console.error("Stats Error:", err);
        res.status(500).json({ message: 'Server error fetching stats' });
    }
};
