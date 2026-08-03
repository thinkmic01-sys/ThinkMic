const Transcript = require('../models/Transcript');
const Recording = require('../models/Recording');
const { transcriptionQueue, summarizationQueue } = require('../queues');

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
// const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
// const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
// const { v4: uuidv4 } = require('uuid');

// Initialize the S3 Client
// const s3Client = new S3Client({
//     region: process.env.AWS_REGION,
//     credentials: {
//         accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//         secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
//     }
// });

// @desc    Generate a presigned URL for direct S3 upload
// @route   GET /api/v1/recordings/upload-url
// @access  Private
// exports.getUploadUrl = async (req, res) => {
//     try {
//         const { mimeType } = req.query;
//
//         if (!mimeType || !mimeType.startsWith('audio/')) {
//             return res.status(400).json({ message: 'Invalid or missing audio mimeType' });
//         }
//
//         // Determine extension based on mimeType (e.g., 'audio/webm' -> 'webm')
//         const ext = mimeType.split('/')[1].split(';')[0];
//
//         // Construct the secure S3 Key: recordings/{userId}/{uuid}.{ext}[cite: 1]
//         const s3Key = `recordings/${req.user._id}/${uuidv4()}.${ext}`;
//
//         const command = new PutObjectCommand({
//             Bucket: process.env.S3_BUCKET_NAME,
//             Key: s3Key,
//             ContentType: mimeType
//         });
//
//         // Generate the URL with a 5-minute expiration limit[cite: 1]
//         const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
//
//         res.status(200).json({
//             uploadUrl,
//             s3Key,
//             message: 'Presigned URL generated successfully'
//         });
//     } catch (error) {
//         console.error('S3 Presigned URL Error:', error);
//         res.status(500).json({ message: 'Failed to generate upload URL', error: error.message });
//     }
// };

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

        res.status(200).json({
            count: recordings.length,
            recordings
        });
    } catch (error) {
        console.error('Fetch Recordings Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create a placeholder recording (Pre-upload step)
// @route   POST /api/v1/recordings
// @access  Private
exports.createRecordingDraft = async (req, res) => {
    try {
        const { title, mimeType, fileSizeBytes } = req.body;

        const recording = await Recording.create({
            userId: req.user._id,
            title: title || 'Untitled Research Audio',
            mimeType,
            fileSizeBytes,
            s3Key: `pending-${Date.now()}`, // Temporary placeholder until S3 upload
            status: 'uploaded'
        });

        res.status(201).json({ recording });
    } catch (error) {
        console.error('Create Recording Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};