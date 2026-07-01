// frontend/src/pages/SpeechWorkspace.jsx
import React, { useState, useEffect, useRef } from 'react';

export default function SpeechWorkspace() {
    // --- STATE MANAGEMENT ---
    const [recordingState, setRecordingState] = useState('idle'); // 'idle', 'recording', 'paused'
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [transcripts, setTranscripts] = useState([
        { time: 605, text: "The initial findings from the AI model suggest a strong correlation between the selected features. However, we need to consider the variance in the secondary dataset." },
        { time: 680, text: "Let's pivot the analysis to focus on the edge cases. I noticed a cluster forming around the upper quartile that wasn't present in the previous iteration. We should probably flag this for the review board next week." },
    ]);

    // --- REFS FOR BROWSER APIs ---
    const mediaRecorderRef = useRef(null);
    const streamRef = useRef(null);
    const timerIntervalRef = useRef(null);
    const mockTranscriptIntervalRef = useRef(null);

    // --- AUDIO & RECORDING LOGIC ---
    const startRecording = async () => {
        try {
            // 1. Ask browser for Microphone permission
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // 2. Initialize MediaRecorder
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            // (When the backend is ready, you will send audio chunks via WebSockets here)
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    // const audioBlob = new Blob([event.data], { type: 'audio/webm' });
                    // socket.emit('audio-chunk', audioBlob);
                }
            };

            mediaRecorder.start(1000); // Collect data every second
            setRecordingState('recording');
        } catch (err) {
            console.error("Microphone access denied:", err);
            alert("Please allow microphone access in your browser to use the workspace.");
        }
    };

    const pauseRecording = () => {
        if (mediaRecorderRef.current && recordingState === 'recording') {
            mediaRecorderRef.current.pause();
            setRecordingState('paused');
        } else if (mediaRecorderRef.current && recordingState === 'paused') {
            mediaRecorderRef.current.resume();
            setRecordingState('recording');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            // Shut down the microphone hardware
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        setRecordingState('idle');
        setTimeElapsed(0); // Optional: Reset timer, or keep it depending on UX needs
    };

    // --- TIMER & MOCK DATA EFFECTS ---
    useEffect(() => {
        if (recordingState === 'recording') {
            // Start the clock
            timerIntervalRef.current = setInterval(() => {
                setTimeElapsed((prev) => prev + 1);
            }, 1000);

            // Simulate incoming AI text every 8 seconds for testing the UI
            mockTranscriptIntervalRef.current = setInterval(() => {
                setTranscripts((prev) => [
                    ...prev,
                    { time: prev.length > 0 ? prev[prev.length-1].time + 8 : 8, text: "This is a simulated incoming live transcription chunk captured from the microphone stream." }
                ]);
            }, 8000);

        } else {
            clearInterval(timerIntervalRef.current);
            clearInterval(mockTranscriptIntervalRef.current);
        }

        // Cleanup on unmount
        return () => {
            clearInterval(timerIntervalRef.current);
            clearInterval(mockTranscriptIntervalRef.current);
        };
    }, [recordingState]);

    // Format seconds into HH:MM:SS
    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col relative w-full h-[calc(100vh-64px)] bg-[#f4f5fa] overflow-hidden">

            {/* Top Control Bar */}
            <div className="h-20 bg-white border-b border-gray-200 shadow-sm flex items-center justify-between px-8 shrink-0 z-10">

                {/* Left: Input Source */}
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full border border-cyan flex items-center justify-center text-cyan bg-cyan-soft/30">
                        <span className="material-symbols-outlined text-[24px]">mic</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Input Source</span>
                        <button className="flex items-center gap-1 text-primary font-bold text-sm hover:text-cyan transition-colors">
                            Configure Mic <span className="material-symbols-outlined text-[18px]">arrow_drop_down</span>
                        </button>
                    </div>
                </div>

                {/* Center: Recording Status Pill */}
                <div className="bg-primary text-white rounded-full px-6 py-2.5 flex items-center gap-6 shadow-md w-80 justify-center">
                    <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${recordingState === 'recording' ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></span>
                        <span className="text-xs font-bold tracking-widest text-white/90">REC</span>
                        <span className="font-mono font-bold text-lg ml-1">{formatTime(timeElapsed)}</span>
                    </div>

                    {/* Animated Waveform (Only animates when recording) */}
                    <div className="flex items-center gap-1 h-6">
                        {[1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1].map((bar, i) => (
                            <div
                                key={i}
                                className="w-1 bg-cyan rounded-full transition-all duration-150"
                                style={{
                                    height: recordingState === 'recording' ? `${Math.max(20, Math.random() * 100)}%` : '4px',
                                    opacity: recordingState === 'idle' ? 0.3 : 1
                                }}
                            ></div>
                        ))}
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={startRecording}
                        disabled={recordingState !== 'idle'}
                        className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors
              ${recordingState !== 'idle' ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-green-500 text-green-500 hover:bg-green-50'}`}
                    >
                        <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                    </button>
                    <button
                        onClick={pauseRecording}
                        disabled={recordingState === 'idle'}
                        className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors
              ${recordingState === 'idle' ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-yellow-500 text-yellow-500 hover:bg-yellow-50'}
              ${recordingState === 'paused' ? 'bg-yellow-100' : ''}`}
                    >
                        <span className="material-symbols-outlined text-[18px]">pause</span>
                    </button>
                    <button
                        onClick={stopRecording}
                        disabled={recordingState === 'idle'}
                        className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors
              ${recordingState === 'idle' ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-red-500 text-red-500 hover:bg-red-50'}`}
                    >
                        <span className="material-symbols-outlined text-[18px]">stop</span>
                    </button>

                    <div className="h-8 w-px bg-gray-200 mx-2"></div>

                    <span className="bg-cyan-soft text-cyan font-bold text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-cyan/20">
            <span className="material-symbols-outlined text-[16px] animate-spin">sync</span> Processing...
          </span>
                    <button className="w-10 h-10 rounded-lg border border-gray-200 text-primary flex items-center justify-center hover:bg-gray-50 ml-2">
                        <span className="material-symbols-outlined">file_download</span>
                    </button>
                </div>
            </div>

            {/* Main Split Layout */}
            <div className="flex-1 overflow-hidden p-6 flex flex-col lg:flex-row gap-6 max-w-[1600px] mx-auto w-full">

                {/* Left Column: Live Transcript */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#f9f9ff]">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-primary">Speech to Text</h2>
                            {recordingState === 'recording' && (
                                <span className="bg-cyan-soft text-cyan text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider border border-cyan/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse"></span> Live
                </span>
                            )}
                        </div>
                        <select className="bg-transparent text-sm font-semibold text-gray-500 outline-none cursor-pointer">
                            <option>English (US)</option>
                            <option>Spanish (ES)</option>
                        </select>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {transcripts.map((t, idx) => (
                            <div key={idx} className="flex gap-4 group">
                <span className="bg-cyan-soft/50 text-cyan font-mono text-xs font-bold px-2 py-1 rounded h-fit shrink-0 mt-0.5 group-hover:bg-cyan-soft transition-colors">
                  {formatTime(t.time)}
                </span>
                                <p className="text-gray-700 leading-relaxed text-[15px]">
                                    {t.text}
                                </p>
                            </div>
                        ))}
                        {/* Blinking cursor effect when recording */}
                        {recordingState === 'recording' && (
                            <div className="flex gap-4">
                 <span className="bg-cyan-soft/50 text-cyan font-mono text-xs font-bold px-2 py-1 rounded h-fit shrink-0 mt-0.5 opacity-50">
                  {formatTime(timeElapsed)}
                </span>
                                <span className="w-0.5 h-5 bg-cyan animate-pulse mt-1"></span>
                            </div>
                        )}
                        {transcripts.length === 0 && recordingState !== 'recording' && (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                                <span className="material-symbols-outlined text-[48px] opacity-50">mic_none</span>
                                <p className="font-medium">Hit play to start capturing audio.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Intelligence */}
                <div className="w-full lg:w-[450px] xl:w-[500px] flex flex-col gap-6 shrink-0 overflow-y-auto pr-2 pb-8">

                    {/* Summary Box */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-primary">Intelligence Summary</h2>
                            <button className="text-cyan text-sm font-bold flex items-center gap-1 hover:text-primary transition-colors">
                                <span className="material-symbols-outlined text-[16px]">refresh</span> Regenerate
                            </button>
                        </div>
                        <div className="p-5">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="relative">
                                    <select className="appearance-none bg-gray-50 border border-gray-200 rounded text-xs font-bold text-gray-600 py-2 pl-3 pr-8 outline-none">
                                        <option>Length: Detailed</option>
                                        <option>Length: Concise</option>
                                    </select>
                                    <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-gray-400 pointer-events-none">expand_more</span>
                                </div>
                                <div className="relative">
                                    <select className="appearance-none bg-gray-50 border border-gray-200 rounded text-xs font-bold text-gray-600 py-2 pl-3 pr-8 outline-none">
                                        <option>Style: Bullets</option>
                                        <option>Style: Paragraph</option>
                                    </select>
                                    <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-gray-400 pointer-events-none">expand_more</span>
                                </div>
                                <button className="ml-auto bg-primary text-white text-xs font-bold px-4 py-2 rounded hover:bg-opacity-90 transition-colors">
                                    Summarize
                                </button>
                            </div>

                            <ul className="space-y-4 text-sm text-gray-600 marker:text-cyan pl-4 list-disc">
                                <li><strong className="text-gray-900">Model Correlation:</strong> Initial findings indicate strong feature correlation. Secondary dataset variance requires further investigation.</li>
                                <li><strong className="text-gray-900">Edge Case Analysis:</strong> Focus shifting to edge cases due to unexpected clustering in the upper quartile.</li>
                                <li><strong className="text-gray-900">Action Required:</strong> Flag upper quartile cluster findings for the review board meeting next week.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Topics Box */}
                    <div className="flex flex-col gap-3">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Discussed Topics</h3>

                        <div className="bg-white border border-gray-200 rounded-lg p-4 flex justify-between items-center cursor-pointer hover:border-gray-300 transition-colors">
                            <div className="flex items-center gap-3">
                                <span className="w-2 h-2 rounded-full bg-primary"></span>
                                <span className="font-bold text-gray-900 text-sm">Feature Correlation</span>
                            </div>
                            <span className="material-symbols-outlined text-gray-400">expand_more</span>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-4 flex justify-between items-center cursor-pointer hover:border-gray-300 transition-colors">
                            <div className="flex items-center gap-3">
                                <span className="w-2 h-2 rounded-full bg-cyan"></span>
                                <span className="font-bold text-gray-900 text-sm">Review Board Flag</span>
                            </div>
                            <span className="material-symbols-outlined text-gray-400 transition-transform rotate-180">expand_more</span>
                        </div>

                        {/* Tags row */}
                        <div className="flex gap-2 px-1 mt-1">
              <span className="bg-cyan-soft text-cyan font-bold text-xs px-3 py-1.5 rounded-full flex items-center gap-1 border border-cyan/20">
                Upper Quartile <span className="material-symbols-outlined text-[14px] cursor-pointer">close</span>
              </span>
                            <button className="border border-gray-200 text-gray-500 font-bold text-xs px-3 py-1.5 rounded-full hover:bg-gray-50 transition-colors">
                                + Add tag
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}