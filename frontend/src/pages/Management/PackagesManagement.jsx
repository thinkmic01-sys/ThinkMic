import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const emptyForm = { name: '', description: '', storageGB: '', transcriptionMinutes: '', searches: '', priceUSD: '' };

export default function PackagesManagement() {
    const [packages, setPackages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [form, setForm] = useState(emptyForm);
    const [isSaving, setIsSaving] = useState(false);

    // Inline per-card editing - editingId tracks which card is in edit mode, editForm holds
    // its draft values so other cards aren't affected while one is being edited.
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState(emptyForm);

    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type }), 4000);
    };

    const fetchPackages = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/admin/packages');
            setPackages(res.data.packages || []);
        } catch (err) {
            showToast('Failed to load packages.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchPackages(); }, []);

    const handleCreate = async () => {
        if (!form.name.trim()) return showToast('Package name is required.', 'error');
        if ([form.storageGB, form.transcriptionMinutes, form.searches, form.priceUSD].some((v) => v === '' || Number(v) < 0)) {
            return showToast('Storage, minutes, searches, and price must all be filled in with non-negative numbers.', 'error');
        }
        setIsSaving(true);
        try {
            const res = await api.post('/admin/packages', {
                name: form.name.trim(),
                description: form.description.trim(),
                storageGB: Number(form.storageGB),
                transcriptionMinutes: Number(form.transcriptionMinutes),
                searches: Number(form.searches),
                priceUSD: Number(form.priceUSD)
            });
            setPackages((prev) => [...prev, res.data.package].sort((a, b) => a.priceUSD - b.priceUSD));
            setForm(emptyForm);
            showToast('Package created.', 'success');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to create package.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const startEdit = (pkg) => {
        setEditingId(pkg._id);
        setEditForm({
            name: pkg.name,
            description: pkg.description || '',
            storageGB: pkg.storageGB,
            transcriptionMinutes: pkg.transcriptionMinutes,
            searches: pkg.searches,
            priceUSD: pkg.priceUSD
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm(emptyForm);
    };

    const saveEdit = async (id) => {
        if (!editForm.name.trim()) return showToast('Package name is required.', 'error');
        try {
            const res = await api.patch(`/admin/packages/${id}`, {
                name: editForm.name.trim(),
                description: editForm.description.trim(),
                storageGB: Number(editForm.storageGB),
                transcriptionMinutes: Number(editForm.transcriptionMinutes),
                searches: Number(editForm.searches),
                priceUSD: Number(editForm.priceUSD)
            });
            setPackages((prev) => prev.map((p) => p._id === id ? res.data.package : p).sort((a, b) => a.priceUSD - b.priceUSD));
            cancelEdit();
            showToast('Package updated.', 'success');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to update package.', 'error');
        }
    };

    const toggleActive = async (pkg) => {
        try {
            const res = await api.patch(`/admin/packages/${pkg._id}`, { isActive: !pkg.isActive });
            setPackages((prev) => prev.map((p) => p._id === pkg._id ? res.data.package : p));
            showToast(res.data.package.isActive ? 'Package activated.' : 'Package deactivated.', 'success');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to update package.', 'error');
        }
    };

    const handleDelete = async (pkg) => {
        try {
            await api.delete(`/admin/packages/${pkg._id}`);
            setPackages((prev) => prev.filter((p) => p._id !== pkg._id));
            showToast('Package deleted.', 'success');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to delete package.', 'error');
        }
    };

    return (
        <div className="w-full p-4 sm:p-6 md:p-8 flex flex-col pb-20 min-h-full">
            <div className="mb-5 sm:mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-[#075e51] mb-1 tracking-tight">Packages</h2>
                <p className="text-[#777682] text-sm sm:text-base">
                    Define the storage, transcription minutes, and search allowances users can purchase, and their USD price. Active packages appear in the purchase prompt users see on login until they've bought one.
                </p>
            </div>

            <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb] p-5 sm:p-6 mb-6">
                <label className="block text-[12px] font-bold text-[#777682] uppercase tracking-wide mb-3">Add Package</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                    <div>
                        <label className="block text-[10px] font-bold text-[#464651] uppercase tracking-wide mb-1.5">Name</label>
                        <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Starter" className="w-full border border-[#c7c5d3] rounded-md py-2.5 px-3 text-[14px] outline-none focus:border-[#075e51] focus:ring-1 focus:ring-[#075e51]" />
                    </div>
                    <div className="lg:col-span-2">
                        <label className="block text-[10px] font-bold text-[#464651] uppercase tracking-wide mb-1.5">Description <span className="normal-case font-normal text-[#777682]">(optional)</span></label>
                        <input type="text" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Short one-line pitch for this plan" className="w-full border border-[#c7c5d3] rounded-md py-2.5 px-3 text-[14px] outline-none focus:border-[#075e51] focus:ring-1 focus:ring-[#075e51]" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-[#464651] uppercase tracking-wide mb-1.5">Storage (GB)</label>
                        <input type="number" min="0" value={form.storageGB} onChange={(e) => setForm((f) => ({ ...f, storageGB: e.target.value }))} className="w-full border border-[#c7c5d3] rounded-md py-2.5 px-3 text-[14px] outline-none focus:border-[#075e51] focus:ring-1 focus:ring-[#075e51]" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-[#464651] uppercase tracking-wide mb-1.5">Transcription Minutes</label>
                        <input type="number" min="0" value={form.transcriptionMinutes} onChange={(e) => setForm((f) => ({ ...f, transcriptionMinutes: e.target.value }))} className="w-full border border-[#c7c5d3] rounded-md py-2.5 px-3 text-[14px] outline-none focus:border-[#075e51] focus:ring-1 focus:ring-[#075e51]" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-[#464651] uppercase tracking-wide mb-1.5">Searches</label>
                        <input type="number" min="0" value={form.searches} onChange={(e) => setForm((f) => ({ ...f, searches: e.target.value }))} className="w-full border border-[#c7c5d3] rounded-md py-2.5 px-3 text-[14px] outline-none focus:border-[#075e51] focus:ring-1 focus:ring-[#075e51]" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-[#464651] uppercase tracking-wide mb-1.5">Price (USD)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#777682] text-[14px]">$</span>
                            <input type="number" min="0" step="0.01" value={form.priceUSD} onChange={(e) => setForm((f) => ({ ...f, priceUSD: e.target.value }))} className="w-full border border-[#c7c5d3] rounded-md py-2.5 pl-7 pr-3 text-[14px] outline-none focus:border-[#075e51] focus:ring-1 focus:ring-[#075e51]" />
                        </div>
                    </div>
                </div>
                <button
                    onClick={handleCreate}
                    disabled={isSaving}
                    className="bg-[#075e51] text-white text-[13px] font-bold px-5 py-2.5 rounded-md hover:bg-[#097969] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    {isSaving ? 'Adding...' : 'Add Package'}
                </button>
            </div>

            {isLoading ? (
                <p className="text-center text-[#777682] py-8 text-sm">Loading packages...</p>
            ) : packages.length === 0 ? (
                <div className="bg-white rounded-xl border border-[#e0e2eb] p-8 text-center">
                    <p className="text-[#777682] text-sm">No packages yet. Add one above.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {packages.map((pkg) => (
                        <div key={pkg._id} className={`bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border p-5 flex flex-col ${pkg.isActive ? 'border-[#e0e2eb]' : 'border-[#e0e2eb] opacity-60'}`}>
                            {editingId === pkg._id ? (
                                <div className="flex flex-col gap-2.5">
                                    <input type="text" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} placeholder="Name" className="w-full border border-[#c7c5d3] rounded-md py-2 px-2.5 text-[13px] font-bold outline-none focus:border-[#075e51]" />
                                    <input type="text" value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} placeholder="Description" className="w-full border border-[#c7c5d3] rounded-md py-2 px-2.5 text-[12px] outline-none focus:border-[#075e51]" />
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-[9px] font-bold text-[#777682] uppercase mb-1">Storage GB</label>
                                            <input type="number" min="0" value={editForm.storageGB} onChange={(e) => setEditForm((f) => ({ ...f, storageGB: e.target.value }))} className="w-full border border-[#c7c5d3] rounded-md py-1.5 px-2 text-[12px] outline-none focus:border-[#075e51]" />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-bold text-[#777682] uppercase mb-1">Minutes</label>
                                            <input type="number" min="0" value={editForm.transcriptionMinutes} onChange={(e) => setEditForm((f) => ({ ...f, transcriptionMinutes: e.target.value }))} className="w-full border border-[#c7c5d3] rounded-md py-1.5 px-2 text-[12px] outline-none focus:border-[#075e51]" />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-bold text-[#777682] uppercase mb-1">Searches</label>
                                            <input type="number" min="0" value={editForm.searches} onChange={(e) => setEditForm((f) => ({ ...f, searches: e.target.value }))} className="w-full border border-[#c7c5d3] rounded-md py-1.5 px-2 text-[12px] outline-none focus:border-[#075e51]" />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-bold text-[#777682] uppercase mb-1">Price USD</label>
                                            <input type="number" min="0" step="0.01" value={editForm.priceUSD} onChange={(e) => setEditForm((f) => ({ ...f, priceUSD: e.target.value }))} className="w-full border border-[#c7c5d3] rounded-md py-1.5 px-2 text-[12px] outline-none focus:border-[#075e51]" />
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-1">
                                        <button onClick={() => saveEdit(pkg._id)} className="flex-1 bg-[#075e51] text-white text-[12px] font-bold py-2 rounded-md hover:bg-[#097969] transition-colors">Save</button>
                                        <button onClick={cancelEdit} className="flex-1 border border-[#c7c5d3] text-[#464651] text-[12px] font-bold py-2 rounded-md hover:bg-[#f1f3fc] transition-colors">Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-start justify-between mb-1">
                                        <h3 className="text-[17px] font-bold text-[#181c22]">{pkg.name}</h3>
                                        {!pkg.isActive && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#f1f3fc] text-[#777682] uppercase tracking-wide">Inactive</span>}
                                    </div>
                                    {pkg.description && <p className="text-[12px] text-[#777682] mb-3">{pkg.description}</p>}
                                    <div className="text-[28px] font-bold text-[#075e51] mb-3">${pkg.priceUSD}<span className="text-[13px] font-normal text-[#777682]"> one-time</span></div>
                                    <div className="flex flex-col gap-1.5 text-[13px] text-[#464651] mb-4">
                                        <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-[#075e51]">cloud</span> {pkg.storageGB} GB storage</span>
                                        <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-[#075e51]">mic</span> {pkg.transcriptionMinutes} transcription minutes</span>
                                        <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-[#075e51]">search</span> {pkg.searches} searches</span>
                                    </div>
                                    <div className="mt-auto flex gap-2 pt-3 border-t border-[#f1f3fc]">
                                        <button onClick={() => startEdit(pkg)} className="flex-1 text-[12px] font-bold text-[#075e51] border border-[#e0e2eb] hover:bg-[#f1f3fc] transition-colors py-2 rounded-md flex items-center justify-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">edit</span> Edit
                                        </button>
                                        <button onClick={() => toggleActive(pkg)} className="flex-1 text-[12px] font-bold text-[#854d0e] border border-[#EAB308]/50 bg-[#FEF9C3] hover:bg-[#d0f6f8] transition-colors py-2 rounded-md">
                                            {pkg.isActive ? 'Deactivate' : 'Activate'}
                                        </button>
                                        <button onClick={() => handleDelete(pkg)} className="text-[#ba1a1a] border border-[#ffb4ab] hover:bg-[#ffdad6] transition-colors py-2 px-2.5 rounded-md">
                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {toast.show && (
                <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-[13px] font-bold ${toast.type === 'error' ? 'bg-[#ba1a1a]' : 'bg-[#075e51]'}`}>
                    {toast.message}
                </div>
            )}
        </div>
    );
}
