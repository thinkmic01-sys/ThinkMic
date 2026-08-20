import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';

export default function KeywordsManagement() {
    const [keywords, setKeywords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Cascading add form - Main Topic (required) -> Sub Topic (optional) -> Main Keyword.
    // mainTopic/subTopic are left filled in after a successful add since an admin typically
    // adds several keywords under the same topic/subtopic in a row.
    const [mainTopic, setMainTopic] = useState('');
    const [subTopic, setSubTopic] = useState('');
    const [keywordText, setKeywordText] = useState('');
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

    // Suggestion lists for the datalist comboboxes - existing Main Topics always, existing
    // Sub Topics narrowed to whichever Main Topic is currently typed in.
    const existingMainTopics = useMemo(() => (
        [...new Set(keywords.map((k) => k.mainTopic))].sort((a, b) => a.localeCompare(b))
    ), [keywords]);

    const existingSubTopics = useMemo(() => (
        [...new Set(
            keywords
                .filter((k) => k.mainTopic.toLowerCase() === mainTopic.trim().toLowerCase() && k.subTopic)
                .map((k) => k.subTopic)
        )].sort((a, b) => a.localeCompare(b))
    ), [keywords, mainTopic]);

    // Grouped for display: Main Topic -> Sub Topic ('' = "no sub topic", shown first) -> keywords
    const grouped = useMemo(() => {
        const byMain = new Map();
        for (const kw of keywords) {
            if (!byMain.has(kw.mainTopic)) byMain.set(kw.mainTopic, new Map());
            const bySub = byMain.get(kw.mainTopic);
            const subKey = kw.subTopic || '';
            if (!bySub.has(subKey)) bySub.set(subKey, []);
            bySub.get(subKey).push(kw);
        }
        return [...byMain.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([topic, bySub]) => ({
                topic,
                subGroups: [...bySub.entries()].sort((a, b) => a[0].localeCompare(b[0]))
            }));
    }, [keywords]);

    const handleAdd = async () => {
        const trimmedMain = mainTopic.trim();
        const trimmedText = keywordText.trim();
        if (!trimmedMain || !trimmedText) return;
        setIsSaving(true);
        try {
            await api.post('/admin/keywords', { mainTopic: trimmedMain, subTopic: subTopic.trim(), text: trimmedText });
            setKeywordText('');
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
        <div className="w-full h-[calc(100vh-64px)] overflow-y-auto custom-scrollbar p-4 sm:p-6 md:p-8 flex flex-col pb-20">
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #c7c5d3; border-radius: 10px; }
            `}</style>
            <div className="mb-5 sm:mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-[#075e51] mb-1 tracking-tight">Keywords</h2>
                <p className="text-[#777682] text-sm sm:text-base">
                    Curate the topics users can follow on My Learning List. Organize them as a Main Topic, an optional Sub Topic, then the Main Keyword itself - these also become the category options when hosting a seminar, and the same hierarchy is what users filter by.
                </p>
            </div>

            <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb] p-5 sm:p-6 mb-5 sm:mb-6">
                <label className="block text-[12px] font-bold text-[#777682] uppercase tracking-wide mb-2">Add Keyword</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label className="block text-[10px] font-bold text-[#464651] uppercase tracking-wide mb-1.5">Main Topic</label>
                        <input
                            type="text"
                            list="main-topic-options"
                            value={mainTopic}
                            onChange={(e) => { setMainTopic(e.target.value); setSubTopic(''); }}
                            placeholder="e.g. Technology"
                            className="w-full border border-[#c7c5d3] rounded-md py-2.5 px-3 text-[14px] outline-none focus:border-[#075e51] focus:ring-1 focus:ring-[#075e51]"
                        />
                        <datalist id="main-topic-options">
                            {existingMainTopics.map((t) => <option key={t} value={t} />)}
                        </datalist>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-[#464651] uppercase tracking-wide mb-1.5">Sub Topic <span className="normal-case font-normal text-[#777682]">(optional)</span></label>
                        <input
                            type="text"
                            list="sub-topic-options"
                            value={subTopic}
                            onChange={(e) => setSubTopic(e.target.value)}
                            placeholder="e.g. Artificial Intelligence"
                            className="w-full border border-[#c7c5d3] rounded-md py-2.5 px-3 text-[14px] outline-none focus:border-[#075e51] focus:ring-1 focus:ring-[#075e51]"
                        />
                        <datalist id="sub-topic-options">
                            {existingSubTopics.map((t) => <option key={t} value={t} />)}
                        </datalist>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-[#464651] uppercase tracking-wide mb-1.5">Main Keyword</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={keywordText}
                                onChange={(e) => setKeywordText(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                                placeholder="e.g. Machine Learning"
                                className="flex-1 min-w-0 border border-[#c7c5d3] rounded-md py-2.5 px-3 text-[14px] outline-none focus:border-[#075e51] focus:ring-1 focus:ring-[#075e51]"
                            />
                            <button
                                onClick={handleAdd}
                                disabled={isSaving || !mainTopic.trim() || !keywordText.trim()}
                                title={!mainTopic.trim() ? 'Main Topic is required' : undefined}
                                className="bg-[#075e51] text-white text-[13px] font-bold px-4 py-2.5 rounded-md hover:bg-[#097969] transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5 shrink-0"
                            >
                                <span className="material-symbols-outlined text-[18px]">add</span>
                            </button>
                        </div>
                    </div>
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
                    <div className="flex flex-col gap-6">
                        {grouped.map(({ topic, subGroups }) => (
                            <div key={topic}>
                                <h4 className="text-[15px] font-bold text-[#075e51] mb-2.5 flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[18px]">folder</span> {topic}
                                </h4>
                                <div className="flex flex-col gap-3 pl-2 sm:pl-4 border-l-2 border-[#e0e2eb]">
                                    {subGroups.map(([sub, kws]) => (
                                        <div key={sub || '__none__'}>
                                            {sub && (
                                                <p className="text-[12px] font-bold text-[#464651] mb-1.5 flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px]">subdirectory_arrow_right</span> {sub}
                                                </p>
                                            )}
                                            <div className="flex flex-wrap gap-2.5">
                                                {kws.map((keyword) => (
                                                    <span
                                                        key={keyword._id}
                                                        className="inline-flex items-center gap-2 bg-[#f1f3fc] text-[#075e51] border border-[#c7c5d3] rounded-full pl-3.5 pr-2 py-1.5 text-[13px] font-bold"
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
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {toast.show && (
                <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-[13px] font-bold ${toast.type === 'error' ? 'bg-[#ba1a1a]' : 'bg-[#075e51]'}`}>
                    {toast.message}
                </div>
            )}
        </div>
    );
}
