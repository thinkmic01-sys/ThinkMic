const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Transcript = require('../models/Transcript');
const Recording = require('../models/Recording');
const Summary = require('../models/Summary');
const Report = require('../models/Report');
const { transcriptionQueue, summarizationQueue } = require('../queues');
const r2StorageService = require('../services/r2StorageService');

// Locale codes used consistently across deepgramService.js/SpeechWorkspace.jsx (en-US, ur-PK)
const SUPPORTED_LOCALES = ['en-US', 'ur-PK'];
const LOCALE_LANGUAGE_NAMES = { 'en-US': 'English', 'ur-PK': 'Urdu' };

// Whisper (openaiService.transcribeAudio) expects the raw locale code
const normalizeLocale = (locale) => SUPPORTED_LOCALES.includes(locale) ? locale : 'en-US';
// The AI summary prompt (openaiService.generateSummary) uses `language` as a natural-language
// instruction ("write entirely in ${language}"), not a locale code, so it needs the plain name
const localeToLanguageName = (locale) => LOCALE_LANGUAGE_NAMES[normalizeLocale(locale)];

// Browsers report mimetype with codec params (e.g. "audio/webm;codecs=opus") - store the clean
// base type so playback <audio> tags and format displays elsewhere in the app stay consistent
const cleanMimeType = (mimetype) => (mimetype || '').split(';')[0].trim() || 'audio/webm';

// For any recording stored in R2 (recording.r2Key set), attaches a short-lived
// presigned playback URL so the frontend <audio> element streams directly from
// R2 with zero server bandwidth. Locally-stored recordings pass through untouched.
const attachPlaybackUrls = async (recordings) => {
    return Promise.all(recordings.map(async (recording) => {
        const plain = recording.toObject ? recording.toObject() : recording;
        if (plain.r2Key) {
            try {
                plain.playbackUrl = await r2StorageService.getR2DownloadPresignedUrl(plain.r2Key);
            } catch (err) {
                console.error('R2 Playback URL Error:', err.message);
            }
        }
        return plain;
    }));
};
// @desc    Generate a presigned URL for a direct browser-to-R2 upload
// @route   GET /api/v1/recordings/upload-url
// @access  Private
exports.getUploadUrl = async (req, res) => {
    try {
        const { mimeType } = req.query;

        if (!mimeType || !mimeType.startsWith('audio/')) {
            return res.status(400).json({ message: 'Invalid or missing audio mimeType' });
        }

        if (!r2StorageService.isR2Configured()) {
            // Graceful fallback: no R2 credentials in this environment, so tell the
            // client to use the existing local multipart upload route instead.
            return res.status(200).json({
                storage: 'local',
                message: 'R2 is not configured. Use POST /api/v1/recordings for local upload instead.'
            });
        }

        // Determine extension based on mimeType (e.g., 'audio/webm' -> 'webm')
        const ext = mimeType.split('/')[1].split(';')[0];

        // Pre-generate the Mongo _id this recording will use once finalized, so the R2 key
        // is partitioned exactly as recordings/{userId}/{recordingId}.{ext} - keeping the R2
        // object and its Mongo document permanently tied together (tenant isolation, easy audits).
        const recordingId = new mongoose.Types.ObjectId();
        const r2Key = `recordings/${req.user._id}/${recordingId}.${ext}`;

        const uploadUrl = await r2StorageService.getR2UploadPresignedUrl(r2Key, mimeType, 300);

        res.status(200).json({
            uploadUrl,
            r2Key,
            recordingId,
            storage: 'r2',
            message: 'Presigned R2 upload URL generated'
        });
    } catch (error) {
        console.error('R2 Presigned URL Error:', error);
        res.status(500).json({ message: 'Failed to generate upload URL', error: error.message });
    }
};

