const cron = require('node-cron');
const Seminar = require('../models/Seminar');
const Registration = require('../models/Registration');
const Notification = require('../models/Notification');
const { _internal: seminarInternals } = require('../controllers/seminarsController');
const redis = require('../config/redis');

// Helper to calculate hours between two dates
const getHoursBetween = (d1, d2) => Math.abs(d1 - d2) / 36e5;

// Redis-backed lock so these jobs stay safe if the app ever runs more than one instance
// (e.g. multiple Railway replicas) - without it, every replica's node-cron fires the same
// schedule simultaneously: the reminder job would send N duplicate notifications per user,
// and the refund sweep (below) could double-credit a host, since refundUnusedHold reads
// rewardHeldAmount before zeroing it and only saves afterward. TTL is kept just under 24h so
// a lock left behind by a crashed run can never block the *next* day's run, while still
// blocking same-day duplicate runs for the entire day.
const acquireDailyLock = async (key) => (await redis.set(key, '1', 'PX', 23 * 60 * 60 * 1000, 'NX')) === 'OK';

// Run every day at 12:00 AM (midnight)
cron.schedule('0 0 * * *', async () => {
    if (!(await acquireDailyLock('cron-lock:seminar-reminders'))) {
        console.log('[CRON] Reminder check already ran/running elsewhere today - skipping.');
        return;
    }
    console.log('[CRON] Running daily reminder check for upcoming seminars...');
    try {
        // Find all seminars that are scheduled and in the future
        const upcomingSeminars = await Seminar.find({ status: 'scheduled' });

        for (const seminar of upcomingSeminars) {
            // Check if seminar has a valid date
            if (!seminar.date) continue;
            
            // Try to parse the date and startTime
            // seminar.date is a Date object, not a "YYYY-MM-DD" string - must be normalized
            // first (matches the auto-complete sweep below), otherwise this always produces
            // an Invalid Date and silently skips every seminar.
            const seminarDateTime = new Date(`${seminar.date.toISOString().split('T')[0]}T${seminar.startTime || '00:00'}:00`);
            const now = new Date();

            if (isNaN(seminarDateTime.getTime())) continue;

            const hoursRemaining = getHoursBetween(seminarDateTime, now);
            const daysRemaining = Math.round(hoursRemaining / 24);

            // We only want to notify if it's e.g., exactly 1 day, 3 days, or 7 days away
            if (daysRemaining === 1 || daysRemaining === 3 || daysRemaining === 7) {
                
                // Get all users registered for this seminar
                const registrations = await Registration.find({ seminarId: seminar._id });
                
                for (const reg of registrations) {
                    // Create a notification for the user
                    await Notification.create({
                        userId: reg.userId,
                        type: 'reminder',
                        message: `Reminder: The seminar "${seminar.title}" is starting in ${daysRemaining} day(s)!`,
                        link: `/app/courses/seminars/${seminar._id}`
                    });
                }
                
                console.log(`[CRON] Sent ${registrations.length} reminders for seminar: ${seminar.title} (${daysRemaining} days remaining)`);
            }
        }
    } catch (err) {
        console.error('[CRON] Error running daily reminder job:', err);
    }
});

// Run every day at 12:05 AM - auto-complete past-due seminars and refund any unused
// escrowed reward coins back to the host.
cron.schedule('5 0 * * *', async () => {
    if (!(await acquireDailyLock('cron-lock:seminar-completion-sweep'))) {
        console.log('[CRON] Completion sweep already ran/running elsewhere today - skipping.');
        return;
    }
    console.log('[CRON] Sweeping past-due seminars for auto-completion and reward refunds...');
    try {
        const pastDueSeminars = await Seminar.find({ status: { $in: ['scheduled', 'live'] } });
        let completedCount = 0;

        for (const seminar of pastDueSeminars) {
            if (!seminar.date) continue;

            const seminarEndDateTime = new Date(`${seminar.date.toISOString().split('T')[0]}T${seminar.endTime || '23:59'}:00`);
            if (isNaN(seminarEndDateTime.getTime()) || seminarEndDateTime > new Date()) continue;

            seminar.status = 'completed';
            await seminarInternals.refundUnusedHold(seminar, seminar.hostId, 'system');
            await seminar.save();
            completedCount++;
        }

        if (completedCount > 0) {
            console.log(`[CRON] Auto-completed ${completedCount} past-due seminar(s) and refunded unused reward funds.`);
        }
    } catch (err) {
        console.error('[CRON] Error running seminar completion sweep:', err);
    }
});
