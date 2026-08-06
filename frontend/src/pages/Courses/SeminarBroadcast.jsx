import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import axios from 'axios';
import deepgramService from '../../services/deepgramService';

// Mirrors SpeechWorkspace.jsx's codec probing - Safari/iOS don't support audio/webm at all
const getSupportedAudioMimeType = () => {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac', 'audio/ogg;codecs=opus'];
    for (const t of types) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t;
    }
    return '';
};

export default function SeminarBroadcast() {
    const { seminarId } = useParams();
    const navigate = useNavigate();
    const user = useSelector((state) => state.auth?.user);

    const [seminar, setSeminar] = useState(null);
    const [loadError, setLoadError] = useState('');
    const [broadcastState, setBroadcastState] = useState('idle'); // idle, connecting, live, ending, ended
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [transcripts, setTranscripts] = useState([]);
    const [interimText, setInterimText] = useState('');
    const [toast, setToast] = useState(null);

    const streamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recordingStartTimeRef = useRef(null);
    const interimTextRef = useRef('');
    const timerIntervalRef = useRef(null);

    const showToast = (message, type = 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    useEffect(() => {
        const fetchSeminar = async () => {
            try {
                const res = await api.get(`/seminars/${seminarId}`);
                setSeminar(res.data);
            } catch (err) {
                setLoadError(err.response?.data?.message || 'Could not load this seminar.');
            }
        };
        fetchSeminar();
    }, [seminarId]);

    useEffect(() => {
        return () => {
            clearInterval(timerIntervalRef.current);
            if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
            deepgramService.disconnect();
        };
    }, []);

    const goLive = async () => {
        try {
            await api.post(`/seminars/${seminarId}/start`);
        } catch (err) {
            showToast(err.response?.data?.message || 'Could not start the broadcast.', 'error');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            setBroadcastState('connecting');
            const connected = await deepgramService.connect('en-US');
            if (!connected) {
                setBroadcastState('idle');
                return;
            }

            deepgramService.onTranscript = (transcript, isFinal) => {
                if (isFinal && transcript.trim()) {
                    setTranscripts((prev) => {
                        const latestTime = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
                        return [...prev, { time: latestTime, text: transcript.trim() }];
                    });
                    setInterimText('');
                    interimTextRef.current = '';
                } else if (!isFinal) {
                    setInterimText(transcript);
                    interimTextRef.current = transcript;
                }
            };
            deepgramService.onError = (err) => showToast(err.message || 'Live transcription error', 'error');
            deepgramService.onClose = () => {
                showToast('Live transcription connection was lost.', 'error');
            };

            const supportedMimeType = getSupportedAudioMimeType();
            let mediaRecorder;
            try {
                mediaRecorder = supportedMimeType ? new MediaRecorder(stream, { mimeType: supportedMimeType }) : new MediaRecorder(stream);
            } catch (recorderError) {
                console.error('Failed to initialize MediaRecorder:', recorderError);
                showToast('This browser does not support any compatible audio recording format.', 'error');
                stream.getTracks().forEach((t) => t.stop());
                deepgramService.disconnect();
                setBroadcastState('idle');
                return;
            }
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            recordingStartTimeRef.current = Date.now();
            setTranscripts([]);
            setInterimText('');

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                    deepgramService.sendAudio(event.data);
                }
            };
            mediaRecorder.onerror = () => showToast('A recording error occurred.', 'error');

            mediaRecorder.start(250);
            setBroadcastState('live');

            timerIntervalRef.current = setInterval(() => {
                setTimeElapsed(Math.floor((Date.now() - recordingStartTimeRef.current) / 1000));
            }, 1000);
        } catch (err) {
            console.error('Microphone access error:', err);
            showToast('Error starting broadcast. Ensure microphone access is allowed.', 'error');
            setBroadcastState('idle');
        }
    };

    const endBroadcast = async () => {
        setBroadcastState('ending');
        clearInterval(timerIntervalRef.current);

        const recorder = mediaRecorderRef.current;
        const finalBlob = await new Promise((resolve) => {
            if (!recorder || recorder.state === 'inactive') {
                resolve(new Blob(audioChunksRef.current, { type: recorder?.mimeType || 'audio/webm' }));
                return;
            }
            recorder.onstop = () => resolve(new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' }));
            recorder.stop();
        });

        deepgramService.disconnect();
        if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());

        let rawText = transcripts.map((t) => t.text).join(' ').trim();
        if (interimTextRef.current) rawText = (rawText + ' ' + interimTextRef.current).trim();

        let r2Key, mimeType, fileSizeBytes;
        try {
            const { data: presign } = await api.get('/recordings/upload-url', { params: { mimeType: finalBlob.type || 'audio/webm' } });
            if (presign.storage === 'r2') {
                await axios.put(presign.uploadUrl, finalBlob, { headers: { 'Content-Type': finalBlob.type || 'audio/webm' } });
                r2Key = presign.r2Key;
                mimeType = finalBlob.type || 'audio/webm';
                fileSizeBytes = finalBlob.size;
            }
            // storage === 'local' (no R2 configured, e.g. local dev): skip audio upload,
            // the transcript/summary still get finalized from rawText below.
        } catch (err) {
            console.error('Seminar audio upload failed (continuing with transcript only):', err);
        }

        try {
            await api.post(`/seminars/${seminarId}/end`, { rawText, r2Key, mimeType, fileSizeBytes });
            setBroadcastState('ended');
            showToast('Broadcast ended. Generating the summary for attendees now.', 'success');
        } catch (err) {
            showToast(err.response?.data?.message || 'Could not finalize the broadcast.', 'error');
            setBroadcastState('live');
        }
    };

    if (loadError) {
        return (
            <div className="w-full h-[calc(100vh-64px)] flex items-center justify-center bg-[#f9f9ff]">
                <p className="text-[#464651] font-semibold">{loadError}</p>
            </div>
        );
    }

    if (!seminar) {
        return (
            <div className="w-full h-[calc(100vh-64px)] flex items-center justify-center bg-[#f9f9ff]">
                <p className="text-[#464651]">Loading seminar...</p>
            </div>
        );
    }

    if (user && seminar.hostId !== user.id) {
        return (
            <div className="w-full h-[calc(100vh-64px)] flex items-center justify-center bg-[#f9f9ff]">
                <p className="text-[#464651] font-semibold">Only the host can broadcast this seminar.</p>
            </div>
        );
    }

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <div className="w-full h-[calc(100vh-64px)] bg-[#f9f9ff] overflow-y-auto font-sans">
            <div className="max-w-[900px] mx-auto p-4 sm:p-6 md:p-8">
                <button onClick={() => navigate('/app/courses')} className="text-[#777682] hover:text-[#222777] flex items-center gap-1 text-[13px] font-bold mb-4 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back to Course Library
                </button>

                <h1 className="text-[24px] sm:text-[32px] font-bold text-[#222777] mb-1">{seminar.title}</h1>
                <p className="text-[14px] text-[#464651] mb-6">{seminar.abstract}</p>

                {broadcastState === 'idle' && (
                    <div className="bg-white rounded-xl border border-[#e0e2eb] p-8 text-center shadow-sm">
                        <span className="material-symbols-outlined text-[48px] text-[#222777] mb-3 block">podcasts</span>
                        <p className="text-[#464651] mb-6">When you're ready, go live - every registered attendee will be notified instantly.</p>
                        <button onClick={goLive} className="bg-[#222777] text-white font-bold px-8 py-3 rounded-lg hover:bg-[#3a3f8f] transition-colors inline-flex items-center gap-2">
                            <span className="material-symbols-outlined">play_arrow</span> Go Live
                        </button>
                    </div>
                )}

                {broadcastState === 'connecting' && (
                    <div className="bg-white rounded-xl border border-[#e0e2eb] p-8 text-center shadow-sm text-[#464651]">
                        Connecting to live transcription...
                    </div>
                )}

                {(broadcastState === 'live' || broadcastState === 'ending') && (
                    <>
                        <div className="bg-white rounded-xl border border-[#00c2cb] ring-1 ring-[#00c2cb]/40 p-5 sm:p-6 mb-6 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a] animate-pulse"></span>
                                <span className="font-bold text-[#181c22]">LIVE</span>
                                <span className="font-mono text-[#464651]">{formatTime(timeElapsed)}</span>
                            </div>
                            <button
                                onClick={endBroadcast}
                                disabled={broadcastState === 'ending'}
                                className="bg-[#ba1a1a] text-white font-bold px-6 py-2.5 rounded-lg hover:bg-[#93000a] transition-colors disabled:opacity-60 flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[18px]">stop_circle</span>
                                {broadcastState === 'ending' ? 'Ending...' : 'End Broadcast'}
                            </button>
                        </div>

                        <div className="bg-white rounded-xl border border-[#e0e2eb] p-5 sm:p-6 shadow-sm min-h-[240px]">
                            <h3 className="text-[16px] font-semibold text-[#181c22] mb-3">Live Transcript</h3>
                            <div className="space-y-2 text-[15px] leading-[1.7] text-[#464651]">
                                {transcripts.map((t, i) => <p key={i}>{t.text}</p>)}
                                {interimText && <p className="text-[#222777] italic">{interimText}</p>}
                                {transcripts.length === 0 && !interimText && <p className="text-[#c7c5d3]">Start speaking...</p>}
                            </div>
                        </div>
                    </>
                )}

                {broadcastState === 'ended' && (
                    <div className="bg-white rounded-xl border border-[#e0e2eb] p-8 text-center shadow-sm">
                        <span className="material-symbols-outlined text-[48px] text-[#00c2cb] mb-3 block">check_circle</span>
                        <p className="text-[#181c22] font-semibold mb-2">Broadcast ended.</p>
                        <p className="text-[#464651] mb-6">The summary is being generated and will reach every attendee shortly.</p>
                        <button onClick={() => navigate('/app/courses')} className="bg-[#222777] text-white font-bold px-6 py-2.5 rounded-lg hover:bg-[#3a3f8f] transition-colors">
                            Back to Course Library
                        </button>
                    </div>
                )}
            </div>

            {toast && (
                <div className="fixed bottom-6 right-6 z-[60]">
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border ${toast.type === 'error' ? 'bg-[#ba1a1a] text-white border-[#93000a]' : 'bg-[#222777] text-white border-[#070963]'}`}>
                        <span className="material-symbols-outlined">{toast.type === 'error' ? 'error' : 'check_circle'}</span>
                        <span className="font-bold text-sm">{toast.message}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
