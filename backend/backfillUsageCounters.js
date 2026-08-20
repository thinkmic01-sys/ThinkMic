// One-time migration: initializes User.usage.{storageBytes, transcriptionSeconds,
// searchesCount} for every user who already has a package selected, computed by
// re-aggregating their real Recording/SearchResult documents (usageService.getRawUsage) -
// the exact same source of truth the counters replace. Only needs to run once, right after
// deploying the counter fields; new usage from that point on is maintained atomically by
// usageService.reserveUsage/releaseUsage, never by re-running this.
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const usageService = require('./services/usageService');

(async () => {
    await mongoose.connect(process.env.DB_URI);

    const users = await User.find({ purchasedPackageId: { $ne: null } }).select('_id email');
    console.log(`Backfilling usage counters for ${users.length} user(s) with a selected package...`);

    let updated = 0;
    for (const user of users) {
        const raw = await usageService.getRawUsage(user._id);
        await User.updateOne({ _id: user._id }, {
            $set: {
                'usage.storageBytes': raw.storageBytesUsed,
                'usage.transcriptionSeconds': raw.transcriptionMinutesUsed * 60,
                'usage.searchesCount': raw.searchesUsed
            }
        });
        console.log(` - ${user.email}: ${raw.storageBytesUsed} bytes, ${Math.round(raw.transcriptionMinutesUsed * 60)}s, ${raw.searchesUsed} searches`);
        updated++;
    }

    console.log(`Done. Backfilled ${updated} user(s).`);
    await mongoose.disconnect();
})().catch((err) => {
    console.error('Backfill failed:', err);
    process.exit(1);
});
