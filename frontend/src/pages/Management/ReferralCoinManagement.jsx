import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import api from '../../services/api';

const STATUS_CLASSES = {
    approved: 'bg-[#FEF9C3] text-[#854d0e] border-[#EAB308]/50',
    rejected: 'bg-[#ffdad6] text-[#ba1a1a] border-[#ffb4ab]',
    pending: 'bg-[#fff8e1] text-[#b45309] border-[#ffe082]'
};

export default function ReferralCoinManagement() {
    const accessToken = useSelector((state) => state.auth?.accessToken);
    const permissions = useSelector((state) => state.auth?.user?.permissions) || [];

    // This page bundles 5 distinct permissions (settings, pending, approve/reject, history/
    // stats, adjust coins) behind one route-level gate ("has any rewards.* permission" in
    // App.jsx) - these flags hide the specific tabs/sections/actions a given role wasn't
    // granted, on top of the backend already rejecting the underlying API calls either way.
    const canManageSettings = permissions.includes('rewards.manage_settings');
    const canAdjustCoins = permissions.includes('rewards.adjust_coins');
    const canManagePending = permissions.includes('rewards.manage_pending');
    const canApproveReject = permissions.includes('rewards.approve_reject');
    const canViewHistoryStats = permissions.includes('rewards.view_history_stats');
    const canManageRankTiers = permissions.includes('rewards.manage_rank_tiers');

    const TABS = [
        (canManageSettings || canAdjustCoins) && { id: 'settings', label: 'Settings' },
        (canManagePending || canApproveReject) && { id: 'pending', label: 'Pending Rewards' },
        canViewHistoryStats && { id: 'history', label: 'Approval History' },
        canViewHistoryStats && { id: 'stats', label: 'Statistics' },
        canManageRankTiers && { id: 'rankTiers', label: 'Rank Tiers' }
    ].filter(Boolean);

    const [activeTab, setActiveTab] = useState(() => TABS[0]?.id);

    // Custom Toast State
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type }), 4000);
    };

    const errMsg = (err, fallback) => err.response?.data?.message || fallback;

    // --- SETTINGS TAB ---
    const [settings, setSettings] = useState({ l1Amount: 0, l2Amount: 0, l3Amount: 0 });
    const [settingsLoading, setSettingsLoading] = useState(false);

    const fetchSettings = useCallback(async () => {
        if (!accessToken) return;
        try {
            const res = await api.get('/admin/rewards/settings');
            setSettings(res.data.settings);
        } catch (err) {
            console.error(err);
        }
    }, [accessToken]);

    const handleSaveSettings = async () => {
        setSettingsLoading(true);
        try {
            const res = await api.patch('/admin/rewards/settings', {
                l1Amount: Number(settings.l1Amount),
                l2Amount: Number(settings.l2Amount),
                l3Amount: Number(settings.l3Amount)
            });
            setSettings(res.data.settings);
            showToast('Reward settings updated!', 'success');
        } catch (err) {
            showToast(errMsg(err, 'Failed to update settings'), 'error');
        } finally {
            setSettingsLoading(false);
        }
    };

    // Manual coin adjustment mini-form - user is picked via name/email search rather than
    // typed as a raw ObjectId, since there was previously no way for the admin to find one.
    const [adjustUserId, setAdjustUserId] = useState('');
    const [userQuery, setUserQuery] = useState('');
    const [userResults, setUserResults] = useState([]);
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const [adjustAmount, setAdjustAmount] = useState('');
    const [adjustReason, setAdjustReason] = useState('');
    const [adjustLoading, setAdjustLoading] = useState(false);

    // Debounced name/email search - skipped once a user is already selected (adjustUserId
    // set) so re-rendering the query into the input as "Name (email)" doesn't re-trigger it.
    useEffect(() => {
        if (!accessToken || adjustUserId || userQuery.trim().length < 2) {
            return; // too short to search yet; clearing is handled synchronously in the input's onChange below
        }
        const timer = setTimeout(async () => {
            try {
                const res = await api.get('/admin/users', { params: { search: userQuery.trim() } });
                setUserResults(res.data.users || []);
                setIsUserDropdownOpen(true);
            } catch (err) {
                console.error(err);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [accessToken, userQuery, adjustUserId]);

    const handleUserQueryChange = (e) => {
        const value = e.target.value;
        setUserQuery(value);
        setAdjustUserId(''); // typing again invalidates the previous selection
        if (value.trim().length < 2) {
            setUserResults([]);
            setIsUserDropdownOpen(false);
        }
    };

    const handleSelectUser = (user) => {
        setAdjustUserId(user._id);
        setUserQuery(`${user.fullName} (${user.email})`);
        setUserResults([]);
        setIsUserDropdownOpen(false);
    };

    const handleAdjustCoins = async () => {
        if (!adjustUserId || !adjustAmount) return;
        setAdjustLoading(true);
        try {
            await api.post(`/admin/rewards/adjust/${adjustUserId}`, {
                amount: Number(adjustAmount),
                reason: adjustReason
            });
            showToast('Coin balance adjusted!', 'success');
            setAdjustUserId(''); setUserQuery(''); setAdjustAmount(''); setAdjustReason('');
        } catch (err) {
            showToast(errMsg(err, 'Failed to adjust coins'), 'error');
        } finally {
            setAdjustLoading(false);
        }
    };

    // --- PENDING REWARDS TAB ---
    const [pendingRewards, setPendingRewards] = useState([]);
    const [pendingTotal, setPendingTotal] = useState(0);
    const [pendingPage, setPendingPage] = useState(1);
    const [editingAmounts, setEditingAmounts] = useState({});

    const fetchPending = useCallback(async () => {
        if (!accessToken) return;
        try {
            const res = await api.get(`/admin/rewards/pending?page=${pendingPage}`);
            setPendingRewards(res.data.rewards || []);
            setPendingTotal(res.data.total || 0);
        } catch (err) {
            console.error(err);
        }
    }, [accessToken, pendingPage]);

    const handleEditAmount = (id, value) => {
        setEditingAmounts(prev => ({ ...prev, [id]: value }));
    };

    const handleSaveAmount = async (id) => {
        const value = Number(editingAmounts[id]);
        if (!value || value <= 0) {
            return showToast('Coin amount must be positive. Reject the reward instead if no coins should be awarded.', 'error');
        }
        try {
            await api.patch(`/admin/rewards/pending/${id}`, { coinAmount: value });
            showToast('Reward amount updated!', 'success');
            setEditingAmounts(prev => { const next = { ...prev }; delete next[id]; return next; });
            fetchPending();
        } catch (err) {
            showToast(errMsg(err, 'Failed to update amount'), 'error');
        }
    };

    const handleApprove = async (id) => {
        try {
            await api.post(`/admin/rewards/pending/${id}/approve`);
            showToast('Reward approved and coins credited!', 'success');
            fetchPending();
        } catch (err) {
            showToast(errMsg(err, 'Failed to approve reward'), 'error');
        }
    };

    const handleReject = async (id) => {
        const reason = window.prompt('Reason for rejection (optional):') || '';
        try {
            await api.post(`/admin/rewards/pending/${id}/reject`, { reason });
            showToast('Reward rejected.', 'success');
            fetchPending();
        } catch (err) {
            showToast(errMsg(err, 'Failed to reject reward'), 'error');
        }
    };

    // --- APPROVAL HISTORY TAB ---
    const [history, setHistory] = useState([]);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [historyPage, setHistoryPage] = useState(1);

    const fetchHistory = useCallback(async () => {
        if (!accessToken) return;
        try {
            const res = await api.get(`/admin/rewards/history?page=${historyPage}`);
            setHistory(res.data.history || []);
            setHistoryTotal(res.data.total || 0);
        } catch (err) {
            console.error(err);
        }
    }, [accessToken, historyPage]);

    // --- STATISTICS TAB ---
    const [stats, setStats] = useState(null);

    const fetchStats = useCallback(async () => {
        if (!accessToken) return;
        try {
            const res = await api.get('/admin/rewards/stats');
            setStats(res.data);
        } catch (err) {
            console.error(err);
        }
    }, [accessToken]);

    // --- RANK TIERS TAB ---
    // Admin-authored coin-based tiers (name + minimum coin threshold, e.g. Bronze from 0,
    // Silver from 501, ...) shown on the Achievements page's Tier stat and Leaderboard in
    // place of a plain numeric position - see backend/controllers/achievementsController.js
    // resolveRankTier().
    const [rankTiers, setRankTiers] = useState([]);
    const [rankTiersLoading, setRankTiersLoading] = useState(false);

    const fetchRankTiers = useCallback(async () => {
        if (!accessToken) return;
        try {
            const res = await api.get('/admin/rewards/rank-tiers');
            setRankTiers(res.data.rankTiers || []);
        } catch (err) {
            console.error(err);
        }
    }, [accessToken]);

    const handleRankTierField = (index, field, value) => {
        setRankTiers(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
    };

    const handleAddRankTier = () => {
        // clientId gives a brand-new tier (not yet saved, so no real _id from Mongo yet) a
        // stable React key - keying the list on array index instead broke focus tracking
        // when deleting a tier from the middle of the list, since every later tier's index
        // shifts down and React reconciles by position rather than identity.
        const clientId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString();
        setRankTiers(prev => [...prev, { clientId, name: '', minCoins: 0 }]);
    };

    const handleRemoveRankTier = (index) => {
        setRankTiers(prev => prev.filter((_, i) => i !== index));
    };

    const handleSaveRankTiers = async () => {
        setRankTiersLoading(true);
        try {
            const payload = rankTiers.map(t => ({ name: t.name, minCoins: Number(t.minCoins) }));
            const res = await api.put('/admin/rewards/rank-tiers', { rankTiers: payload });
            setRankTiers(res.data.rankTiers);
            showToast('Rank tiers updated!', 'success');
        } catch (err) {
            showToast(errMsg(err, 'Failed to update rank tiers'), 'error');
        } finally {
            setRankTiersLoading(false);
        }
    };

    useEffect(() => {
        // Only fetch what the current permission set actually has access to - e.g. a role
        // with rewards.adjust_coins but not rewards.manage_settings still lands on the
        // Settings tab (for the coin-adjustment card) but shouldn't call the settings API.
        if (activeTab === 'settings' && canManageSettings) fetchSettings();
        if (activeTab === 'pending' && (canManagePending || canApproveReject)) fetchPending();
        if (activeTab === 'history' && canViewHistoryStats) fetchHistory();
        if (activeTab === 'stats' && canViewHistoryStats) fetchStats();
        if (activeTab === 'rankTiers' && canManageRankTiers) fetchRankTiers();
    }, [activeTab, canManageSettings, canManagePending, canApproveReject, canViewHistoryStats, canManageRankTiers, fetchSettings, fetchPending, fetchHistory, fetchStats, fetchRankTiers]);

    return (
        <div className="w-full h-[calc(100vh-64px)] overflow-y-auto bg-[#F4F9F8] font-sans custom-scrollbar">
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #c7c5d3; border-radius: 10px; }
            `}</style>

            <div className="w-full p-4 sm:p-6 md:p-8 flex flex-col pb-20 min-h-full">

                {/* Page Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5 sm:mb-6">
                    <div className="w-full md:w-auto">
                        <h2 className="text-2xl sm:text-3xl font-bold text-[#075e51] mb-1 tracking-tight">Referral & Coin Management</h2>
                        <p className="text-[#777682] text-sm sm:text-base">Configure reward amounts, approve pending coins, and monitor referral activity.</p>
                    </div>
                </div>

                {/* Internal Tabs */}
                <div className="flex gap-4 sm:gap-6 border-b border-[#e0e2eb] mb-6 overflow-x-auto hide-scrollbar">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`pb-3 px-1 text-[13px] sm:text-[14px] font-bold whitespace-nowrap border-b-[3px] transition-colors ${activeTab === tab.id ? 'border-[#075e51] text-[#075e51]' : 'border-transparent text-[#777682] hover:text-[#464651]'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* --- SETTINGS TAB --- */}
                {activeTab === 'settings' && (
                    <div className="flex flex-col gap-6">
                        {canManageSettings && (
                        <div className="bg-white p-5 sm:p-6 rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb]">
                            <h3 className="text-[16px] sm:text-[18px] font-bold text-[#075e51] mb-4">Referral Reward Amounts</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {['l1Amount', 'l2Amount', 'l3Amount'].map((key, i) => (
                                    <div key={key}>
                                        <label className="block text-[11px] font-bold text-[#464651] mb-2 uppercase tracking-wider">L{i + 1} Reward (coins)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={settings[key]}
                                            onChange={(e) => setSettings(prev => ({ ...prev, [key]: e.target.value }))}
                                            className="w-full border border-[#c7c5d3] rounded-md p-2.5 text-[14px] outline-none focus:border-[#075e51] focus:ring-1 focus:ring-[#075e51]"
                                        />
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={handleSaveSettings}
                                disabled={settingsLoading}
                                className="mt-5 bg-[#075e51] text-white text-[13px] font-bold py-2.5 px-6 rounded-lg hover:bg-[#097969] transition-colors disabled:opacity-50"
                            >
                                {settingsLoading ? 'Saving...' : 'Save Settings'}
                            </button>
                            <p className="text-[12px] text-[#777682] mt-3">Changes apply to future referrals only. Already-pending rewards keep the amount they were created with.</p>
                        </div>
                        )}

                        {canAdjustCoins && (
                        <div className="bg-white p-5 sm:p-6 rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb]">
                            <h3 className="text-[16px] sm:text-[18px] font-bold text-[#075e51] mb-4">Manual Coin Adjustment</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="relative">
                                    <label className="block text-[11px] font-bold text-[#464651] mb-2 uppercase tracking-wider">User</label>
                                    <input
                                        type="text"
                                        value={userQuery}
                                        onChange={handleUserQueryChange}
                                        onFocus={() => userResults.length > 0 && setIsUserDropdownOpen(true)}
                                        onBlur={() => setTimeout(() => setIsUserDropdownOpen(false), 150)}
                                        placeholder="Search by name or email..."
                                        autoComplete="off"
                                        className="w-full border border-[#c7c5d3] rounded-md p-2.5 text-[13px] outline-none focus:border-[#075e51]"
                                    />
                                    {isUserDropdownOpen && userResults.length > 0 && (
                                        <div className="absolute z-10 mt-1 w-full bg-white border border-[#c7c5d3] rounded-md shadow-lg max-h-48 overflow-y-auto">
                                            {userResults.map((u) => (
                                                <button
                                                    key={u._id}
                                                    type="button"
                                                    onMouseDown={() => handleSelectUser(u)}
                                                    className="w-full text-left px-3 py-2 text-[13px] hover:bg-[#f1f3fc] transition-colors border-b border-[#f1f3fc] last:border-0"
                                                >
                                                    <div className="font-semibold text-[#181c22]">{u.fullName}</div>
                                                    <div className="text-[11px] text-[#777682] font-mono">{u.email}</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {adjustUserId && <p className="text-[10px] text-[#EAB308] font-bold mt-1.5">✓ User selected</p>}
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-[#464651] mb-2 uppercase tracking-wider">Amount (+/-)</label>
                                    <input type="number" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} placeholder="e.g. 50 or -20" className="w-full border border-[#c7c5d3] rounded-md p-2.5 text-[14px] outline-none focus:border-[#075e51]" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-[#464651] mb-2 uppercase tracking-wider">Reason</label>
                                    <input type="text" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="Reason for adjustment" className="w-full border border-[#c7c5d3] rounded-md p-2.5 text-[14px] outline-none focus:border-[#075e51]" />
                                </div>
                            </div>
                            <button
                                onClick={handleAdjustCoins}
                                disabled={adjustLoading}
                                className="mt-5 bg-white border border-[#c7c5d3] text-[#181c22] text-[13px] font-bold py-2.5 px-6 rounded-lg hover:bg-[#f1f3fc] transition-colors disabled:opacity-50"
                            >
                                {adjustLoading ? 'Applying...' : 'Apply Adjustment'}
                            </button>
                        </div>
                        )}
                    </div>
                )}

                {/* --- PENDING REWARDS TAB --- */}
                {activeTab === 'pending' && (
                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb] overflow-hidden">
                        <div className="overflow-x-auto w-full custom-scrollbar">
                            <table className="w-full text-left border-collapse min-w-[750px]">
                                <thead className="bg-[#F4F9F8] border-b border-[#e0e2eb]">
                                <tr>
                                    <th className="py-3 px-4 text-[11px] font-bold text-[#777682] uppercase tracking-wider">Referral User</th>
                                    <th className="py-3 px-4 text-[11px] font-bold text-[#777682] uppercase tracking-wider">Level</th>
                                    <th className="py-3 px-4 text-[11px] font-bold text-[#777682] uppercase tracking-wider">Coin Amount</th>
                                    <th className="py-3 px-4 text-[11px] font-bold text-[#777682] uppercase tracking-wider">Registered</th>
                                    <th className="py-3 px-4 text-[11px] font-bold text-[#777682] uppercase tracking-wider text-right">Actions</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-[#e0e2eb] text-[13px]">
                                {pendingRewards.length === 0 ? (
                                    <tr><td colSpan={5} className="py-12 text-center text-[#777682]">No pending rewards.</td></tr>
                                ) : pendingRewards.map(r => (
                                    <tr key={r._id} className="hover:bg-[#f1f3fc] transition-colors">
                                        <td className="py-3 px-4">
                                            <div className="font-bold text-[#181c22]">{r.beneficiaryId?.fullName || '—'}</div>
                                            <div className="text-[11px] text-[#777682]">Referred: {r.referredName}</div>
                                        </td>
                                        <td className="py-3 px-4 font-mono text-[12px] text-[#464651]">L{r.level}</td>
                                        <td className="py-3 px-4">
                                            {canManagePending ? (
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={editingAmounts[r._id] ?? r.coinAmount}
                                                    onChange={(e) => handleEditAmount(r._id, e.target.value)}
                                                    className="w-24 border border-[#c7c5d3] rounded p-1.5 text-[13px] font-mono outline-none focus:border-[#075e51]"
                                                />
                                            ) : (
                                                <span className="font-mono text-[13px] text-[#464651]">{r.coinAmount}</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 font-mono text-[11px] text-[#777682] whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString()}</td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center justify-end gap-2">
                                                {canManagePending && editingAmounts[r._id] !== undefined && Number(editingAmounts[r._id]) !== r.coinAmount && (
                                                    <button onClick={() => handleSaveAmount(r._id)} className="text-[11px] font-bold text-[#075e51] hover:underline">Save</button>
                                                )}
                                                {canApproveReject && (
                                                    <>
                                                        <button onClick={() => handleApprove(r._id)} className="bg-[#FEF9C3] text-[#854d0e] border border-[#EAB308]/30 text-[11px] font-bold py-1.5 px-3 rounded hover:bg-[#d4f7f9] transition-colors">Approve</button>
                                                        <button onClick={() => handleReject(r._id)} className="bg-[#ffdad6] text-[#ba1a1a] border border-[#ffb4ab] text-[11px] font-bold py-1.5 px-3 rounded hover:bg-[#ffc9c4] transition-colors">Reject</button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                        {pendingTotal > 25 && (
                            <div className="border-t border-[#e0e2eb] p-3 sm:px-6 flex items-center justify-between bg-[#F4F9F8]">
                                <span className="text-[11px] font-semibold text-[#777682]">Showing {pendingRewards.length} of {pendingTotal}</span>
                                <div className="flex gap-1">
                                    <button onClick={() => setPendingPage(p => Math.max(1, p - 1))} disabled={pendingPage === 1} className="w-8 h-8 rounded flex items-center justify-center text-[#777682] hover:bg-white disabled:opacity-50">
                                        <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                                    </button>
                                    <button onClick={() => setPendingPage(p => p + 1)} disabled={pendingPage * 25 >= pendingTotal} className="w-8 h-8 rounded flex items-center justify-center text-[#777682] hover:bg-white disabled:opacity-50">
                                        <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- APPROVAL HISTORY TAB --- */}
                {activeTab === 'history' && (
                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb] overflow-hidden">
                        <div className="overflow-x-auto w-full custom-scrollbar">
                            <table className="w-full text-left border-collapse min-w-[750px]">
                                <thead className="bg-[#F4F9F8] border-b border-[#e0e2eb]">
                                <tr>
                                    <th className="py-3 px-4 text-[11px] font-bold text-[#777682] uppercase tracking-wider">Beneficiary</th>
                                    <th className="py-3 px-4 text-[11px] font-bold text-[#777682] uppercase tracking-wider">Level</th>
                                    <th className="py-3 px-4 text-[11px] font-bold text-[#777682] uppercase tracking-wider">Amount</th>
                                    <th className="py-3 px-4 text-[11px] font-bold text-[#777682] uppercase tracking-wider">Status</th>
                                    <th className="py-3 px-4 text-[11px] font-bold text-[#777682] uppercase tracking-wider">Processed By</th>
                                    <th className="py-3 px-4 text-[11px] font-bold text-[#777682] uppercase tracking-wider">Reason</th>
                                    <th className="py-3 px-4 text-[11px] font-bold text-[#777682] uppercase tracking-wider">Date</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-[#e0e2eb] text-[13px]">
                                {history.length === 0 ? (
                                    <tr><td colSpan={7} className="py-12 text-center text-[#777682]">No approval history yet.</td></tr>
                                ) : history.map(r => (
                                    <tr key={r._id} className="hover:bg-[#f1f3fc] transition-colors">
                                        <td className="py-3 px-4 font-bold text-[#181c22]">{r.beneficiaryId?.fullName || '—'}</td>
                                        <td className="py-3 px-4 font-mono text-[12px] text-[#464651]">L{r.level}</td>
                                        <td className="py-3 px-4 font-mono font-bold text-[13px]">{r.coinAmount}</td>
                                        <td className="py-3 px-4">
                                            <span className={`inline-flex items-center text-[10px] px-2.5 py-1 rounded-full border font-bold uppercase tracking-wider ${STATUS_CLASSES[r.approvalStatus]}`}>{r.approvalStatus}</span>
                                        </td>
                                        <td className="py-3 px-4 text-[12px] text-[#464651]">{(r.approvalStatus === 'rejected' ? r.rejectedBy?.fullName : r.approvedBy?.fullName) || '—'}</td>
                                        <td className="py-3 px-4 text-[12px] text-[#464651] max-w-[220px] truncate" title={r.rejectionReason || ''}>{r.approvalStatus === 'rejected' ? (r.rejectionReason || '—') : '—'}</td>
                                        <td className="py-3 px-4 font-mono text-[11px] text-[#777682] whitespace-nowrap">{new Date(r.approvedAt || r.rejectedAt || r.updatedAt).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                        {historyTotal > 25 && (
                            <div className="border-t border-[#e0e2eb] p-3 sm:px-6 flex items-center justify-between bg-[#F4F9F8]">
                                <span className="text-[11px] font-semibold text-[#777682]">Showing {history.length} of {historyTotal}</span>
                                <div className="flex gap-1">
                                    <button onClick={() => setHistoryPage(p => Math.max(1, p - 1))} disabled={historyPage === 1} className="w-8 h-8 rounded flex items-center justify-center text-[#777682] hover:bg-white disabled:opacity-50">
                                        <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                                    </button>
                                    <button onClick={() => setHistoryPage(p => p + 1)} disabled={historyPage * 25 >= historyTotal} className="w-8 h-8 rounded flex items-center justify-center text-[#777682] hover:bg-white disabled:opacity-50">
                                        <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- STATISTICS TAB --- */}
                {activeTab === 'stats' && stats && (
                    <div className="flex flex-col gap-6">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                            <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] p-4 sm:p-6 flex flex-col justify-between h-[100px]">
                                <span className="text-[10px] sm:text-[12px] font-bold uppercase tracking-wider text-[#777682]">Total Coins Distributed</span>
                                <span className="text-[26px] sm:text-[30px] font-bold text-[#075e51]">{stats.totalCoinsDistributed.toLocaleString()}</span>
                            </div>
                            <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] p-4 sm:p-6 flex flex-col justify-between h-[100px]">
                                <span className="text-[10px] sm:text-[12px] font-bold uppercase tracking-wider text-[#777682]">Total Pending Coins</span>
                                <span className="text-[26px] sm:text-[30px] font-bold text-[#EAB308]">{stats.totalPendingCoins.toLocaleString()}</span>
                            </div>
                            <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] p-4 sm:p-6 flex flex-col justify-between h-[100px]">
                                <span className="text-[10px] sm:text-[12px] font-bold uppercase tracking-wider text-[#777682]">Conversion Rate</span>
                                <span className="text-[26px] sm:text-[30px] font-bold text-[#075e51]">{stats.conversionRate}%</span>
                            </div>
                            <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] p-4 sm:p-6 flex flex-col justify-between h-[100px]">
                                <span className="text-[10px] sm:text-[12px] font-bold uppercase tracking-wider text-[#777682]">Approved / Rejected / Pending</span>
                                <span className="text-[16px] sm:text-[18px] font-bold text-[#075e51]">{stats.approvedCount} / {stats.rejectedCount} / {stats.pendingCount}</span>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb] overflow-hidden">
                            <div className="p-4 sm:p-6 border-b border-[#e0e2eb]">
                                <h3 className="text-[16px] sm:text-[18px] font-bold text-[#075e51]">Top Referrers</h3>
                            </div>
                            <div className="overflow-x-auto w-full custom-scrollbar">
                                <table className="w-full text-left border-collapse min-w-[500px]">
                                    <thead className="bg-[#F4F9F8] border-b border-[#e0e2eb]">
                                    <tr>
                                        <th className="py-3 px-4 text-[11px] font-bold text-[#777682] uppercase tracking-wider">User</th>
                                        <th className="py-3 px-4 text-[11px] font-bold text-[#777682] uppercase tracking-wider">Approved Referrals</th>
                                        <th className="py-3 px-4 text-[11px] font-bold text-[#777682] uppercase tracking-wider text-right">Total Coins</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#e0e2eb] text-[13px]">
                                    {stats.topReferrers.length === 0 ? (
                                        <tr><td colSpan={3} className="py-8 text-center text-[#777682]">No approved referrals yet.</td></tr>
                                    ) : stats.topReferrers.map(r => (
                                        <tr key={r._id} className="hover:bg-[#f1f3fc] transition-colors">
                                            <td className="py-3 px-4 font-bold text-[#181c22]">{r.user.fullName}</td>
                                            <td className="py-3 px-4 font-mono text-[12px] text-[#464651]">{r.count}</td>
                                            <td className="py-3 px-4 text-right font-mono font-bold text-[#EAB308]">{r.totalCoins}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- RANK TIERS TAB --- */}
                {activeTab === 'rankTiers' && (
                    <div className="bg-white p-5 sm:p-6 rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb]">
                        <h3 className="text-[16px] sm:text-[18px] font-bold text-[#075e51] mb-1">Rank Tiers</h3>
                        <p className="text-[12px] text-[#777682] mb-4">Define named tiers (e.g. Bronze, Silver, Gold) by minimum lifetime coins. A user's tier is the highest one whose threshold their lifetime coins meet or exceed. Shown on the Achievements page's Tier stat and Leaderboard.</p>

                        <div className="flex flex-col gap-3">
                            {rankTiers.map((tier, i) => (
                                <div key={tier._id || tier.clientId} className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={tier.name}
                                            onChange={(e) => handleRankTierField(i, 'name', e.target.value)}
                                            placeholder="Tier name (e.g. Bronze)"
                                            className="w-full border border-[#c7c5d3] rounded-md p-2.5 text-[14px] outline-none focus:border-[#075e51] focus:ring-1 focus:ring-[#075e51]"
                                        />
                                    </div>
                                    <div className="w-40">
                                        <input
                                            type="number"
                                            min="0"
                                            value={tier.minCoins}
                                            onChange={(e) => handleRankTierField(i, 'minCoins', e.target.value)}
                                            placeholder="Min coins"
                                            className="w-full border border-[#c7c5d3] rounded-md p-2.5 text-[14px] outline-none focus:border-[#075e51] focus:ring-1 focus:ring-[#075e51]"
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleRemoveRankTier(i)}
                                        className="w-9 h-9 shrink-0 rounded-md border border-[#ffb4ab] text-[#ba1a1a] hover:bg-[#ffdad6] transition-colors flex items-center justify-center"
                                        title="Remove tier"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                    </button>
                                </div>
                            ))}
                            {rankTiers.length === 0 && (
                                <p className="text-[13px] text-[#777682] py-4 text-center">No rank tiers configured yet.</p>
                            )}
                        </div>

                        <button
                            onClick={handleAddRankTier}
                            className="mt-4 text-[13px] font-bold text-[#075e51] hover:underline flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-[16px]">add</span> Add Tier
                        </button>

                        <div>
                            <button
                                onClick={handleSaveRankTiers}
                                disabled={rankTiersLoading}
                                className="mt-5 bg-[#075e51] text-white text-[13px] font-bold py-2.5 px-6 rounded-lg hover:bg-[#097969] transition-colors disabled:opacity-50"
                            >
                                {rankTiersLoading ? 'Saving...' : 'Save Rank Tiers'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* --- CUSTOM TOAST NOTIFICATION --- */}
            <div className={`fixed bottom-24 right-6 z-50 transition-all duration-300 transform ${toast.show ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'}`}>
                <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${toast.type === 'error' ? 'bg-[#ffdad6] border-[#ba1a1a] text-[#ba1a1a]' : 'bg-[#FEF9C3] border-[#EAB308] text-[#854d0e]'}`}>
                    <span className="material-symbols-outlined text-[20px]">
                        {toast.type === 'error' ? 'error' : 'check_circle'}
                    </span>
                    <span className="text-[13px] sm:text-[14px] font-bold">{toast.message}</span>
                    <button onClick={() => setToast(prev => ({ ...prev, show: false }))} className="ml-2 hover:opacity-70">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
