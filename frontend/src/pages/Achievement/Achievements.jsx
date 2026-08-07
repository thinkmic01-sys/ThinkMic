import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from "react-router-dom";
import api from '../../services/api';

const DEFAULT_LEVEL_INFO = {
    currentLevel: 1,
    levelName: 'Novice Researcher',
    currentLevelMin: 0,
    nextLevelThreshold: 500,
    progressPercent: 0,
    isMaxLevel: false
};

export default function Achievements() {
    const navigate = useNavigate();
    // Pull the live coin balance and auth token from our Redux store
    const { user, accessToken: token } = useSelector((state) => state.auth);
    const currentCoins = user?.coins ?? 0;

    const [activeTab, setActiveTab] = useState('history');

    // Dynamic data arrays (Ready for backend integration)
    const waysToEarn = [
        { id: 1, title: 'Complete a seminar', desc: 'Finish any verified academic video module.', icon: 'school', path: '/app/courses/seminars' },
        { id: 3, title: 'Invite a peer', desc: 'Refer a colleague to join ThinkMic.', icon: 'group_add', path: '/app/forms' },
    ];

    const [transactions, setTransactions] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [stats, setStats] = useState({ weekEarned: 0, lifetime: 0, rank: '-', streak: 0, levelInfo: DEFAULT_LEVEL_INFO });

    React.useEffect(() => {
        const fetchTransactions = async () => {
            try {
                const response = await api.get('/achievements/transactions');
                setTransactions(response.data);
            } catch (error) {
                console.error("Failed to fetch transactions", error);
            }
        };
        const fetchLeaderboard = async () => {
            try {
                const response = await api.get('/achievements/leaderboard');
                setLeaderboard(response.data);
            } catch (error) {
                console.error("Failed to fetch leaderboard", error);
            }
        };
        const fetchStats = async () => {
            try {
                const response = await api.get('/achievements/stats');
                setStats(response.data);
            } catch (error) {
                console.error("Failed to fetch stats", error);
            }
        };
        fetchTransactions();
        fetchLeaderboard();
        fetchStats();
    }, [token]);

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
                            <div className={`w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center border-4 shadow-[0_0_15px_rgba(0,194,203,0.4)] animate-pulse relative shrink-0 ${stats.levelInfo.isMaxLevel ? 'bg-[#3a2f00] border-[#FFD700]' : 'bg-[#1E2255] border-[#00c2cb]'}`}>
                                <span className={`material-symbols-outlined text-[32px] sm:text-[40px] md:text-[48px] ${stats.levelInfo.isMaxLevel ? 'text-[#FFD700]' : 'text-[#00c2cb]'}`} style={{ fontVariationSettings: "'FILL' 1" }}>{stats.levelInfo.isMaxLevel ? 'military_tech' : 'toll'}</span>
                                <div className={`absolute -bottom-2 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] uppercase tracking-wider font-bold border whitespace-nowrap ${stats.levelInfo.isMaxLevel ? 'bg-[#fff8e1] text-[#8a6d00] border-[#FFD700]' : 'bg-[#e6fbfc] text-[#006e73] border-[#00c2cb]'}`}>
                                    {stats.levelInfo.isMaxLevel ? 'MAX' : `Lvl ${stats.levelInfo.currentLevel}`}
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] sm:text-xs text-[#777682] uppercase tracking-wider mb-0.5 sm:mb-1 font-bold">Available Balance</p>
                                <h3 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#222777] tracking-tight flex items-baseline gap-1 sm:gap-2">
                                    {currentCoins.toLocaleString()} <span className="text-lg sm:text-xl md:text-2xl text-[#777682] font-medium">Coins</span>
                                </h3>
                                <p className="text-[12px] sm:text-[13px] text-[#3a3f8f] font-bold mt-1">{stats.levelInfo.levelName}</p>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full lg:w-1/3 shrink-0">
                            <div className="flex justify-between text-[11px] sm:text-xs font-bold mb-2">
                                <span className="text-[#777682]">
                                    {stats.levelInfo.isMaxLevel ? 'Max Level Reached 🏆' : `Progress to Level ${stats.levelInfo.currentLevel + 1}`}
                                </span>
                                <span className="text-[#222777]">
                                    {stats.levelInfo.isMaxLevel ? 'MAX' : `${stats.lifetime.toLocaleString()} / ${stats.levelInfo.nextLevelThreshold.toLocaleString()}`}
                                </span>
                            </div>
                            <div className="h-1.5 sm:h-2 w-full bg-[#e0e2eb] rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-1000 ease-out ${stats.levelInfo.isMaxLevel ? 'bg-[#FFD700]' : 'bg-[#00c2cb]'}`} style={{ width: `${stats.levelInfo.progressPercent}%` }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-[#e0e2eb]">
                        <div>
                            <p className="text-[10px] sm:text-xs text-[#777682] mb-0.5 sm:mb-1 flex items-center gap-1 font-bold uppercase tracking-wider"><span className="material-symbols-outlined text-[14px]">calendar_today</span> Week Earned</p>
                            <p className="text-lg sm:text-xl md:text-2xl text-[#222777] font-bold">+{stats.weekEarned}</p>
                        </div>
                        <div>
                            <p className="text-[10px] sm:text-xs text-[#777682] mb-0.5 sm:mb-1 flex items-center gap-1 font-bold uppercase tracking-wider"><span className="material-symbols-outlined text-[14px]">all_inclusive</span> Lifetime</p>
                            <p className="text-lg sm:text-xl md:text-2xl text-[#222777] font-bold">{stats.lifetime?.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-[10px] sm:text-xs text-[#777682] mb-0.5 sm:mb-1 flex items-center gap-1 font-bold uppercase tracking-wider"><span className="material-symbols-outlined text-[14px]">leaderboard</span> Rank</p>
                            <p className="text-lg sm:text-xl md:text-2xl text-[#222777] font-bold">#{stats.rank}</p>
                        </div>
                        <div>
                            <p className="text-[10px] sm:text-xs text-[#777682] mb-0.5 sm:mb-1 flex items-center gap-1 font-bold uppercase tracking-wider"><span className="material-symbols-outlined text-[14px]">local_fire_department</span> Streak</p>
                            <p className="text-lg sm:text-xl md:text-2xl text-[#222777] font-bold">{stats.streak} Days</p>
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
                                <div key={item.id} onClick={() => navigate(item.path)} className="bg-white rounded-lg p-3 sm:p-4 border border-[#e0e2eb] shadow-sm flex items-center justify-between hover:border-[#222777] transition-colors cursor-pointer group">
                                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 pr-3">
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[#f1f3fc] flex items-center justify-center text-[#3a3f8f] group-hover:bg-[#e0e0ff] transition-colors shrink-0">
                                            <span className="material-symbols-outlined text-[18px] sm:text-[24px]">{item.icon}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[13px] sm:text-[15px] text-[#181c22] font-semibold truncate">{item.title}</p>
                                            <p className="text-[11px] sm:text-xs text-[#777682] line-clamp-1 sm:line-clamp-none">{item.desc}</p>
                                        </div>
                                    </div>
                                    <span className="material-symbols-outlined text-[#c7c5d3] group-hover:text-[#222777] transition-colors shrink-0">arrow_forward</span>
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
                                            <tr key={tx._id} className={`hover:bg-[#f1f3fc] transition-colors ${tx.amount < 0 ? 'bg-[#ffdad6]/20 hover:bg-[#ffdad6]/40' : ''}`}>
                                                <td className="py-3 sm:py-4 px-3 sm:px-4 font-mono text-[11px] sm:text-xs text-[#777682] whitespace-nowrap">{new Date(tx.date).toLocaleString()}</td>
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
                            ) : activeTab === 'leaderboard' ? (
                                <div className="overflow-x-auto w-full custom-scrollbar">
                                    <table className="w-full text-left border-collapse min-w-[450px]">
                                        <thead className="bg-[#f9f9ff] border-b border-[#e0e2eb]">
                                        <tr>
                                            <th className="py-3 px-3 sm:px-4 text-[10px] sm:text-[11px] text-[#777682] font-bold uppercase tracking-wider whitespace-nowrap">Rank</th>
                                            <th className="py-3 px-3 sm:px-4 text-[10px] sm:text-[11px] text-[#777682] font-bold uppercase tracking-wider">Scholar</th>
                                            <th className="py-3 px-3 sm:px-4 text-[10px] sm:text-[11px] text-[#777682] font-bold uppercase tracking-wider text-right whitespace-nowrap">Lifetime Coins</th>
                                        </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#e0e2eb] text-[13px] sm:text-sm">
                                        {leaderboard.map((u, idx) => (
                                            <tr key={u._id} className={`hover:bg-[#f1f3fc] transition-colors ${u._id === user?.id ? 'bg-[#e6fbfc] hover:bg-[#cbf4f6]' : ''}`}>
                                                <td className="py-3 sm:py-4 px-3 sm:px-4 font-mono text-[12px] sm:text-[14px] text-[#222777] font-bold whitespace-nowrap">
                                                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                                                </td>
                                                <td className="py-3 sm:py-4 px-3 sm:px-4 text-[#181c22] flex items-center gap-2 sm:gap-3 font-semibold min-w-[200px]">
                                                    <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName)}&background=222777&color=fff`} className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-[#c7c5d3] object-cover" alt="Avatar"/>
                                                    <span className="truncate">{u.fullName} {u._id === user?.id && <span className="ml-2 text-[10px] bg-[#00c2cb] text-white px-2 py-0.5 rounded-full">You</span>}</span>
                                                </td>
                                                <td className="py-3 sm:py-4 px-3 sm:px-4 text-right font-bold font-mono text-[12px] sm:text-[13px] whitespace-nowrap text-[#006e73]">
                                                    {u.lifetimeCoins?.toLocaleString() || 0}
                                                </td>
                                            </tr>
                                        ))}
                                        {leaderboard.length === 0 && (
                                            <tr>
                                                <td colSpan="3" className="py-8 text-center text-[#777682] font-mono text-xs">No ranking data available</td>
                                            </tr>
                                        )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : null}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}