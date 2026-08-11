import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CourseWorkbook() {
    const navigate = useNavigate();
    const [isRecording, setIsRecording] = useState(false);
    const [timer, setTimer] = useState(0);

    useEffect(() => {
        let interval;
        if (isRecording) { interval = setInterval(() => setTimer(prev => prev + 1), 1000); }
        else { clearInterval(interval); setTimer(0); }
        return () => clearInterval(interval);
    }, [isRecording]);

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `00:${s}`; // Simplified for UI
    };

    return (
        <div className="w-full h-[calc(100vh-64px)] bg-[#f9f9ff] overflow-y-auto custom-scrollbar font-sans">
            <style>{`
                .pulse-ring-workbook { box-shadow: 0 0 0 0 rgba(0, 194, 203, 0.7); animation: pulse-wb 1.8s infinite cubic-bezier(0.66, 0, 0, 1); }
                @keyframes pulse-wb { to { box-shadow: 0 0 0 8px rgba(0, 194, 203, 0); } }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #c7c5d3; border-radius: 10px; }
            `}</style>

            <div className="w-full p-4 sm:p-6 md:p-8 pb-12 sm:pb-20 animate-in slide-in-from-right-8 duration-300">

                {/* Top Progress Bar */}
                <div className="mb-5 sm:mb-6">
                    <button onClick={() => navigate('/app/courses/my-learning')} className="text-[#777682] hover:text-[#222777] flex items-center gap-1 text-[12px] sm:text-[13px] font-bold mb-3 sm:mb-4 transition-colors w-fit">
                        <span className="material-symbols-outlined text-[16px] sm:text-[18px]">arrow_back</span> <span className="hidden sm:inline">Back to</span> Learning List
                    </button>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-2 sm:mb-1 gap-2 sm:gap-0">
                        <div>
                            <h1 className="text-[24px] sm:text-[28px] md:text-[32px] font-bold text-[#181c22] leading-[1.2] tracking-tight">Module 4: Advanced Heuristics</h1>
                            <p className="text-[14px] sm:text-[16px] text-[#464651] mt-1">Chapter 2: Application in Nuanced Data Sets</p>
                        </div>
                        <div className="text-left sm:text-right">
                            <span className="font-mono text-[12px] sm:text-[14px] font-medium text-[#222777]">65% Complete</span>
                        </div>
                    </div>
                    <div className="w-full bg-[#e6e8f1] rounded-full h-1.5 sm:h-2">
                        <div className="bg-[#222777] h-1.5 sm:h-2 rounded-full transition-all duration-500" style={{ width: '65%' }}></div>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 sm:gap-8">

                    {/* Left Rail */}
                    <aside className="w-full lg:w-64 flex-shrink-0">
                        <div className="bg-white shadow-[0_1px_4px_rgba(58,63,143,0.08)] rounded-lg p-4 sm:p-5 lg:sticky lg:top-[88px]">
                            <h3 className="text-[20px] sm:text-[24px] font-semibold text-[#181c22] mb-3 sm:mb-4 tracking-tight">Contents</h3>
                            <ul className="space-y-1.5 sm:space-y-2">
                                <li>
                                    <div className="flex items-start gap-2 group cursor-pointer p-1.5 -ml-1.5 rounded hover:bg-[#f9f9ff]">
                                        <span className="material-symbols-outlined text-[#00696e] mt-[2px] text-[16px] sm:text-[18px]">check_circle</span>
                                        <span className="text-[14px] sm:text-[16px] text-[#464651] group-hover:text-[#222777] transition-colors leading-[1.6]">1. Introduction to Heuristics</span>
                                    </div>
                                </li>
                                <li className="bg-[#f1f3fc] -mx-2 sm:-mx-3 p-2 sm:p-2.5 rounded border-l-[3px] border-[#222777]">
                                    <div className="flex items-start gap-2 pl-1">
                                        <span className="material-symbols-outlined text-[#222777] mt-[2px] text-[16px] sm:text-[18px]">radio_button_checked</span>
                                        <span className="text-[14px] sm:text-[16px] text-[#222777] font-bold leading-[1.6]">3. Nuanced Data Applications</span>
                                    </div>
                                </li>
                                <li>
                                    <div className="flex items-start gap-2 opacity-60 pointer-events-none p-1.5 -ml-1.5">
                                        <span className="material-symbols-outlined text-[#777682] mt-[2px] text-[16px] sm:text-[18px]">lock</span>
                                        <span className="text-[14px] sm:text-[16px] text-[#464651] leading-[1.6]">4. Practical Exercise</span>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </aside>

                    {/* Central Worksheet Area */}
                    <div className="flex-1 max-w-3xl flex flex-col gap-5 sm:gap-6 pb-12">

                        {/* Task Overview */}
                        <div className="bg-white shadow-[0_1px_4px_rgba(58,63,143,0.08)] rounded-lg p-5 sm:p-6 border-l-4 border-[#00696e]">
                            <h4 className="text-[20px] sm:text-[24px] font-semibold text-[#181c22] mb-2 flex items-center gap-1.5 tracking-tight">
                                <span className="material-symbols-outlined text-[#00696e] text-[20px] sm:text-[24px]">info</span> Task Overview
                            </h4>
                            <p className="text-[14px] sm:text-[16px] text-[#464651] leading-[1.7] sm:leading-[1.85]">
                                Review the provided dataset excerpt regarding urban traffic flow anomalies. Identify three potential heuristic biases a naive AI model might adopt if trained exclusively on this sample without contextual tagging.
                            </p>
                        </div>

                        {/* Multiple Choice Block */}
                        <div className="bg-white shadow-[0_1px_4px_rgba(58,63,143,0.08)] rounded-lg p-5 sm:p-6">
                            <h4 className="font-mono text-[13px] sm:text-[14px] font-medium text-[#181c22] mb-3 sm:mb-4 leading-[1.4]">Question 1: Primary Indicator</h4>
                            <p className="text-[14px] sm:text-[16px] text-[#464651] mb-4 leading-[1.6]">Which temporal pattern is most likely to cause an availability cascade in the model?</p>
                            <div className="space-y-2 sm:space-y-3">
                                <label className="flex items-start sm:items-center gap-3 sm:gap-4 p-3 rounded border border-[#c7c5d3] hover:border-[#222777] hover:bg-[#f1f3fc] cursor-pointer transition-all">
                                    <input type="radio" name="q1" className="text-[#222777] focus:ring-[#222777] w-4 h-4 border-[#c7c5d3] mt-1 sm:mt-0 shrink-0" />
                                    <span className="text-[14px] sm:text-[16px] text-[#181c22] leading-[1.4] sm:leading-[1.6]">Weekend spikes in suburban zones</span>
                                </label>
                                <label className="flex items-start sm:items-center gap-3 sm:gap-4 p-3 rounded border border-[#222777] bg-[#f1f3fc] cursor-pointer transition-all">
                                    <input type="radio" name="q1" defaultChecked className="text-[#222777] focus:ring-[#222777] w-4 h-4 border-[#222777] mt-1 sm:mt-0 shrink-0" />
                                    <span className="text-[14px] sm:text-[16px] text-[#222777] font-bold leading-[1.4] sm:leading-[1.6]">Rush hour localized congestion</span>
                                </label>
                            </div>
                        </div>

                        {/* Voice Rationale Block */}
                        <div className="bg-white shadow-[0_1px_4px_rgba(58,63,143,0.08)] rounded-lg p-5 sm:p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#6bf6ff] opacity-10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                            <h4 className="font-mono text-[12px] sm:text-[14px] font-medium text-[#181c22] mb-2 sm:mb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 leading-[1.4]">
                                Question 2: Oral Rationale
                                <span className="bg-[#e6e8f1] text-[#464651] px-2 py-1 rounded-full font-mono text-[10px] sm:text-[12px] flex items-center gap-1 w-fit">
                                    <span className="material-symbols-outlined text-[14px]">mic</span> Voice Required
                                </span>
                            </h4>
                            <p className="text-[14px] sm:text-[16px] text-[#464651] mb-5 sm:mb-6 leading-[1.6]">Explain how 'Confirmation Bias' might manifest in the model's predictive routing during a major sporting event.</p>

                            <div className="border border-[#c7c5d3] rounded-lg p-4 sm:p-5 bg-[#f9f9ff] flex flex-col items-center justify-center min-h-[180px] sm:min-h-[200px] relative">
                                <div className="flex flex-col items-center gap-3 sm:gap-4 z-10">
                                    <button
                                        onClick={() => setIsRecording(!isRecording)}
                                        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white border-2 flex items-center justify-center transition-transform group
                                        ${isRecording ? 'border-[#ba1a1a] shadow-[0_0_0_0_rgba(186,26,26,0.7)] animate-[pulse-wb_1.8s_infinite]' : 'border-[#00696e] pulse-ring-workbook hover:scale-105'}`}
                                    >
                                        <span className={`material-symbols-outlined text-[28px] sm:text-[32px] transition-colors ${isRecording ? 'text-[#ba1a1a]' : 'text-[#00696e] group-hover:text-[#222777]'}`}>{isRecording ? 'stop' : 'mic'}</span>
                                    </button>
                                    <span className={`font-mono text-[11px] sm:text-[12px] font-bold leading-[1.4] ${isRecording ? 'text-[#ba1a1a]' : 'text-[#00696e]'}`}>
                                        {isRecording ? `Recording... ${formatTime(timer)}` : 'Click to Record'}
                                    </span>
                                </div>
                                {isRecording && (
                                    <div className="w-full mt-5 sm:mt-6 p-3 sm:p-4 bg-white rounded border border-[#e0e2eb] shadow-sm">
                                        <p className="text-[14px] sm:text-[16px] leading-[1.7] sm:leading-[1.85] text-[#181c22]">
                                            <span className="text-[#181c22]">During a major sporting event, the model might exhibit confirmation bias by heavily weighting historical data that suggests main arterial roads will be gridlocked. </span>
                                            <span className="text-[#222777] bg-[#e0e0ff]/30 border-b border-[#222777] border-dashed pb-[1px] animate-pulse">It would actively seek out minor traffic anomalies...</span>
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Footer */}
                        <div className="flex flex-col sm:flex-row justify-center sm:justify-end gap-3 sm:gap-4 mt-2 sm:mt-4 border-t border-[#c7c5d3] pt-5 sm:pt-6">
                            <button className="w-full sm:w-auto px-6 py-2.5 sm:py-2 rounded border border-[#c7c5d3] text-[#464651] font-mono text-[13px] sm:text-[14px] font-medium hover:bg-[#f1f3fc] transition-colors text-center leading-[1.4]">
                                Save Draft
                            </button>
                            <button onClick={() => navigate('/app/courses/my-learning')} className="w-full sm:w-auto px-6 py-2.5 sm:py-2 rounded bg-[#222777] text-white font-mono text-[13px] sm:text-[14px] font-medium hover:bg-[#3a3f8f] shadow-md flex items-center justify-center gap-1.5 transition-colors leading-[1.4]">
                                Submit Module <span className="material-symbols-outlined text-[16px] sm:text-[18px]">send</span>
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}