// frontend/src/pages/SpeechWorkspace.jsx
import React, { useState, useEffect, useRef } from 'react';
import {useNavigate} from "react-router-dom";

export default function SpeechWorkspace() {
    // --- STATE MANAGEMENT ---
    const navigate = useNavigate();
    const [recordingState, setRecordingState] = useState('idle');
    const [timeElapsed, setTimeElapsed] = useState(872); // 00:14:32
    const [transcripts, setTranscripts] = useState([
        { time: 605, text: "The initial findings from the AI model suggest a strong correlation between the selected features. However, we need to consider the variance in the secondary dataset." },
        { time: 680, text: "Let's pivot the analysis to focus on the edge cases. I noticed a cluster forming around the upper quartile that wasn't present in the previous iteration. We should probably flag this for the review board next week." },
        { time: 825, text: "And if we look at the..." }
    ]);

    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Functionality States
    const [intentMode, setIntentMode] = useState('User-Defined');
    const [customPrompt, setCustomPrompt] = useState('');
    const [summaryLength, setSummaryLength] = useState('Detailed');
    const [summaryStyle, setSummaryStyle] = useState('Bullets');

    const [expandedTopicId, setExpandedTopicId] = useState(3);
    const [topics, setTopics] = useState([
        { id: 1, title: 'Feature Correlation', color: 'bg-[#222777]', tags: [] },
        { id: 2, title: 'Secondary Dataset Variance', color: 'bg-[#61f4fd]', tags: [] },
        { id: 3, title: 'Review Board Flag', color: 'bg-[#222777]', tags: ['Upper Quartile', 'Clustering'] }
    ]);

    const mediaRecorderRef = useRef(null);
    const streamRef = useRef(null);
    const timerIntervalRef = useRef(null);
    const mockTranscriptIntervalRef = useRef(null);
    const fileInputRef = useRef(null);

    // --- AUDIO & RECORDING LOGIC ---
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start(1000);
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
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        setRecordingState('idle');
    };

    const handleUploadClick = () => fileInputRef.current.click();

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 50 * 1024 * 1024) return alert("File exceeds the 50MB limit.");
            setIsUploading(true);
            setUploadProgress(0);
            const uploadInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(uploadInterval);
                        setIsUploading(false);
                        alert(`${file.name} uploaded successfully!`);
                        return 100;
                    }
                    return prev + 10;
                });
            }, 300);
        }
    };

    // --- INTERACTIVE FUNCTIONALITY HANDLERS ---
    const handleAddTopicTag = (topicId) => {
        const newTag = window.prompt("Enter new tag:");
        if (newTag && newTag.trim() !== '') {
            setTopics(topics.map(t => t.id === topicId ? { ...t, tags: [...t.tags, newTag.trim()] } : t));
        }
    };

    const handleRemoveTopicTag = (topicId, tagToRemove) => {
        setTopics(topics.map(t => t.id === topicId ? { ...t, tags: t.tags.filter(tag => tag !== tagToRemove) } : t));
    };

    const handleIntentTagClick = (tagText) => {
        setCustomPrompt(prev => prev ? `${prev}, ${tagText}` : tagText);
    };

    const handleSummarize = () => {
        alert(`Generating new ${summaryLength.toLowerCase()} summary in ${summaryStyle.toLowerCase()} format...`);
    };

    useEffect(() => {
        if (recordingState === 'recording') {
            timerIntervalRef.current = setInterval(() => setTimeElapsed((prev) => prev + 1), 1000);
            mockTranscriptIntervalRef.current = setInterval(() => {
                setTranscripts((prev) => [...prev, { time: prev.length > 0 ? prev[prev.length-1].time + 8 : 8, text: "This is a simulated incoming chunk." }]);
            }, 8000);
        } else {
            clearInterval(timerIntervalRef.current);
            clearInterval(mockTranscriptIntervalRef.current);
        }
        return () => {
            clearInterval(timerIntervalRef.current);
            clearInterval(mockTranscriptIntervalRef.current);
        };
    }, [recordingState]);

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col relative w-full h-[calc(100vh-64px)] bg-[#f9f9ff] overflow-hidden">
            <style>{`
                @keyframes cyanPulse {
                    0% { box-shadow: 0 0 0 0 rgba(0, 194, 203, 0.4); }
                    70% { box-shadow: 0 0 0 8px rgba(0, 194, 203, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(0, 194, 203, 0); }
                }
                .live-pulse {
                    animation: cyanPulse 1.8s infinite;
                }
            `}</style>

            {/* Top Control Bar */}
            <div className="h-20 bg-white border-b border-[#c7c5d3] shadow-sm flex items-center justify-between px-8 shrink-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-md flex items-center justify-center text-white bg-[#3a3f8f] shadow-sm">
                        <span className="material-symbols-outlined text-[22px]">mic</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-[#777682] uppercase tracking-wider mb-0.5">Input Source</span>
                        <button className="flex items-center gap-1 text-[#222777] font-bold text-sm hover:text-[#3a3f8f] transition-colors">
                            Configure Mic <span className="material-symbols-outlined text-[18px]">arrow_drop_down</span>
                        </button>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-1">
                    <div className="bg-[#222777] text-white rounded-md px-5 py-2 flex items-center gap-6 shadow-[0_1px_4px_rgba(58,63,143,0.08),_0_4px_16px_rgba(58,63,143,0.06)] w-[340px] justify-between border border-[#3a3f8f]">
                        <div className="flex items-center gap-3">
                            <span className={`w-2.5 h-2.5 rounded-full ${recordingState === 'recording' ? 'bg-[#ba1a1a] animate-pulse' : 'bg-[#777682]'}`}></span>
                            <span className="text-xs font-bold tracking-widest text-[#bfc2ff]">REC</span>
                            <span className="font-mono font-bold text-sm tracking-wide text-white">{formatTime(timeElapsed)}</span>
                        </div>
                        <div className="flex items-center gap-[3px] h-5">
                            {[1, 2, 4, 6, 8, 5, 3, 7, 9, 6, 4, 2, 5, 3].map((bar, i) => (
                                <div key={i} className="w-1 bg-[#61f4fd] rounded-full transition-all duration-150"
                                     style={{ height: recordingState === 'recording' ? `${Math.max(20, Math.random() * 100)}%` : '4px', opacity: recordingState === 'idle' ? 0.3 : 1 }}></div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={startRecording} disabled={recordingState !== 'idle' || isUploading}
                            className={`w-10 h-10 rounded-md border flex items-center justify-center transition-colors ${recordingState !== 'idle' ? 'border-[#e0e2eb] text-[#c7c5d3] cursor-not-allowed' : 'border-[#e0e2eb] text-[#00696e] bg-white hover:bg-[#eef0f9] shadow-sm'}`}>
                        <span className="material-symbols-outlined text-[24px]">play_arrow</span>
                    </button>
                    <button onClick={pauseRecording} disabled={recordingState === 'idle' || isUploading}
                            className={`w-10 h-10 rounded-md border flex items-center justify-center transition-colors ${recordingState === 'idle' ? 'border-[#e0e2eb] text-[#c7c5d3] cursor-not-allowed' : 'border-[#e0e2eb] text-[#222777] bg-white hover:bg-[#eef0f9] shadow-sm'} ${recordingState === 'paused' ? 'bg-[#e0e0ff] border-[#bfc2ff]' : ''}`}>
                        <span className="material-symbols-outlined text-[20px]">pause</span>
                    </button>
                    <button onClick={stopRecording} disabled={recordingState === 'idle' || isUploading}
                            className={`w-10 h-10 rounded-md border flex items-center justify-center transition-colors ${recordingState === 'idle' ? 'border-[#e0e2eb] text-[#c7c5d3] cursor-not-allowed' : 'border-[#ffdad6] text-[#ba1a1a] bg-[#ffdad6] hover:bg-[#ba1a1a]/10 shadow-sm'}`}>
                        <span className="material-symbols-outlined text-[18px]">stop</span>
                    </button>

                    <div className="h-6 w-px bg-[#e0e2eb] mx-1"></div>

                    <div className={`font-bold text-xs px-4 py-2 rounded-md flex items-center gap-2 border shadow-sm transition-opacity duration-200 ${recordingState === 'recording' ? 'opacity-100 bg-[#f9f9ff] text-[#222777] border-[#e0e2eb]' : 'opacity-0 pointer-events-none'}`}>
                        <span className={`material-symbols-outlined text-[16px] ${recordingState === 'recording' ? 'animate-spin' : ''}`}>sync</span> Recording...
                    </div>

                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".mp3,.wav,.m4a,.webm" />
                    <button onClick={handleUploadClick} disabled={recordingState !== 'idle' || isUploading}
                            className="w-10 h-10 rounded-md border border-[#e0e2eb] text-[#3a3f8f] bg-white flex items-center justify-center hover:bg-[#f1f3fc] shadow-sm transition-colors disabled:opacity-50">
                        <span className="material-symbols-outlined text-[20px]">upload_file</span>
                    </button>
                </div>
            </div>

            {/* Main Layout */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 pb-32 flex flex-col lg:flex-row gap-6 max-w-[1280px] mx-auto w-full">

                {/* LEFT COLUMN: Transcript & Processing Intent */}
                <div className="flex-1 flex flex-col gap-6">

                    {/* Speech to Text Box */}
                    <div className="bg-white rounded-lg shadow-[0_1px_4px_rgba(58,63,143,0.08),_0_4px_16px_rgba(58,63,143,0.06)] border border-[#e0e2eb] flex flex-col flex-1 min-h-[380px]">
                        <div className="px-6 py-4 border-b border-[#e0e2eb] flex justify-between items-center bg-[#f9f9ff] rounded-t-lg">
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-bold text-[#222777] tracking-tight">Speech to Text</h2>
                                <span className={`border text-[12px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${recordingState === 'recording' ? 'border-[#61f4fd] text-[#006e73]' : 'border-[#c7c5d3] text-[#777682]'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${recordingState === 'recording' ? 'bg-[#00c2cb] live-pulse' : 'bg-[#777682]'}`}></span> Live
                                </span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <select className="appearance-none bg-white border border-[#c7c5d3] rounded-md px-3 py-1 pr-8 text-[14px] font-mono font-bold text-[#464651] outline-none cursor-pointer focus:border-[#222777]">
                                        <option>English (US)</option>
                                        <option>Spanish (ES)</option>
                                    </select>
                                    <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-[#777682] pointer-events-none">expand_more</span>
                                </div>
                                <div className="flex items-center gap-3 text-[#777682]">
                                    <button className="hover:text-[#222777] transition-colors"><span className="material-symbols-outlined text-[18px]">content_copy</span></button>
                                    <button className="hover:text-[#ba1a1a] transition-colors"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {transcripts.map((t, idx) => (
                                <div key={idx} className="flex gap-4">
                                    <span className={`font-mono text-[14px] tracking-wide pt-[2px] shrink-0 ${recordingState === 'recording' ? 'text-[#006e73]' : 'text-[#777682]'}`}>
                                        {formatTime(t.time)}
                                    </span>
                                    <p className="text-[#181c22] leading-[1.85] text-[16px]">
                                        {t.text}
                                    </p>
                                </div>
                            ))}
                            {recordingState === 'recording' && (
                                <div className="flex gap-4">
                                    <span className="text-[#006e73] font-mono text-[14px] tracking-wide pt-[2px] shrink-0 opacity-50">
                                        {formatTime(timeElapsed)}
                                    </span>
                                    <span className="w-[2px] h-5 bg-[#00c2cb] animate-pulse mt-1.5"></span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Processing Intent Box */}
                    <div className="bg-white rounded-lg shadow-[0_1px_4px_rgba(58,63,143,0.08),_0_4px_16px_rgba(58,63,143,0.06)] border border-[#e0e2eb] p-5 flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-mono text-[14px] font-bold text-[#222777] tracking-widest uppercase">Processing Intent</h3>
                            <div className="flex bg-[#f1f3fc] rounded-md p-1 border border-[#e0e2eb]">
                                <button
                                    onClick={() => setIntentMode('User-Defined')}
                                    className={`px-3 py-1 text-[13px] font-bold rounded transition-all ${intentMode === 'User-Defined' ? 'bg-white text-[#222777] shadow-sm border border-[#e0e2eb]' : 'text-[#777682] hover:text-[#464651]'}`}
                                >
                                    User-Defined
                                </button>
                                <button
                                    onClick={() => setIntentMode('Data Fill')}
                                    className={`px-3 py-1 text-[13px] font-bold rounded transition-all ${intentMode === 'Data Fill' ? 'bg-white text-[#222777] shadow-sm border border-[#e0e2eb]' : 'text-[#777682] hover:text-[#464651]'}`}
                                >
                                    Data Fill
                                </button>
                            </div>
                        </div>

                        <div className="relative border border-[#c7c5d3] rounded-md bg-white overflow-hidden">
                            <textarea
                                value={customPrompt}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                                placeholder="Enter custom prompt or select a saved template..."
                                className="w-full h-24 p-4 text-[16px] text-[#464651] outline-none resize-none bg-transparent placeholder:text-[#777682]"
                            />
                            <button
                                onClick={() => alert(`Running prompt: ${customPrompt || "Default"}`)}
                                className="absolute bottom-2 right-2 bg-[#61f4fd] text-[#004f53] text-[14px] font-bold px-4 py-2 rounded-[6px] hover:bg-[#3edae3] transition-colors flex items-center gap-1 shadow-sm">
                                <span className="material-symbols-outlined text-[16px]">magic_button</span> Run Prompt
                            </button>
                        </div>

                        <div className="flex gap-2">
                            {['Extract Action Items', 'Identify Key Entities', 'Sentiment Analysis'].map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => handleIntentTagClick(tag)}
                                    className="bg-[#e0e2eb] text-[#464651] font-bold text-[12px] px-3 py-1.5 rounded-full hover:bg-[#c7c5d3] transition-colors"
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>

                </div>

                {/* RIGHT COLUMN: Intelligence & Summary */}
                <div className="w-full lg:w-[480px] xl:w-[500px] flex flex-col gap-6 shrink-0">

                    <div className="bg-white rounded-lg shadow-[0_1px_4px_rgba(58,63,143,0.08),_0_4px_16px_rgba(58,63,143,0.06)] border border-[#e0e2eb] flex flex-col flex-1">
                        <div className="p-5 border-b border-[#e0e2eb] flex justify-between items-center bg-[#f9f9ff] rounded-t-lg">
                            <h2 className="text-2xl font-bold text-[#222777] tracking-tight">Intelligence Summary</h2>
                            <button className="text-[#006e73] text-[14px] font-bold flex items-center gap-1 hover:text-[#004f53] transition-colors">
                                <span className="material-symbols-outlined text-[16px]">refresh</span> Regenerate
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="text-[12px] font-mono text-[#777682] font-bold">Length:</span>
                                <div className="relative">
                                    <select
                                        value={summaryLength}
                                        onChange={(e) => setSummaryLength(e.target.value)}
                                        className="appearance-none bg-transparent font-mono font-bold text-[12px] text-[#464651] pr-5 outline-none cursor-pointer">
                                        <option>Detailed</option>
                                        <option>Concise</option>
                                    </select>
                                    <span className="material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2 text-[14px] text-[#777682] pointer-events-none">expand_more</span>
                                </div>
                                <span className="text-[12px] font-mono text-[#777682] font-bold ml-2">Style:</span>
                                <div className="relative">
                                    <select
                                        value={summaryStyle}
                                        onChange={(e) => setSummaryStyle(e.target.value)}
                                        className="appearance-none bg-transparent font-mono font-bold text-[12px] text-[#464651] pr-5 outline-none cursor-pointer">
                                        <option>Bullets</option>
                                        <option>Paragraph</option>
                                    </select>
                                    <span className="material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2 text-[14px] text-[#777682] pointer-events-none">expand_more</span>
                                </div>
                                <button
                                    onClick={handleSummarize}
                                    className="ml-auto bg-[#3a3f8f] text-white text-[14px] font-bold px-4 py-2 rounded-[6px] shadow-sm hover:bg-[#222777] transition-colors">
                                    Summarize
                                </button>
                            </div>

                            <ul className="space-y-4 text-[16px] text-[#464651] marker:text-[#006e73] pl-4 list-disc leading-[1.6]">
                                <li><strong className="text-[#181c22] font-bold">Model Correlation:</strong> Initial findings indicate strong feature correlation. Secondary dataset variance requires further investigation.</li>
                                <li><strong className="text-[#181c22] font-bold">Edge Case Analysis:</strong> Focus shifting to edge cases due to unexpected clustering in the upper quartile.</li>
                                <li><strong className="text-[#181c22] font-bold">Action Required:</strong> Flag upper quartile cluster findings for the review board meeting next week.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Discussed Topics Box */}
                    <div className="bg-white rounded-lg shadow-[0_1px_4px_rgba(58,63,143,0.08),_0_4px_16px_rgba(58,63,143,0.06)] border border-[#e0e2eb] p-5 flex flex-col">
                        <h3 className="font-mono text-[14px] font-bold text-[#222777] tracking-widest uppercase mb-4">Discussed Topics</h3>

                        <div className="flex flex-col gap-2">
                            {topics.map(topic => {
                                const isExpanded = expandedTopicId === topic.id;
                                return (
                                    <div key={topic.id} className={`flex flex-col ${isExpanded ? 'border border-[#c7c5d3] rounded-md pb-2' : ''}`}>
                                        <div
                                            onClick={() => setExpandedTopicId(isExpanded ? null : topic.id)}
                                            className={`p-3 flex justify-between items-center cursor-pointer transition-colors ${!isExpanded ? 'hover:bg-[#f9f9ff] rounded-md' : ''}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className={`w-2 h-2 rounded-full ${topic.color}`}></span>
                                                <span className="text-[16px] text-[#181c22] font-medium">{topic.title}</span>
                                            </div>
                                            <span className={`material-symbols-outlined text-[#777682] text-[18px] transition-transform ${isExpanded ? 'rotate-180 text-[#464651]' : ''}`}>
                                                expand_more
                                            </span>
                                        </div>

                                        {isExpanded && (
                                            <div className="ml-5 border-l-[2px] border-[#e0e2eb] pl-4 py-1 flex flex-wrap gap-2 mb-1">
                                                {topic.tags.map((tag, idx) => (
                                                    <span key={idx} className="bg-[#e6fbfc] text-[#006e73] font-bold text-[12px] px-2.5 py-1 rounded-full flex items-center gap-1">
                                                        {tag}
                                                        <span
                                                            onClick={(e) => { e.stopPropagation(); handleRemoveTopicTag(topic.id, tag); }}
                                                            className="material-symbols-outlined text-[14px] cursor-pointer hover:text-[#ba1a1a]"
                                                        >
                                                            close
                                                        </span>
                                                    </span>
                                                ))}
                                                <button
                                                    onClick={() => handleAddTopicTag(topic.id)}
                                                    className="bg-transparent border border-dashed border-[#c7c5d3] text-[#777682] font-bold text-[12px] px-3 py-1 rounded-full hover:bg-[#f9f9ff] transition-colors"
                                                >
                                                    + Add tag
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>
            </div>

            {/* Sticky Bottom Action Bar - FIXED WIDTH */}
            <div className="absolute bottom-0 left-0 w-full bg-white border-t border-[#e0e2eb] px-6 py-4 flex justify-between items-center z-20 shadow-[0_-4px_16px_rgba(58,63,143,0.06)]">
                <div className="flex items-center gap-2 text-[#777682] text-[14px] font-bold">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span> Saved 2 min ago
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => alert("Draft saved.")}
                        className="bg-white border border-[#c7c5d3] text-[#181c22] text-[14px] font-bold py-2 px-6 rounded-[6px] hover:bg-[#f9f9ff] transition-colors"
                    >
                        Save Draft
                    </button>
                    <button
                        onClick={() => navigate('/app/research/results')}
                        className="bg-[#222777] text-white text-[14px] font-bold py-2 px-6 rounded-[6px] shadow-sm hover:bg-[#3a3f8f] hover:cursor-pointer transition-colors flex items-center gap-2"
                    >
                        Approve & Generate Queries <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </button>
                </div>
            </div>

        </div>
    );
}