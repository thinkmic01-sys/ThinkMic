import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from "react-router-dom";

export default function Achievements() {
    // Pull the live coin balance from our Redux store
    const { user } = useSelector((state) => state.auth);
    const currentCoins = user?.coins || 1250;

    const [activeTab, setActiveTab] = useState('history');

    // Dynamic data arrays (Ready for backend integration)
    const waysToEarn = [
        { id: 1, title: 'Complete a seminar', desc: 'Finish any verified academic video module.', amount: 50, icon: 'school' },
        { id: 2, title: 'Publish AI notes', desc: 'Share your synthesized notes with the community.', amount: 100, icon: 'edit_document' },
        { id: 3, title: 'Invite a peer', desc: 'Refer a colleague to join ThinkMic.', amount: 200, icon: 'group_add' },
    ];

    const transactions = [
        { id: 1, date: '2023-10-27 14:30', action: 'Seminar: Quantum Computing', icon: 'school', amount: 50 },
        { id: 2, date: '2023-10-26 09:15', action: 'Notes Published', icon: 'edit_document', amount: 100 },
        { id: 3, date: '2023-10-25 18:45', action: 'PDF Export', icon: 'download', amount: -20 },
        { id: 4, date: '2023-10-24 11:00', action: '7-Day Streak Bonus', icon: 'local_fire_department', amount: 200 },
        { id: 5, date: '2023-10-22 16:20', action: 'Seminar: Intro to Neural Nets', icon: 'school', amount: 50 },
    ];

    return (
        /* FIXED: Added strict height and overflow-y-auto to the outermost container */
        <div className="w-full h-[calc(100vh-64px)] overflow-y-auto bg-[#f9f9ff] font-sans custom-scrollbar">

            <style>{`
                /* Ensures scrollbars are visible on mobile/webkit browsers */
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #c7c5d3; border-radius: 10px; }
            `}</style>

            <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8 flex flex-col pb-20">

                {/* Header */}
                <div className="mb-6 sm:mb-8">
                    <h2 className="text-2xl sm:text-3xl font-bold text-[#222777] mb-1.5 sm:mb-2 tracking-tight">Rewards & Achievements</h2>
                    <p className="text-gray-500 text-sm sm:text-lg">Track your research milestones and token accumulation.</p>
                </div>

                {/* Hero Balance Card */}
                <div className="bg-white rounded-xl p-5 sm:p-6 md:p-8 shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] mb-6 sm:mb-8 relative overflow-hidden">
                    {/* Decorative background glow */}
                    <div className="absolute -right-10 -top-10 sm:-right-20 sm:-top-20 w-48 h-48 sm:w-64 sm:h-64 bg-[#00c2cb]/10 rounded-full blur-3xl pointer-events-none"></div>

                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 sm:gap-8 relative z-10">

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full lg:w-auto">
                            {/* Coin Badge */}
                            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-[#1E2255] flex items-center justify-center border-4 border-[#00c2cb] shadow-[0_0_15px_rgba(0,194,203,0.4)] animate-pulse relative shrink-0">
                                <span className="material-symbols-outlined text-[#00c2cb] text-[32px] sm:text-[40px] md:text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>toll</span>
                                <div className="absolute -bottom-2 bg-[#e6fbfc] text-[#006e73] px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] uppercase tracking-wider font-bold border border-[#00c2cb]">Lvl 4</div>
                            </div>

                            <div>
                                <p className="text-[10px] sm:text-xs text-[#777682] uppercase tracking-wider mb-0.5 sm:mb-1 font-bold">Available Balance</p>
                                <h3 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#222777] tracking-tight flex items-baseline gap-1 sm:gap-2">
                                    {currentCoins.toLocaleString()} <span className="text-lg sm:text-xl md:text-2xl text-[#777682] font-medium">Coins</span>
                                </h3>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full lg:w-1/3 shrink-0">
                            <div className="flex justify-between text-[11px] sm:text-xs font-bold mb-2">
                                <span className="text-[#777682]">Progress to Level 5</span>
                                <span className="text-[#222777]">1,250 / 2,000</span>
                            </div>
                            <div className="h-1.5 sm:h-2 w-full bg-[#e0e2eb] rounded-full overflow-hidden">
                                <div className="h-full bg-[#00c2cb] rounded-full transition-all duration-1000 ease-out" style={{ width: '62.5%' }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-[#e0e2eb]">
                        <div>
                            <p className="text-[10px] sm:text-xs text-[#777682] mb-0.5 sm:mb-1 flex items-center gap-1 font-bold uppercase tracking-wider"><span className="material-symbols-outlined text-[14px]">calendar_today</span> Week Earned</p>
                            <p className="text-lg sm:text-xl md:text-2xl text-[#222777] font-bold">+350</p>
                        </div>
                        <div>
                            <p className="text-[10px] sm:text-xs text-[#777682] mb-0.5 sm:mb-1 flex items-center gap-1 font-bold uppercase tracking-wider"><span className="material-symbols-outlined text-[14px]">all_inclusive</span> Lifetime</p>
                            <p className="text-lg sm:text-xl md:text-2xl text-[#222777] font-bold">4,850</p>
                        </div>
                        <div>
                            <p className="text-[10px] sm:text-xs text-[#777682] mb-0.5 sm:mb-1 flex items-center gap-1 font-bold uppercase tracking-wider"><span className="material-symbols-outlined text-[14px]">leaderboard</span> Rank</p>
                            <p className="text-lg sm:text-xl md:text-2xl text-[#222777] font-bold">#42</p>
                        </div>
                        <div>
                            <p className="text-[10px] sm:text-xs text-[#777682] mb-0.5 sm:mb-1 flex items-center gap-1 font-bold uppercase tracking-wider"><span className="material-symbols-outlined text-[14px]">local_fire_department</span> Streak</p>
                            <p className="text-lg sm:text-xl md:text-2xl text-[#222777] font-bold">14 Days</p>
                        </div>
                    </div>
                </div>

                {/* Two Columns Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">

                    {/* Ways to Earn */}
                    <div className="order-2 lg:order-1">
                        <h3 className="text-xl sm:text-2xl text-[#222777] mb-3 sm:mb-4 font-bold">Ways to Earn</h3>
                        <div className="flex flex-col gap-2 sm:gap-3">
                            {waysToEarn.map((item) => (
                                <div key={item.id} className="bg-white rounded-lg p-3 sm:p-4 border border-[#e0e2eb] shadow-sm flex items-center justify-between hover:border-[#222777] transition-colors cursor-pointer group">
                                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 pr-3">
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[#f1f3fc] flex items-center justify-center text-[#3a3f8f] group-hover:bg-[#e0e0ff] transition-colors shrink-0">
                                            <span className="material-symbols-outlined text-[18px] sm:text-[24px]">{item.icon}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[13px] sm:text-[15px] text-[#181c22] font-semibold truncate">{item.title}</p>
                                            <p className="text-[11px] sm:text-xs text-[#777682] line-clamp-1 sm:line-clamp-none">{item.desc}</p>
                                        </div>
                                    </div>
                                    <div className="bg-[#e6fbfc] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-[#00c2cb]/30 flex items-center gap-0.5 sm:gap-1 shrink-0">
                                        <span className="material-symbols-outlined text-[#006e73] text-[12px] sm:text-[14px]">add</span>
                                        <span className="text-[#006e73] font-bold text-[12px] sm:text-sm">{item.amount}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Transaction History & Leaderboard Tabs */}
                    <div className="order-1 lg:order-2 bg-white rounded-xl border border-[#e0e2eb] shadow-[0_1px_4px_rgba(58,63,143,0.05)] overflow-hidden flex flex-col h-full">

                        {/* Tabs */}
                        <div className="flex border-b border-[#e0e2eb] bg-[#f9f9ff]">
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`flex-1 py-2.5 sm:py-3 text-[13px] sm:text-sm font-bold transition-colors ${activeTab === 'history' ? 'text-[#222777] border-b-2 border-[#222777] bg-white' : 'text-[#777682] hover:text-[#222777]'}`}
                            >
                                History
                            </button>
                            <button
                                onClick={() => setActiveTab('leaderboard')}
                                className={`flex-1 py-2.5 sm:py-3 text-[13px] sm:text-sm font-bold transition-colors ${activeTab === 'leaderboard' ? 'text-[#222777] border-b-2 border-[#222777] bg-white' : 'text-[#777682] hover:text-[#222777]'}`}
                            >
                                Leaderboard
                            </button>
                        </div>

                        {/* Ledger Table Wrapper */}
                        <div className="w-full">
                            {activeTab === 'history' ? (
                                <div className="overflow-x-auto w-full custom-scrollbar">
                                    <table className="w-full text-left border-collapse min-w-[450px]">
                                        <thead className="bg-[#f9f9ff] border-b border-[#e0e2eb]">
                                        <tr>
                                            <th className="py-3 px-3 sm:px-4 text-[10px] sm:text-[11px] text-[#777682] font-bold uppercase tracking-wider whitespace-nowrap">Date</th>
                                            <th className="py-3 px-3 sm:px-4 text-[10px] sm:text-[11px] text-[#777682] font-bold uppercase tracking-wider">Action</th>
                                            <th className="py-3 px-3 sm:px-4 text-[10px] sm:text-[11px] text-[#777682] font-bold uppercase tracking-wider text-right whitespace-nowrap">Amount</th>
                                        </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#e0e2eb] text-[13px] sm:text-sm">
                                        {transactions.map((tx) => (
                                            <tr key={tx.id} className={`hover:bg-[#f1f3fc] transition-colors ${tx.amount < 0 ? 'bg-[#ffdad6]/20 hover:bg-[#ffdad6]/40' : ''}`}>
                                                <td className="py-3 sm:py-4 px-3 sm:px-4 font-mono text-[11px] sm:text-xs text-[#777682] whitespace-nowrap">{tx.date}</td>
                                                <td className="py-3 sm:py-4 px-3 sm:px-4 text-[#181c22] flex items-center gap-2 sm:gap-3 font-semibold min-w-[200px]">
                                                    <span className="material-symbols-outlined text-[16px] sm:text-[18px] text-[#c7c5d3] shrink-0">{tx.icon}</span>
                                                    <span className="truncate">{tx.action}</span>
                                                </td>
                                                <td className={`py-3 sm:py-4 px-3 sm:px-4 text-right font-bold font-mono text-[12px] sm:text-[13px] whitespace-nowrap ${tx.amount > 0 ? 'text-[#006e73]' : 'text-[#ba1a1a]'}`}>
                                                    {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-48 sm:h-64 text-[#c7c5d3] font-bold text-[13px] sm:text-sm px-4 text-center">
                                    Leaderboard synchronization coming soon
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}