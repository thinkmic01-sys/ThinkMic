import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from 'react-redux';
import { login, logout } from '../../store/slices/authSlice';
import api from '../../services/api';
import axios from 'axios';
import deepgramService from '../../services/deepgramService';
import { getMicStream } from '../../services/micDevice';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../../config';

// Probes for a codec MediaRecorder can actually use in this browser - Safari/iOS don't support
// audio/webm at all, so a hardcoded mimeType silently breaks recording there
const getSupportedAudioMimeType = () => {
    const types = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/aac',
        'audio/ogg;codecs=opus'
    ];
    for (const t of types) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) {
            return t;
        }
    }
    return ''; // Fallback to browser default
};

const getExtensionForMimeType = (mimeType) => {
    if (!mimeType) return 'webm';
    if (mimeType.includes('mp4')) return 'mp4';
    if (mimeType.includes('aac')) return 'aac';
    if (mimeType.includes('ogg')) return 'ogg';
    return 'webm';
};

// openaiService.generateSummary uses `language` as a natural-language prompt instruction
// ("write entirely in ${language}"), not a locale code - convert before sending it, mirroring
// the same mapping backend/controllers/recordingController.js applies on the upload path
const LOCALE_LANGUAGE_NAMES = { 'en-US': 'English', 'ur-PK': 'Urdu' };
const localeToLanguageName = (locale) => LOCALE_LANGUAGE_NAMES[locale] || 'English';

// Popular display fonts for the Speech-to-Text transcript, keyed by locale. 'default' leaves
// the font-family untouched (English falls back to the page's base sans-serif; Urdu falls back
// to the .font-urdu stack in index.css). Only Noto Nastaliq Urdu is loaded via Google Fonts
// (see index.html) - the other Urdu options render correctly for users who already have those
// fonts installed locally and fall back to a generic serif otherwise, same as .font-urdu already did.
const TRANSCRIPT_FONT_OPTIONS = {
    'en-US': [
        { value: 'default', label: 'Default' },
        { value: 'times', label: 'Times New Roman', stack: "'Times New Roman', Times, serif" },
        { value: 'georgia', label: 'Georgia', stack: "Georgia, 'Times New Roman', serif" },
        { value: 'arial', label: 'Arial', stack: "Arial, Helvetica, sans-serif" },
        { value: 'verdana', label: 'Verdana', stack: "Verdana, Geneva, sans-serif" },
        { value: 'courier', label: 'Courier New', stack: "'Courier New', Courier, monospace" }
    ],
    'ur-PK': [
        { value: 'default', label: 'Default (Jameel Noori Nastaleeq)' },
        { value: 'noto-nastaliq', label: 'Noto Nastaliq Urdu', stack: "'Noto Nastaliq Urdu', serif" },
        { value: 'jameel', label: 'Jameel Noori Nastaleeq', stack: "'Jameel Noori Nastaleeq', serif" },
        { value: 'alvi', label: 'Alvi Nastaleeq', stack: "'Alvi Nastaleeq', serif" }
    ]
};

// Single global slot for an in-progress live session's text, so a refresh/crash mid-recording
// doesn't lose everything spoken so far (audio itself can't be recovered from localStorage -
// only the transcribed text, since MediaRecorder's audio chunks live only in memory).
const DRAFT_STORAGE_KEY = 'thinkmic_speech_draft_v1';

