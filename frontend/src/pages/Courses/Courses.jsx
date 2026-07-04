// frontend/src/pages/Courses/Courses.jsx
import React, { useState } from 'react';

export default function Courses() {
    // Internal router state for the Courses module
    const [activeView, setActiveView] = useState('learning-list'); // 'learning-list', 'seminars', 'workbook'

    // --- VIEW 1: MY LEARNING LIST ---
    const renderLearningList = () => (
        <div className="flex-1 pt-[24px] px-4 md:px-8 pb-8 max-w-[1280px] w-full mx-auto animate-in fade-in duration-300">
            <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-[40px] leading-[1.2] tracking-[-0.02em] font-bold text-[#222777]">My Learning List</h1>
                    <p className="text-[16px] leading-[1.85] text-[#464651] mt-1 max-w-2xl">Track your progress, resume ongoing courses, and review saved materials.</p>
                </div>
                <div className="flex items-center gap-2 bg-[#f1f3fc] px-4 py-2 rounded-lg border border-[#e0e2eb] shadow-sm">
                    <span className="material-symbols-outlined text-[#6bf6ff]" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                    <span className="text-[14px] leading-[1.4] font-medium text-[#181c22]">14 Day Streak</span>
                </div>
            </header>

            {/* Dashboard Top Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
                {/* Progress Card */}
                <div className="shadow-[0_1px_4px_rgba(58,63,143,0.08),_0_4px_16px_rgba(58,63,143,0.06)] bg-white rounded-xl p-6 border border-[#e0e2eb] flex flex-col items-center justify-center text-center col-span-1">
                    <h2 className="text-[24px] leading-[1.3] tracking-[-0.01em] font-semibold text-[#222777] mb-4 self-start">Weekly Goal</h2>
                    <div className="relative w-32 h-32 mb-4">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" fill="none" r="45" stroke="#ebeef6" strokeWidth="8"></circle>
                            <circle className="transition-all duration-1000 ease-out" cx="50" cy="50" fill="none" r="45" stroke="#00C2CB" strokeDasharray="282.7" strokeDashoffset="70.6" strokeLinecap="round" strokeWidth="8"></circle>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="font-mono text-[24px] font-bold text-[#181c22]">75%</span>
                        </div>
                    </div>
                    <p className="text-[16px] leading-[1.6] text-[#464651]">3 of 4 hours completed</p>
                </div>

                {/* Stats Cards */}
                <div className="col-span-1 lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="shadow-[0_1px_4px_rgba(58,63,143,0.08),_0_4px_16px_rgba(58,63,143,0.06)] bg-white rounded-xl p-6 border border-[#e0e2eb] flex flex-col justify-between cursor-pointer hover:border-[#222777] transition-colors" onClick={() => setActiveView('seminars')}>
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-2 bg-[#e0e0ff] rounded-lg text-[#222777]">
                                <span className="material-symbols-outlined">menu_book</span>
                            </div>
                            <span className="text-[14px] leading-[1.4] font-medium text-[#00696e] bg-[#E6FBFC] px-2 py-[2px] rounded border border-[#61f4fd]/30">Active</span>
                        </div>
                        <div>
                            <p className="text-[32px] leading-[1.2] tracking-[-0.02em] font-bold text-[#222777]">4</p>
                            <p className="text-[16px] leading-[1.6] text-[#464651] flex items-center gap-1">Courses In Progress <span className="material-symbols-outlined text-[16px] text-[#00c2cb]">arrow_forward</span></p>
                        </div>
                    </div>

                    <div className="shadow-[0_1px_4px_rgba(58,63,143,0.08),_0_4px_16px_rgba(58,63,143,0.06)] bg-white rounded-xl p-6 border border-[#e0e2eb] flex flex-col justify-between relative overflow-hidden group">
                        <div className="absolute -right-6 -top-6 text-[#e0e2eb] opacity-50 transform rotate-12 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-[120px]" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-2 bg-[#e0e0ff] rounded-lg text-[#282c5f]">
                                    <span className="material-symbols-outlined">done_all</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-[32px] leading-[1.2] tracking-[-0.02em] font-bold text-[#222777]">12</p>
                                <p className="text-[16px] leading-[1.6] text-[#464651]">Completed Modules</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* List Section */}
            <div className="space-y-8">
                {/* In Progress */}
                <section>
                    <div className="flex items-center justify-between mb-4 border-b border-[#e0e2eb] pb-1">
                        <h3 className="text-[24px] leading-[1.3] tracking-[-0.01em] font-semibold text-[#222777] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[20px]">play_circle</span>
                            In Progress
                        </h3>
                    </div>
                    <div className="space-y-2">
                        {/* List Item 1 */}
                        <div className="shadow-[0_1px_4px_rgba(58,63,143,0.08),_0_4px_16px_rgba(58,63,143,0.06)] bg-white rounded-lg p-4 border border-[#e0e2eb] flex flex-col sm:flex-row items-center gap-4 hover:border-[#222777]/30 transition-colors">
                            <div className="w-full sm:w-32 h-24 rounded-md overflow-hidden bg-[#e6e8f1] shrink-0 relative">
                                <img alt="Course thumbnail" className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=600&auto=format&fit=crop" />
                                <div className="absolute bottom-1 right-1 bg-[#181c22]/80 text-[#ffffff] font-mono text-[10px] px-1 rounded">Video</div>
                            </div>
                            <div className="flex-1 w-full min-w-0">
                                <h4 className="text-[16px] leading-[1.85] font-semibold text-[#181c22] truncate mb-1">Advanced Neural Network Architectures</h4>
                                <p className="text-[12px] leading-[1] font-semibold text-[#464651] truncate mb-4">Module 3: Transformer Models Deep Dive</p>
                                <div className="flex items-center gap-4 w-full max-w-md">
                                    <div className="flex-1 h-2 bg-[#e6e8f1] rounded-full overflow-hidden">
                                        <div className="h-full bg-[#6bf6ff] rounded-full w-[65%]"></div>
                                    </div>
                                    <span className="font-mono text-[12px] leading-[1.4] text-[#464651] w-10 text-right">65%</span>
                                </div>
                            </div>
                            <div className="w-full sm:w-auto mt-2 sm:mt-0 shrink-0">
                                <button onClick={() => setActiveView('workbook')} className="w-full sm:w-auto bg-[#3a3f8f] text-[#ffffff] px-6 py-2 rounded-lg text-[12px] leading-[1] font-semibold hover:bg-[#222777] transition-colors flex items-center justify-center gap-1">
                                    Continue
                                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                </button>
                            </div>
                        </div>

                        {/* List Item 2 */}
                        <div className="shadow-[0_1px_4px_rgba(58,63,143,0.08),_0_4px_16px_rgba(58,63,143,0.06)] bg-white rounded-lg p-4 border border-[#e0e2eb] flex flex-col sm:flex-row items-center gap-4 hover:border-[#222777]/30 transition-colors">
                            <div className="w-full sm:w-32 h-24 rounded-md overflow-hidden bg-[#e6e8f1] shrink-0 relative">
                                <img alt="Course thumbnail" className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=600&auto=format&fit=crop" />
                                <div className="absolute bottom-1 right-1 bg-[#181c22]/80 text-[#ffffff] font-mono text-[10px] px-1 rounded">Reading</div>
                            </div>
                            <div className="flex-1 w-full min-w-0">
                                <h4 className="text-[16px] leading-[1.85] font-semibold text-[#181c22] truncate mb-1">Data Ethics & Governance</h4>
                                <p className="text-[12px] leading-[1] font-semibold text-[#464651] truncate mb-4">Chapter 2: Bias in Machine Learning</p>
                                <div className="flex items-center gap-4 w-full max-w-md">
                                    <div className="flex-1 h-2 bg-[#e6e8f1] rounded-full overflow-hidden">
                                        <div className="h-full bg-[#6bf6ff] rounded-full w-[20%]"></div>
                                    </div>
                                    <span className="font-mono text-[12px] leading-[1.4] text-[#464651] w-10 text-right">20%</span>
                                </div>
                            </div>
                            <div className="w-full sm:w-auto mt-2 sm:mt-0 shrink-0">
                                <button onClick={() => setActiveView('workbook')} className="w-full sm:w-auto bg-[#3a3f8f] text-[#ffffff] px-6 py-2 rounded-lg text-[12px] leading-[1] font-semibold hover:bg-[#222777] transition-colors flex items-center justify-center gap-1">
                                    Continue
                                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Saved Items */}
                <section>
                    <div className="flex items-center justify-between mb-4 border-b border-[#e0e2eb] pb-1">
                        <h3 className="text-[24px] leading-[1.3] tracking-[-0.01em] font-semibold text-[#222777] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[20px]">bookmark</span>
                            Saved for Later
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Saved Item 1 */}
                        <div className="shadow-[0_1px_4px_rgba(58,63,143,0.08),_0_4px_16px_rgba(58,63,143,0.06)] bg-white rounded-lg p-4 border border-[#e0e2eb] flex gap-4">
                            <div className="w-16 h-16 rounded bg-[#e6e8f1] flex items-center justify-center text-[#222777] shrink-0">
                                <span className="material-symbols-outlined">article</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-[14px] leading-[1.85] font-semibold text-[#181c22] line-clamp-2 mb-1">The Future of Generative AI in Academic Research Contexts</h4>
                                <p className="font-mono text-[14px] leading-[1.4] font-medium text-[#464651]">Added 2 days ago</p>
                            </div>
                            <button className="text-[#464651] hover:text-[#222777] self-start p-1">
                                <span className="material-symbols-outlined text-[20px]">more_vert</span>
                            </button>
                        </div>
                        {/* Saved Item 2 */}
                        <div className="shadow-[0_1px_4px_rgba(58,63,143,0.08),_0_4px_16px_rgba(58,63,143,0.06)] bg-white rounded-lg p-4 border border-[#e0e2eb] flex gap-4">
                            <div className="w-16 h-16 rounded bg-[#e6e8f1] flex items-center justify-center text-[#222777] shrink-0">
                                <span className="material-symbols-outlined">smart_display</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-[14px] leading-[1.85] font-semibold text-[#181c22] line-clamp-2 mb-1">Webinar: Optimizing Large Language Models for Efficiency</h4>
                                <p className="font-mono text-[14px] leading-[1.4] font-medium text-[#464651]">Added 1 week ago</p>
                            </div>
                            <button className="text-[#464651] hover:text-[#222777] self-start p-1">
                                <span className="material-symbols-outlined text-[20px]">more_vert</span>
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );

    // --- VIEW 2: WORKBOOK ---
    const renderWorkbook = () => (
        <div className="flex-1 pt-[24px] px-4 md:px-8 pb-8 max-w-[1280px] w-full mx-auto relative overflow-y-auto animate-in slide-in-from-right-8 duration-300">
            {/* Top Progress Bar */}
            <div className="mb-6">
                <button onClick={() => setActiveView('learning-list')} className="text-[#777682] hover:text-[#222777] flex items-center gap-1 text-[13px] font-bold mb-4 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back to Learning List
                </button>
                <div className="flex justify-between items-end mb-1">
                    <div>
                        <h1 className="text-[32px] leading-[1.2] tracking-[-0.02em] font-bold text-[#181c22]">Module 4: Advanced Heuristics</h1>
                        <p className="text-[16px] leading-[1.6] text-[#464651] mt-1">Chapter 2: Application in Nuanced Data Sets</p>
                    </div>
                    <div className="text-right">
                        <span className="font-mono text-[14px] leading-[1.4] font-medium text-[#222777]">65% Complete</span>
                    </div>
                </div>
                <div className="w-full bg-[#e6e8f1] rounded-full h-2">
                    <div className="bg-[#222777] h-2 rounded-full" style={{ width: '65%' }}></div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Left Chapter Navigation Rail */}
                <aside className="w-full lg:w-64 flex-shrink-0">
                    <div className="shadow-[0_1px_4px_rgba(58,63,143,0.08),_0_4px_16px_rgba(58,63,143,0.06)] bg-white rounded-lg p-4 sticky top-[88px]">
                        <h3 className="text-[24px] leading-[1.3] tracking-[-0.01em] font-semibold text-[#181c22] mb-4">Contents</h3>
                        <ul className="space-y-2">
                            <li>
                                <a href="#" className="flex items-start gap-2 group">
                                    <span className="material-symbols-outlined text-[#00696e] mt-[2px] text-[18px]">check_circle</span>
                                    <span className="text-[16px] leading-[1.6] text-[#464651] group-hover:text-[#222777] transition-colors">1. Introduction to Heuristics</span>
                                </a>
                            </li>
                            <li>
                                <a href="#" className="flex items-start gap-2 group">
                                    <span className="material-symbols-outlined text-[#00696e] mt-[2px] text-[18px]">check_circle</span>
                                    <span className="text-[16px] leading-[1.6] text-[#464651] group-hover:text-[#222777] transition-colors">2. Identifying Bias</span>
                                </a>
                            </li>
                            <li className="bg-[#f1f3fc] -mx-2 p-2 rounded border-l-2 border-[#222777]">
                                <a href="#" className="flex items-start gap-2">
                                    <span className="material-symbols-outlined text-[#222777] mt-[2px] text-[18px]">radio_button_checked</span>
                                    <span className="text-[16px] leading-[1.6] text-[#222777] font-bold">3. Nuanced Data Applications</span>
                                </a>
                            </li>
                            <li>
                                <div className="flex items-start gap-2 group opacity-60 pointer-events-none">
                                    <span className="material-symbols-outlined text-[#777682] mt-[2px] text-[18px]">lock</span>
                                    <span className="text-[16px] leading-[1.6] text-[#464651]">4. Practical Exercise</span>
                                </div>
                            </li>
                            <li>
                                <div className="flex items-start gap-2 group opacity-60 pointer-events-none">
                                    <span className="material-symbols-outlined text-[#777682] mt-[2px] text-[18px]">lock</span>
                                    <span className="text-[16px] leading-[1.6] text-[#464651]">5. Module Review</span>
                                </div>
                            </li>
                        </ul>
                    </div>
                </aside>

                {/* Central Content Area - Worksheet */}
                <div className="flex-1 max-w-3xl flex flex-col gap-6 pb-12">
                    {/* Instruction Block */}
                    <div className="shadow-[0_1px_4px_rgba(58,63,143,0.08),_0_4px_16px_rgba(58,63,143,0.06)] bg-white rounded-lg p-6 border-l-4 border-[#00696e]">
                        <h4 className="text-[24px] leading-[1.3] tracking-[-0.01em] font-semibold text-[#181c22] mb-2 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[#00696e]">info</span> Task Overview
                        </h4>
                        <p className="text-[16px] leading-[1.85] text-[#464651]">
                            Review the provided dataset excerpt regarding urban traffic flow anomalies. Identify three potential heuristic biases a naive AI model might adopt if trained exclusively on this sample without contextual tagging.
                        </p>
                    </div>

                    {/* Multiple Choice Block */}
                    <div className="shadow-[0_1px_4px_rgba(58,63,143,0.08),_0_4px_16px_rgba(58,63,143,0.06)] bg-white rounded-lg p-6">
                        <h4 className="font-mono text-[14px] leading-[1.4] font-medium text-[#181c22] mb-4">Question 1: Primary Indicator</h4>
                        <p className="text-[16px] leading-[1.6] text-[#464651] mb-4">Which temporal pattern is most likely to cause an availability cascade in the model?</p>
                        <div className="space-y-2">
                            <label className="flex items-center gap-4 p-2 rounded border border-[#c7c5d3] hover:border-[#222777] hover:bg-[#f1f3fc] cursor-pointer transition-all">
                                <input type="radio" name="q1" className="text-[#222777] focus:ring-[#222777] w-4 h-4 border-[#c7c5d3]" />
                                <span className="text-[16px] leading-[1.6] text-[#181c22]">Weekend spikes in suburban zones</span>
                            </label>
                            <label className="flex items-center gap-4 p-2 rounded border border-[#222777] bg-[#f1f3fc] cursor-pointer transition-all">
                                <input type="radio" name="q1" defaultChecked className="text-[#222777] focus:ring-[#222777] w-4 h-4 border-[#222777]" />
                                <span className="text-[16px] leading-[1.6] text-[#222777] font-bold">Rush hour localized congestion</span>
                            </label>
                            <label className="flex items-center gap-4 p-2 rounded border border-[#c7c5d3] hover:border-[#222777] hover:bg-[#f1f3fc] cursor-pointer transition-all">
                                <input type="radio" name="q1" className="text-[#222777] focus:ring-[#222777] w-4 h-4 border-[#c7c5d3]" />
                                <span className="text-[16px] leading-[1.6] text-[#181c22]">Overnight maintenance delays</span>
                            </label>
                        </div>
                    </div>

                    {/* Voice Answer Block with Live Transcript */}
                    <div className="shadow-[0_1px_4px_rgba(58,63,143,0.08),_0_4px_16px_rgba(58,63,143,0.06)] bg-white rounded-lg p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#6bf6ff] opacity-10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                        <h4 className="font-mono text-[14px] leading-[1.4] font-medium text-[#181c22] mb-1 flex items-center justify-between">
                            Question 2: Oral Rationale
                            <span className="bg-[#e6e8f1] text-[#464651] px-2 py-1 rounded-full font-mono text-[12px] leading-[1.4] flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">mic</span> Voice Required
                            </span>
                        </h4>
                        <p className="text-[16px] leading-[1.6] text-[#464651] mb-6">Explain how 'Confirmation Bias' might manifest in the model's predictive routing during a major sporting event.</p>

                        <div className="border border-[#c7c5d3] rounded-lg p-4 bg-[#f9f9ff] flex flex-col items-center justify-center min-h-[200px] relative">
                            {/* Mini Recorder */}
                            <div className="flex flex-col items-center gap-4 z-10">
                                <button className="w-16 h-16 rounded-full bg-white border-2 border-[#00696e] flex items-center justify-center shadow-[0_0_0_0_rgba(0,194,203,0.7)] animate-[pulse_1.8s_infinite_cubic-bezier(0.66,0,0,1)] hover:scale-105 transition-transform group">
                                    <span className="material-symbols-outlined text-[#00696e] text-[32px] group-hover:text-[#222777] transition-colors">mic</span>
                                </button>
                                <span className="font-mono text-[12px] leading-[1.4] text-[#00696e] font-bold">Recording... 00:24</span>
                            </div>
                            {/* Live Transcript Area */}
                            <div className="w-full mt-6 p-4 bg-white rounded border border-[#e0e2eb] shadow-sm">
                                <p className="text-[16px] leading-[1.85] text-[#181c22]">
                                    <span className="text-[#181c22]">During a major sporting event, the model might exhibit confirmation bias by heavily weighting historical data that suggests main arterial roads will be gridlocked. </span>
                                    <span className="text-[#222777] bg-[#e0e0ff]/30 border-b border-[#222777] border-dashed pb-[1px] animate-pulse">It would actively seek out minor traffic anomalies on those routes to confirm its prediction, while potentially ignoring...</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Long Answer Textarea */}
                    <div className="shadow-[0_1px_4px_rgba(58,63,143,0.08),_0_4px_16px_rgba(58,63,143,0.06)] bg-white rounded-lg p-6">
                        <h4 className="font-mono text-[14px] leading-[1.4] font-medium text-[#181c22] mb-1">Question 3: Mitigation Strategies</h4>
                        <p className="text-[16px] leading-[1.6] text-[#464651] mb-4">Detail two algorithmic adjustments to prevent the biases identified in Q1 and Q2.</p>
                        <textarea className="w-full bg-[#f1f3fc] border border-[#c7c5d3] rounded p-4 text-[16px] leading-[1.6] text-[#181c22] focus:outline-none focus:border-[#222777] focus:ring-1 focus:ring-[#222777] transition-colors shadow-sm" placeholder="Begin typing your strategy here..." rows="5"></textarea>
                    </div>

                    {/* Action Footer */}
                    <div className="flex justify-end gap-4 mt-2 border-t border-[#c7c5d3] pt-6">
                        <button className="px-6 py-2 rounded border border-[#c7c5d3] text-[#464651] font-mono text-[14px] leading-[1.4] font-medium hover:bg-[#f1f3fc] transition-colors">
                            Save Draft
                        </button>
                        <button onClick={() => setActiveView('learning-list')} className="px-6 py-2 rounded bg-[#222777] text-white font-mono text-[14px] leading-[1.4] font-medium hover:bg-[#3a3f8f] transition-colors shadow-md flex items-center gap-1">
                            Submit Module <span className="material-symbols-outlined text-[18px]">send</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    // --- VIEW 3: NEARBY SEMINARS (MAP) ---
    // (This remains unchanged from the previous setup to complete the 3-view flow)
    const renderSeminars = () => (
        <div className="flex flex-col h-[calc(100vh-64px)] w-full animate-in fade-in duration-300">
            <div className="flex items-center justify-between p-4 md:px-8 border-b border-[#e0e2eb] bg-white shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => setActiveView('learning-list')} className="text-[#777682] hover:text-[#222777] transition-colors flex items-center justify-center w-8 h-8 rounded-full hover:bg-[#f1f3fc]">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h1 className="text-[24px] font-bold text-[#222777]">Nearby Seminars</h1>
                </div>
                <div className="flex gap-2">
                    <select className="bg-[#f9f9ff] border border-[#e0e2eb] rounded-md px-3 py-1.5 text-[13px] font-bold text-[#464651] outline-none">
                        <option>All Topics</option>
                        <option>Machine Learning</option>
                    </select>
                    <select className="bg-[#f9f9ff] border border-[#e0e2eb] rounded-md px-3 py-1.5 text-[13px] font-bold text-[#464651] outline-none">
                        <option>Any Distance</option>
                        <option>&lt; 5 km</option>
                    </select>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* List Column */}
                <div className="w-full md:w-[400px] border-r border-[#e0e2eb] bg-[#f9f9ff] overflow-y-auto p-4 space-y-4 shrink-0 shadow-[1px_0_4px_rgba(0,0,0,0.05)] z-10">
                    {/* Seminar Card 1 */}
                    <div className="bg-white border border-[#e0e2eb] rounded-xl p-5 shadow-sm hover:border-[#222777] transition-colors cursor-pointer relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-[#00c2cb]"></div>
                        <div className="flex justify-between items-start mb-2">
                            <span className="bg-[#e6fbfc] text-[#006e73] font-mono text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">school</span> Workshop
                            </span>
                            <span className="text-[12px] font-mono font-bold text-[#00c2cb] flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">location_on</span> 1.2 km
                            </span>
                        </div>
                        <h3 className="text-[18px] font-bold text-[#181c22] mb-2 leading-tight">Applied NLP in Clinical Research</h3>
                        <p className="text-[13px] text-[#464651] line-clamp-2 mb-4 leading-relaxed">Exploring transformer models for extracting patient outcomes from unstructured medical records...</p>
                        <div className="flex items-center justify-between border-t border-[#e0e2eb] pt-3">
                            <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-[#777682]">
                                <span className="material-symbols-outlined text-[14px]">calendar_today</span> Oct 24 • 14:00
                            </div>
                            <button className="bg-[#222777] text-white px-4 py-1.5 rounded text-[12px] font-bold shadow-sm hover:bg-[#3a3f8f] transition-colors">
                                Register
                            </button>
                        </div>
                    </div>
                </div>

                {/* Map Area Placeholder */}
                <div className="hidden md:flex flex-1 bg-[#d7dae2] relative overflow-hidden items-center justify-center">
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#464651 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                    {/* Simulated Pins */}
                    <div className="absolute top-[40%] left-[45%] flex flex-col items-center cursor-pointer group z-10">
                        <div className="bg-white px-3 py-1.5 rounded-lg shadow-lg mb-1 whitespace-nowrap border border-[#e0e2eb]">
                            <p className="text-[13px] font-bold text-[#222777]">Applied NLP in Clinic</p>
                            <p className="text-[10px] font-mono text-[#777682] font-bold">1.2 km away • Today</p>
                        </div>
                        <div className="w-6 h-6 bg-[#00c2cb] rounded-full border-2 border-white shadow-md flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="w-full h-full bg-[#f9f9ff] overflow-hidden">
            {activeView === 'learning-list' && renderLearningList()}
            {activeView === 'seminars' && renderSeminars()}
            {activeView === 'workbook' && renderWorkbook()}
        </div>
    );
}