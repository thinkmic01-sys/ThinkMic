const mongoose = require('mongoose');
const Seminar = require('../models/Seminar');
const Registration = require('../models/Registration');
const Notification = require('../models/Notification');
const Recording = require('../models/Recording');
const Transcript = require('../models/Transcript');
const coinWalletService = require('../services/coinWalletService');
const { summarizationQueue } = require('../queues');
const socket = require('../utils/socket');
const r2StorageService = require('../services/r2StorageService');

// Reserves `totalRequired` coins from the host into escrow for a seminar's reward campaign.
// Mutates `seminar.rewardHeldAmount` and notifies the host. Throws InsufficientBalanceError
// if the host doesn't have enough available coins.
async function holdForSeminar(seminar, totalRequired, hostId, hostRole) {
    if (totalRequired <= 0) return;

    await coinWalletService.holdCoins(hostId, totalRequired, {
        type: 'seminar_reward_reserved',
        action: `Reserved for "${seminar.title}"`,
        relatedEntityType: 'Seminar',
        relatedEntityId: seminar._id,
        actorId: hostId,
        actorRole: hostRole,
        auditAction: 'seminar_coins_reserved'
    });
    seminar.rewardHeldAmount += totalRequired;

    await Notification.create({
        userId: hostId,
        type: 'seminar_coins_reserved',
        message: `${totalRequired} coins reserved for "${seminar.title}"'s reward campaign.`,
        link: '/app/courses/seminars'
    });
}

// Refunds whatever is left in `seminar.rewardHeldAmount` back to the host's spendable balance.
async function refundUnusedHold(seminar, actorId, actorRole) {
    if (!seminar.rewardHeldAmount || seminar.rewardHeldAmount <= 0) return;
    const amount = seminar.rewardHeldAmount;

    await coinWalletService.refundHeldCoins(seminar.hostId, amount, {
        type: 'seminar_reward_refunded',
        action: `Unused reward funds refunded for "${seminar.title}"`,
        relatedEntityType: 'Seminar',
        relatedEntityId: seminar._id,
        actorId: actorId || seminar.hostId,
        actorRole: actorRole || 'system',
        auditAction: 'seminar_coins_refunded'
    });
    seminar.rewardHeldAmount = 0;

    await Notification.create({
        userId: seminar.hostId,
        type: 'seminar_coins_refunded',
        message: `${amount} unused coins refunded from "${seminar.title}"'s reward campaign.`,
        link: '/app/courses/seminars'
    });
}

