import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function KeywordsManagement() {
    const [keywords, setKeywords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newKeyword, setNewKeyword] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type }), 4000);
    };

    const fetchKeywords = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/keywords');
            setKeywords(res.data.keywords || []);
        } catch (err) {
            showToast('Failed to load keywords.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchKeywords(); }, []);

    const handleAdd = async () => {
        const text = newKeyword.trim();
        if (!text) return;
        setIsSaving(true);
        try {
            await api.post('/admin/keywords', { text });
            setNewKeyword('');
            showToast('Keyword added.', 'success');
            fetchKeywords();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to add keyword.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (keyword) => {
        try {
            await api.delete(`/admin/keywords/${keyword._id}`);
            showToast('Keyword deleted.', 'success');
            setKeywords((prev) => prev.filter((k) => k._id !== keyword._id));
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to delete keyword.', 'error');
        }
    };

    return (
        <div className="w-full p-4 sm:p-6 md:p-8 flex flex-col pb-20 min-h-full">
            <div className="mb-5 sm:mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-[#222777] mb-1 tracking-tight">Keywords</h2>
                <p className="text-[#777682] text-sm sm:text-base">
                    Curate the topics users can follow on My Learning List. These also become the category options when hosting a seminar - a matching category notifies everyone following that keyword.
                </p>
            </div>

            <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb] p-5 sm:p-6 mb-5 sm:mb-6">
                <label className="block text-[12px] font-bold text-[#777682] uppercase tracking-wide mb-2">Add Keyword</label>
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                        placeholder="e.g. Machine Learning"
                        className="flex-1 border border-[#c7c5d3] rounded-md py-2.5 px-3 text-[14px] outline-none focus:border-[#222777] focus:ring-1 focus:ring-[#222777]"
                    />
                    <button
                        onClick={handleAdd}
                        disabled={isSaving || !newKeyword.trim()}
                        className="bg-[#222777] text-white text-[13px] font-bold px-5 py-2.5 rounded-md hover:bg-[#3a3f8f] transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shrink-0"
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        {isSaving ? 'Adding...' : 'Add'}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb] p-5 sm:p-6">
                <h3 className="text-[12px] font-bold text-[#777682] uppercase tracking-wide mb-4">
                    All Keywords {!isLoading && <span className="font-mono normal-case">({keywords.length})</span>}
                </h3>
                {isLoading ? (
                    <p className="text-center text-[#777682] py-8 text-sm">Loading keywords...</p>
                ) : keywords.length === 0 ? (
                    <p className="text-center text-[#777682] py-8 text-sm">No keywords yet. Add one above.</p>
                ) : (
                    <div className="flex flex-wrap gap-2.5">
                        {keywords.map((keyword) => (
                            <span
                                key={keyword._id}
                                className="inline-flex items-center gap-2 bg-[#f1f3fc] text-[#222777] border border-[#c7c5d3] rounded-full pl-3.5 pr-2 py-1.5 text-[13px] font-bold"
                            >
                                {keyword.text}
                                <button
                                    onClick={() => handleDelete(keyword)}
                                    title="Delete keyword"
                                    className="text-[#777682] hover:text-[#ba1a1a] transition-colors flex items-center justify-center w-5 h-5 rounded-full hover:bg-white"
                                >
                                    <span className="material-symbols-outlined text-[15px]">close</span>
                                </button>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {toast.show && (
                <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-[13px] font-bold ${toast.type === 'error' ? 'bg-[#ba1a1a]' : 'bg-[#222777]'}`}>
                    {toast.message}
                </div>
            )}
        </div>
    );
}