// @desc    Upload audio locally
// @route   POST /api/v1/recordings
// @access  Private
exports.uploadAudioLocal = async (req, res) => {
    try {
        // req.file is provided by the Multer middleware
        if (!req.file) {
            return res.status(400).json({ message: 'No audio file provided' });
        }

        // Create the recording document in the database
        const recordingData = {
            userId: req.user._id,
            title: req.body.title || 'Untitled Research Audio',
            mimeType: cleanMimeType(req.file.mimetype),
            fileSizeBytes: req.file.size,
            s3Key: req.file.filename, // We temporarily store the local filename here
            status: 'uploaded'
        };

        if (req.body.projectId) {
            recordingData.projectId = req.body.projectId;
        }

        const recording = await Recording.create(recordingData);

        if (req.body.sttEngine === 'Browser' || req.body.sttEngine === 'Deepgram' || req.body.rawText !== undefined) {
            // Bypass Whisper: Create transcript directly and enqueue summarization
            const transcript = await Transcript.create({
                recordingId: recording._id,
                userId: req.user._id,
                text: req.body.rawText || '(No audio detected or transcription empty)',
                whisperModel: `skipped-via-${req.body.sttEngine || 'live-stt'}`
            });

            // Mirrors transcriptionWorker.js's Whisper path - without this, Recording.transcriptId
            // stays unset for every live (Deepgram/Browser) session, which breaks session restore
            // (getRecordingById's populate('transcriptId') resolves to nothing) and breaks summary
            // linking too (summarizationWorker.js looks up the Recording BY transcriptId).
            recording.transcriptId = transcript._id;
            await recording.save();

            await summarizationQueue.add('summarize', {
                transcriptId: transcript._id,
                userId: req.user._id,
                customPrompt: req.body.customPrompt,
                language: localeToLanguageName(req.body.language),
                length: req.body.length,
                style: req.body.style
            });

            // Notify frontend that transcription is already complete
            const socket = require('../utils/socket');
            socket.getIO().to(req.user._id.toString()).emit('transcription_complete', {
                recordingId: recording._id,
                transcriptId: transcript._id,
                text: req.body.rawText
            });

        } else {
            // Enqueue transcription job
            await transcriptionQueue.add('transcribe', {
                recordingId: recording._id,
                s3Key: req.file.filename,
                userId: req.user._id,
                language: normalizeLocale(req.body.language),
                length: req.body.length,
                style: req.body.style
            });
        }

        res.status(201).json({
            message: 'Audio uploaded successfully',
            recording
        });
    } catch (error) {
        console.error('Local Upload Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get all recordings for the logged-in user
// @route   GET /api/v1/recordings
// @access  Private
exports.getMyRecordings = async (req, res) => {
    try {
        // req.user._id comes from our authMiddleware!
        const recordings = await Recording.find({ userId: req.user._id })
            .sort({ createdAt: -1 }) // Newest first
            .populate('summaryId', 'tags summaryText') // Pull in a snippet of the summary
            .exec();

        const recordingsWithPlayback = await attachPlaybackUrls(recordings);

        res.status(200).json({
            count: recordingsWithPlayback.length,
            recordings: recordingsWithPlayback
        });
    } catch (error) {
        console.error('Fetch Recordings Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get a single recording with its transcript and summary populated
// @route   GET /api/v1/recordings/:id
// @access  Private
exports.getRecordingById = async (req, res) => {
    try {
        const recording = await Recording.findOne({ _id: req.params.id, userId: req.user._id })
            .populate('transcriptId', 'text segments whisperModel editedText')
            .populate('summaryId', 'summaryText tags queries editedSummaryText')
            .exec();

        if (!recording) {
            return res.status(404).json({ message: 'Recording not found' });
        }

        const [recordingWithPlayback] = await attachPlaybackUrls([recording]);

        res.status(200).json({ recording: recordingWithPlayback });
    } catch (error) {
        console.error('Fetch Recording Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Finalize a recording after a direct R2 upload (or create a bare
//          placeholder draft if no r2Key is supplied yet)
// @route   POST /api/v1/recordings/draft
// @access  Private
exports.createRecordingDraft = async (req, res) => {
    try {
        const { title, mimeType, fileSizeBytes, r2Key, recordingId, projectId, sttEngine, rawText } = req.body;

        const recordingData = {
            userId: req.user._id,
            title: title || 'Untitled Research Audio',
            mimeType,
            fileSizeBytes,
            // r2Key is the durable reference once uploaded; s3Key stays required by
            // the schema, so mirror it there too for any code path still keyed on s3Key
            s3Key: r2Key || `pending-${Date.now()}`,
            status: 'uploaded'
        };
        if (r2Key) recordingData.r2Key = r2Key;
        if (projectId) recordingData.projectId = projectId;
        // Keep the Mongo _id in sync with the recordingId issued by GET /upload-url,
        // so the R2 key (recordings/{userId}/{recordingId}.ext) matches this document's _id
        if (recordingId) recordingData._id = recordingId;

        const recording = await Recording.create(recordingData);

        if (r2Key && (sttEngine === 'Browser' || sttEngine === 'Deepgram' || rawText !== undefined)) {
            // Same bypass as uploadAudioLocal: live-recorded audio already has its
            // transcript from the browser/Deepgram, so skip Whisper entirely.
            const transcript = await Transcript.create({
                recordingId: recording._id,
                userId: req.user._id,
                text: rawText || '(No audio detected or transcription empty)',
                whisperModel: `skipped-via-${sttEngine || 'live-stt'}`
            });

            // See the matching comment in uploadAudioLocal - without this, session restore
            // and summary linking both silently break for this recording.
            recording.transcriptId = transcript._id;
            await recording.save();

            await summarizationQueue.add('summarize', {
                transcriptId: transcript._id,
                userId: req.user._id,
                customPrompt: req.body.customPrompt,
                language: localeToLanguageName(req.body.language),
                length: req.body.length,
                style: req.body.style
            });

            const socket = require('../utils/socket');
            socket.getIO().to(req.user._id.toString()).emit('transcription_complete', {
                recordingId: recording._id,
                transcriptId: transcript._id,
                text: rawText
            });
        } else if (r2Key) {
            // Only enqueue Whisper transcription once the audio actually exists in R2
            await transcriptionQueue.add('transcribe', {
                recordingId: recording._id,
                r2Key,
                storage: 'r2',
                userId: req.user._id,
                language: normalizeLocale(req.body.language),
                length: req.body.length,
                style: req.body.style
            });
        }

        res.status(201).json({ recording });
    } catch (error) {
        console.error('Create Recording Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete a recording and cascade-clean every associated resource so
//          nothing is ever left orphaned in R2 or MongoDB (audio, transcript,
//          summary, and any reports built from this recording - whether linked
//          via recordingId directly or via the summary they were generated from)
// @route   DELETE /api/v1/recordings/:id
// @access  Private
exports.deleteRecording = async (req, res) => {
    try {
        const recording = await Recording.findOne({ _id: req.params.id, userId: req.user._id });
        if (!recording) {
            return res.status(404).json({ message: 'Recording not found' });
        }

        const transcript = await Transcript.findOne({ recordingId: recording._id });
        const summary = recording.summaryId
            ? await Summary.findById(recording.summaryId)
            : (transcript ? await Summary.findOne({ transcriptId: transcript._id }) : null);

        // reportGenWorker.js links a Report to its source via EITHER recordingId or
        // summaryId - match both so a report never survives its recording as an orphan.
        const reportOrConditions = [{ recordingId: recording._id }];
        if (summary) reportOrConditions.push({ summaryId: summary._id });
        const reports = await Report.find({ $or: reportOrConditions });

        // 1. Delete the audio object itself (R2 or local disk)
        if (recording.r2Key) {
            await r2StorageService.deleteR2Object(recording.r2Key).catch((err) =>
                console.error('R2 audio delete failed:', err.message));
        } else if (recording.s3Key && !recording.s3Key.startsWith('pending-')) {
            fs.unlink(path.join(__dirname, '../uploads', recording.s3Key), () => {}); // best-effort
        }

        // 2. Delete every report's generated files (R2 or local), then the Report docs
        for (const report of reports) {
            if (report.pdfR2Key) await r2StorageService.deleteR2Object(report.pdfR2Key).catch((err) =>
                console.error('R2 report PDF delete failed:', err.message));
            if (report.docxR2Key) await r2StorageService.deleteR2Object(report.docxR2Key).catch((err) =>
                console.error('R2 report DOCX delete failed:', err.message));
            if (report.pdfLocalPath) fs.unlink(path.join(__dirname, '..', report.pdfLocalPath), () => {});
            if (report.docxLocalPath) fs.unlink(path.join(__dirname, '..', report.docxLocalPath), () => {});
        }
        if (reports.length > 0) {
            await Report.deleteMany({ _id: { $in: reports.map((r) => r._id) } });
        }

        // 3. Delete the Summary and Transcript documents
        if (summary) await Summary.deleteOne({ _id: summary._id });
        if (transcript) await Transcript.deleteOne({ _id: transcript._id });

        // 4. Finally, delete the Recording itself
        await Recording.deleteOne({ _id: recording._id });

        res.status(200).json({
            message: 'Recording and all associated data deleted successfully',
            deleted: {
                recording: true,
                transcript: !!transcript,
                summary: !!summary,
                reports: reports.length
            }
        });
    } catch (error) {
        console.error('Delete Recording Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};