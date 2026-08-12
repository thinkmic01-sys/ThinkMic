import React, { useState, useEffect } from 'react';
import api from '../../services/api';

// Keywords are admin-curated (Management > Keywords) - following one here notifies you
// when a seminar is hosted in that category. No enrollment/progress model exists yet (see
// CLAUDE.md), so this page no longer shows any course-progress content - it used to be
// hardcoded fake courses/streaks/saved items, which was removed rather than kept as
// fabricated data.
export default function MyLearningList() {
    const [allKeywords, setAllKeywords] = useState([]);
    const [myKeywordIds, setMyKeywordIds] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [savingId, setSavingId] = useState(null);

    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type }), 4000);
    };

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [keywordsRes, meRes] = await Promise.all([
                    api.get('/keywords'),
                    api.get('/users/me')
                ]);
                setAllKeywords(keywordsRes.data.keywords || []);
                setMyKeywordIds((meRes.data.user.learningKeywords || []).map((k) => k._id));
            } catch (err) {
                showToast('Failed to load keywords.', 'error');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const toggleKeyword = async (keywordId) => {
        const isFollowing = myKeywordIds.includes(keywordId);
        const nextIds = isFollowing ? myKeywordIds.filter((id) => id !== keywordId) : [...myKeywordIds, keywordId];

        setSavingId(keywordId);
        try {
            await api.patch('/users/me', { learningKeywords: nextIds });
            setMyKeywordIds(nextIds);
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to update your learning list.', 'error');
        } finally {
            setSavingId(null);
        }
    };

    const myKeywords = allKeywords.filter((k) => myKeywordIds.includes(k._id));
    const suggestedKeywords = allKeywords.filter((k) => !myKeywordIds.includes(k._id));

    return (
        <div className="w-full h-[calc(100vh-64px)] bg-[#f9f9ff] overflow-y-auto custom-scrollbar font-sans">

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #c7c5d3; border-radius: 10px; }
            `}</style>

            <div className="w-full p-4 sm:p-6 md:p-8 pb-12 sm:pb-8 animate-in fade-in duration-300">
                <header className="mb-6 sm:mb-8">
                    <h1 className="text-[28px] sm:text-[32px] md:text-[40px] font-bold text-[#222777] leading-[1.2] tracking-tight sm:tracking-[-0.02em]">My Learning List</h1>
                    <p className="text-[14px] sm:text-[16px] leading-[1.6] sm:leading-[1.85] text-[#464651] mt-1 sm:mt-2 max-w-2xl">Follow topics to get notified when a seminar is hosted in that category.</p>
                </header>

                <section className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] p-5 sm:p-6 mb-6 sm:mb-8">
                    <h3 className="text-[20px] sm:text-[24px] font-semibold text-[#222777] mb-1 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[20px] sm:text-[24px]">bookmark</span> My Keywords
                    </h3>
                    <p className="text-[13px] sm:text-[14px] text-[#777682] mb-4">Topics you're following.</p>

                    {isLoading ? (
                        <p className="text-[13px] text-[#777682]">Loading...</p>
                    ) : myKeywords.length === 0 ? (
                        <p className="text-[13px] text-[#c7c5d3] italic">You aren't following any keywords yet - add some below.</p>
                    ) : (
                        <div className="flex flex-wrap gap-2.5">
                            {myKeywords.map((keyword) => (
                                <button
                                    key={keyword._id}
                                    onClick={() => toggleKeyword(keyword._id)}
                                    disabled={savingId === keyword._id}
                                    className="inline-flex items-center gap-2 bg-[#e6fbfc] text-[#006e73] border border-[#6bf6ff]/50 rounded-full pl-3.5 pr-2 py-1.5 text-[13px] font-bold hover:bg-[#6bf6ff]/20 transition-colors disabled:opacity-60"
                                >
                                    {keyword.text}
                                    <span className="material-symbols-outlined text-[15px]">{savingId === keyword._id ? 'hourglass_empty' : 'close'}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </section>

                <section className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] p-5 sm:p-6 mb-6 sm:mb-8">
                    <h3 className="text-[20px] sm:text-[24px] font-semibold text-[#222777] mb-1 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[20px] sm:text-[24px]">explore</span> Discover Keywords
                    </h3>
                    <p className="text-[13px] sm:text-[14px] text-[#777682] mb-4">Add a topic to start getting notified about it.</p>

                    {isLoading ? (
                        <p className="text-[13px] text-[#777682]">Loading...</p>
                    ) : suggestedKeywords.length === 0 ? (
                        <p className="text-[13px] text-[#c7c5d3] italic">{allKeywords.length === 0 ? 'No keywords have been added yet - check back soon.' : "You're following every available keyword."}</p>
                    ) : (
                        <div className="flex flex-wrap gap-2.5">
                            {suggestedKeywords.map((keyword) => (
                                <button
                                    key={keyword._id}
                                    onClick={() => toggleKeyword(keyword._id)}
                                    disabled={savingId === keyword._id}
                                    className="inline-flex items-center gap-2 bg-[#f1f3fc] text-[#222777] border border-[#c7c5d3] rounded-full pl-3.5 pr-2 py-1.5 text-[13px] font-bold hover:bg-[#e0e2eb] transition-colors disabled:opacity-60"
                                >
                                    {keyword.text}
                                    <span className="material-symbols-outlined text-[15px]">{savingId === keyword._id ? 'hourglass_empty' : 'add'}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {toast.show && (
                <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-[13px] font-bold ${toast.type === 'error' ? 'bg-[#ba1a1a]' : 'bg-[#222777]'}`}>
                    {toast.message}
                </div>
            )}
        </div>
    );
}
