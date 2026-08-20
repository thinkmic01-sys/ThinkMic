const Recording = require('../models/Recording');
const SearchResult = require('../models/SearchResult');
const User = require('../models/User');
const Notification = require('../models/Notification');
const socket = require('../utils/socket');

const BYTES_PER_GB = 1024 ** 3;

const DIMENSION_LABELS = {
    storage: 'storage',
    transcription: 'transcription minutes',
    searches: 'searches'
};

// Maps each dimension to the User.usage counter it lives in, and how to compute that
// dimension's limit (in the counter's own units) from a Package document.
const DIMENSION_CONFIG = {
    storage: { counterPath: 'usage.storageBytes', getLimit: (pkg) => pkg.storageGB * BYTES_PER_GB },
    transcription: { counterPath: 'usage.transcriptionSeconds', getLimit: (pkg) => pkg.transcriptionMinutes * 60 },
    searches: { counterPath: 'usage.searchesCount', getLimit: (pkg) => pkg.searches }
};

// Raw lifetime totals computed by re-aggregating Recording/SearchResult from scratch - no
// longer used for live enforcement (see reserveUsage below), but kept for the one-time
// counter backfill script and as a ground-truth sanity check.
async function getRawUsage(userId) {
    const [agg] = await Recording.aggregate([
        { $match: { userId } },
        { $group: { _id: null, totalBytes: { $sum: '$fileSizeBytes' }, totalSeconds: { $sum: '$durationSeconds' } } }
    ]);
    const searchesUsed = await SearchResult.countDocuments({ userId });

    return {
        storageBytesUsed: agg?.totalBytes || 0,
        transcriptionMinutesUsed: (agg?.totalSeconds || 0) / 60,
        searchesUsed
    };
}

// @desc Full usage snapshot for a user against their currently selected package - percentages
//       per dimension, which (if any) are at/over 100%, and the single highest percentage
//       (used to decide whether an upgrade prompt/notification is due). Reads the
//       atomically-maintained User.usage counters directly - fast, and always consistent
//       with whatever reserveUsage/releaseUsage last committed.
async function getUsageStatus(userId) {
    const user = await User.findById(userId).select('purchasedPackageId usage').populate('purchasedPackageId');
    const pkg = user?.purchasedPackageId;
    const usage = user?.usage || {};

    if (!pkg) {
        return {
            hasPackage: false,
            package: null,
            storageBytesUsed: usage.storageBytes || 0,
            transcriptionMinutesUsed: (usage.transcriptionSeconds || 0) / 60,
            searchesUsed: usage.searchesCount || 0
        };
    }

    // A 0 limit means zero allowance, not "unlimited" - it must read as already full (100%),
    // not 0% used, otherwise a user with a 0-limit package could use that dimension freely.
    const storageGBUsed = (usage.storageBytes || 0) / BYTES_PER_GB;
    const storagePct = pkg.storageGB > 0 ? (storageGBUsed / pkg.storageGB) * 100 : 100;
    const transcriptionMinutesUsed = (usage.transcriptionSeconds || 0) / 60;
    const transcriptionPct = pkg.transcriptionMinutes > 0 ? (transcriptionMinutesUsed / pkg.transcriptionMinutes) * 100 : 100;
    const searchesUsed = usage.searchesCount || 0;
    const searchesPct = pkg.searches > 0 ? (searchesUsed / pkg.searches) * 100 : 100;
    const maxPct = Math.max(storagePct, transcriptionPct, searchesPct);

    return {
        hasPackage: true,
        package: pkg,
        storageGBUsed,
        storagePct,
        transcriptionMinutesUsed,
        transcriptionPct,
        searchesUsed,
        searchesPct,
        maxPct,
        isFull: {
            storage: storagePct >= 100,
            transcription: transcriptionPct >= 100,
            searches: searchesPct >= 100
        }
    };
}

