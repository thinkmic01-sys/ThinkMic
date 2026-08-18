import React, { useState, useEffect } from 'react';
import api from '../services/api';

// Shown when a user clicks their coin balance in Navbar.jsx - mirrors
// PackagesPromptModal.jsx's look and behavior (a single dialog, one card per coin package,
// dismiss via X only). Same initial-stage scope: purely informational, no payment gateway
// wired up yet, so there's no working "buy" action on the cards.
export default function CoinPackagesModal({ isOpen, onClose }) {
    const [coinPackages, setCoinPackages] = useState([]);
    const [hasLoaded, setHasLoaded] = useState(false);

    useEffect(() => {
        if (!isOpen || hasLoaded) return;
        setHasLoaded(true);
        api.get('/coin-packages')
            .then((res) => setCoinPackages(res.data.coinPackages || []))
            .catch(() => {});
    }, [isOpen, hasLoaded]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-[#181c22]/60 backdrop-blur-sm flex items-center justify-center z-[200] px-4 py-8">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-full overflow-y-auto custom-scrollbar">
                <style>{`
                    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #c7c5d3; border-radius: 10px; }
                `}</style>
                <div className="px-6 sm:px-8 py-6 border-b border-[#e0e2eb] flex items-start justify-between">
                    <div>
                        <h2 className="text-[22px] sm:text-[26px] font-bold text-[#075e51]">Get More Coins</h2>
                        <p className="text-[13px] sm:text-[14px] text-[#777682] mt-1">Top up your coin balance. You can decide later - just close this to continue.</p>
                    </div>
                    <button
                        onClick={onClose}
                        title="Close"
                        className="text-[#777682] hover:text-[#181c22] transition-colors shrink-0 ml-4"
                    >
                        <span className="material-symbols-outlined text-[24px]">close</span>
                    </button>
                </div>

                {coinPackages.length === 0 ? (
                    <div className="p-8 sm:p-10 text-center text-[#777682] text-[14px]">No coin packages are available yet.</div>
                ) : (
                    <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {coinPackages.map((pkg, idx) => (
                            <div
                                key={pkg._id}
                                className={`rounded-xl border p-5 flex flex-col ${idx === 1 && coinPackages.length >= 3 ? 'border-2 border-[#EAB308] bg-[#FEF9C3]/30 shadow-md' : 'border-[#e0e2eb] bg-white'}`}
                            >
                                {idx === 1 && coinPackages.length >= 3 && (
                                    <span className="self-start text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#EAB308] text-[#181c22] uppercase tracking-wide mb-2">Most Popular</span>
                                )}
                                <h3 className="text-[18px] font-bold text-[#181c22]">{pkg.name}</h3>
                                {pkg.description && <p className="text-[12px] text-[#777682] mt-1 mb-3">{pkg.description}</p>}
                                <div className="text-[30px] font-bold text-[#075e51] my-2">${pkg.priceUSD}</div>
                                <div className="flex flex-col gap-2 text-[13px] text-[#464651] mt-2">
                                    <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px] text-[#EAB308]">toll</span> {pkg.coins.toLocaleString()} coins</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
