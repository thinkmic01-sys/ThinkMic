import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

// Full, searchable/filterable catalog of every shared project (see ProjectDashboard.jsx's
// "Share My Project") - distinct from My Learning List's "Shared Projects" section, which
// only shows projects matching keywords the current user already follows. Library shows
// everything, filterable by the same Main Topic -> Sub Topic -> Keyword hierarchy admins
// add keywords under (Management > Keywords).
export default function Library() {
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchInput, setSearchInput] = useState('');

    const [allKeywords, setAllKeywords] = useState([]);
    const [mainTopicFilter, setMainTopicFilter] = useState('All Topics');
    const [subTopicFilter, setSubTopicFilter] = useState('All Sub Topics');
    const [keywordFilter, setKeywordFilter] = useState('All Keywords');

    const [unlockingId, setUnlockingId] = useState(null);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type }), 4000);
    };

    useEffect(() => {
        api.get('/keywords').then((res) => setAllKeywords(res.data.keywords || [])).catch(() => {});
    }, []);

    const mainTopicOptions = useMemo(() => (
        [...new Set(allKeywords.map((k) => k.mainTopic))].sort((a, b) => a.localeCompare(b))
    ), [allKeywords]);

    const subTopicOptions = useMemo(() => (
        [...new Set(
            allKeywords
                .filter((k) => mainTopicFilter === 'All Topics' || k.mainTopic === mainTopicFilter)
                .map((k) => k.subTopic)
                .filter(Boolean)
        )].sort((a, b) => a.localeCompare(b))
    ), [allKeywords, mainTopicFilter]);

    const keywordFilterOptions = useMemo(() => (
        allKeywords
            .filter((k) => mainTopicFilter === 'All Topics' || k.mainTopic === mainTopicFilter)
            .filter((k) => subTopicFilter === 'All Sub Topics' || k.subTopic === subTopicFilter)
    ), [allKeywords, mainTopicFilter, subTopicFilter]);

    // Debounced search + server-side filtering (name match and Topic/Sub Topic/Keyword are
    // all applied on the backend - see projectsController.listSharedProjectsLibrary).
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(true);
            const params = {};
            if (searchInput.trim()) params.search = searchInput.trim();
            if (keywordFilter !== 'All Keywords') {
                const kw = allKeywords.find((k) => k.text === keywordFilter);
                if (kw) params.keyword = kw._id;
            } else {
                if (mainTopicFilter !== 'All Topics') params.mainTopic = mainTopicFilter;
                if (subTopicFilter !== 'All Sub Topics') params.subTopic = subTopicFilter;
            }
            api.get('/projects/library', { params })
                .then((res) => setProjects(res.data.projects || []))
                .catch(() => showToast('Failed to load the library.', 'error'))
                .finally(() => setIsLoading(false));
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput, mainTopicFilter, subTopicFilter, keywordFilter, allKeywords]);

    const handleUnlock = async (project) => {
        if (project.hasUnlocked) {
            navigate(`/app/projects/${project._id}`);
            return;
        }
        setUnlockingId(project._id);
        try {
            await api.post(`/projects/${project._id}/unlock`);
            setProjects((prev) => prev.map((p) => p._id === project._id ? { ...p, hasUnlocked: true } : p));
            navigate(`/app/projects/${project._id}`);
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to unlock project.', 'error');
        } finally {
            setUnlockingId(null);
        }
    };

    return (
        <div className="w-full h-[calc(100vh-64px)] bg-[#F4F9F8] overflow-y-auto custom-scrollbar font-sans">
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #c7c5d3; border-radius: 10px; }
            `}</style>

            <div className="w-full p-4 sm:p-6 md:p-8 pb-12 animate-in fade-in duration-300">
                <header className="mb-6">
                    <h1 className="text-[28px] sm:text-[32px] md:text-[40px] font-bold text-[#075e51] leading-[1.2] tracking-tight">Library</h1>
                    <p className="text-[14px] sm:text-[16px] text-[#464651] mt-1 max-w-2xl">Browse every project shared by other scholars. Search by name, or filter by topic.</p>
                </header>

                <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] p-4 sm:p-5 mb-6 flex flex-col gap-3">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#777682] text-[20px]">search</span>
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search shared projects by name..."
                            className="w-full border border-[#c7c5d3] rounded-md py-2.5 pl-10 pr-3 text-[14px] outline-none focus:border-[#075e51] focus:ring-1 focus:ring-[#075e51]"
                        />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2.5">
                        <div className="relative flex-1">
                            <select
                                value={mainTopicFilter}
                                onChange={(e) => { setMainTopicFilter(e.target.value); setSubTopicFilter('All Sub Topics'); setKeywordFilter('All Keywords'); }}
                                className="w-full appearance-none border border-[#c7c5d3] rounded-md py-2 px-3 pr-8 text-[13px] font-semibold text-[#181c22] outline-none focus:border-[#075e51] cursor-pointer"
                            >
                                <option>All Topics</option>
                                {mainTopicOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[#777682] pointer-events-none text-[16px]">expand_more</span>
                        </div>
                        <div className="relative flex-1">
                            <select
                                value={subTopicFilter}
                                onChange={(e) => { setSubTopicFilter(e.target.value); setKeywordFilter('All Keywords'); }}
                                disabled={subTopicOptions.length === 0}
                                className="w-full appearance-none border border-[#c7c5d3] rounded-md py-2 px-3 pr-8 text-[13px] font-semibold text-[#181c22] outline-none focus:border-[#075e51] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option>All Sub Topics</option>
                                {subTopicOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[#777682] pointer-events-none text-[16px]">expand_more</span>
                        </div>
                        <div className="relative flex-1">
                            <select
                                value={keywordFilter}
                                onChange={(e) => setKeywordFilter(e.target.value)}
                                disabled={keywordFilterOptions.length === 0}
                                className="w-full appearance-none border border-[#c7c5d3] rounded-md py-2 px-3 pr-8 text-[13px] font-semibold text-[#181c22] outline-none focus:border-[#075e51] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option>All Keywords</option>
                                {keywordFilterOptions.map((k) => <option key={k._id} value={k.text}>{k.text}</option>)}
                            </select>
                            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[#777682] pointer-events-none text-[16px]">expand_more</span>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <p className="text-[13px] text-[#777682] text-center py-12">Loading...</p>
                ) : projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center bg-white rounded-xl border border-[#e0e2eb] border-dashed py-16 px-4 shadow-sm">
                        <span className="material-symbols-outlined text-[32px] text-[#c7c5d3] mb-3">auto_stories</span>
                        <h3 className="text-[16px] font-bold text-[#181c22] mb-1">No shared projects found</h3>
                        <p className="text-[13px] text-[#777682] text-center max-w-md">Try a different search term or clear the topic filters.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {projects.map((project) => (
                            <div key={project._id} className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] p-5 flex flex-col">
                                <h3 className="font-bold text-[15px] text-[#181c22] mb-1 line-clamp-1">{project.name}</h3>
                                <p className="text-[12px] text-[#777682] mb-2">by {project.isOwn ? 'you' : project.ownerName}</p>
                                <p className="text-[13px] text-[#464651] line-clamp-2 mb-3 flex-1">{project.description || 'No description provided.'}</p>
                                {project.keywords?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {project.keywords.map((kw) => (
                                            <span key={kw._id} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f1f3fc] text-[#464651] border border-[#e0e2eb]">{kw.text}</span>
                                        ))}
                                    </div>
                                )}
                                <button
                                    onClick={() => handleUnlock(project)}
                                    disabled={unlockingId === project._id}
                                    className={`shrink-0 inline-flex items-center justify-center gap-1.5 text-[12px] font-bold px-3.5 py-2 rounded-full transition-colors disabled:opacity-60 ${
                                        project.hasUnlocked
                                            ? 'bg-[#FEF9C3] text-[#854d0e] border border-[#EAB308]/50 hover:bg-[#d0f6f8]'
                                            : 'bg-[#075e51] text-white hover:bg-[#097969]'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[15px]">
                                        {unlockingId === project._id ? 'hourglass_empty' : project.hasUnlocked ? 'visibility' : 'toll'}
                                    </span>
                                    {unlockingId === project._id ? 'Unlocking...' : project.hasUnlocked ? 'View' : `Unlock · ${project.sharePriceCoins}`}
                                </button>
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
