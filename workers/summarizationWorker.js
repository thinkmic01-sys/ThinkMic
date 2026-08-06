// workers/summarizationWorker.js
const { Worker } = require('bullmq');
const connection = require('./config/redis');

// Import shared models and services from backend
const openaiService = require('../backend/services/openaiService');
const anthropicService = require('../backend/services/anthropicService');
const Transcript = require('../backend/models/Transcript');
const Summary = require('../backend/models/Summary');
const Recording = require('../backend/models/Recording');
const Notification = require('../backend/models/Notification');
const Seminar = require('../backend/models/Seminar');
const Registration = require('../backend/models/Registration');
const socketUtil = require('../backend/utils/socket');

const worker = new Worker('summarization', async (job) => {
    const { transcriptId, userId, customPrompt, length, style, language, seminarId } = job.data;
    console.log(`[Worker] Starting summarization for transcript ${transcriptId}`);

    try {
        const io = socketUtil.getIO();
        io.to(userId).emit('job_progress', { type: 'summarization', status: 'processing', transcriptId });

        // 1. Fetch transcript from DB
        const transcript = await Transcript.findById(transcriptId);
        if (!transcript) throw new Error("Transcript not found");

        // 2. Try OpenAI (ChatGPT) first, fallback to Anthropic (Claude) on failure
        let summaryResult;
        try {
            summaryResult = await openaiService.generateSummary(transcript.text, customPrompt, length, style, language);
            console.log(`[Worker] Summary generated via OpenAI (ChatGPT)`);
        } catch (openaiError) {
            console.warn(`[Worker] OpenAI failed, falling back to Anthropic Claude:`, openaiError.message);
            try {
                const claudeResult = await anthropicService.generateReport(
                    '', // no prior summary
                    transcript.text,
                    'summary'
                );
                summaryResult = {
                    summary: claudeResult.reportContent,
                    tags: [],
                    queries: []
                };
                console.log(`[Worker] Summary generated via Anthropic (Claude) fallback`);
            } catch (claudeError) {
                console.error(`[Worker] Both OpenAI and Anthropic failed:`, claudeError.message);
                throw new Error('All AI providers failed to generate summary');
            }
        }

        // 3. Save or Update Summary in DB
        const summary = await Summary.findOneAndUpdate(
            { transcriptId },
            {
                userId,
                summaryText: summaryResult.summary,
                tags: summaryResult.tags,
                queries: summaryResult.queries
            },
            { upsert: true, new: true }
        );

        // 4. Link summary to recording
        const recording = await Recording.findOneAndUpdate({ transcriptId }, { summaryId: summary._id }, { new: true });

        // 5. Create a persistent notification so the user learns about it even if they left the page
        const recTitle = recording?.title || 'Your research audio';
        const sessionLink = `/app/research?recordingId=${recording?._id || ''}&transcriptId=${transcriptId}`;
        const notif = await Notification.create({
            userId,
            message: `Research summary for "${recTitle}" is ready!`,
            type: 'update',
            link: sessionLink
        });
        io.to(userId).emit('new_notification', { notification: notif });

        // 6. Emit Success to User
        io.to(userId).emit('summarization_complete', {
            recordingId: recording?._id,
            transcriptId,
            summaryId: summary._id,
            title: recTitle,
            summary: summary.summaryText,
            tags: summary.tags,
            queries: summary.queries
        });

        // 7. Seminar broadcasts fan out to every registered attendee, not just the host who
        // ended it - the point of a seminar is everyone who joined gets the takeaways.
        if (seminarId) {
            const seminar = await Seminar.findByIdAndUpdate(seminarId, { summaryId: summary._id }, { new: true }).select('title hostId');
            const registrations = await Registration.find({ seminarId }).select('userId');

            if (registrations.length > 0) {
                const seminarTitle = seminar?.title || recTitle;
                const notifDocs = await Notification.insertMany(registrations.map((r) => ({
                    userId: r.userId,
                    type: 'update',
                    message: `The summary for "${seminarTitle}" you attended is ready!`,
                    link: '/app/courses/seminars'
                })));

                registrations.forEach((r, i) => {
                    const room = r.userId.toString();
                    io.to(room).emit('new_notification', { notification: notifDocs[i] });
                    io.to(room).emit('seminar_summary_complete', {
                        seminarId,
                        summaryId: summary._id,
                        title: seminarTitle,
                        summary: summary.summaryText,
                        tags: summary.tags
                    });
                });
            }
        }

        console.log(`[Worker] Finished summarization for transcript ${transcriptId}`);
        return { summaryId: summary._id };
    } catch (error) {
        console.error(`[Worker] Summarization failed:`, error);
        try {
            const io = socketUtil.getIO();
            io.to(userId).emit('job_progress', { type: 'summarization', status: 'error', transcriptId, error: error.message });

            // Notify the user even if they've already left the page
            const recording = await Recording.findOne({ transcriptId });
            const recTitle = recording?.title || 'Your research audio';
            const notif = await Notification.create({
                userId,
                message: `Summary generation failed for "${recTitle}". Please try again.`,
                type: 'system',
                link: recording ? `/app/research?recordingId=${recording._id}&transcriptId=${transcriptId}` : ''
            });
            io.to(userId).emit('new_notification', { notification: notif });
        } catch(e) {}

        throw error;
    }
}, { connection });

worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job.id} failed:`, err);
});

module.exports = worker;
