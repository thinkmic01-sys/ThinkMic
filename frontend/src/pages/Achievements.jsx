// frontend/src/pages/Achievements.jsx
import React, { useState } from 'react';
import { useSelector } from 'react-redux';

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
        <div className="w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col pb-20">

            {/* Header */}
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-primary mb-2">Rewards & Achievements</h2>
                <p className="text-gray-500 text-lg">Track your research milestones and token accumulation.</p>
            </div>

            {/* Hero Balance Card */}
            <div className="bg-white rounded-xl p-6 md:p-8 shadow-card border border-gray-100 mb-8 relative overflow-hidden">
                {/* Decorative background glow */}
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-cyan/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">

                    <div className="flex items-center gap-6 w-full md:w-auto">
                        {/* Coin Badge */}
                        <div className="w-24 h-24 rounded-full bg-[#1E2255] flex items-center justify-center border-4 border-cyan shadow-[0_0_15px_rgba(0,194,203,0.4)] animate-pulse relative shrink-0">
                            <span className="material-symbols-outlined text-cyan text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>toll</span>
                            <div className="absolute -bottom-2 bg-cyan-soft text-cyan px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold border border-cyan">Lvl 4</div>
                        </div>

                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-semibold">Available Balance</p>
                            <h3 className="text-5xl font-bold text-primary tracking-tight">
                                {currentCoins.toLocaleString()} <span className="text-2xl text-gray-400 font-medium">Coins</span>
                            </h3>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full md:w-1/3">
                        <div className="flex justify-between text-xs font-semibold mb-2">
                            <span className="text-gray-500">Progress to Level 5</span>
                            <span className="text-primary font-bold">1,250 / 2,000</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-cyan rounded-full transition-all duration-1000 ease-out" style={{ width: '62.5%' }}></div>
                        </div>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-gray-100">
                    <div>
                        <p className="text-xs text-gray-500 mb-1 flex items-center gap-1 font-semibold"><span className="material-symbols-outlined text-[14px]">calendar_today</span> Week Earned</p>
                        <p className="text-2xl text-primary font-bold">+350</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 mb-1 flex items-center gap-1 font-semibold"><span className="material-symbols-outlined text-[14px]">all_inclusive</span> Lifetime</p>
                        <p className="text-2xl text-primary font-bold">4,850</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 mb-1 flex items-center gap-1 font-semibold"><span className="material-symbols-outlined text-[14px]">leaderboard</span> Rank</p>
                        <p className="text-2xl text-primary font-bold">#42</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 mb-1 flex items-center gap-1 font-semibold"><span className="material-symbols-outlined text-[14px]">local_fire_department</span> Streak</p>
                        <p className="text-2xl text-primary font-bold">14 Days</p>
                    </div>
                </div>
            </div>

            {/* Two Columns Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Ways to Earn */}
                <div>
                    <h3 className="text-2xl text-primary mb-4 font-bold">Ways to Earn</h3>
                    <div className="flex flex-col gap-3">
                        {waysToEarn.map((item) => (
                            <div key={item.id} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm flex items-center justify-between hover:border-primary transition-colors cursor-pointer group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
                                        <span className="material-symbols-outlined">{item.icon}</span>
                                    </div>
                                    <div>
                                        <p className="text-gray-900 font-semibold">{item.title}</p>
                                        <p className="text-xs text-gray-500">{item.desc}</p>
                                    </div>
                                </div>
                                <div className="bg-cyan-soft px-2.5 py-1 rounded-full border border-cyan/20 flex items-center gap-1 shrink-0">
                                    <span className="material-symbols-outlined text-cyan text-[14px]">add</span>
                                    <span className="text-cyan font-bold text-sm">{item.amount}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Transaction History & Leaderboard Tabs */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[400px]">

                    {/* Tabs */}
                    <div className="flex border-b border-gray-200 bg-gray-50/50">
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'history' ? 'text-primary border-b-2 border-primary bg-white' : 'text-gray-500 hover:text-primary'}`}
                        >
                            Transaction History
                        </button>
                        <button
                            onClick={() => setActiveTab('leaderboard')}
                            className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'leaderboard' ? 'text-primary border-b-2 border-primary bg-white' : 'text-gray-500 hover:text-primary'}`}
                        >
                            Leaderboard
                        </button>
                    </div>

                    {/* Ledger Table */}
                    <div className="flex-1 overflow-y-auto">
                        {activeTab === 'history' ? (
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
                                <tr>
                                    <th className="py-2.5 px-4 text-xs text-gray-500 font-bold uppercase tracking-wider">Date</th>
                                    <th className="py-2.5 px-4 text-xs text-gray-500 font-bold uppercase tracking-wider">Action</th>
                                    <th className="py-2.5 px-4 text-xs text-gray-500 font-bold uppercase tracking-wider text-right">Amount</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-sm">
                                {transactions.map((tx) => (
                                    <tr key={tx.id} className={`hover:bg-gray-50 transition-colors ${tx.amount < 0 ? 'bg-red-50/30' : ''}`}>
                                        <td className="py-3 px-4 font-mono text-xs text-gray-500 whitespace-nowrap">{tx.date}</td>
                                        <td className="py-3 px-4 text-gray-900 flex items-center gap-2 font-medium">
                                            <span className="material-symbols-outlined text-[16px] text-gray-400">{tx.icon}</span>
                                            {tx.action}
                                        </td>
                                        <td className={`py-3 px-4 text-right font-bold font-mono ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                            {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="flex items-center justify-center h-64 text-gray-400 font-bold">
                                Leaderboard coming soon
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}