// @desc Atomically checks-and-increments a usage counter in one indivisible MongoDB
//       operation - the $expr guard and the $inc happen as a single findOneAndUpdate, so two
//       concurrent calls can never both read "still under limit" after the first has already
//       committed (the same guarantee coinWalletService.js's $gte balance guard relies on).
//       This is the real enforcement point; usageGuard.js's pre-check is just an early,
//       non-atomic fast-fail so a request doesn't waste effort (e.g. uploading a large file)
//       before finding out it was already going to be rejected.
// @throws NO_PACKAGE if the user has no package selected, LIMIT_REACHED if reserving would
//         exceed the package's limit for this dimension.
async function reserveUsage(userId, dimension, amount) {
    if (!amount || amount <= 0) return;

    const user = await User.findById(userId).select('purchasedPackageId').populate('purchasedPackageId');
    const pkg = user?.purchasedPackageId;
    if (!pkg) {
        const err = new Error('Select a package to continue.');
        err.code = 'NO_PACKAGE';
        throw err;
    }

    const { counterPath, getLimit } = DIMENSION_CONFIG[dimension];
    const rawLimit = getLimit(pkg);
    // A 0 limit means zero allowance - use -1 so no positive amount can ever satisfy the
    // $lte guard below (matches the same 0-means-full rule getUsageStatus applies).
    const limit = rawLimit > 0 ? rawLimit : -1;

    const updated = await User.findOneAndUpdate(
        {
            _id: userId,
            $expr: { $lte: [{ $add: [{ $ifNull: [`$${counterPath}`, 0] }, amount] }, limit] }
        },
        { $inc: { [counterPath]: amount } },
        { new: true }
    );

    if (!updated) {
        const err = new Error(`Your ${DIMENSION_LABELS[dimension]} allowance is full. Upgrade your package to continue.`);
        err.code = 'LIMIT_REACHED';
        err.dimension = dimension;
        throw err;
    }
}

// @desc Releases a previously-reserved amount (e.g. a Recording was deleted, or a reserve
//       needs to be undone after a later step failed) - floored at 0 defensively via an
//       aggregation-pipeline update, so it can never go negative even under a race.
async function releaseUsage(userId, dimension, amount) {
    if (!amount || amount <= 0) return;
    const { counterPath } = DIMENSION_CONFIG[dimension];
    await User.updateOne({ _id: userId }, [
        { $set: { [counterPath]: { $max: [0, { $subtract: [{ $ifNull: [`$${counterPath}`, 0] }, amount] }] } } }
    ], { updatePipeline: true });
}

// @desc Throws if the user has no package, or if the given dimension is already at/over
//       100% - callers (usageGuard middleware) turn this into a 403 with a clear message.
//       Read-only fast-fail; reserveUsage above is what actually enforces atomically.
async function assertCanUse(userId, dimension) {
    const status = await getUsageStatus(userId);

    if (!status.hasPackage) {
        const err = new Error('Select a package to continue.');
        err.code = 'NO_PACKAGE';
        throw err;
    }

    if (status.isFull[dimension]) {
        const err = new Error(`Your ${DIMENSION_LABELS[dimension]} allowance is full. Upgrade your package to continue.`);
        err.code = 'LIMIT_REACHED';
        err.dimension = dimension;
        throw err;
    }

    return status;
}

// @desc Best-effort: fires the one-time 80%-usage Notification for the user's current
//       package if they've crossed the threshold and haven't already been warned for it.
//       Never throws - a notification failure should never break the caller's real action.
async function checkAndNotify(userId) {
    try {
        const status = await getUsageStatus(userId);
        if (!status.hasPackage || status.maxPct < 80) return status;

        const user = await User.findById(userId).select('usage80NotifiedForPackageId');
        const pkgId = status.package._id.toString();
        if (user.usage80NotifiedForPackageId?.toString() === pkgId) return status;

        const dimension = status.storagePct === status.maxPct ? 'storage'
            : status.transcriptionPct === status.maxPct ? 'transcription' : 'searches';
        const isFull = status.maxPct >= 100;
        const message = isFull
            ? `Your ${DIMENSION_LABELS[dimension]} allowance is full - upgrade your package to continue.`
            : `You've used ${Math.round(status.maxPct)}% of your ${DIMENSION_LABELS[dimension]} allowance - consider upgrading your package.`;

        const notification = await Notification.create({ userId, type: 'package_usage_warning', message, link: '/app/dashboard' });
        await User.findByIdAndUpdate(userId, { usage80NotifiedForPackageId: status.package._id });

        try {
            socket.getIO().to(userId.toString()).emit('new_notification', { notification });
        } catch (err) {
            // Socket.io not initialized (e.g. a script/test context) - notification is still saved.
        }

        return status;
    } catch (err) {
        console.error('usageService.checkAndNotify error:', err.message);
        return null;
    }
}

module.exports = { getUsageStatus, getRawUsage, assertCanUse, reserveUsage, releaseUsage, checkAndNotify, DIMENSION_LABELS };
