// frontend/src/pages/UserTimeline.jsx
import React, { useState } from 'react';
import {Link} from "react-router-dom";

export default function UserTimeline() {
    const [activeFilter, setActiveFilter] = useState('All');

    // MOCK DATA: Timeline Events
    const timelineEvents = [
        {
            id: 1,
            type: 'Recording',
            title: 'Recording AI Ethics Lecture',
            timestamp: 'Live',
            description: "Capturing live audio from Professor Harrison's seminar on algorithmic bias. Processing real-time transcription and key entity extraction.",
            icon: 'mic',
            color: 'text-[#00c2cb]',
            borderColor: 'border-[#00c2cb]',
            isLive: true
        },
        {
            id: 2,
            type: 'Rewards',
            title: 'Milestone Achieved',
            timestamp: '2 hours ago',
            description: 'Completed "Deep Learning Fundamentals" workbook.',
            icon: 'emoji_events',
            color: 'text-[#006e73]',
            borderColor: 'border-[#3edae3]',
            coinReward: '+500',
            isLive: false
        },
        {
            id: 3,
            type: 'Reports',
            title: 'Report Generated',
            timestamp: 'Yesterday, 4:30 PM',
            description: 'Comprehensive literature review on Transformer architectures. Synthesized from 14 individual research papers and 3 seminar transcripts.',
            icon: 'description',
            color: 'text-[#222777]',
            borderColor: 'border-[#222777]',
            hasLink: true,
            isLive: false
        },
        {
            id: 4,
            type: 'Seminars',
            title: 'Seminar Synthesized',
            timestamp: 'Oct 12, 10:00 AM',
            description: '"The Future of Generative Models" by Dr. Aris. Extracted 5 key themes and generated flashcards for review.',
            icon: 'record_voice_over',
            color: 'text-[#3f4378]',
            borderColor: 'border-[#3f4378]',
            isLive: false
        }
    ];

    const filters = ['All', 'Recordings', 'Summaries', 'Reports', 'Seminars', 'Notes', 'Rewards'];

    const filteredEvents = activeFilter === 'All'
        ? timelineEvents
        : timelineEvents.filter(event => event.type === activeFilter);

    return (
        <div className="flex-1 w-full bg-[#f1f3fc] p-4 md:p-8 flex justify-center h-[calc(100vh-64px)] overflow-y-auto">


            <style>{`
                .pulse-ring { animation: pulse 1.8s infinite cubic-bezier(0.4, 0, 0.2, 1); }
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(0, 194, 203, 0.4); }
                    70% { box-shadow: 0 0 0 8px rgba(0, 194, 203, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(0, 194, 203, 0); }
                }
                .shadow-card { box-shadow: 0 1px 4px rgba(58,63,143,0.08), 0 4px 16px rgba(58,63,143,0.06); }
            `}</style>

            <div className="w-full max-w-[900px] flex flex-col md:flex-row gap-8 pb-12">

                {/* Timeline Container */}
                <div className="flex-1">


                    {/* Header & Filters */}
                    <div className="mb-8 border-b border-[#e0e2eb] pb-6 bg-white p-6 rounded-xl shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-[32px] font-bold text-[#222777] tracking-tight">My Timeline</h2>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {filters.map(filter => (
                                <button
                                    key={filter}
                                    onClick={() => setActiveFilter(filter)}
                                    className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-colors shadow-sm
                                        ${activeFilter === filter
                                        ? 'bg-[#3a3f8f] text-white hover:bg-[#222777]'
                                        : 'bg-[#f9f9ff] text-[#464651] border border-[#c7c5d3] hover:bg-[#e0e2eb]'
                                    }`}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Vertical Timeline */}
                    <div className="relative ml-4 md:ml-8">
                        {/* Vertical Line */}
                        <div className="absolute left-[11px] top-4 bottom-0 w-[2px] bg-[#c7c5d3] rounded-full"></div>

                        {filteredEvents.length === 0 ? (
                            <div className="pl-12 pt-8 pb-8 text-[#777682] font-bold font-mono">No activity found for this filter.</div>
                        ) : (
                            filteredEvents.map(event => (
                                <div key={event.id} className="relative pl-10 pb-8 group animate-in slide-in-from-bottom-4 duration-300">

                                    {/* Timeline Node */}
                                    <div className={`absolute left-0 top-1 w-6 h-6 rounded-full bg-white border-2 ${event.borderColor} flex items-center justify-center shadow-sm z-10 ${event.isLive ? 'pulse-ring' : ''}`}>
                                        {event.isLive
                                            ? <div className="w-2 h-2 rounded-full bg-[#00c2cb]"></div>
                                            : <div className={`w-2 h-2 rounded-full ${event.color.replace('text-', 'bg-')}`}></div>
                                        }
                                    </div>

                                    {/* Event Card */}
                                    <div className="bg-white rounded-xl p-5 shadow-card border border-[#e0e2eb] hover:border-[#00c2cb]/50 transition-all group-hover:shadow-md">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`material-symbols-outlined text-[20px] ${event.color}`}>{event.icon}</span>
                                                <span className="font-mono text-[14px] font-bold text-[#181c22]">{event.title}</span>
                                            </div>
                                            <span className={`font-mono text-[11px] font-bold ${event.isLive ? 'text-[#00c2cb]' : 'text-[#777682]'}`}>
                                                {event.timestamp}
                                            </span>
                                        </div>

                                        {event.coinReward && (
                                            <div className="bg-[#e6fbfc] text-[#006e73] px-3 py-1 rounded-full flex items-center gap-1 w-fit mb-3 border border-[#6bf6ff]/50 shadow-sm">
                                                <span className="material-symbols-outlined text-[14px]">toll</span>
                                                <span className="text-[12px] font-bold">{event.coinReward}</span>
                                            </div>
                                        )}

                                        <p className="text-[15px] text-[#464651] leading-relaxed mb-1">{event.description}</p>

                                        {event.hasLink && (
                                            <button className="text-[#222777] font-bold text-[13px] hover:underline flex items-center gap-1 mt-3">
                                                <span>View Report</span>
                                                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}

                        {/* End of timeline marker */}
                        {filteredEvents.length > 0 && (
                            <div className="relative pl-10 pb-2">
                                <div className="absolute left-[7px] top-0 w-2.5 h-2.5 rounded-full bg-[#c7c5d3] z-10"></div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Rail: Gamification Widgets */}
                <div className="w-full md:w-[280px] shrink-0 space-y-6">

                    {/* Streak Widget */}
                    <div className="bg-white rounded-xl p-5 shadow-card border border-[#e0e2eb]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[18px] font-bold text-[#181c22]">Activity Streak</h3>
                            <span className="material-symbols-outlined text-[#00c2cb] text-[24px]">local_fire_department</span>
                        </div>
                        <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-[40px] font-bold text-[#222777] tracking-tighter">14</span>
                            <span className="font-mono text-[12px] font-bold text-[#777682] uppercase tracking-wider">Days</span>
                        </div>
                        <p className="font-mono text-[11px] text-[#464651] mb-5 leading-relaxed font-bold">Keep recording or synthesizing to maintain your streak!</p>

                        {/* Mini Week View */}
                        <div className="flex justify-between items-center px-1">
                            {['M', 'T', 'W'].map((day, i) => (
                                <div key={i} className="flex flex-col items-center gap-1 opacity-50">
                                    <span className="font-mono text-[10px] font-bold text-[#777682]">{day}</span>
                                    <div className="w-6 h-6 rounded-full bg-[#3a3f8f] flex items-center justify-center"><span className="material-symbols-outlined text-[12px] text-white">check</span></div>
                                </div>
                            ))}
                            <div className="flex flex-col items-center gap-1">
                                <span className="font-mono text-[10px] font-bold text-[#222777]">T</span>
                                <div className="w-6 h-6 rounded-full border-2 border-[#00c2cb] flex items-center justify-center pulse-ring"><span className="material-symbols-outlined text-[12px] text-[#00c2cb]">mic</span></div>
                            </div>
                            <div className="flex flex-col items-center gap-1 opacity-30">
                                <span className="font-mono text-[10px] font-bold text-[#777682]">F</span>
                                <div className="w-6 h-6 rounded-full bg-[#ebeef6] flex items-center justify-center"></div>
                            </div>
                        </div>
                    </div>

                    {/* Impact Widget */}
                    <div className="bg-white rounded-xl p-5 shadow-card border border-[#e0e2eb]">
                        <h3 className="text-[16px] font-bold text-[#181c22] mb-4">This Week's Impact</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-[#e0e2eb] pb-3">
                                <span className="font-mono text-[12px] font-bold text-[#777682]">Hours Recorded</span>
                                <span className="font-mono text-[14px] font-bold text-[#222777]">12.5h</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-[#e0e2eb] pb-3">
                                <span className="font-mono text-[12px] font-bold text-[#777682]">Reports Gen.</span>
                                <span className="font-mono text-[14px] font-bold text-[#222777]">4</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="font-mono text-[12px] font-bold text-[#777682]">Coins Earned</span>
                                <span className="font-mono text-[14px] font-bold text-[#006e73] bg-[#e6fbfc] px-2 py-0.5 rounded border border-[#6bf6ff]/50">+850</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}