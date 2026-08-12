import React from 'react';
import { useNavigate } from 'react-router-dom';

// No enrollment/progress model exists yet (see CLAUDE.md) - this used to show hardcoded
// fake courses/streaks/saved items. Rather than keep fabricating data, show an honest
// empty state until real enrollment tracking is built.
export default function MyLearningList() {
    const navigate = useNavigate();

    return (
        <div className="w-full h-[calc(100vh-64px)] bg-[#f9f9ff] overflow-y-auto custom-scrollbar font-sans">

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #c7c5d3; border-radius: 10px; }
            `}</style>

            <div className="w-full p-4 sm:p-6 md:p-8 pb-12 sm:pb-8 animate-in fade-in duration-300">
                <button onClick={() => navigate('/app/courses')} className="text-[#777682] hover:text-[#222777] flex items-center gap-1 text-[12px] sm:text-[13px] font-bold mb-3 sm:mb-4 transition-colors w-fit">
                    <span className="material-symbols-outlined text-[16px] sm:text-[18px]">arrow_back</span> <span className="hidden sm:inline">Back to</span> Seminar Library
                </button>
                <header className="mb-6 sm:mb-8">
                    <h1 className="text-[28px] sm:text-[32px] md:text-[40px] font-bold text-[#222777] leading-[1.2] tracking-tight sm:tracking-[-0.02em]">My Learning List</h1>
                    <p className="text-[14px] sm:text-[16px] leading-[1.6] sm:leading-[1.85] text-[#464651] mt-1 sm:mt-2 max-w-2xl">Track your progress, resume ongoing courses, and review saved materials.</p>
                </header>

                <div className="flex flex-col items-center justify-center bg-white rounded-xl border border-[#e0e2eb] border-dashed py-16 sm:py-24 px-4 shadow-sm">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#f1f3fc] rounded-full flex items-center justify-center text-[#c7c5d3] mb-3 sm:mb-4">
                        <span className="material-symbols-outlined text-[28px] sm:text-[32px]">school</span>
                    </div>
                    <h3 className="text-[16px] sm:text-[18px] font-bold text-[#181c22] mb-2 text-center">No courses in progress yet</h3>
                    <p className="text-[13px] sm:text-[14px] text-[#777682] mb-5 sm:mb-6 text-center max-w-md leading-relaxed">
                        Register for a seminar to start tracking your learning progress here.
                    </p>
                    <button
                        onClick={() => navigate('/app/courses')}
                        className="bg-[#222777] text-white px-6 py-2.5 rounded-lg text-[13px] sm:text-[14px] font-bold shadow-sm hover:bg-[#3a3f8f] transition-colors"
                    >
                        Browse Seminars
                    </button>
                </div>
            </div>
        </div>
    );
}