exports.getSeminars = async (req, res) => {
    try {
        const query = {
            $or: [
                { status: { $ne: 'draft' } },
                { status: 'draft', hostId: req.user.id }
            ]
        };
        const seminars = await Seminar.find(query).sort({ date: 1, startTime: 1 });
        res.status(200).json(seminars);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.createSeminar = async (req, res) => {
    try {
        const rewardEnabled = !!req.body.rewardEnabled;
        const rewardPerUser = Math.max(0, Number(req.body.rewardPerUser) || 0);
        const rewardMaxRecipients = Math.max(0, Number(req.body.rewardMaxRecipients) || 0);
        const status = req.body.status || 'scheduled';

        const newSeminar = new Seminar({
            hostId: req.user.id,
            hostName: req.body.hostName,
            hostImageUrl: req.body.hostImageUrl,
            title: req.body.title,
            abstract: req.body.abstract,
            category: req.body.category,
            tags: req.body.tags ? String(req.body.tags).split(',').map(tag => tag.trim()).filter(t => t !== '') : [],
            imageUrl: req.body.imageUrl,
            location: req.body.location,
            date: req.body.date,
            startTime: req.body.startTime,
            endTime: req.body.endTime,
            format: req.body.format,
            status,
            rewardEnabled,
            rewardPerUser,
            rewardMaxRecipients
        });

        await newSeminar.validate();

        if (rewardEnabled && status !== 'draft') {
            const totalRequired = rewardPerUser * rewardMaxRecipients;
            try {
                await holdForSeminar(newSeminar, totalRequired, req.user.id, req.user.role);
            } catch (err) {
                if (err instanceof coinWalletService.InsufficientBalanceError) {
                    return res.status(400).json({
                        message: 'Insufficient available coins to fund this reward campaign.',
                        required: totalRequired,
                        available: req.user.coins
                    });
                }
                throw err;
            }
        }

        const savedSeminar = await newSeminar.save();
        res.status(201).json(savedSeminar);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getSeminarById = async (req, res) => {
    try {
        const seminar = await Seminar.findById(req.params.id)
            .populate('recordingId', 'r2Key mimeType durationSeconds')
            .populate('summaryId', 'summaryText tags')
            .lean();
        if (!seminar) return res.status(404).json({ message: 'Seminar not found' });

        // Attach a short-lived presigned playback URL so the recorded seminar's audio
        // streams directly from R2 - same pattern recordingController uses for recordings.
        if (seminar.recordingId?.r2Key) {
            try {
                seminar.recordingId.playbackUrl = await r2StorageService.getR2DownloadPresignedUrl(seminar.recordingId.r2Key);
            } catch (err) {
                console.error('Seminar recording playback URL error:', err.message);
            }
        }

        res.status(200).json(seminar);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateSeminar = async (req, res) => {
    try {
        const seminar = await Seminar.findOne({ _id: req.params.id, hostId: req.user.id });
        if (!seminar) {
            return res.status(404).json({ message: 'Seminar not found or unauthorized' });
        }

        const wasDraft = seminar.status === 'draft';
        const wasTerminal = ['completed', 'cancelled'].includes(seminar.status);
        // Locked once a campaign has ever reserved or distributed funds - not just while a
        // balance remains held, so terms can't be edited after full distribution either.
        const hadActiveHold = seminar.rewardEnabled && (seminar.rewardHeldAmount > 0 || seminar.rewardRecipientsCount > 0);

        // Once coins are reserved for a campaign, its terms are locked - the seminar
        // must be completed/cancelled (which refunds the unused hold) before it can change.
        const rewardFieldsChanged = ['rewardEnabled', 'rewardPerUser', 'rewardMaxRecipients'].some(
            f => req.body[f] !== undefined && req.body[f] !== seminar[f]
        );
        if (hadActiveHold && rewardFieldsChanged) {
            return res.status(400).json({ message: 'Reward campaign terms cannot be changed once coins are reserved. Cancel or complete this seminar first.' });
        }

        const fields = ['title', 'abstract', 'category', 'imageUrl', 'location', 'date', 'startTime', 'endTime', 'format', 'hostName', 'hostImageUrl', 'status'];
        fields.forEach(f => {
            if (req.body[f] !== undefined) seminar[f] = req.body[f];
        });
        if (req.body.tags !== undefined) {
            seminar.tags = String(req.body.tags).split(',').map(t => t.trim()).filter(Boolean);
        }
        if (!hadActiveHold) {
            if (req.body.rewardEnabled !== undefined) seminar.rewardEnabled = !!req.body.rewardEnabled;
            if (req.body.rewardPerUser !== undefined) seminar.rewardPerUser = Math.max(0, Number(req.body.rewardPerUser) || 0);
            if (req.body.rewardMaxRecipients !== undefined) seminar.rewardMaxRecipients = Math.max(0, Number(req.body.rewardMaxRecipients) || 0);
        }

        const nowTerminal = ['completed', 'cancelled'].includes(seminar.status);
        const nowDraft = seminar.status === 'draft';

        if (nowTerminal && !wasTerminal) {
            await refundUnusedHold(seminar, req.user.id, req.user.role);
        } else if (wasDraft && !nowDraft && seminar.rewardEnabled && seminar.rewardHeldAmount === 0) {
            const totalRequired = seminar.rewardPerUser * seminar.rewardMaxRecipients;
            try {
                await holdForSeminar(seminar, totalRequired, req.user.id, req.user.role);
            } catch (err) {
                if (err instanceof coinWalletService.InsufficientBalanceError) {
                    return res.status(400).json({
                        message: 'Insufficient available coins to fund this reward campaign.',
                        required: totalRequired,
                        available: req.user.coins
                    });
                }
                throw err;
            }
        }

        const updatedSeminar = await seminar.save();
        res.status(200).json(updatedSeminar);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteSeminar = async (req, res) => {
    try {
        const seminar = await Seminar.findOne({ _id: req.params.id, hostId: req.user.id });
        if (!seminar) {
            return res.status(404).json({ message: 'Seminar not found or unauthorized' });
        }

        await refundUnusedHold(seminar, req.user.id, req.user.role);
        await seminar.deleteOne();
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.registerForSeminar = async (req, res) => {
    try {
        const seminarId = req.params.id;
        const userId = req.user.id;

        const seminar = await Seminar.findById(seminarId);
        if (!seminar) return res.status(404).json({ message: 'Seminar not found' });

        const existing = await Registration.findOne({ userId, seminarId });
        if (existing) return res.status(400).json({ message: 'Already registered' });

        // Registration always succeeds if not a duplicate - reward distribution below is
        // a best-effort atomic sub-step that never blocks the join itself.
        const registration = await Registration.create({ userId, seminarId });

        if (seminar.rewardEnabled && seminar.rewardPerUser > 0) {
            const session = await mongoose.startSession();
            try {
                await session.withTransaction(async () => {
                    const claimedSeminar = await Seminar.findOneAndUpdate(
                        { _id: seminarId, rewardRecipientsCount: { $lt: seminar.rewardMaxRecipients } },
                        { $inc: { rewardRecipientsCount: 1, rewardHeldAmount: -seminar.rewardPerUser } },
                        { new: true, session }
                    );
                    if (!claimedSeminar) return; // slots full - no reward, registration still stands

                    await coinWalletService.spendHeldCoins(seminar.hostId, seminar.rewardPerUser, {
                        actorId: userId,
                        actorRole: req.user.role,
                        auditAction: 'seminar_reward_spent',
                        relatedEntityType: 'Seminar',
                        relatedEntityId: seminar._id,
                        auditMetadata: { relatedUserId: userId }
                    }, session);

                    await coinWalletService.creditCoins(userId, seminar.rewardPerUser, {
                        type: 'seminar_reward_received',
                        action: `Reward for joining "${seminar.title}"`,
                        relatedUserId: seminar.hostId,
                        relatedEntityType: 'Seminar',
                        relatedEntityId: seminar._id,
                        actorId: userId,
                        actorRole: req.user.role,
                        auditAction: 'seminar_reward_received'
                    }, session);

                    registration.rewardClaimed = true;
                    registration.rewardAmount = seminar.rewardPerUser;
                    await registration.save({ session });

                    await Notification.create([{
                        userId,
                        type: 'seminar_reward_received',
                        message: `You earned ${seminar.rewardPerUser} coins for joining "${seminar.title}"!`,
                        link: '/app/courses/seminars'
                    }], { session });
                });
            } catch (err) {
                console.error('Seminar reward distribution failed (registration still stands):', err);
            } finally {
                session.endSession();
            }
        }

        res.status(201).json(registration);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getRegistrations = async (req, res) => {
    try {
        const registrations = await Registration.find({ userId: req.user.id });
        res.status(200).json(registrations);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Host starts the live broadcast - flips status to 'live' and notifies
//          every registered attendee in real time (socket) and durably (Notification).
// @route   POST /api/v1/seminars/:id/start
// @access  Private (host only)
exports.startSeminar = async (req, res) => {
    try {
        const seminar = await Seminar.findOne({ _id: req.params.id, hostId: req.user.id });
        if (!seminar) {
            return res.status(404).json({ message: 'Seminar not found or unauthorized' });
        }
        if (seminar.status === 'live') {
            return res.status(400).json({ message: 'Seminar is already live' });
        }
        if (['completed', 'cancelled'].includes(seminar.status)) {
            return res.status(400).json({ message: 'This seminar has already ended' });
        }

        seminar.status = 'live';
        seminar.actualStartTime = new Date();
        await seminar.save();

        const registrations = await Registration.find({ seminarId: seminar._id }).select('userId');

        if (registrations.length > 0) {
            await Notification.insertMany(registrations.map((r) => ({
                userId: r.userId,
                type: 'seminar_live',
                message: `"${seminar.title}" is live now!`,
                link: '/app/courses/seminars'
            })));
        }

        const io = socket.getIO();
        registrations.forEach((r) => {
            io.to(r.userId.toString()).emit('seminar_live', {
                seminarId: seminar._id.toString(),
                title: seminar.title
            });
        });

        res.status(200).json(seminar);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Host ends the live broadcast - finalizes the recording/transcript from the
//          accumulated live speech-to-text and kicks off summarization. No Whisper call
//          needed: the text already came from the host's live Deepgram session, same
//          bypass pattern used for live/Deepgram-sourced recordings elsewhere.
// @route   POST /api/v1/seminars/:id/end
// @access  Private (host only)
exports.endSeminar = async (req, res) => {
    try {
        const seminar = await Seminar.findOne({ _id: req.params.id, hostId: req.user.id });
        if (!seminar) {
            return res.status(404).json({ message: 'Seminar not found or unauthorized' });
        }
        if (seminar.status !== 'live') {
            return res.status(400).json({ message: 'Seminar is not currently live' });
        }

        const { rawText, r2Key, mimeType, fileSizeBytes } = req.body;

        const recording = await Recording.create({
            userId: req.user.id,
            title: seminar.title,
            mimeType: mimeType || 'audio/webm',
            fileSizeBytes: fileSizeBytes || 0,
            // r2Key is the durable reference once uploaded - mirrors createRecordingDraft's
            // fallback for the case where the audio upload hasn't finished landing yet.
            s3Key: r2Key || `pending-${Date.now()}`,
            r2Key: r2Key || undefined,
            status: 'uploaded'
        });

        const transcript = await Transcript.create({
            recordingId: recording._id,
            userId: req.user.id,
            text: rawText || '(No audio detected or transcription empty)',
            whisperModel: 'skipped-via-Deepgram-live'
        });

        recording.transcriptId = transcript._id;
        await recording.save();

        seminar.status = 'completed';
        seminar.actualEndTime = new Date();
        seminar.recordingId = recording._id;
        seminar.transcriptId = transcript._id;

        await refundUnusedHold(seminar, req.user.id, req.user.role);
        await seminar.save();

        await summarizationQueue.add('summarize', {
            transcriptId: transcript._id,
            userId: req.user.id,
            // Not yet consumed by the worker - reserved for the fan-out-to-all-attendees
            // step, which will emit summary_complete/Notifications to every Registration
            // for this seminar instead of just the host.
            seminarId: seminar._id,
            language: 'English'
        });

        res.status(200).json(seminar);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports._internal = { holdForSeminar, refundUnusedHold };
