import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function MyLearningList() {
    const navigate = useNavigate();

    return (
        <div className="w-full h-[calc(100vh-64px)] bg-[#f9f9ff] overflow-y-auto custom-scrollbar font-sans">

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #c7c5d3; border-radius: 10px; }
            `}</style>

            <div className="max-w-[1280px] mx-auto p-4 sm:p-6 md:p-8 pb-12 sm:pb-8 animate-in fade-in duration-300">
                <button onClick={() => navigate('/app/courses')} className="text-[#777682] hover:text-[#222777] flex items-center gap-1 text-[12px] sm:text-[13px] font-bold mb-3 sm:mb-4 transition-colors w-fit">
                    <span className="material-symbols-outlined text-[16px] sm:text-[18px]">arrow_back</span> <span className="hidden sm:inline">Back to</span> Seminar Library
                </button>
                <header className="mb-6 sm:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
                    <div>
                        <h1 className="text-[28px] sm:text-[32px] md:text-[40px] font-bold text-[#222777] leading-[1.2] tracking-tight sm:tracking-[-0.02em]">My Learning List</h1>
                        <p className="text-[14px] sm:text-[16px] leading-[1.6] sm:leading-[1.85] text-[#464651] mt-1 sm:mt-2 max-w-2xl">Track your progress, resume ongoing courses, and review saved materials.</p>
                    </div>
                    <div className="flex items-center justify-center gap-2 bg-[#f1f3fc] px-4 py-2.5 sm:py-2 rounded-lg border border-[#e0e2eb] shadow-sm w-full md:w-auto shrink-0">
                        <span className="material-symbols-outlined text-[#6bf6ff] text-[20px] sm:text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                        <span className="text-[13px] sm:text-[14px] font-medium text-[#181c22]">14 Day Streak</span>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-10">
                    {/* Progress Card */}
                    <div className="bg-white shadow-[0_1px_4px_rgba(58,63,143,0.08)] rounded-xl p-5 sm:p-6 border border-[#e0e2eb] flex flex-col items-center justify-center text-center">
                        <h2 className="text-[20px] sm:text-[24px] font-semibold text-[#222777] mb-4 self-start">Weekly Goal</h2>
                        <div className="relative w-28 h-28 sm:w-32 sm:h-32 mb-3 sm:mb-4">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" fill="none" r="45" stroke="#ebeef6" strokeWidth="8"></circle>
                                <circle cx="50" cy="50" fill="none" r="45" stroke="#00C2CB" strokeDasharray="282.7" strokeDashoffset="70.6" strokeLinecap="round" strokeWidth="8" className="transition-all duration-1000 ease-out"></circle>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="font-mono text-[20px] sm:text-[24px] font-bold text-[#181c22]">75%</span>
                            </div>
                        </div>
                        <p className="text-[14px] sm:text-[16px] text-[#464651]">3 of 4 hours completed</p>
                    </div>

                    {/* Active Courses Stats - the "Seminars / Find nearby events" shortcut card that
                        used to sit beside this was removed; Nearby Seminars is reached from the
                        Seminar Library header instead, so it isn't duplicated here. */}
                    <div className="col-span-1 lg:col-span-2 bg-white shadow-[0_1px_4px_rgba(58,63,143,0.08)] rounded-xl p-5 sm:p-6 border border-[#e0e2eb] flex flex-col justify-between">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-2 bg-[#e0e0ff] rounded-lg text-[#222777]">
                                <span className="material-symbols-outlined text-[20px] sm:text-[24px]">menu_book</span>
                            </div>
                            <span className="text-[12px] sm:text-[14px] font-medium text-[#00696e] bg-[#E6FBFC] px-2 py-0.5 rounded border border-[#61f4fd]/30">Active</span>
                        </div>
                        <div>
                            <p className="text-[28px] sm:text-[32px] font-bold text-[#222777] leading-[1.2] tracking-[-0.02em]">4</p>
                            <p className="text-[14px] sm:text-[16px] text-[#464651] mt-1 sm:mt-0">Courses In Progress</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-8 sm:space-y-10">
                    {/* In Progress Section */}
                    <section>
                        <div className="flex items-center justify-between mb-4 sm:mb-5 border-b border-[#e0e2eb] pb-1.5 sm:pb-2">
                            <h3 className="text-[20px] sm:text-[24px] font-semibold text-[#222777] flex items-center gap-1.5 sm:gap-2">
                                <span className="material-symbols-outlined text-[20px] sm:text-[24px]">play_circle</span> In Progress
                            </h3>
                        </div>
                        <div className="space-y-3 sm:space-y-4">
                            {/* List Item 1 */}
                            <div className="bg-white shadow-[0_1px_4px_rgba(58,63,143,0.08)] rounded-lg p-3 sm:p-4 border border-[#e0e2eb] flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 hover:border-[#222777]/30 transition-colors">
                                <div className="w-full sm:w-36 md:w-40 h-36 sm:h-24 rounded-md overflow-hidden bg-[#e6e8f1] shrink-0 relative">
                                    <img alt="Thumbnail" className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=600&auto=format&fit=crop" />
                                    <div className="absolute bottom-1 right-1 bg-[#181c22]/80 text-white font-mono text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm">Video</div>
                                </div>
                                <div className="flex-1 w-full min-w-0">
                                    <h4 className="text-[15px] sm:text-[16px] font-semibold text-[#181c22] line-clamp-2 sm:truncate mb-1 leading-snug">Advanced Neural Network Architectures</h4>
                                    <p className="text-[12px] sm:text-[13px] font-semibold text-[#464651] truncate mb-3 sm:mb-4">Module 3: Transformer Models Deep Dive</p>
                                    <div className="flex items-center gap-3 sm:gap-4 w-full max-w-md">
                                        <div className="flex-1 h-1.5 sm:h-2 bg-[#e6e8f1] rounded-full overflow-hidden">
                                            <div className="h-full bg-[#6bf6ff] rounded-full w-[65%]"></div>
                                        </div>
                                        <span className="font-mono text-[11px] sm:text-[12px] text-[#464651] w-8 sm:w-10 text-right">65%</span>
                                    </div>
                                </div>
                                <div className="w-full sm:w-auto mt-2 sm:mt-0 shrink-0">
                                    <button onClick={() => navigate('/app/courses/workbook')} className="w-full sm:w-auto bg-[#3a3f8f] text-white px-5 sm:px-6 py-2.5 sm:py-2 rounded-lg text-[13px] sm:text-[12px] font-semibold hover:bg-[#222777] transition-colors flex items-center justify-center gap-1 shadow-sm">
                                        Continue <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                    </button>
                                </div>
                            </div>

                            {/* List Item 2 */}
                            <div className="bg-white shadow-[0_1px_4px_rgba(58,63,143,0.08)] rounded-lg p-3 sm:p-4 border border-[#e0e2eb] flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 hover:border-[#222777]/30 transition-colors">
                                <div className="w-full sm:w-36 md:w-40 h-36 sm:h-24 rounded-md overflow-hidden bg-[#e6e8f1] shrink-0 relative">
                                    <img alt="Thumbnail" className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=600&auto=format&fit=crop" />
                                    <div className="absolute bottom-1 right-1 bg-[#181c22]/80 text-white font-mono text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm">Reading</div>
                                </div>
                                <div className="flex-1 w-full min-w-0">
                                    <h4 className="text-[15px] sm:text-[16px] font-semibold text-[#181c22] line-clamp-2 sm:truncate mb-1 leading-snug">Data Ethics & Governance</h4>
                                    <p className="text-[12px] sm:text-[13px] font-semibold text-[#464651] truncate mb-3 sm:mb-4">Chapter 2: Bias in Machine Learning</p>
                                    <div className="flex items-center gap-3 sm:gap-4 w-full max-w-md">
                                        <div className="flex-1 h-1.5 sm:h-2 bg-[#e6e8f1] rounded-full overflow-hidden">
                                            <div className="h-full bg-[#6bf6ff] rounded-full w-[20%]"></div>
                                        </div>
                                        <span className="font-mono text-[11px] sm:text-[12px] text-[#464651] w-8 sm:w-10 text-right">20%</span>
                                    </div>
                                </div>
                                <div className="w-full sm:w-auto mt-2 sm:mt-0 shrink-0">
                                    <button onClick={() => navigate('/app/courses/workbook')} className="w-full sm:w-auto bg-[#3a3f8f] text-white px-5 sm:px-6 py-2.5 sm:py-2 rounded-lg text-[13px] sm:text-[12px] font-semibold hover:bg-[#222777] transition-colors flex items-center justify-center gap-1 shadow-sm">
                                        Continue <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Saved Items Section */}
                    <section>
                        <div className="flex items-center justify-between mb-4 sm:mb-5 border-b border-[#e0e2eb] pb-1.5 sm:pb-2">
                            <h3 className="text-[20px] sm:text-[24px] font-semibold text-[#222777] flex items-center gap-1.5 sm:gap-2">
                                <span className="material-symbols-outlined text-[20px] sm:text-[24px]">bookmark</span> Saved for Later
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                            {/* Saved Item 1 */}
                            <div className="bg-white shadow-[0_1px_4px_rgba(58,63,143,0.08)] rounded-lg p-3 sm:p-4 border border-[#e0e2eb] flex items-start gap-3 sm:gap-4 hover:border-[#c7c5d3] transition-colors cursor-pointer">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded bg-[#e6e8f1] flex items-center justify-center text-[#222777] shrink-0">
                                    <span className="material-symbols-outlined text-[20px] sm:text-[24px]">article</span>
                                </div>
                                <div className="flex-1 min-w-0 pt-0.5">
                                    <h4 className="text-[13px] sm:text-[14px] leading-[1.6] sm:leading-[1.7] font-semibold text-[#181c22] line-clamp-2 mb-1 sm:mb-1.5">The Future of Generative AI in Academic Research Contexts</h4>
                                    <p className="font-mono text-[10px] sm:text-[11px] font-medium text-[#777682]">Added 2 days ago</p>
                                </div>
                                <button className="text-[#c7c5d3] hover:text-[#222777] p-1 -mt-1 -mr-1 transition-colors shrink-0">
                                    <span className="material-symbols-outlined text-[18px] sm:text-[20px]">more_vert</span>
                                </button>
                            </div>
                            {/* Saved Item 2 */}
                            <div className="bg-white shadow-[0_1px_4px_rgba(58,63,143,0.08)] rounded-lg p-3 sm:p-4 border border-[#e0e2eb] flex items-start gap-3 sm:gap-4 hover:border-[#c7c5d3] transition-colors cursor-pointer">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded bg-[#e6e8f1] flex items-center justify-center text-[#222777] shrink-0">
                                    <span className="material-symbols-outlined text-[20px] sm:text-[24px]">smart_display</span>
                                </div>
                                <div className="flex-1 min-w-0 pt-0.5">
                                    <h4 className="text-[13px] sm:text-[14px] leading-[1.6] sm:leading-[1.7] font-semibold text-[#181c22] line-clamp-2 mb-1 sm:mb-1.5">Webinar: Optimizing Large Language Models for Efficiency</h4>
                                    <p className="font-mono text-[10px] sm:text-[11px] font-medium text-[#777682]">Added 1 week ago</p>
                                </div>
                                <button className="text-[#c7c5d3] hover:text-[#222777] p-1 -mt-1 -mr-1 transition-colors shrink-0">
                                    <span className="material-symbols-outlined text-[18px] sm:text-[20px]">more_vert</span>
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}