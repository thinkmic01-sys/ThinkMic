import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function MyLearningList() {
    const navigate = useNavigate();

    return (
        <div className="w-full h-[calc(100vh-64px)] bg-[#f9f9ff] overflow-y-auto">
            <div className="max-w-[1280px] mx-auto p-4 md:p-8 pb-8 animate-in fade-in duration-300">
                <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-[40px] font-bold text-[#222777] leading-[1.2] tracking-[-0.02em]">My Learning List</h1>
                        <p className="text-[16px] leading-[1.85] text-[#464651] mt-1">Track your progress, resume ongoing courses, and review saved materials.</p>
                    </div>
                    <div className="flex items-center gap-2 bg-[#f1f3fc] px-4 py-2 rounded-lg border border-[#e0e2eb] shadow-sm">
                        <span className="material-symbols-outlined text-[#6bf6ff]" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                        <span className="text-[14px] font-medium text-[#181c22]">14 Day Streak</span>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
                    {/* Progress Card */}
                    <div className="bg-white shadow-[0_1px_4px_rgba(58,63,143,0.08),_0_4px_16px_rgba(58,63,143,0.06)] rounded-xl p-6 border border-[#e0e2eb] flex flex-col items-center justify-center text-center">
                        <h2 className="text-[24px] font-semibold text-[#222777] mb-4 self-start">Weekly Goal</h2>
                        <div className="relative w-32 h-32 mb-4">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" fill="none" r="45" stroke="#ebeef6" strokeWidth="8"></circle>
                                <circle cx="50" cy="50" fill="none" r="45" stroke="#00C2CB" strokeDasharray="282.7" strokeDashoffset="70.6" strokeLinecap="round" strokeWidth="8" className="transition-all duration-1000 ease-out"></circle>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="font-mono text-[24px] font-bold text-[#181c22]">75%</span>
                            </div>
                        </div>
                        <p className="text-[16px] text-[#464651]">3 of 4 hours completed</p>
                    </div>

                    <div className="col-span-1 lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-white shadow-[0_1px_4px_rgba(58,63,143,0.08),_0_4px_16px_rgba(58,63,143,0.06)] rounded-xl p-6 border border-[#e0e2eb] flex flex-col justify-between">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-2 bg-[#e0e0ff] rounded-lg text-[#222777]">
                                    <span className="material-symbols-outlined">menu_book</span>
                                </div>
                                <span className="text-[14px] font-medium text-[#00696e] bg-[#E6FBFC] px-2 py-[2px] rounded border border-[#61f4fd]/30">Active</span>
                            </div>
                            <div>
                                <p className="text-[32px] font-bold text-[#222777] leading-[1.2] tracking-[-0.02em]">4</p>
                                <p className="text-[16px] text-[#464651]">Courses In Progress</p>
                            </div>
                        </div>

                        {/* NAVIGATES TO THE MAP SCREEN */}
                        <div className="bg-white shadow-[0_1px_4px_rgba(58,63,143,0.08),_0_4px_16px_rgba(58,63,143,0.06)] rounded-xl p-6 border border-[#e0e2eb] flex flex-col justify-between relative overflow-hidden group cursor-pointer hover:border-[#222777] transition-colors" onClick={() => navigate('/app/courses/seminars')}>
                            <div className="absolute -right-6 -top-6 text-[#e0e2eb] opacity-50 transform rotate-12 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-[120px]" style={{ fontVariationSettings: "'FILL' 1" }}>map</span>
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-2 bg-[#e6fbfc] rounded-lg text-[#006e73]">
                                        <span className="material-symbols-outlined">location_on</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[32px] font-bold text-[#222777] leading-[1.2] tracking-[-0.02em]">Seminars</p>
                                    <p className="text-[16px] font-medium text-[#00c2cb] group-hover:text-[#222777] flex items-center gap-1 transition-colors">Find nearby events <span className="material-symbols-outlined text-[16px]">arrow_forward</span></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <section>
                        <div className="flex items-center justify-between mb-4 border-b border-[#e0e2eb] pb-1">
                            <h3 className="text-[24px] font-semibold text-[#222777] flex items-center gap-1">
                                <span className="material-symbols-outlined text-[20px]">play_circle</span> In Progress
                            </h3>
                        </div>
                        <div className="space-y-2">
                            <div className="bg-white shadow-[0_1px_4px_rgba(58,63,143,0.08)] rounded-lg p-4 border border-[#e0e2eb] flex flex-col sm:flex-row items-center gap-4 hover:border-[#222777]/30 transition-colors">
                                <div className="w-full sm:w-32 h-24 rounded-md overflow-hidden bg-[#e6e8f1] shrink-0 relative">
                                    <img alt="Thumbnail" className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=600&auto=format&fit=crop" />
                                    <div className="absolute bottom-1 right-1 bg-[#181c22]/80 text-white font-mono text-[10px] px-1 rounded">Video</div>
                                </div>
                                <div className="flex-1 w-full min-w-0">
                                    <h4 className="text-[16px] font-semibold text-[#181c22] truncate mb-1">Advanced Neural Network Architectures</h4>
                                    <p className="text-[12px] font-semibold text-[#464651] truncate mb-4">Module 3: Transformer Models Deep Dive</p>
                                    <div className="flex items-center gap-4 w-full max-w-md">
                                        <div className="flex-1 h-2 bg-[#e6e8f1] rounded-full overflow-hidden">
                                            <div className="h-full bg-[#6bf6ff] rounded-full w-[65%]"></div>
                                        </div>
                                        <span className="font-mono text-[12px] text-[#464651] w-10 text-right">65%</span>
                                    </div>
                                </div>
                                <div className="w-full sm:w-auto mt-2 sm:mt-0 shrink-0">
                                    <button onClick={() => navigate('/app/courses/workbook')} className="w-full sm:w-auto bg-[#3a3f8f] text-white px-6 py-2 rounded-lg text-[12px] font-semibold hover:bg-[#222777] transition-colors flex items-center justify-center gap-1">
                                        Continue <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}