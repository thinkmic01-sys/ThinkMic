import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import api from '../services/api';
import { updateUser } from '../store/slices/authSlice';

// Shown when a user clicks "Top Up" on one of the Dashboard's package-usage rows (Storage/
// Transcription/Searches) - lets them spend existing coins to buy extra allowance for just
// that dimension, on top of whatever their selected package already grants. Mirrors
// CoinPackagesModal.jsx's look; unlike that dialog this one has a working purchase flow
// since it spends coins the user already has rather than needing a payment gateway.
const DIMENSION_META = {
    storage: { label: 'Storage', unit: 'GB', icon: 'cloud_done', step: 1 },
    transcription: { label: 'Transcription Minutes', unit: 'minutes', icon: 'mic', step: 5 },
    searches: { label: 'Searches', unit: 'searches', icon: 'search', step: 5 }
};

export default function UsageTopUpModal({ dimension, onClose, onSuccess }) {
    const dispatch = useDispatch();
    const coins = useSelector((state) => state.auth?.user?.coins || 0);
    const [rates, setRates] = useState(null);
    const [quantity, setQuantity] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const isOpen = !!dimension;
    const meta = dimension ? DIMENSION_META[dimension] : null;

    useEffect(() => {
        if (!isOpen) return;
        setQuantity('');
        setError('');
        api.get('/users/usage-rates').then((res) => setRates(res.data.settings)).catch(() => {});
    }, [isOpen, dimension]);

    if (!isOpen) return null;

    const rateField = dimension === 'storage' ? 'coinsPerStorageGB'
        : dimension === 'transcription' ? 'coinsPerTranscriptionMinute' : 'coinsPerSearch';
    const ratePerUnit = rates ? rates[rateField] : null;
    const qtyNum = Number(quantity) || 0;
    const cost = ratePerUnit !== null ? Math.ceil(qtyNum * ratePerUnit) : null;
    const canAfford = cost !== null && cost <= coins;

    const handlePurchase = async () => {
        if (qtyNum <= 0) return setError('Enter a quantity greater than 0.');
        if (!canAfford) return setError('Not enough coins for this quantity.');

        setIsSubmitting(true);
        setError('');
        try {
            const res = await api.post('/users/me/usage/topup', { dimension, quantity: qtyNum });
            dispatch(updateUser({ coins: res.data.coins }));
            onSuccess(res.data);
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to purchase top-up.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-[#181c22]/60 backdrop-blur-sm flex items-center justify-center z-[200] px-4 py-8">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-y-auto">
                <div className="px-6 py-6 border-b border-[#e0e2eb] flex items-start justify-between">
                    <div>
                        <h2 className="text-[20px] font-bold text-[#075e51] flex items-center gap-2">
                            <span className="material-symbols-outlined">{meta.icon}</span> Top Up {meta.label}
                        </h2>
                        <p className="text-[13px] text-[#777682] mt-1">Spend coins to extend your allowance for this dimension.</p>
                    </div>
                    <button onClick={onClose} title="Close" className="text-[#777682] hover:text-[#181c22] transition-colors shrink-0 ml-4">
                        <span className="material-symbols-outlined text-[24px]">close</span>
                    </button>
                </div>

                <div className="p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between text-[13px]">
                        <span className="text-[#777682]">Your coin balance</span>
                        <span className="font-bold text-[#854d0e] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px] text-[#EAB308]">toll</span> {coins.toLocaleString()}
                        </span>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-[#464651] uppercase tracking-wide mb-1.5">
                            Quantity ({meta.unit})
                        </label>
                        <input
                            type="number"
                            min="0"
                            step={meta.step}
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder={`e.g. ${meta.step}`}
                            className="w-full border border-[#c7c5d3] rounded-md py-2.5 px-3 text-[14px] outline-none focus:border-[#075e51] focus:ring-1 focus:ring-[#075e51]"
                        />
                    </div>

                    <div className="flex items-center justify-between text-[13px] bg-[#f1f3fc] rounded-md px-3 py-2.5">
                        <span className="text-[#464651] font-bold">Cost</span>
                        <span className={`font-bold flex items-center gap-1 ${cost !== null && !canAfford ? 'text-[#ba1a1a]' : 'text-[#075e51]'}`}>
                            {ratePerUnit === null ? '...' : (
                                <>
                                    <span className="material-symbols-outlined text-[16px]">toll</span> {cost.toLocaleString()} coins
                                </>
                            )}
                        </span>
                    </div>
                    {ratePerUnit !== null && (
                        <p className="text-[11px] text-[#777682] -mt-2">{ratePerUnit} coins per {meta.unit === 'searches' ? 'search' : meta.unit.replace(/s$/, '')}</p>
                    )}

                    {error && <p className="text-[12px] text-[#ba1a1a] font-bold">{error}</p>}

                    <button
                        onClick={handlePurchase}
                        disabled={isSubmitting || qtyNum <= 0}
                        className="bg-[#075e51] text-white text-[13px] font-bold px-5 py-2.5 rounded-md hover:bg-[#097969] transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-1"
                    >
                        <span className="material-symbols-outlined text-[18px]">toll</span>
                        {isSubmitting ? 'Processing...' : 'Confirm Top Up'}
                    </button>
                </div>
            </div>
        </div>
    );
}
