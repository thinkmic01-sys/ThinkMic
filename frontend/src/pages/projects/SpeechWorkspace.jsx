import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from 'react-redux';
import { login, logout } from '../../store/slices/authSlice';
import api from '../../services/api';
import deepgramService from '../../services/deepgramService';
import { io } from 'socket.io-client';

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

export default function SpeechWorkspace() {
    // --- STATE MANAGEMENT ---
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get('projectId');
    
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
    const recognitionRef = useRef(null);
    const interimTextRef = useRef('');
    const recordingStartTimeRef = useRef(null);
    // Mirrors recordingState for callbacks/closures (e.g. deepgramService.onClose) that would
    // otherwise capture a stale value from whenever startRecording originally ran
    const recordingStateRef = useRef('idle');

    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const dispatch = useDispatch();
    // Functionality States
    const [intentMode, setIntentMode] = useState('User-Defined');
    const [customPrompts, setCustomPrompts] = useState([{ id: Date.now(), text: '' }]);
    const [summaryLength, setSummaryLength] = useState('Detailed');
    const [summaryStyle, setSummaryStyle] = useState('Bullets');

    const [expandedTopicId, setExpandedTopicId] = useState(null);
    const [topics, setTopics] = useState([]);
    const [queries, setQueries] = useState([]);

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

        const socket = io('http://localhost:5000', {
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
                    color: ['bg-blue-500', 'bg-green-500', 'bg-[#00c2cb]', 'bg-[#222777]'][i % 4],
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

    // --- UPLOAD LOGIC TO BACKEND ---
    const uploadAudioToBackend = async (audioBlob, filename, rawText = null, isFileUpload = false) => {
        setIsUploading(true);
        setUploadProgress(50); // Show intermediate progress

        const formData = new FormData();
        formData.append('audio', audioBlob, filename);
        formData.append('title', filename || 'Live Workspace Recording');
        
        if (rawText !== null && rawText !== undefined) {
            formData.append('rawText', rawText);
        }
        if (!isFileUpload) {
            formData.append('sttEngine', sttEngine);
        }
        formData.append('language', language);
        formData.append('length', summaryLength);
        formData.append('style', summaryStyle);
        if (projectId) {
            formData.append('projectId', projectId);
        }

        try {
            const response = await api.post('/recordings', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            const data = response.data;

            setUploadProgress(100);
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
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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

    const triggerAIProcessing = async (promptOverride = '') => {
        if (!currentTranscriptId) {
            return showToast("No transcript available to process yet. Wait for upload to finish.", "error");
        }
        showToast(`Requesting AI processing...`, 'success');
        try {
            const response = await api.post(`/summaries/transcript/${currentTranscriptId}/regenerate`, {
                customPrompt: promptOverride || customPrompts[0].text,
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
            
            // Navigate to Research module
            navigate('/app/research/results' + (projectId ? `?projectId=${projectId}` : ''));
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

    return (
        <div className="flex flex-col relative w-full h-[calc(100vh-64px)] bg-[#f9f9ff] overflow-hidden font-sans">
            <style>{`
                @keyframes cyanPulse {
                    0% { box-shadow: 0 0 0 0 rgba(0, 194, 203, 0.4); }
                    70% { box-shadow: 0 0 0 8px rgba(0, 194, 203, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(0, 194, 203, 0); }
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
                    background-color: #222777;
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
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-md flex items-center justify-center text-white bg-[#3a3f8f] shadow-sm">
                        <span className="material-symbols-outlined text-[18px] md:text-[22px]">mic</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="hidden sm:block text-[10px] font-bold text-[#777682] uppercase tracking-wider mb-0.5">STT Engine</span>
                        <div className="relative">
                            <select 
                                value={sttEngine}
                                onChange={(e) => setSttEngine(e.target.value)}
                                disabled={recordingState !== 'idle'}
                                className="appearance-none bg-transparent font-bold text-[13px] md:text-sm text-[#222777] hover:text-[#3a3f8f] outline-none cursor-pointer pr-5 transition-colors disabled:opacity-50"
                            >
                                <option value="Deepgram">Deepgram (Live Premium)</option>
                                <option value="Whisper">Whisper (High Accuracy)</option>
                                <option value="Browser">Browser API (Fast, Free)</option>
                            </select>
                            <span className="material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2 text-[16px] text-[#222777] pointer-events-none disabled:opacity-50">expand_more</span>
                        </div>
                    </div>
                </div>

                {/* Center: Recording Status Indicator */}
                <div className="flex flex-col items-center gap-1 w-full md:w-auto shrink-0 order-first md:order-none">
                    <div className="bg-[#222777] text-white rounded-md px-4 sm:px-5 py-2 flex items-center justify-between gap-4 md:gap-6 shadow-sm w-full md:w-[340px] border border-[#3a3f8f]">
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
                                <div key={i} className="w-[3px] md:w-1 bg-[#61f4fd] rounded-full transition-all duration-150"
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
                        className={`custom-tooltip w-9 h-9 md:w-10 md:h-10 rounded-md border flex items-center justify-center transition-colors ${recordingState === 'idle' ? 'border-[#e0e2eb] text-[#00696e] bg-white hover:bg-[#eef0f9] shadow-sm' : (recordingState === 'connecting' ? 'border-[#e0e2eb] text-[#777682] bg-[#f9f9ff] cursor-wait' : (recordingState === 'paused' ? 'bg-[#e0e0ff] border-[#bfc2ff] text-[#222777]' : 'border-[#e0e2eb] text-[#222777] bg-white hover:bg-[#eef0f9] shadow-sm'))}`}
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

                    <div className={`hidden lg:flex font-bold text-xs px-4 py-2 rounded-md items-center gap-2 border shadow-sm transition-opacity duration-200 ${isUploading ? 'opacity-100 bg-[#f9f9ff] text-[#222777] border-[#e0e2eb]' : 'opacity-0 pointer-events-none absolute'}`}>
                        <span className={`material-symbols-outlined text-[16px] ${isUploading ? 'animate-spin' : ''}`}>sync</span> Uploading... {uploadProgress}%
                    </div>

                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".mp3,.wav,.m4a,.webm" />
                    <button onClick={handleUploadClick} disabled={recordingState !== 'idle' || isUploading}
                            data-tooltip="Upload Audio"
                            className="custom-tooltip w-9 h-9 md:w-10 md:h-10 rounded-md border border-[#e0e2eb] text-[#3a3f8f] bg-white flex items-center justify-center hover:bg-[#f1f3fc] shadow-sm transition-colors disabled:opacity-50">
                        <span className="material-symbols-outlined text-[18px] md:text-[20px]">upload_file</span>
                    </button>
                </div>
            </div>

            {/* --- MAIN LAYOUT --- */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 pb-28 md:pb-32 flex flex-col lg:flex-row gap-4 sm:gap-6 max-w-[1280px] mx-auto w-full">

                {/* LEFT COLUMN: Transcript & Processing Intent */}
                <div className="flex-1 flex flex-col gap-4 sm:gap-6 min-w-0">

                    {/* Speech to Text Box */}
                    <div className="bg-white rounded-lg shadow-[0_1px_4px_rgba(58,63,143,0.08),_0_4px_16px_rgba(58,63,143,0.06)] border border-[#e0e2eb] flex flex-col flex-1 min-h-[300px] md:min-h-[380px]">
                        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[#e0e2eb] flex flex-col sm:flex-row sm:justify-between sm:items-center bg-[#f9f9ff] rounded-t-lg gap-3">
                            <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
                                <h2 className="text-[20px] sm:text-2xl font-bold text-[#222777] tracking-tight">Speech to Text</h2>
                                <span className={`border text-[10px] sm:text-[12px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${recordingState === 'recording' ? 'border-[#61f4fd] text-[#006e73]' : 'border-[#c7c5d3] text-[#777682]'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${recordingState === 'recording' ? 'bg-[#00c2cb] live-pulse' : 'bg-[#777682]'}`}></span> Live
                                </span>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                                <div className="relative w-full sm:w-auto">
                                    <select 
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value)}
                                        className="bg-transparent text-[12px] sm:text-[14px] font-bold text-[#464651] outline-none appearance-none pr-6 cursor-pointer"
                                    >
                                        <option value="en-US">English (US)</option>
                                        <option value="ur-PK">Urdu (PK)</option>
                                    </select>
                                    <span className="material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2 text-[16px] text-[#777682] pointer-events-none">expand_more</span>
                                </div>
                                <div className="flex gap-2 sm:gap-3 ml-2 sm:ml-4 border-l border-[#e0e2eb] pl-2 sm:pl-4">
                                    <button 
                                        onClick={() => {
                                            let text = transcripts.map(t => t.text).join(' ');
                                            if (interimTextRef.current) text += ' ' + interimTextRef.current;
                                            navigator.clipboard.writeText(text);
                                            showToast("Copied to clipboard!", "success");
                                        }}
                                        className="text-[#777682] hover:text-[#222777] transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[18px] sm:text-[20px]">content_copy</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
                            {transcripts.map((t, idx) => (
                                <div key={idx} className="flex gap-3 sm:gap-4">
                                    <span className={`font-mono text-[12px] sm:text-[14px] tracking-wide pt-[2px] shrink-0 ${recordingState === 'recording' ? 'text-[#006e73]' : 'text-[#777682]'}`}>
                                        {formatTime(t.time)}
                                    </span>
                                    <p className={`text-[#181c22] leading-[1.7] sm:leading-[1.85] text-[14px] sm:text-[16px] ${language === 'ur-PK' ? 'font-urdu' : ''}`} dir={language === 'ur-PK' ? 'rtl' : 'ltr'}>
                                        {t.text}
                                    </p>
                                </div>
                            ))}
                            {interimText && (
                                <div className="flex gap-3 sm:gap-4">
                                    <span className="font-mono text-[12px] sm:text-[14px] tracking-wide pt-[2px] shrink-0 text-[#006e73]">
                                        {formatTime(Math.floor((Date.now() - recordingStartTimeRef.current) / 1000))}
                                    </span>
                                    <p className={`text-[#3a3f8f] leading-[1.7] sm:leading-[1.85] text-[14px] sm:text-[16px] italic ${language === 'ur-PK' ? 'font-urdu' : ''}`} dir={language === 'ur-PK' ? 'rtl' : 'ltr'}>
                                        {interimText}
                                    </p>
                                </div>
                            )}
                            {recordingState === 'recording' && (
                                <div className="flex gap-3 sm:gap-4">
                                    <span className="text-[#006e73] font-mono text-[12px] sm:text-[14px] tracking-wide pt-[2px] shrink-0 opacity-50">
                                        {formatTime(timeElapsed)}
                                    </span>
                                    <span className="w-[2px] h-4 sm:h-5 bg-[#00c2cb] animate-pulse mt-1 sm:mt-1.5"></span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Processing Intent Box */}
                    <div className="bg-white rounded-lg shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] p-4 sm:p-5 flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                            <h3 className="font-mono text-[13px] sm:text-[14px] font-bold text-[#222777] tracking-widest uppercase">Processing Intent</h3>
                            <button 
                                onClick={() => setCustomPrompts([...customPrompts, { id: Date.now(), text: '' }])}
                                className="text-[#222777] text-[12px] sm:text-[13px] font-bold flex items-center gap-1 hover:text-[#3a3f8f] transition-colors"
                            >
                                <span className="material-symbols-outlined text-[16px] sm:text-[18px]">add</span> Add Section
                            </button>
                        </div>

                        <div className="flex flex-col gap-3 overflow-y-auto max-h-[105px] sm:max-h-[120px] custom-scrollbar pr-1">
                            {customPrompts.map((promptObj, index) => (
                                <div key={promptObj.id} className="relative border border-[#c7c5d3] rounded-md bg-white overflow-hidden shrink-0">
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
                                            newPrompts[index].text = e.target.value;
                                            setCustomPrompts(newPrompts);
                                        }}
                                        placeholder="Enter custom prompt or select a saved template..."
                                        className="w-full h-20 sm:h-24 p-3 sm:p-4 text-[14px] sm:text-[16px] text-[#464651] outline-none resize-none bg-transparent placeholder:text-[#c7c5d3]"
                                    />
                                    <button
                                        onClick={() => triggerAIProcessing(promptObj.text)}
                                        className="absolute bottom-2 right-2 bg-[#61f4fd] text-[#004f53] text-[12px] sm:text-[14px] font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-[6px] hover:bg-[#3edae3] transition-colors flex items-center gap-1 shadow-sm">
                                        <span className="material-symbols-outlined text-[14px] sm:text-[16px]">magic_button</span> <span className="hidden sm:inline">Run Prompt</span>
                                    </button>
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
                        <div className="p-4 sm:p-5 border-b border-[#e0e2eb] flex justify-between items-center bg-[#f9f9ff] rounded-t-lg">
                            <h2 className="text-[20px] sm:text-2xl font-bold text-[#222777] tracking-tight">Intelligence Summary</h2>
                            <button onClick={handleSummarize} className="text-[#006e73] text-[12px] sm:text-[14px] font-bold flex items-center gap-1 hover:text-[#004f53] transition-colors shrink-0">
                                <span className="material-symbols-outlined text-[16px]">refresh</span> <span className="hidden sm:inline">Regenerate</span>
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
                                {(isUploading || isGeneratingSummary) ? (
                                    <div className="h-full flex flex-col space-y-4 animate-pulse pt-2">
                                        <div className="h-4 bg-[#e0e2eb] rounded w-3/4"></div>
                                        <div className="h-4 bg-[#e0e2eb] rounded w-full"></div>
                                        <div className="h-4 bg-[#e0e2eb] rounded w-5/6"></div>
                                        <div className="h-4 bg-[#e0e2eb] rounded w-full mt-4"></div>
                                        <div className="h-4 bg-[#e0e2eb] rounded w-4/5"></div>
                                    </div>
                                ) : summaryText ? (
                                    <div className={`prose prose-sm prose-blue max-w-none ${language === 'ur-PK' ? 'font-urdu' : ''}`} dir={language === 'ur-PK' ? 'rtl' : 'ltr'}>
                                        {summaryText.split('\n').map((line, i) => (
                                            <p key={i} className="mb-2">{line}</p>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-[#c7c5d3] italic p-6">
                                        <span className="material-symbols-outlined text-[40px] mb-2 opacity-50">analytics</span>
                                        <p className="text-center">Stop recording to automatically generate an AI summary.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Discussed Topics Box */}
                    <div className="bg-white rounded-lg shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] p-4 sm:p-5 flex flex-col">
                        <h3 className="font-mono text-[13px] sm:text-[14px] font-bold text-[#222777] tracking-widest uppercase mb-3 sm:mb-4 shrink-0">Discussed Topics</h3>

                        <div className="flex flex-col gap-2 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                            {topics.map(topic => {
                                const isExpanded = expandedTopicId === topic.id;
                                return (
                                    <div key={topic.id} className={`flex flex-col ${isExpanded ? 'border border-[#c7c5d3] rounded-md pb-2' : ''}`}>
                                        <div
                                            onClick={() => setExpandedTopicId(isExpanded ? null : topic.id)}
                                            className={`p-2 sm:p-3 flex justify-between items-center cursor-pointer transition-colors ${!isExpanded ? 'hover:bg-[#f9f9ff] rounded-md' : ''}`}
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
                                                    <span key={idx} className="bg-[#e6fbfc] text-[#006e73] font-bold text-[11px] sm:text-[12px] px-2 py-1 rounded-full flex items-center gap-1">
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
                                                            className="border border-[#c7c5d3] rounded px-2 py-0.5 text-[11px] sm:text-[12px] outline-none text-[#222777]"
                                                            placeholder="Type tag..."
                                                        />
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleAddTopicTag(topic.id)}
                                                        className="bg-transparent border border-dashed border-[#c7c5d3] text-[#777682] font-bold text-[11px] sm:text-[12px] px-2.5 py-1 rounded-full hover:bg-[#f9f9ff] transition-colors"
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
                            <span className="material-symbols-outlined text-[16px] sm:text-[18px] text-[#006e73]">check_circle</span>
                            <span className="hidden sm:inline text-[#006e73]">Saved</span>
                        </>
                    ) : null}
                </div>
                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    <button
                        onClick={handleRunResearch}
                        className="bg-[#222777] text-white text-[12px] sm:text-[14px] font-bold py-1.5 sm:py-2 px-3 sm:px-6 rounded-[6px] shadow-sm hover:bg-[#3a3f8f] hover:cursor-pointer transition-colors flex items-center gap-1 sm:gap-2"
                    >
                        Approve <span className="hidden sm:inline">& Generate Queries</span> <span className="material-symbols-outlined text-[16px] sm:text-[18px]">arrow_forward</span>
                    </button>
                </div>
            </div>

            {/* --- CUSTOM TOAST NOTIFICATION --- */}
            <div className={`fixed bottom-24 right-6 z-50 transition-all duration-300 transform ${toast.show ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'}`}>
                <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${toast.type === 'error' ? 'bg-[#ffdad6] border-[#ba1a1a] text-[#ba1a1a]' : 'bg-[#e6fbfc] border-[#00c2cb] text-[#006e73]'}`}>
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