export default function SpeechWorkspace() {
    // --- STATE MANAGEMENT ---
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get('projectId');
    const recordingIdParam = queryParams.get('recordingId');
    const transcriptIdParam = queryParams.get('transcriptId');

    const accessToken = useSelector((state) => state.auth?.accessToken);
    const userId = useSelector((state) => state.auth?.user?.id);
    const [recordingState, setRecordingState] = useState('idle');
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [transcripts, setTranscripts] = useState([]);
    const [interimText, setInterimText] = useState('');
    const [summaryText, setSummaryText] = useState('');
    const [currentTranscriptId, setCurrentTranscriptId] = useState(null);
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [tagInputTopicId, setTagInputTopicId] = useState(null);
    const [newTagValue, setNewTagValue] = useState('');
    const [sttEngine, setSttEngine] = useState('Deepgram'); // Browser, Whisper, Deepgram
    const [language, setLanguage] = useState('en-US'); // en-US, ur-PK
    // Display-only preference (never persisted) - which font renders the transcript text.
    // Keyed against TRANSCRIPT_FONT_OPTIONS[language]; reset to 'default' whenever the
    // language changes since a font choice from one language rarely makes sense in the other.
    const [transcriptFont, setTranscriptFont] = useState('default');
    const recognitionRef = useRef(null);
    const interimTextRef = useRef('');
    const recordingStartTimeRef = useRef(null);
    // Mirrors recordingState for callbacks/closures (e.g. deepgramService.onClose) that would
    // otherwise capture a stale value from whenever startRecording originally ran
    const recordingStateRef = useRef('idle');

    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isLoadingSession, setIsLoadingSession] = useState(false);

    const dispatch = useDispatch();
    // Functionality States
    const [intentMode, setIntentMode] = useState('User-Defined');
    // Each entry's `answer` is filled by handleRunIntentPrompt via the dedicated /intent
    // endpoint - deliberately never touches summaryText, so running a Processing Intent
    // prompt can never clobber the main Intelligence Summary.
    const [customPrompts, setCustomPrompts] = useState([{ id: Date.now(), text: '', answer: '', isAnswering: false }]);
    const [summaryLength, setSummaryLength] = useState('Detailed');
    const [summaryStyle, setSummaryStyle] = useState('Bullets');

    const [expandedTopicId, setExpandedTopicId] = useState(null);
    const [topics, setTopics] = useState([]);
    const [queries, setQueries] = useState([]);

    // --- TRANSCRIPT EDITING (Point 8) & SESSION RESTORE (Point 29) ---
    const [audioPlaybackUrl, setAudioPlaybackUrl] = useState(null);
    const [savedEditedText, setSavedEditedText] = useState(null);
    const [isEditingTranscript, setIsEditingTranscript] = useState(false);
    const [editedTranscriptDraft, setEditedTranscriptDraft] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    // --- LOCAL AUTOSAVE / CRASH RECOVERY (Point 12) ---
    const [recoveredDraft, setRecoveredDraft] = useState(null);
    const autosaveIntervalRef = useRef(null);
    // Server-side draft session (see initLiveSession): set once /recordings/live/start
    // resolves after a fresh recording starts, so autosave and the Stop-time finalize call
    // both have somewhere to write to instead of only ever persisting text at Stop.
    const draftRecordingIdRef = useRef(null);
    const draftTranscriptIdRef = useRef(null);

    // --- DISPLAY TRANSLATION ---
    // null = show the real transcript/summary as-is; a string = show this translation instead.
    // Never persisted server-side and never written back into transcripts/savedEditedText/
    // summaryText, so switching languages back and forth can't corrupt the real content, and
    // editing a transcript always operates on the real (untranslated) text.
    const [translatedTranscriptText, setTranslatedTranscriptText] = useState(null);
    const [translatedSummaryText, setTranslatedSummaryText] = useState(null);
    const [isTranslating, setIsTranslating] = useState(false);
    // The language the current transcript/summary actually exist in - selecting this language
    // again just reverts to the real content instead of calling the translate API.
    const originalContentLanguageRef = useRef('en-US');
    // Caches translate API results per transcriptId+targetLanguage so toggling back and forth
    // between the same two languages doesn't re-call (and re-bill) the AI translation each time.
    const translationCacheRef = useRef({});

    // Custom Toast State
    const [toast, setToast] = useState({ show: false, message: '', type: 'error' });

    const showToast = (message, type = 'error') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type }), 4000);
    };

    const mediaRecorderRef = useRef(null);
    const streamRef = useRef(null);
    const timerIntervalRef = useRef(null);
    const mockTranscriptIntervalRef = useRef(null);
    const fileInputRef = useRef(null);
    const audioChunksRef = useRef([]); // To store audio data during recording
    const socketRef = useRef(null);

    // --- SOCKET.IO REAL-TIME UPDATES ---
    useEffect(() => {
        if (!userId) return;

        const socket = io(API_BASE_URL, {
            withCredentials: true
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected to WebSocket server');
            socket.emit('join', userId);
        });

        socket.on('job_progress', (data) => {
            if (data.status === 'processing') {
                showToast(`AI is processing your ${data.type}...`, 'success');
                setIsGeneratingSummary(true);
            } else if (data.status === 'error') {
                showToast(`Error processing ${data.type}: ${data.error}`, 'error');
                setIsGeneratingSummary(false);
            }
        });

        socket.on('transcription_complete', (data) => {
            showToast('Transcription complete!', 'success');
            // If we already have live transcripts, we might not want to overwrite them with the whisper one,
            // but we absolutely need the transcriptId for summarization.
            setCurrentTranscriptId(data.transcriptId);
            // A plain file upload (Whisper, no live capture) never populates transcripts as it
            // goes - this event is the only moment that text becomes available, so show it here.
            // Guarded to never overwrite an already-progressing live Deepgram/Browser session.
            if (data.text) {
                setTranscripts((prev) => (prev.length > 0 ? prev : [{ time: 0, text: data.text }]));
            }
        });

        socket.on('summarization_complete', (data) => {
            setIsGeneratingSummary(false);
            showToast('Summary generation complete!', 'success');
            if (data.summary) {
                setSummaryText(data.summary);
            }
            if (data.tags && Array.isArray(data.tags)) {
                setTopics(data.tags.map((tag, i) => ({
                    id: Date.now() + i,
                    title: tag,
                    color: ['bg-blue-500', 'bg-green-500', 'bg-[#EAB308]', 'bg-[#075e51]'][i % 4],
                    tags: ['auto-generated']
                })));
            }
            if (data.queries && Array.isArray(data.queries)) {
                setQueries(data.queries);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [userId]);

    // --- SESSION RESUMPTION: hydrate an existing recording from the URL (e.g. a notification
    // or toast "Open Session" link, or a click from Dashboard/Project recent recordings) ---
    useEffect(() => {
        if (!recordingIdParam) return;

        const hydrateSession = async () => {
            setIsLoadingSession(true);
            // Best-effort: the restored recording's true original language isn't reliably
            // known (Transcript.language is often unset for live/bypass sessions), so this
            // just assumes whatever's currently selected - selecting a different language
            // will translate from here.
            setTranslatedTranscriptText(null);
            setTranslatedSummaryText(null);
            translationCacheRef.current = {};
            originalContentLanguageRef.current = language;
            try {
                const res = await api.get(`/recordings/${recordingIdParam}`);
                const rec = res.data.recording;
                if (!rec) return;

                const transcript = rec.transcriptId;
                const summary = rec.summaryId;

                if (transcript) {
                    setCurrentTranscriptId(transcript._id);
                    if (transcript.segments && transcript.segments.length > 0) {
                        setTranscripts(transcript.segments.map((seg) => ({ time: Math.floor(seg.start || 0), text: seg.text })));
                    } else if (transcript.text) {
                        setTranscripts([{ time: 0, text: transcript.text }]);
                    }
                    // A prior manual edit always wins over the raw ASR text (mirrors how
                    // summary.editedSummaryText is preferred below)
                    if (transcript.editedText) {
                        setSavedEditedText(transcript.editedText);
                    }
                } else if (transcriptIdParam) {
                    setCurrentTranscriptId(transcriptIdParam);
                }

                if (rec.playbackUrl) {
                    setAudioPlaybackUrl(rec.playbackUrl);
                }

                if (summary) {
                    setSummaryText(summary.editedSummaryText || summary.summaryText || '');
                    if (Array.isArray(summary.tags)) {
                        setTopics(summary.tags.map((tag, i) => ({
                            id: Date.now() + i,
                            title: tag,
                            color: ['bg-blue-500', 'bg-green-500', 'bg-[#EAB308]', 'bg-[#075e51]'][i % 4],
                            tags: ['auto-generated']
                        })));
                    }
                    if (Array.isArray(summary.queries)) {
                        setQueries(summary.queries);
                    }
                }

                showToast('Session restored — continue where you left off.', 'success');
            } catch (err) {
                console.error('Failed to hydrate session:', err);
                showToast('Could not load the requested research session.', 'error');
            } finally {
                setIsLoadingSession(false);
            }
        };

        hydrateSession();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recordingIdParam]);

    // --- CRASH RECOVERY: on a fresh visit (not an explicit ?recordingId= resume link),
    // check for a leftover local draft from a session that never got saved (e.g. a refresh
    // mid-recording) and offer to bring the transcribed text back ---
    useEffect(() => {
        if (recordingIdParam) return; // explicit resume already handled above
        try {
            const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
            if (!raw) return;
            const draft = JSON.parse(raw);
            if (draft && Array.isArray(draft.transcripts) && draft.transcripts.length > 0) {
                setRecoveredDraft(draft);
            }
        } catch (e) {
            localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const restoreDraft = () => {
        if (!recoveredDraft) return;
        setTranscripts(recoveredDraft.transcripts || []);
        setInterimText(recoveredDraft.interimText || '');
        if (recoveredDraft.language) setLanguage(recoveredDraft.language);
        if (recoveredDraft.sttEngine) setSttEngine(recoveredDraft.sttEngine);
        setTranslatedTranscriptText(null);
        setTranslatedSummaryText(null);
        translationCacheRef.current = {};
        originalContentLanguageRef.current = recoveredDraft.language || language;
        showToast('Recovered transcript text restored. Audio was not recoverable — start a new recording to keep capturing.', 'success');
        setRecoveredDraft(null);
    };

    const discardDraft = () => {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        setRecoveredDraft(null);
    };

    // --- AUTOSAVE: while actively recording/paused, periodically snapshot the transcribed
    // text both to localStorage (instant, survives even if the network/backend is down) and
    // to the server-side draft transcript created by initLiveSession (survives a lost device
    // or cleared browser storage, not just a same-device refresh) ---
    useEffect(() => {
        const isLive = recordingState === 'recording' || recordingState === 'paused';
        if (!isLive) {
            if (autosaveIntervalRef.current) {
                clearInterval(autosaveIntervalRef.current);
                autosaveIntervalRef.current = null;
            }
            return;
        }

        const saveDraft = () => {
            try {
                localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
                    projectId: projectId || null,
                    sttEngine,
                    language,
                    transcripts,
                    interimText: interimTextRef.current,
                    savedAt: Date.now()
                }));
            } catch (e) {
                // localStorage full or unavailable (e.g. private browsing) - autosave is
                // best-effort only, never block recording over it
            }

            if (draftTranscriptIdRef.current) {
                let text = transcripts.map((t) => t.text).join(' ').trim();
                if (interimTextRef.current) text = (text + ' ' + interimTextRef.current).trim();
                api.patch(`/transcriptions/${draftTranscriptIdRef.current}`, { text }).catch((err) => {
                    console.error('Server-side autosave failed:', err);
                });
            }
        };

        saveDraft();
        autosaveIntervalRef.current = setInterval(saveDraft, 8000);
        return () => {
            if (autosaveIntervalRef.current) {
                clearInterval(autosaveIntervalRef.current);
                autosaveIntervalRef.current = null;
            }
        };
    }, [recordingState, transcripts, projectId, sttEngine, language]);

    // --- REFRESH/CLOSE GUARD: browsers only allow the native confirmation prompt on
    // beforeunload (custom text/button labels are ignored for security reasons), but
    // triggering it at all stops an accidental refresh from silently wiping in-progress work.
    // Covers the whole active-session lifecycle, not just live recording: summary generation,
    // file upload, translation, an in-progress transcript edit, and saving that edit.
    useEffect(() => {
        const isLive = recordingState === 'recording' || recordingState === 'paused';
        const isBusy = isLive || isGeneratingSummary || isUploading || isTranslating || isSavingEdit || isEditingTranscript;
        if (!isBusy) return;

        const handleBeforeUnload = (e) => {
            e.preventDefault();
            e.returnValue = '';
            return '';
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [recordingState, isGeneratingSummary, isUploading, isTranslating, isSavingEdit, isEditingTranscript]);

    // --- UPLOAD LOGIC TO BACKEND ---
    // Uploads the audio bytes directly from the browser to R2 (bypassing our backend
    // entirely for the transfer) so upload speed never degrades as concurrent users or
    // file size grow - the Express server only ever handles a small JSON finalize call.
    // Falls back to the old local-multipart route when R2 isn't configured (local dev).
    const uploadAudioToBackend = async (audioBlob, filename, rawText = null, isFileUpload = false) => {
        setIsUploading(true);
        setUploadProgress(0);

        const mimeType = audioBlob.type || 'audio/webm';
        const engineForUpload = isFileUpload ? undefined : sttEngine;
        // A manual file upload (the "Upload" button) has no server-side draft session -
        // only a live-recorded Stop finalizes the one initLiveSession created at Start.
        const existingRecordingId = !isFileUpload ? draftRecordingIdRef.current : null;
        const onUploadProgress = (evt) => {
            if (evt.total) setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
        };

        try {
            const { data: presign } = await api.get('/recordings/upload-url', {
                params: { mimeType, recordingId: existingRecordingId || undefined }
            });

            if (presign.storage === 'r2') {
                // Direct browser -> R2 PUT using the presigned URL. Deliberately uses a
                // bare axios call (not the `api` instance) so no Authorization header or
                // credentials are sent to R2 - only the presigned query signature.
                await axios.put(presign.uploadUrl, audioBlob, {
                    headers: { 'Content-Type': mimeType },
                    onUploadProgress
                });

                await api.post('/recordings/draft', {
                    title: filename || 'Live Workspace Recording',
                    mimeType,
                    fileSizeBytes: audioBlob.size,
                    r2Key: presign.r2Key,
                    recordingId: presign.recordingId,
                    projectId: projectId || undefined,
                    sttEngine: engineForUpload,
                    rawText: (rawText !== null && rawText !== undefined) ? rawText : undefined,
                    language,
                    length: summaryLength,
                    style: summaryStyle
                });
            } else {
                // R2 not configured in this environment - fall back to local multipart upload.
                const formData = new FormData();
                formData.append('audio', audioBlob, filename);
                formData.append('title', filename || 'Live Workspace Recording');
                if (rawText !== null && rawText !== undefined) {
                    formData.append('rawText', rawText);
                }
                if (engineForUpload) {
                    formData.append('sttEngine', engineForUpload);
                }
                formData.append('language', language);
                formData.append('length', summaryLength);
                formData.append('style', summaryStyle);
                if (projectId) {
                    formData.append('projectId', projectId);
                }
                if (existingRecordingId) {
                    formData.append('recordingId', existingRecordingId);
                }

                await api.post('/recordings', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress
                });
            }

            setUploadProgress(100);
            localStorage.removeItem(DRAFT_STORAGE_KEY);
            draftRecordingIdRef.current = null;
            draftTranscriptIdRef.current = null;
            showToast('Audio saved successfully to the server!', 'success');
        } catch (error) {
            console.error("Upload error:", error);
            showToast(`Upload failed: ${error.response?.data?.message || 'Unknown error'}`, 'error');
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    // --- AUDIO & RECORDING LOGIC ---
    const startRecording = async () => {
        try {
            // MUST GET MEDIA STREAM FIRST to avoid browser blocking due to async delay from click
            const stream = await getMicStream();
            streamRef.current = stream;

            if (sttEngine === 'Deepgram') {
                setRecordingState('connecting');
                const connected = await deepgramService.connect(language);
                if (!connected) {
                    setRecordingState('idle');
                    return;
                }
                
                deepgramService.onTranscript = (transcript, isFinal) => {
                    if (isFinal && transcript.trim()) {
                        setTranscripts((prev) => {
                            const latestTime = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
                            return [...prev, { time: latestTime, text: transcript.trim() }];
                        });
                        setInterimText('');
                    } else if (!isFinal) {
                        setInterimText(transcript);
                        interimTextRef.current = transcript;
                    }
                };
                
                deepgramService.onError = (err) => {
                    showToast(err.message || 'Deepgram error', 'error');
                };

                deepgramService.onClose = () => {
                    // Only surface this if we're still actively in a recording session - an
                    // intentional stop already flips isIntentionalDisconnect before disconnecting
                    if (recordingStateRef.current === 'recording' || recordingStateRef.current === 'paused') {
                        showToast('Live transcription connection was lost. Please stop and restart recording.', 'error');
                    }
                };
            }

            // If starting from idle (new session), clear everything out first
            if (recordingState === 'idle') {
                setTranscripts([]);
                setInterimText('');
                setSummaryText('');
                setCurrentTranscriptId(null);
                setTopics([]);
                setSavedEditedText(null);
                setAudioPlaybackUrl(null);
                setRecoveredDraft(null);
                setTranslatedTranscriptText(null);
                setTranslatedSummaryText(null);
                translationCacheRef.current = {};
                originalContentLanguageRef.current = language;

                // Server-side draft: create the Recording+Transcript now so the periodic
                // autosave below (and the Stop-time finalize call) have something to write
                // to, instead of the transcript only ever being persisted once at Stop.
                // Best-effort - if this fails, local recording and the localStorage autosave
                // banner still protect the session, just without server-side durability.
                draftRecordingIdRef.current = null;
                draftTranscriptIdRef.current = null;
                api.post('/recordings/live/start', {
                    title: `Live Workspace Recording - ${new Date().toLocaleString()}`,
                    projectId: projectId || undefined,
                    sttEngine,
                    language
                }).then(({ data }) => {
                    draftRecordingIdRef.current = data.recordingId;
                    draftTranscriptIdRef.current = data.transcriptId;
                    setCurrentTranscriptId(data.transcriptId);
                }).catch((err) => {
                    console.error('Failed to start server-side draft session:', err);
                });
            }
            
            // For Deepgram, we need timeslice chunks. For others, we also need it for the final blob.
            const supportedMimeType = getSupportedAudioMimeType();
            let mediaRecorder;
            try {
                mediaRecorder = supportedMimeType
                    ? new MediaRecorder(stream, { mimeType: supportedMimeType })
                    : new MediaRecorder(stream);
            } catch (recorderError) {
                console.error('Failed to initialize MediaRecorder:', recorderError);
                showToast('This browser does not support any compatible audio recording format.', 'error');
                stream.getTracks().forEach((track) => track.stop());
                setRecordingState('idle');
                if (sttEngine === 'Deepgram') deepgramService.disconnect();
                return;
            }
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = []; // Reset chunks
            recordingStartTimeRef.current = Date.now();

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                    if (sttEngine === 'Deepgram') {
                        deepgramService.sendAudio(event.data);
                    }
                }
            };

            mediaRecorder.onerror = (event) => {
                console.error('MediaRecorder error:', event.error);
                showToast('A recording error occurred. Please stop and try again.', 'error');
            };

            mediaRecorder.onstop = () => {
                // Use the codec MediaRecorder actually negotiated (not a hardcoded guess) so the
                // blob's type - and the extension we upload it with - always match its real content
                const resolvedMimeType = mediaRecorder.mimeType || 'audio/webm';
                const audioBlob = new Blob(audioChunksRef.current, { type: resolvedMimeType });
                const extension = getExtensionForMimeType(resolvedMimeType);

                // For simplicity, we just pass the joined transcript text
                setTranscripts((currentTranscripts) => {
                    if (sttEngine === 'Browser' || sttEngine === 'Deepgram') {
                        let rawText = currentTranscripts.map(t => t.text).join(' ').trim();
                        if (interimTextRef.current) {
                            rawText = (rawText + ' ' + interimTextRef.current).trim();
                        }
                        uploadAudioToBackend(audioBlob, `live-recording-${Date.now()}.${extension}`, rawText);
                    } else {
                        // Whisper
                        uploadAudioToBackend(audioBlob, `live-recording-${Date.now()}.${extension}`);
                    }
                    return currentTranscripts;
                });

                if (sttEngine === 'Deepgram') {
                    deepgramService.disconnect();
                }
            };

            mediaRecorder.start(250); // Collect data in 250ms chunks (Deepgram likes small chunks)
            setRecordingState('recording');

            // --- WEB SPEECH API INTEGRATION (For Browser or Whisper mode) ---
            if (sttEngine === 'Browser' || sttEngine === 'Whisper') {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                if (SpeechRecognition) {
                    if (!recognitionRef.current) {
                        const recognition = new SpeechRecognition();
                        recognition.continuous = true;
                        recognition.interimResults = true;
                        recognition.lang = language;

                        recognition.onstart = () => {};

                        recognition.onresult = (event) => {
                            let interim = '';
                            let finalTranscript = '';

                            for (let i = event.resultIndex; i < event.results.length; i++) {
                                const transcript = event.results[i][0].transcript;
                                if (event.results[i].isFinal) {
                                    finalTranscript += transcript + ' ';
                                } else {
                                    interim += transcript;
                                }
                            }

                            if (finalTranscript.trim()) {
                                setTranscripts((prev) => {
                                    const latestTime = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
                                    return [...prev, { time: latestTime, text: finalTranscript.trim() }];
                                });
                            }
                            setInterimText(interim);
                            interimTextRef.current = interim;
                        };
                        
                        recognition.onend = () => {
                            // Restart recognition if we are still recording
                            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                                try { recognition.start(); } catch(e) {}
                            }
                        };

                        recognitionRef.current = recognition;
                    }
                    // recognitionRef.current is reused across sessions - keep its language in sync
                    // with the current selector in case the user switched languages since last use
                    recognitionRef.current.lang = language;
                    try { recognitionRef.current.start(); } catch(e) {}
                } else if (sttEngine === 'Browser') {
                    showToast("Your browser does not support the Web Speech API. Please use Chrome or select Deepgram/Whisper.", "error");
                }
            }

        } catch (err) {
            console.error("Microphone access denied or error:", err);
            showToast("Error starting recording. Ensure microphone access is allowed.", "error");
        }
    };

    const pauseRecording = () => {
        const recorder = mediaRecorderRef.current;
        if (!recorder) return;

        if (recordingState === 'recording' && recorder.state === 'recording') {
            try {
                recorder.pause();
                setRecordingState('paused');
                try { recognitionRef.current?.stop(); } catch (e) {}
            } catch (e) {
                console.error('Failed to pause recording:', e);
                showToast('Could not pause recording.', 'error');
            }
        } else if (recordingState === 'paused' && recorder.state === 'paused') {
            try {
                recorder.resume();
                setRecordingState('recording');
                try { recognitionRef.current?.start(); } catch (e) {}
            } catch (e) {
                console.error('Failed to resume recording:', e);
                showToast('Could not resume recording.', 'error');
            }
        }
    };

    const stopRecording = () => {
        try {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop(); // This triggers the onstop event defined in startRecording
            }
        } catch (e) {
            console.error('Failed to stop MediaRecorder cleanly:', e);
        }
        try { streamRef.current?.getTracks().forEach(track => track.stop()); } catch (e) {}
        try { recognitionRef.current?.stop(); } catch(e) {}
        setRecordingState('idle');
        setTimeElapsed(0);
    };

    const handleUploadClick = () => fileInputRef.current.click();

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 50 * 1024 * 1024) return showToast("File exceeds the 50MB limit.", "error");
            if (file.type && !file.type.startsWith('audio/')) return showToast("Please select a valid audio file.", "error");
            uploadAudioToBackend(file, file.name, null, true);
        }
        // Allow re-selecting the same file after a previous rejection
        e.target.value = '';
    };

    // --- TRANSCRIPT EDITING (Point 8) ---
    const startEditingTranscript = () => {
        // Always edit the real (untranslated) transcript, never a displayed translation -
        // reverting first avoids the user unknowingly saving translated text as the transcript.
        // Reverts the summary translation too so the language selector and both panels never
        // fall out of sync with each other.
        if (translatedTranscriptText !== null) {
            setTranslatedTranscriptText(null);
            setTranslatedSummaryText(null);
            setLanguage(originalContentLanguageRef.current);
        }
        const currentText = savedEditedText !== null
            ? savedEditedText
            : transcripts.map((t) => t.text).join(' ').trim();
        setEditedTranscriptDraft(currentText);
        setIsEditingTranscript(true);
    };

    const cancelEditingTranscript = () => {
        setIsEditingTranscript(false);
        setEditedTranscriptDraft('');
    };

    const saveEditedTranscript = async () => {
        if (!currentTranscriptId) {
            showToast('No saved transcript to edit yet — stop the recording first.', 'error');
            return;
        }
        setIsSavingEdit(true);
        try {
            await api.patch(`/transcriptions/${currentTranscriptId}`, { editedText: editedTranscriptDraft });
            setSavedEditedText(editedTranscriptDraft);
            setIsEditingTranscript(false);
            showToast('Transcript updated.', 'success');
        } catch (error) {
            console.error('Failed to save transcript edit:', error);
            showToast(`Could not save edit: ${error.response?.data?.message || 'Unknown error'}`, 'error');
        } finally {
            setIsSavingEdit(false);
        }
    };

    // --- DISPLAY TRANSLATION ---
    const handleLanguageChange = async (newLang) => {
        const prevLang = language;
        setLanguage(newLang);
        // The chosen font belongs to the old language's option list - reset to that language's
        // default so we never end up applying e.g. "Times New Roman" to Urdu text.
        setTranscriptFont('default');
        if (newLang === prevLang) return;

        const hasTranscriptContent = savedEditedText !== null || transcripts.length > 0;
        const hasSummaryContent = !!summaryText;
        if (!hasTranscriptContent && !hasSummaryContent) return; // nothing to translate yet

        if (newLang === originalContentLanguageRef.current) {
            // Back to the language this content actually exists in - just revert, no API call
            setTranslatedTranscriptText(null);
            setTranslatedSummaryText(null);
            return;
        }

        const cacheKey = `${currentTranscriptId || 'none'}:${newLang}`;
        const cached = translationCacheRef.current[cacheKey];
        if (cached) {
            setTranslatedTranscriptText(cached.transcriptText);
            setTranslatedSummaryText(cached.summaryText);
            return;
        }

        if (!currentTranscriptId) {
            showToast('No saved transcript to translate yet — stop the recording first.', 'error');
            return;
        }

        setIsTranslating(true);
        try {
            const targetLanguageName = localeToLanguageName(newLang);
            const [transcriptRes, summaryRes] = await Promise.all([
                hasTranscriptContent
                    ? api.post(`/transcriptions/${currentTranscriptId}/translate`, { targetLanguage: targetLanguageName })
                    : Promise.resolve(null),
                hasSummaryContent
                    ? api.post(`/summaries/transcript/${currentTranscriptId}/translate`, { targetLanguage: targetLanguageName })
                    : Promise.resolve(null)
            ]);

            const translatedTranscript = transcriptRes ? transcriptRes.data.translatedText : null;
            const translatedSummary = summaryRes ? summaryRes.data.translatedText : null;

            setTranslatedTranscriptText(translatedTranscript);
            setTranslatedSummaryText(translatedSummary);
            translationCacheRef.current[cacheKey] = { transcriptText: translatedTranscript, summaryText: translatedSummary };
        } catch (error) {
            console.error('Translation failed:', error);
            showToast(`Translation failed: ${error.response?.data?.message || 'Unknown error'}`, 'error');
        } finally {
            setIsTranslating(false);
        }
    };

    // --- INTERACTIVE FUNCTIONALITY HANDLERS ---
    const handleAddTopicTag = (topicId) => {
        setTagInputTopicId(topicId);
        setNewTagValue('');
    };

    const submitNewTag = (topicId) => {
        if (newTagValue && newTagValue.trim() !== '') {
            setTopics(topics.map(t => t.id === topicId ? { ...t, tags: [...t.tags, newTagValue.trim()] } : t));
        }
        setTagInputTopicId(null);
        setNewTagValue('');
    };

    const handleRemoveTopicTag = (topicId, tagToRemove) => {
        setTopics(topics.map(t => t.id === topicId ? { ...t, tags: t.tags.filter(tag => tag !== tagToRemove) } : t));
    };

    const handleIntentTagClick = (tagText) => {
        setCustomPrompts(prev => {
            const newPrompts = [...prev];
            const lastIdx = newPrompts.length - 1;
            const currentText = newPrompts[lastIdx].text;
            newPrompts[lastIdx].text = currentText ? `${currentText}, ${tagText}` : tagText;
            return newPrompts;
        });
    };

    const triggerAIProcessing = async () => {
        if (!currentTranscriptId) {
            return showToast("No transcript available to process yet. Wait for upload to finish.", "error");
        }
        showToast(`Requesting AI processing...`, 'success');
        try {
            await api.post(`/summaries/transcript/${currentTranscriptId}/regenerate`, {
                length: summaryLength,
                style: summaryStyle,
                language: localeToLanguageName(language)
            });
            showToast("AI Job Queued! Waiting for results...", "success");
        } catch (err) {
            showToast(err.response?.data?.message || "Server error triggering AI.", "error");
        }
    };

    const handleSummarize = () => triggerAIProcessing();

    // Runs a single Processing Intent prompt against the transcript captured so far and shows
    // the answer in that prompt's own card in the Answers panel - deliberately synchronous
    // (not queued) and never persisted, same pattern as the transcript/summary translate calls,
    // and deliberately kept separate from triggerAIProcessing so it can never overwrite the
    // main Intelligence Summary.
    const handleRunIntentPrompt = async (promptId) => {
        const promptObj = customPrompts.find(p => p.id === promptId);
        if (!promptObj || !promptObj.text.trim()) {
            return showToast("Enter a prompt first.", "error");
        }
        if (!currentTranscriptId) {
            return showToast("No transcript available to process yet. Wait for upload to finish.", "error");
        }
        setCustomPrompts(prev => prev.map(p => p.id === promptId ? { ...p, isAnswering: true } : p));
        try {
            const response = await api.post(`/summaries/transcript/${currentTranscriptId}/intent`, {
                prompt: promptObj.text,
                language: localeToLanguageName(language)
            });
            setCustomPrompts(prev => prev.map(p => p.id === promptId ? { ...p, answer: response.data.answer, isAnswering: false } : p));
        } catch (err) {
            showToast(err.response?.data?.message || "Server error processing prompt.", "error");
            setCustomPrompts(prev => prev.map(p => p.id === promptId ? { ...p, isAnswering: false } : p));
        }
    };

    const handleRunResearch = async () => {
        if (!queries || queries.length === 0) {
            return showToast("No research queries generated yet.", "warning");
        }
        
        try {
            showToast("Initiating web research...", "success");
            const response = await api.post('/search/sessions', {
                queries: queries,
                config: { gl: "us", hl: "en" }
            });
            
            // Navigate to Research module - carries transcriptId through so a report created
            // from these results can reliably link back to this transcript (see
            // ResearchResults.jsx/reportGenWorker.js) instead of having no way to find it.
            const resultParams = new URLSearchParams();
            if (projectId) resultParams.set('projectId', projectId);
            if (currentTranscriptId) resultParams.set('transcriptId', currentTranscriptId);
            const queryString = resultParams.toString();
            navigate('/app/research/results' + (queryString ? `?${queryString}` : ''));
        } catch (error) {
            showToast(error.response?.data?.message || "Failed to start research", "error");
        }
    };

    useEffect(() => {
        recordingStateRef.current = recordingState;
    }, [recordingState]);

    useEffect(() => {
        if (recordingState === 'recording') {
            timerIntervalRef.current = setInterval(() => setTimeElapsed((prev) => prev + 1), 1000);
        } else {
            clearInterval(timerIntervalRef.current);
        }
        return () => {
            clearInterval(timerIntervalRef.current);
        };
    }, [recordingState]);

    // Ensure the mic, MediaRecorder, and live STT connection are fully released if the user
    // navigates away mid-recording, rather than leaking an open microphone/WebSocket
    useEffect(() => {
        return () => {
            try { streamRef.current?.getTracks().forEach((track) => track.stop()); } catch (e) {}
            try {
                if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                    // Detach handlers first so unmounting doesn't trigger a silent background upload
                    mediaRecorderRef.current.ondataavailable = null;
                    mediaRecorderRef.current.onstop = null;
                    mediaRecorderRef.current.onerror = null;
                    mediaRecorderRef.current.stop();
                }
            } catch (e) {}
            try { recognitionRef.current?.stop(); } catch (e) {}
            try { deepgramService.disconnect(); } catch (e) {}
            clearInterval(timerIntervalRef.current);
        };
    }, []);

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Mirrors the Intelligence Summary panel's (isUploading || isGeneratingSummary) skeleton
    // trigger, but only while there's nothing to show yet - a live Deepgram/Browser session
    // already has spoken text on screen by the time Stop triggers isUploading, and that text
    // should keep showing through the finalize upload rather than being replaced by a skeleton.
    const showTranscriptSkeleton = isLoadingSession || isTranslating ||
        ((isUploading || isGeneratingSummary) && transcripts.length === 0 && savedEditedText === null);

    const fontOptionsForLanguage = TRANSCRIPT_FONT_OPTIONS[language] || TRANSCRIPT_FONT_OPTIONS['en-US'];
    // undefined for 'default' - lets the .font-urdu class (Urdu) or the page's base font
    // (English) keep governing the family, exactly as before this feature existed.
    const transcriptFontStyle = { fontFamily: fontOptionsForLanguage.find(f => f.value === transcriptFont)?.stack };

    return (
        <div className="flex flex-col relative w-full h-[calc(100vh-64px)] bg-[#F4F9F8] overflow-hidden font-sans">
            <style>{`
                @keyframes cyanPulse {
                    0% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.4); }
                    70% { box-shadow: 0 0 0 8px rgba(234, 179, 8, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0); }
                }
                .live-pulse {
                    animation: cyanPulse 1.8s infinite;
                }
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e0e2eb; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #c7c5d3; }
                .custom-tooltip { position: relative; }
                .custom-tooltip::after {
                    content: attr(data-tooltip);
                    position: absolute;
                    top: calc(100% + 8px);
                    left: 50%;
                    transform: translateX(-50%);
                    background-color: #075e51;
                    color: white;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: bold;
                    white-space: nowrap;
                    opacity: 0;
                    visibility: hidden;
                    transition: opacity 0.2s;
                    z-index: 50;
                    pointer-events: none;
                }
                .custom-tooltip:hover::after {
                    opacity: 1;
                    visibility: visible;
                }
            `}</style>

            {/* --- TOP CONTROL BAR (RESPONSIVE) --- */}
            <div className="bg-white border-b border-[#e0e2eb] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between p-4 md:px-8 md:h-20 gap-4 shrink-0 z-10">

                {/* Left: Input Source & Engine Selector */}
                <div className="flex items-center gap-3 shrink-0 flex-wrap">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-md flex items-center justify-center text-[#EAB308] bg-black shadow-sm">
                        <span className="material-symbols-outlined text-[18px] md:text-[22px]">mic</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="hidden sm:block text-[10px] font-bold text-[#777682] uppercase tracking-wider mb-0.5">STT Engine</span>
                        <div className="relative">
                            <select 
                                value={sttEngine}
                                onChange={(e) => setSttEngine(e.target.value)}
                                disabled={recordingState !== 'idle'}
                                className="appearance-none bg-transparent font-bold text-[13px] md:text-sm text-[#075e51] hover:text-[#097969] outline-none cursor-pointer pr-5 transition-colors disabled:opacity-50"
                            >
                                <option value="Deepgram">Deepgram (Live Premium)</option>
                                <option value="Whisper">Whisper (High Accuracy)</option>
                                <option value="Browser">Browser API (Fast, Free)</option>
                            </select>
                            <span className="material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2 text-[16px] text-[#075e51] pointer-events-none disabled:opacity-50">expand_more</span>
                        </div>
                    </div>
                </div>

                {/* Center: Recording Status Indicator */}
                <div className="flex flex-col items-center gap-1 w-full md:w-auto shrink-0 order-first md:order-none">
                    <div className="bg-[#075e51] text-white rounded-md px-4 sm:px-5 py-2 flex items-center justify-between gap-4 md:gap-6 shadow-sm w-full md:w-[340px] border border-[#097969]">
                        <div className="flex items-center gap-2 md:gap-3">
                            <span className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full ${
                                recordingState === 'recording' ? 'bg-[#ba1a1a] animate-pulse'
                                    : recordingState === 'connecting' ? 'bg-[#e3b505] animate-pulse'
                                    : recordingState === 'paused' ? 'bg-[#e3b505]'
                                    : 'bg-[#777682]'
                            }`}></span>
                            <span className="text-[11px] md:text-xs font-bold tracking-widest text-[#bfc2ff]">
                                {recordingState === 'connecting' ? 'INIT' : recordingState === 'paused' ? 'PAUSED' : 'REC'}
                            </span>
                            <span className="font-mono font-bold text-[13px] md:text-sm tracking-wide text-white">{formatTime(timeElapsed)}</span>
                        </div>
                        <div className="flex items-center gap-[2px] md:gap-[3px] h-4 md:h-5">
                            {[1, 2, 4, 6, 8, 5, 3, 7, 9, 6, 4, 2].map((bar, i) => (
                                <div key={i} className="w-[3px] md:w-1 bg-[#CA8A04] rounded-full transition-all duration-150"
                                     style={{ height: recordingState === 'recording' ? `${Math.max(20, Math.random() * 100)}%` : '4px', opacity: recordingState === 'idle' ? 0.3 : 1 }}></div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Audio Controls */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-end md:self-auto">
                    {/* Combined Start/Pause/Resume Button */}
                    <button 
                        onClick={() => {
                            if (recordingState === 'idle') startRecording();
                            else pauseRecording();
                        }}
                        disabled={isUploading || recordingState === 'connecting'}
                        data-tooltip={recordingState === 'idle' ? 'Start' : (recordingState === 'connecting' ? 'Connecting...' : (recordingState === 'paused' ? 'Resume' : 'Pause'))}
                        className={`custom-tooltip w-9 h-9 md:w-10 md:h-10 rounded-md border flex items-center justify-center transition-colors ${recordingState === 'idle' ? 'border-[#e0e2eb] text-[#00696e] bg-white hover:bg-[#eef0f9] shadow-sm' : (recordingState === 'connecting' ? 'border-[#e0e2eb] text-[#777682] bg-[#F4F9F8] cursor-wait' : (recordingState === 'paused' ? 'bg-[#e0e0ff] border-[#bfc2ff] text-[#075e51]' : 'border-[#e0e2eb] text-[#075e51] bg-white hover:bg-[#eef0f9] shadow-sm'))}`}
                    >
                        <span className={`material-symbols-outlined text-[20px] md:text-[24px] ${recordingState === 'connecting' ? 'animate-spin' : ''}`}>
                            {recordingState === 'idle' ? 'play_arrow' : (recordingState === 'connecting' ? 'sync' : (recordingState === 'paused' ? 'play_arrow' : 'pause'))}
                        </span>
                    </button>
                    
                    <button onClick={stopRecording} disabled={recordingState === 'idle' || isUploading}
                            data-tooltip="Stop"
                            className={`custom-tooltip w-9 h-9 md:w-10 md:h-10 rounded-md border flex items-center justify-center transition-colors ${recordingState === 'idle' ? 'border-[#e0e2eb] text-[#c7c5d3] cursor-not-allowed' : 'border-[#ffdad6] text-[#ba1a1a] bg-[#ffdad6] hover:bg-[#ba1a1a]/10 shadow-sm'}`}>
                        <span className="material-symbols-outlined text-[16px] md:text-[18px]">stop</span>
                    </button>

                    <div className="hidden sm:block h-6 w-px bg-[#e0e2eb] mx-1"></div>

                    <div className={`hidden lg:flex font-bold text-xs px-4 py-2 rounded-md items-center gap-2 border shadow-sm transition-opacity duration-200 ${isUploading ? 'opacity-100 bg-[#F4F9F8] text-[#075e51] border-[#e0e2eb]' : 'opacity-0 pointer-events-none absolute'}`}>
                        <span className={`material-symbols-outlined text-[16px] ${isUploading ? 'animate-spin' : ''}`}>sync</span> Uploading... {uploadProgress}%
                    </div>

                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".mp3,.wav,.m4a,.webm" />
                    <button onClick={handleUploadClick} disabled={recordingState !== 'idle' || isUploading}
                            data-tooltip="Upload Audio"
                            className="custom-tooltip w-9 h-9 md:w-10 md:h-10 rounded-md border border-[#e0e2eb] text-[#097969] bg-white flex items-center justify-center hover:bg-[#f1f3fc] shadow-sm transition-colors disabled:opacity-50">
                        <span className="material-symbols-outlined text-[18px] md:text-[20px]">upload_file</span>
                    </button>
                </div>
            </div>

            {recoveredDraft && (
                <div className="w-full px-4 sm:px-6 pt-4">
                    <div className="bg-[#fff8e1] border border-[#e8c547] rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <p className="text-[13px] sm:text-[14px] text-[#181c22]">
                            Found unsaved transcript text from a previous session (last saved {new Date(recoveredDraft.savedAt).toLocaleTimeString()}). Audio wasn't recoverable — only the transcribed text.
                        </p>
                        <div className="flex gap-2 shrink-0">
                            <button onClick={discardDraft} className="text-[13px] font-bold text-[#777682] hover:text-[#181c22] transition-colors px-3 py-1.5">
                                Discard
                            </button>
                            <button onClick={restoreDraft} className="bg-[#075e51] text-white text-[13px] font-bold px-4 py-1.5 rounded-md hover:bg-[#097969] transition-colors">
                                Restore
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MAIN LAYOUT --- */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 pb-28 md:pb-32 flex flex-col lg:flex-row gap-4 sm:gap-6 w-full">

                {/* LEFT COLUMN: Transcript & Processing Intent */}
                <div className="flex-1 flex flex-col gap-4 sm:gap-6 min-w-0">

                    {/* Speech to Text Box */}
                    <div className="bg-white rounded-lg shadow-[0_1px_4px_rgba(58,63,143,0.08),_0_4px_16px_rgba(58,63,143,0.06)] border border-[#e0e2eb] flex flex-col flex-1 min-h-[300px] md:min-h-[380px]">
                        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[#e0e2eb] flex flex-col sm:flex-row sm:justify-between sm:items-center bg-[#F4F9F8] rounded-t-lg gap-3">
                            <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
                                <h2 className="text-[20px] sm:text-2xl font-bold text-[#075e51] tracking-tight">Speech to Text</h2>
                                <span className={`border text-[10px] sm:text-[12px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${recordingState === 'recording' ? 'border-[#CA8A04] text-[#854d0e]' : 'border-[#c7c5d3] text-[#777682]'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${recordingState === 'recording' ? 'bg-[#EAB308] live-pulse' : 'bg-[#777682]'}`}></span> Live
                                </span>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                                <div className="relative w-full sm:w-auto">
                                    <select
                                        value={language}
                                        onChange={(e) => handleLanguageChange(e.target.value)}
                                        disabled={recordingState !== 'idle'}
                                        title={recordingState !== 'idle' ? 'Stop recording to change the language' : undefined}
                                        className="bg-transparent text-[12px] sm:text-[14px] font-bold text-[#464651] outline-none appearance-none pr-6 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <option value="en-US">English (US)</option>
                                        <option value="ur-PK">Urdu (PK)</option>
                                    </select>
                                    <span className="material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2 text-[16px] text-[#777682] pointer-events-none">expand_more</span>
                                </div>
                                <div className="relative w-full sm:w-auto">
                                    <select
                                        value={transcriptFont}
                                        onChange={(e) => setTranscriptFont(e.target.value)}
                                        title="Transcript display font"
                                        className="bg-transparent text-[12px] sm:text-[14px] font-bold text-[#464651] outline-none appearance-none pr-6 cursor-pointer"
                                    >
                                        {fontOptionsForLanguage.map((f) => (
                                            <option key={f.value} value={f.value}>{f.label}</option>
                                        ))}
                                    </select>
                                    <span className="material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2 text-[16px] text-[#777682] pointer-events-none">expand_more</span>
                                </div>
                                <div className="flex gap-2 sm:gap-3 ml-2 sm:ml-4 border-l border-[#e0e2eb] pl-2 sm:pl-4">
                                    {!isEditingTranscript && (
                                        <button
                                            onClick={startEditingTranscript}
                                            title="Edit transcript"
                                            className="text-[#777682] hover:text-[#075e51] transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[18px] sm:text-[20px]">edit</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            let text = translatedTranscriptText !== null
                                                ? translatedTranscriptText
                                                : savedEditedText !== null ? savedEditedText : transcripts.map(t => t.text).join(' ');
                                            if (interimTextRef.current) text += ' ' + interimTextRef.current;
                                            navigator.clipboard.writeText(text);
                                            showToast("Copied to clipboard!", "success");
                                        }}
                                        className="text-[#777682] hover:text-[#075e51] transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[18px] sm:text-[20px]">content_copy</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {audioPlaybackUrl && (
                            <div className="px-4 sm:px-6 py-2 sm:py-3 border-b border-[#e0e2eb] bg-[#F4F9F8]">
                                <audio controls src={audioPlaybackUrl} className="w-full h-9">
                                    Your browser does not support audio playback.
                                </audio>
                            </div>
                        )}

                        {showTranscriptSkeleton ? (
                            <div className="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-6 animate-pulse" aria-busy="true" aria-label="Loading transcript">
                                {[0, 1, 2, 3].map((i) => (
                                    <div key={i} className="flex gap-3 sm:gap-4">
                                        <div className="h-3 w-10 sm:w-12 rounded bg-[#e0e2eb] shrink-0 mt-1" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-3 rounded bg-[#e0e2eb]" style={{ width: `${85 - i * 10}%` }} />
                                            {i % 2 === 0 && <div className="h-3 rounded bg-[#e0e2eb]" style={{ width: `${55 - i * 5}%` }} />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : isEditingTranscript ? (
                            <div className="flex-1 flex flex-col p-4 sm:p-6 gap-3">
                                <textarea
                                    value={editedTranscriptDraft}
                                    onChange={(e) => setEditedTranscriptDraft(e.target.value)}
                                    className={`flex-1 w-full min-h-[200px] p-3 sm:p-4 text-[14px] sm:text-[16px] text-[#181c22] leading-[1.7] border border-[#c7c5d3] rounded-md outline-none resize-none ${language === 'ur-PK' ? 'font-urdu' : ''}`}
                                    style={transcriptFontStyle}
                                    dir={language === 'ur-PK' ? 'rtl' : 'ltr'}
                                />
                                <div className="flex justify-end gap-2 sm:gap-3">
                                    <button
                                        onClick={cancelEditingTranscript}
                                        disabled={isSavingEdit}
                                        className="text-[13px] sm:text-[14px] font-bold text-[#777682] hover:text-[#181c22] transition-colors px-3 py-2"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={saveEditedTranscript}
                                        disabled={isSavingEdit}
                                        className="bg-[#075e51] text-white text-[13px] sm:text-[14px] font-bold px-4 py-2 rounded-md hover:bg-[#097969] transition-colors disabled:opacity-60"
                                    >
                                        {isSavingEdit ? 'Saving...' : 'Save Transcript'}
                                    </button>
                                </div>
                            </div>
                        ) : translatedTranscriptText !== null ? (
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                                <p className={`text-[#181c22] leading-[1.7] sm:leading-[1.85] text-[14px] sm:text-[16px] whitespace-pre-wrap ${language === 'ur-PK' ? 'font-urdu' : ''}`} style={transcriptFontStyle} dir={language === 'ur-PK' ? 'rtl' : 'ltr'}>
                                    {translatedTranscriptText}
                                </p>
                            </div>
                        ) : savedEditedText !== null ? (
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                                <p className={`text-[#181c22] leading-[1.7] sm:leading-[1.85] text-[14px] sm:text-[16px] whitespace-pre-wrap ${language === 'ur-PK' ? 'font-urdu' : ''}`} style={transcriptFontStyle} dir={language === 'ur-PK' ? 'rtl' : 'ltr'}>
                                    {savedEditedText}
                                </p>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
                                {transcripts.map((t, idx) => (
                                    <div key={idx} className="flex gap-3 sm:gap-4">
                                        <span className={`font-mono text-[12px] sm:text-[14px] tracking-wide pt-[2px] shrink-0 ${recordingState === 'recording' ? 'text-[#854d0e]' : 'text-[#777682]'}`}>
                                            {formatTime(t.time)}
                                        </span>
                                        <p className={`text-[#181c22] leading-[1.7] sm:leading-[1.85] text-[14px] sm:text-[16px] ${language === 'ur-PK' ? 'font-urdu' : ''}`} style={transcriptFontStyle} dir={language === 'ur-PK' ? 'rtl' : 'ltr'}>
                                            {t.text}
                                        </p>
                                    </div>
                                ))}
                                {interimText && (
                                    <div className="flex gap-3 sm:gap-4">
                                        <span className="font-mono text-[12px] sm:text-[14px] tracking-wide pt-[2px] shrink-0 text-[#854d0e]">
                                            {formatTime(Math.floor((Date.now() - recordingStartTimeRef.current) / 1000))}
                                        </span>
                                        <p className={`text-[#097969] leading-[1.7] sm:leading-[1.85] text-[14px] sm:text-[16px] italic ${language === 'ur-PK' ? 'font-urdu' : ''}`} style={transcriptFontStyle} dir={language === 'ur-PK' ? 'rtl' : 'ltr'}>
                                            {interimText}
                                        </p>
                                    </div>
                                )}
                                {recordingState === 'recording' && (
                                    <div className="flex gap-3 sm:gap-4">
                                        <span className="text-[#854d0e] font-mono text-[12px] sm:text-[14px] tracking-wide pt-[2px] shrink-0 opacity-50">
                                            {formatTime(timeElapsed)}
                                        </span>
                                        <span className="w-[2px] h-4 sm:h-5 bg-[#EAB308] animate-pulse mt-1 sm:mt-1.5"></span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Processing Intent Box - every prompt is paired with its own answer cell on the same
                        row, and the whole list of rows shares a single scrollbar (rather than the prompt
                        list and a filtered answer list scrolling independently and drifting out of sync). */}
                    <div className="bg-white rounded-lg shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] p-4 sm:p-5 flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                            <h3 className="font-mono text-[13px] sm:text-[14px] font-bold text-[#075e51] tracking-widest uppercase">Processing Intent</h3>
                            <button
                                onClick={() => setCustomPrompts([...customPrompts, { id: Date.now(), text: '', answer: '', isAnswering: false }])}
                                className="text-[#075e51] text-[12px] sm:text-[13px] font-bold flex items-center gap-1 hover:text-[#097969] transition-colors"
                            >
                                <span className="material-symbols-outlined text-[16px] sm:text-[18px]">add</span> Add Section
                            </button>
                        </div>

                        <div className="hidden md:flex gap-4 px-1">
                            <span className="flex-1 min-w-0 font-mono text-[10px] sm:text-[11px] font-bold text-[#777682] uppercase tracking-wider">Prompt</span>
                            <span className="flex-1 min-w-0 font-mono text-[10px] sm:text-[11px] font-bold text-[#777682] uppercase tracking-wider">Answer</span>
                        </div>

                        <div className="flex flex-col gap-3 overflow-y-auto overflow-x-hidden max-h-[260px] sm:max-h-[280px] custom-scrollbar pr-1">
                            {customPrompts.map((promptObj, index) => (
                                <div key={promptObj.id} className="flex flex-col md:flex-row gap-3 shrink-0 min-w-0">
                                    {/* Prompt cell */}
                                    <div className="flex-1 min-w-0 relative border border-[#c7c5d3] rounded-md bg-white overflow-hidden">
                                        {customPrompts.length > 1 && (
                                            <button
                                                onClick={() => setCustomPrompts(customPrompts.filter((_, i) => i !== index))}
                                                className="absolute top-2 right-2 text-[#c7c5d3] hover:text-[#ba1a1a] transition-colors z-10"
                                                title="Remove section"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">close</span>
                                            </button>
                                        )}
                                        <textarea
                                            value={promptObj.text}
                                            onChange={(e) => {
                                                const newPrompts = [...customPrompts];
                                                newPrompts[index] = { ...newPrompts[index], text: e.target.value };
                                                setCustomPrompts(newPrompts);
                                            }}
                                            placeholder="Enter custom prompt or select a saved template..."
                                            className="w-full h-20 sm:h-24 p-3 sm:p-4 text-[14px] sm:text-[16px] text-[#464651] outline-none resize-none bg-transparent placeholder:text-[#c7c5d3]"
                                        />
                                        <button
                                            onClick={() => handleRunIntentPrompt(promptObj.id)}
                                            disabled={promptObj.isAnswering || !promptObj.text.trim() || !currentTranscriptId}
                                            title="Answers this prompt against the transcript captured so far, without touching the Intelligence Summary."
                                            className="absolute bottom-2 right-2 bg-[#CA8A04] text-[#004f53] text-[12px] sm:text-[14px] font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-[6px] hover:bg-[#3edae3] transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                            <span className={`material-symbols-outlined text-[14px] sm:text-[16px] ${promptObj.isAnswering ? 'animate-spin' : ''}`}>{promptObj.isAnswering ? 'sync' : 'magic_button'}</span> <span className="hidden sm:inline">{promptObj.isAnswering ? 'Running...' : 'Run Prompt'}</span>
                                        </button>
                                    </div>

                                    {/* Answer cell - always rendered so every prompt has a visible, paired answer slot */}
                                    <div className="flex-1 min-w-0 border border-[#e0e2eb] rounded-md p-3 bg-[#F4F9F8] flex flex-col justify-center">
                                        {promptObj.isAnswering ? (
                                            <div className="space-y-1.5 animate-pulse">
                                                <div className="h-2.5 bg-[#e0e2eb] rounded w-full"></div>
                                                <div className="h-2.5 bg-[#e0e2eb] rounded w-4/5"></div>
                                            </div>
                                        ) : promptObj.answer ? (
                                            <p className="text-[12px] sm:text-[13px] text-[#464651] whitespace-pre-wrap">{promptObj.answer}</p>
                                        ) : (
                                            <p className="text-[12px] text-[#c7c5d3] italic">Run this prompt to see its answer here.</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {['Extract Action Items', 'Identify Key Entities', 'Sentiment Analysis'].map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => handleIntentTagClick(tag)}
                                    className="bg-[#e0e2eb] text-[#464651] font-bold text-[11px] sm:text-[12px] px-3 py-1.5 rounded-full hover:bg-[#c7c5d3] transition-colors"
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>

                </div>

                {/* RIGHT COLUMN: Intelligence & Summary */}
                <div className="w-full lg:w-[400px] xl:w-[480px] flex flex-col gap-4 sm:gap-6 shrink-0">

                    <div className="bg-white rounded-lg shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] flex flex-col flex-1 min-h-[300px]">
                        <div className="p-4 sm:p-5 border-b border-[#e0e2eb] flex justify-between items-center bg-[#F4F9F8] rounded-t-lg">
                            <h2 className="text-[20px] sm:text-2xl font-bold text-[#075e51] tracking-tight">Intelligence Summary</h2>
                            <button
                                onClick={handleSummarize}
                                disabled={isGeneratingSummary || !currentTranscriptId}
                                title="Summarizes the transcript captured so far - works anytime, even while still recording."
                                className="text-[#854d0e] text-[12px] sm:text-[14px] font-bold flex items-center gap-1 hover:text-[#004f53] transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className={`material-symbols-outlined text-[16px] ${isGeneratingSummary ? 'animate-spin' : ''}`}>{summaryText ? 'refresh' : 'auto_awesome'}</span>
                                <span className="hidden sm:inline">{isGeneratingSummary ? 'Generating...' : summaryText ? 'Regenerate' : 'Generate Summary'}</span>
                            </button>
                        </div>
                        <div className="p-4 sm:p-6 flex-1 flex flex-col overflow-hidden">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-5 sm:mb-6 shrink-0">
                                <span className="text-[11px] sm:text-[12px] font-mono text-[#777682] font-bold">Length:</span>
                                <div className="relative">
                                    <select
                                        value={summaryLength}
                                        onChange={(e) => setSummaryLength(e.target.value)}
                                        className="appearance-none bg-transparent font-mono font-bold text-[11px] sm:text-[12px] text-[#464651] pr-5 outline-none cursor-pointer">
                                        <option>Detailed</option>
                                        <option>Concise</option>
                                    </select>
                                    <span className="material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2 text-[14px] text-[#777682] pointer-events-none">expand_more</span>
                                </div>
                                <span className="text-[11px] sm:text-[12px] font-mono text-[#777682] font-bold ml-2">Style:</span>
                                <div className="relative">
                                    <select
                                        value={summaryStyle}
                                        onChange={(e) => setSummaryStyle(e.target.value)}
                                        className="appearance-none bg-transparent font-mono font-bold text-[11px] sm:text-[12px] text-[#464651] pr-5 outline-none cursor-pointer">
                                        <option>Bullets</option>
                                        <option>Paragraph</option>
                                    </select>
                                    <span className="material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2 text-[14px] text-[#777682] pointer-events-none">expand_more</span>
                                </div>
                            </div>
                            
                            {/* Summary Text Render */}
                            <div className="flex-1 mt-4 text-[#464651] text-[14px] sm:text-[15px] leading-relaxed overflow-y-auto pr-2 custom-scrollbar">
                                {(isUploading || isGeneratingSummary || isTranslating) ? (
                                    <div className="h-full flex flex-col space-y-4 animate-pulse pt-2">
                                        <div className="h-4 bg-[#e0e2eb] rounded w-3/4"></div>
                                        <div className="h-4 bg-[#e0e2eb] rounded w-full"></div>
                                        <div className="h-4 bg-[#e0e2eb] rounded w-5/6"></div>
                                        <div className="h-4 bg-[#e0e2eb] rounded w-full mt-4"></div>
                                        <div className="h-4 bg-[#e0e2eb] rounded w-4/5"></div>
                                    </div>
                                ) : translatedSummaryText !== null ? (
                                    <div className={`prose prose-sm prose-blue max-w-none ${language === 'ur-PK' ? 'font-urdu' : ''}`} dir={language === 'ur-PK' ? 'rtl' : 'ltr'}>
                                        {translatedSummaryText.split('\n').map((line, i) => (
                                            <p key={i} className="mb-2">{line}</p>
                                        ))}
                                    </div>
                                ) : summaryText ? (
                                    <div className={`prose prose-sm prose-blue max-w-none ${language === 'ur-PK' ? 'font-urdu' : ''}`} dir={language === 'ur-PK' ? 'rtl' : 'ltr'}>
                                        {summaryText.split('\n').map((line, i) => (
                                            <p key={i} className="mb-2">{line}</p>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-[#c7c5d3] p-6">
                                        <span className="material-symbols-outlined text-[40px] mb-2 opacity-50">analytics</span>
                                        <p className="text-center italic mb-4">
                                            {currentTranscriptId
                                                ? 'Generate an AI summary of the transcript captured so far - you can do this anytime, even while still recording.'
                                                : 'Start recording or upload audio to enable AI summaries.'}
                                        </p>
                                        {currentTranscriptId && (
                                            <button
                                                onClick={handleSummarize}
                                                disabled={isGeneratingSummary}
                                                className="bg-[#075e51] text-white text-[13px] font-bold px-4 py-2 rounded-md hover:bg-[#097969] transition-colors disabled:opacity-60 flex items-center gap-2"
                                            >
                                                <span className={`material-symbols-outlined text-[16px] ${isGeneratingSummary ? 'animate-spin' : ''}`}>auto_awesome</span>
                                                {isGeneratingSummary ? 'Generating...' : 'Generate Summary'}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Discussed Topics Box */}
                    <div className="bg-white rounded-lg shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] p-4 sm:p-5 flex flex-col">
                        <h3 className="font-mono text-[13px] sm:text-[14px] font-bold text-[#075e51] tracking-widest uppercase mb-3 sm:mb-4 shrink-0">Discussed Topics</h3>

                        <div className="flex flex-col gap-2 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                            {topics.map(topic => {
                                const isExpanded = expandedTopicId === topic.id;
                                return (
                                    <div key={topic.id} className={`flex flex-col ${isExpanded ? 'border border-[#c7c5d3] rounded-md pb-2' : ''}`}>
                                        <div
                                            onClick={() => setExpandedTopicId(isExpanded ? null : topic.id)}
                                            className={`p-2 sm:p-3 flex justify-between items-center cursor-pointer transition-colors ${!isExpanded ? 'hover:bg-[#F4F9F8] rounded-md' : ''}`}
                                        >
                                            <div className="flex items-center gap-2 sm:gap-3">
                                                <span className={`w-2 h-2 rounded-full ${topic.color}`}></span>
                                                <span className="text-[14px] sm:text-[16px] text-[#181c22] font-medium">{topic.title}</span>
                                            </div>
                                            <span className={`material-symbols-outlined text-[#777682] text-[18px] transition-transform ${isExpanded ? 'rotate-180 text-[#464651]' : ''}`}>
                                                expand_more
                                            </span>
                                        </div>

                                        {isExpanded && (
                                            <div className="ml-4 sm:ml-5 border-l-[2px] border-[#e0e2eb] pl-3 sm:pl-4 py-1 flex flex-wrap gap-2 mb-1 mt-1">
                                                {topic.tags.map((tag, idx) => (
                                                    <span key={idx} className="bg-[#FEF9C3] text-[#854d0e] font-bold text-[11px] sm:text-[12px] px-2 py-1 rounded-full flex items-center gap-1">
                                                        {tag}
                                                        <span
                                                            onClick={(e) => { e.stopPropagation(); handleRemoveTopicTag(topic.id, tag); }}
                                                            className="material-symbols-outlined text-[12px] sm:text-[14px] cursor-pointer hover:text-[#ba1a1a]"
                                                        >
                                                            close
                                                        </span>
                                                    </span>
                                                ))}
                                                {tagInputTopicId === topic.id ? (
                                                    <div className="flex items-center gap-1">
                                                        <input 
                                                            autoFocus
                                                            type="text" 
                                                            value={newTagValue} 
                                                            onChange={(e) => setNewTagValue(e.target.value)}
                                                            onKeyDown={(e) => e.key === 'Enter' && submitNewTag(topic.id)}
                                                            onBlur={() => submitNewTag(topic.id)}
                                                            className="border border-[#c7c5d3] rounded px-2 py-0.5 text-[11px] sm:text-[12px] outline-none text-[#075e51]"
                                                            placeholder="Type tag..."
                                                        />
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleAddTopicTag(topic.id)}
                                                        className="bg-transparent border border-dashed border-[#c7c5d3] text-[#777682] font-bold text-[11px] sm:text-[12px] px-2.5 py-1 rounded-full hover:bg-[#F4F9F8] transition-colors"
                                                    >
                                                        + Add tag
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>
            </div>

            {/* --- STICKY BOTTOM ACTION BAR (RESPONSIVE FULL WIDTH) --- */}
            <div className="absolute bottom-0 left-0 w-full bg-white border-t border-[#e0e2eb] px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center z-20 shadow-[0_-4px_16px_rgba(58,63,143,0.06)]">
                <div className="flex items-center gap-1 sm:gap-2 text-[#777682] text-[12px] sm:text-[14px] font-bold shrink-0">
                    {summaryText ? (
                        <>
                            <span className="material-symbols-outlined text-[16px] sm:text-[18px] text-[#854d0e]">check_circle</span>
                            <span className="hidden sm:inline text-[#854d0e]">Saved</span>
                        </>
                    ) : null}
                </div>
                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    <button
                        onClick={handleRunResearch}
                        className="bg-[#075e51] text-white text-[12px] sm:text-[14px] font-bold py-1.5 sm:py-2 px-3 sm:px-6 rounded-[6px] shadow-sm hover:bg-[#097969] hover:cursor-pointer transition-colors flex items-center gap-1 sm:gap-2"
                    >
                        Approve <span className="hidden sm:inline">& Generate Queries</span> <span className="material-symbols-outlined text-[16px] sm:text-[18px]">arrow_forward</span>
                    </button>
                </div>
            </div>

            {/* --- CUSTOM TOAST NOTIFICATION --- */}
            <div className={`fixed bottom-24 right-6 z-50 transition-all duration-300 transform ${toast.show ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'}`}>
                <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${toast.type === 'error' ? 'bg-[#ffdad6] border-[#ba1a1a] text-[#ba1a1a]' : 'bg-[#FEF9C3] border-[#EAB308] text-[#854d0e]'}`}>
                    <span className="material-symbols-outlined text-[20px]">
                        {toast.type === 'error' ? 'error' : 'check_circle'}
                    </span>
                    <span className="text-[13px] sm:text-[14px] font-bold">
                        {toast.message}
                    </span>
                    <button onClick={() => setToast(prev => ({...prev, show: false}))} className="ml-2 hover:opacity-70">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>
            </div>

        </div>
    );
}