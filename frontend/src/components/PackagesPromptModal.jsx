import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import api from '../services/api';
import { isManagementUser } from '../config/managementAccess';

// Shown once per login/app-load to a regular product user who hasn't purchased a package
// yet (see backend/models/User.js purchasedPackageId - nothing sets it yet, no payment
// gateway is wired up, this is groundwork for that). Purely informational at this stage -
// the only interaction is dismissing via the X, per the initial-stage scope.
export default function PackagesPromptModal() {
    const isAuthenticated = useSelector((state) => state.auth?.isAuthenticated);
    const user = useSelector((state) => state.auth?.user);

    const [packages, setPackages] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [hasChecked, setHasChecked] = useState(false);

    useEffect(() => {
        if (!isAuthenticated || !user || hasChecked) return;
        setHasChecked(true);

        // Management/admin users are configuring packages for others, not shopping for one
        // themselves - never interrupt them with this.
        if (isManagementUser(user.permissions || [])) return;
        if (user.purchasedPackageId) return;

        api.get('/packages')
            .then((res) => {
                const active = res.data.packages || [];
                if (active.length > 0) {
                    setPackages(active);
                    setIsOpen(true);
                }
            })
            .catch(() => {});
    }, [isAuthenticated, user, hasChecked]);

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
                        <h2 className="text-[22px] sm:text-[26px] font-bold text-[#075e51]">Choose a Package</h2>
                        <p className="text-[13px] sm:text-[14px] text-[#777682] mt-1">Get more storage, transcription minutes, and searches. You can decide later - just close this to continue.</p>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        title="Continue without choosing a package"
                        className="text-[#777682] hover:text-[#181c22] transition-colors shrink-0 ml-4"
                    >
                        <span className="material-symbols-outlined text-[24px]">close</span>
                    </button>
                </div>

                <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {packages.map((pkg, idx) => (
                        <div
                            key={pkg._id}
                            className={`rounded-xl border p-5 flex flex-col ${idx === 1 && packages.length >= 3 ? 'border-2 border-[#EAB308] bg-[#FEF9C3]/30 shadow-md' : 'border-[#e0e2eb] bg-white'}`}
                        >
                            {idx === 1 && packages.length >= 3 && (
                                <span className="self-start text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#EAB308] text-[#181c22] uppercase tracking-wide mb-2">Most Popular</span>
                            )}
                            <h3 className="text-[18px] font-bold text-[#181c22]">{pkg.name}</h3>
                            {pkg.description && <p className="text-[12px] text-[#777682] mt-1 mb-3">{pkg.description}</p>}
                            <div className="text-[30px] font-bold text-[#075e51] my-2">${pkg.priceUSD}</div>
                            <div className="flex flex-col gap-2 text-[13px] text-[#464651] mt-2">
                                <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px] text-[#075e51]">cloud</span> {pkg.storageGB} GB storage</span>
                                <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px] text-[#075e51]">mic</span> {pkg.transcriptionMinutes} transcription minutes</span>
                                <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px] text-[#075e51]">search</span> {pkg.searches} searches</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
