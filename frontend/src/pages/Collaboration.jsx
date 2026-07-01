// frontend/src/pages/Collaboration.jsx
import React, { useState } from 'react';

// Dynamic Mock Data (Ready for Backend)
const referralStats = {
    total: 142,
    pending: 450,
    earned: 3200,
    conversion: 28.4
};

const recentReferrals = [
    { id: 1, initials: 'EL', name: 'Dr. Elena Rostova', date: 'Oct 24, 2026', status: 'Premium', rewards: '500 Coins' },
    { id: 2, initials: 'MS', name: 'Marcus Sterling', date: 'Oct 22, 2026', status: 'Active', rewards: '150 Coins' },
    { id: 3, initials: 'AJ', name: 'alex.j@university.edu', date: 'Oct 21, 2026', status: 'Invited', rewards: '-' },
];

export default function Collaboration() {
    const [isCopied, setIsCopied] = useState(false);
    const referralLink = "https://thinkmic.com/join?ref=scholarly_mind";

    // --- FRONTEND LOGIC --- //

    // Clipboard Copy Logic
    const handleCopyLink = () => {
        navigator.clipboard.writeText(referralLink)
            .then(() => {
                setIsCopied(true);
                // Reset the button text after 2 seconds
                setTimeout(() => setIsCopied(false), 2000);
            })
            .catch(err => console.error("Failed to copy link: ", err));
    };

    // Simulated Actions
    const handleShareEmail = () => alert("Opening email client to share...");
    const handleShareMessage = () => alert("Opening messaging app to share...");
    const handleDownloadQR = () => alert("Downloading QR Code PNG...");

    return (
        <div className="w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col gap-6 h-full pb-20">

            {/* Hero Banner */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="max-w-2xl">
                    <h2 className="text-3xl md:text-4xl font-bold text-primary mb-3 tracking-tight">Grow the ThinkMic Community</h2>
                    <p className="text-gray-500 text-lg leading-relaxed">
                        Invite researchers, scholars, and AI enthusiasts to ThinkMic. Earn platform coins for every active referral and unlock premium collaboration features as your network expands.
                    </p>
                </div>
                <div className="shrink-0 text-cyan">
                    {/* Decorative Icon matching the screenshot */}
                    <span className="material-symbols-outlined text-[100px]" style={{ fontVariationSettings: "'wght' 200" }}>pie_chart</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between h-[120px]">
                    <div className="flex justify-between items-start text-gray-500">
                        <span className="text-sm font-bold tracking-wide">Total Referrals</span>
                        <span className="material-symbols-outlined text-[20px]">person_add</span>
                    </div>
                    <span className="text-4xl font-bold text-primary">{referralStats.total}</span>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between h-[120px]">
                    <div className="flex justify-between items-start text-gray-500">
                        <span className="text-sm font-bold tracking-wide">Pending Coins</span>
                        <span className="material-symbols-outlined text-[20px]">hourglass_empty</span>
                    </div>
                    <span className="text-4xl font-bold text-cyan">{referralStats.pending}</span>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between h-[120px]">
                    <div className="flex justify-between items-start text-gray-500">
                        <span className="text-sm font-bold tracking-wide">Earned Coins</span>
                        <span className="material-symbols-outlined text-[20px]">toll</span>
                    </div>
                    <span className="text-4xl font-bold text-cyan">{referralStats.earned.toLocaleString()}</span>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between h-[120px]">
                    <div className="flex justify-between items-start text-gray-500">
                        <span className="text-sm font-bold tracking-wide">Conversion Rate</span>
                        <span className="material-symbols-outlined text-[20px]">trending_up</span>
                    </div>
                    <span className="text-4xl font-bold text-primary">{referralStats.conversion}%</span>
                </div>
            </div>

            {/* Middle Section: Link & QR Code */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Referral Link Card (Spans 2 columns) */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:p-8 lg:col-span-2 flex flex-col justify-center">
                    <h3 className="text-xl font-bold text-primary mb-4">Your Unique Referral Link</h3>

                    <div className="flex flex-col sm:flex-row gap-3 mb-6">
                        <div className="flex-1 relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">link</span>
                            <input
                                type="text"
                                readOnly
                                value={referralLink}
                                className="w-full bg-[#f9f9ff] border border-gray-200 rounded-lg py-3 pl-12 pr-4 text-sm font-mono text-gray-700 outline-none"
                            />
                        </div>
                        <button
                            onClick={handleCopyLink}
                            className={`px-6 py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center min-w-[120px] shadow-sm
                ${isCopied ? 'bg-green-500 text-white' : 'bg-primary text-white hover:bg-opacity-90'}`}
                        >
                            {isCopied ? 'Copied!' : 'Copy Link'}
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="text-sm font-bold text-gray-500">Share via:</span>
                        <button onClick={handleShareEmail} className="w-10 h-10 rounded-full bg-[#f9f9ff] border border-gray-200 text-primary hover:bg-gray-100 transition-colors flex items-center justify-center">
                            <span className="material-symbols-outlined text-[20px]">mail</span>
                        </button>
                        <button onClick={handleShareMessage} className="w-10 h-10 rounded-full bg-[#f9f9ff] border border-gray-200 text-primary hover:bg-gray-100 transition-colors flex items-center justify-center">
                            <span className="material-symbols-outlined text-[20px]">chat</span>
                        </button>
                    </div>
                </div>

                {/* QR Code Card (Spans 1 column) */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:p-8 flex flex-col items-center justify-center text-center">
                    <h3 className="text-xl font-bold text-primary mb-6">Quick Scan</h3>

                    {/* Abstract placeholder for QR code */}
                    <div className="w-32 h-32 bg-[#f9f9ff] border border-gray-200 rounded-lg mb-4 p-2 grid grid-cols-2 gap-2">
                        <div className="bg-primary/80 rounded-sm"></div>
                        <div className="bg-primary/80 rounded-sm"></div>
                        <div className="bg-primary/80 rounded-sm"></div>
                        <div className="flex gap-1"><div className="w-1/2 bg-cyan rounded-sm"></div><div className="w-1/2 bg-primary/80 rounded-sm"></div></div>
                    </div>

                    <p className="text-xs font-bold text-gray-500 mb-4">Let colleagues scan to join instantly.</p>
                    <button
                        onClick={handleDownloadQR}
                        className="text-primary text-sm font-bold hover:text-cyan transition-colors flex items-center gap-1"
                    >
                        <span className="material-symbols-outlined text-[18px]">download</span> Download PNG
                    </button>
                </div>
            </div>

            {/* Recent Referrals Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-primary">Recent Referrals</h3>
                    <button className="text-sm font-bold text-primary flex items-center gap-1 hover:text-cyan transition-colors">
                        View All <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                        <tr className="bg-[#f9f9ff] border-b border-gray-100 text-xs font-bold text-gray-500">
                            <th className="py-3 px-6">User</th>
                            <th className="py-3 px-6">Date Invited</th>
                            <th className="py-3 px-6">Status</th>
                            <th className="py-3 px-6 text-right">Rewards Earned</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                        {recentReferrals.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                <td className="py-4 px-6">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold shrink-0
                        ${user.status === 'Invited' ? 'bg-[#f9f9ff] border border-gray-200 text-gray-500 border-dashed' : 'bg-gray-100 text-primary'}`}>
                                            {user.initials}
                                        </div>
                                        <span className="font-bold text-primary">{user.name}</span>
                                    </div>
                                </td>
                                <td className="py-4 px-6 font-mono text-xs text-gray-500">{user.date}</td>
                                <td className="py-4 px-6">
                                    {/* Dynamic Status Badges matching screenshot */}
                                    <span className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider
                      ${user.status === 'Premium' ? 'bg-purple-100 text-purple-700' : ''}
                      ${user.status === 'Active' ? 'bg-gray-100 text-gray-700' : ''}
                      ${user.status === 'Invited' ? 'border border-gray-200 text-gray-500 bg-white' : ''}`}
                                    >
                      {user.status === 'Premium' && <span className="material-symbols-outlined text-[14px]">workspace_premium</span>}
                                        {user.status === 'Active' && <span className="material-symbols-outlined text-[14px]">check_circle</span>}
                                        {user.status === 'Invited' && <span className="material-symbols-outlined text-[14px]">mail</span>}
                                        {user.status}
                    </span>
                                </td>
                                <td className={`py-4 px-6 text-right font-mono font-bold text-sm ${user.rewards === '-' ? 'text-gray-400' : 'text-cyan'}`}>
                                    {user.rewards}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}