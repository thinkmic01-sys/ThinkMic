import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import api from '../services/api';
import { isManagementUser } from '../config/managementAccess';

const DIMENSION_LABELS = { storage: 'storage', transcription: 'transcription minutes', searches: 'searches' };

// Two triggers share this one dialog (same catalog-card layout, different copy/behavior):
// - 'noPackage': the user has never selected a package - mandatory, no way to dismiss, since
//   they must pick one before using the app (see backend/middleware/usageGuard.js).
// - 'limitFull': the user's selected package has hit 100% on storage/transcription/searches
//   (backend/services/usageService.js) - dismissible (the specific blocked action already
//   stops them server-side), but only shows packages that actually exceed their current one.
export default function PackagesPromptModal() {
    const isAuthenticated = useSelector((state) => state.auth?.isAuthenticated);
    const user = useSelector((state) => state.auth?.user);

    const [packages, setPackages] = useState([]);
    const [mode, setMode] = useState(null); // null | 'noPackage' | 'limitFull'
    const [fullDimensions, setFullDimensions] = useState([]);
    const [hasChecked, setHasChecked] = useState(false);
    const [isSelecting, setIsSelecting] = useState(null);

    useEffect(() => {
        if (!isAuthenticated || !user || hasChecked) return;

        // Management/admin users are configuring packages for others, not shopping for one
        // themselves - never interrupt them with this.
        if (isManagementUser(user.permissions || [])) {
            setHasChecked(true);
            return;
        }

        const checkUsage = (isRetry) => api.get('/users/me/usage')
            .then((res) => {
                setHasChecked(true);
                const status = res.data;
                if (!status.hasPackage) {
                    api.get('/packages').then((r) => {
                        const active = r.data.packages || [];
                        if (active.length > 0) {
                            setPackages(active);
                            setMode('noPackage');
                        }
                    }).catch(() => {});
                } else if (status.maxPct >= 100) {
                    const full = Object.entries(status.isFull || {}).filter(([, v]) => v).map(([k]) => k);
                    if (status.upgradeOptions?.length > 0) {
                        setPackages(status.upgradeOptions);
                        setFullDimensions(full);
                        setMode('limitFull');
                    }
                }
            })
            .catch((err) => {
                // A silent, permanent no-op here would let a user with no package sail past
                // this mandatory step on a transient network blip, then hit a confusing raw
                // 403 the first time they try to record or search with no context why. Retry
                // once before giving up - a real backend enforcement failure will surface as
                // a proper 403 on their next action either way.
                console.warn('PackagesPromptModal: failed to load usage status', err.message);
                if (!isRetry) {
                    setTimeout(() => checkUsage(true), 3000);
                } else {
                    setHasChecked(true);
                }
            });

        checkUsage(false);
    }, [isAuthenticated, user, hasChecked]);

    const handleSelect = async (pkgId) => {
        setIsSelecting(pkgId);
        try {
            await api.post(`/packages/${pkgId}/select`);
            setMode(null);
        } catch (err) {
            // Leave the dialog open - user can retry.
        } finally {
            setIsSelecting(null);
        }
    };

    if (!mode) return null;

    const isMandatory = mode === 'noPackage';
    const title = isMandatory ? 'Choose a Package' : 'Upgrade Your Package';
    const description = isMandatory
        ? 'Select a package to start using ThinkMic - this defines your storage, transcription minutes, and search allowances.'
        : `Your ${fullDimensions.map((d) => DIMENSION_LABELS[d]).join(' and ')} allowance is full. Upgrade to a package with a higher limit to continue.`;

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
                        <h2 className="text-[22px] sm:text-[26px] font-bold text-[#075e51]">{title}</h2>
                        <p className="text-[13px] sm:text-[14px] text-[#777682] mt-1">{description}</p>
                    </div>
                    {!isMandatory && (
                        <button
                            onClick={() => setMode(null)}
                            title="Close"
                            className="text-[#777682] hover:text-[#181c22] transition-colors shrink-0 ml-4"
                        >
                            <span className="material-symbols-outlined text-[24px]">close</span>
                        </button>
                    )}
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
                            <div className="flex flex-col gap-2 text-[13px] text-[#464651] mt-2 mb-4">
                                <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px] text-[#075e51]">cloud</span> {pkg.storageGB} GB storage</span>
                                <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px] text-[#075e51]">mic</span> {pkg.transcriptionMinutes} transcription minutes</span>
                                <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px] text-[#075e51]">search</span> {pkg.searches} searches</span>
                            </div>
                            <button
                                onClick={() => handleSelect(pkg._id)}
                                disabled={isSelecting === pkg._id}
                                className="mt-auto bg-[#075e51] text-white font-bold text-[13px] py-2.5 rounded-lg hover:bg-[#097969] transition-colors disabled:opacity-60"
                            >
                                {isSelecting === pkg._id ? 'Selecting...' : 'Select'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
