const cron = require('node-cron');
const Seminar = require('../models/Seminar');
const Registration = require('../models/Registration');
const Notification = require('../models/Notification');

// Helper to calculate hours between two dates
const getHoursBetween = (d1, d2) => Math.abs(d1 - d2) / 36e5;

// Run every day at 12:00 AM (midnight)
cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Running daily reminder check for upcoming seminars...');
    try {
        // Find all seminars that are scheduled and in the future
        const upcomingSeminars = await Seminar.find({ status: 'scheduled' });

        for (const seminar of upcomingSeminars) {
            // Check if seminar has a valid date
            if (!seminar.date) continue;
            
            // Try to parse the date and startTime
            // Assume seminar.date is "YYYY-MM-DD" and startTime is "HH:mm"
            const seminarDateTime = new Date(`${seminar.date}T${seminar.startTime || '00:00'}:00`);
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
