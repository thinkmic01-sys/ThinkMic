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

// Raw lifetime totals a user has consumed - packages are one-time allowances (no billing
// cycle/reset concept in this app, see the "$X one-time" pricing shown to users), so these
// are simple all-time sums rather than anything windowed.
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
//       (used to decide whether an upgrade prompt/notification is due).
async function getUsageStatus(userId) {
    const user = await User.findById(userId).select('purchasedPackageId').populate('purchasedPackageId');
    const pkg = user?.purchasedPackageId;
    const raw = await getRawUsage(userId);

    if (!pkg) {
        return { hasPackage: false, package: null, ...raw };
    }

    const storageGBUsed = raw.storageBytesUsed / BYTES_PER_GB;
    const storagePct = pkg.storageGB > 0 ? (storageGBUsed / pkg.storageGB) * 100 : 0;
    const transcriptionPct = pkg.transcriptionMinutes > 0 ? (raw.transcriptionMinutesUsed / pkg.transcriptionMinutes) * 100 : 0;
    const searchesPct = pkg.searches > 0 ? (raw.searchesUsed / pkg.searches) * 100 : 0;
    const maxPct = Math.max(storagePct, transcriptionPct, searchesPct);

    return {
        hasPackage: true,
        package: pkg,
        storageGBUsed,
        storagePct,
        transcriptionMinutesUsed: raw.transcriptionMinutesUsed,
        transcriptionPct,
        searchesUsed: raw.searchesUsed,
        searchesPct,
        maxPct,
        isFull: {
            storage: storagePct >= 100,
            transcription: transcriptionPct >= 100,
            searches: searchesPct >= 100
        }
    };
}

// @desc Throws if the user has no package, or if the given dimension is already at/over
//       100% - callers (usageGuard middleware) turn this into a 403 with a clear message.
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

module.exports = { getUsageStatus, assertCanUse, checkAndNotify, DIMENSION_LABELS };
