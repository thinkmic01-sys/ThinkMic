import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

// Keywords are admin-curated (Management > Keywords) - following one here notifies you
// when a seminar is hosted in that category. No enrollment/progress model exists yet (see
// CLAUDE.md), so this page no longer shows any course-progress content - it used to be
// hardcoded fake courses/streaks/saved items, which was removed rather than kept as
// fabricated data.
export default function MyLearningList() {
    const navigate = useNavigate();
    const [allKeywords, setAllKeywords] = useState([]);
    const [myKeywordIds, setMyKeywordIds] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [savingId, setSavingId] = useState(null);

    // Projects other users have shared under a keyword this user follows (see
    // ProjectDashboard.jsx's "Share My Project") - pay sharePriceCoins to unlock the whole
    // project, or open it straight away if already unlocked.
    const [sharedProjects, setSharedProjects] = useState([]);
    const [unlockingId, setUnlockingId] = useState(null);

    const fetchSharedProjects = async () => {
        try {
            const res = await api.get('/projects/shared');
            setSharedProjects(res.data.projects || []);
        } catch {
            // Non-critical - the keywords section above is the primary content of this page
        }
    };

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
        fetchSharedProjects();
    }, []);

    const toggleKeyword = async (keywordId) => {
        const isFollowing = myKeywordIds.includes(keywordId);
        const nextIds = isFollowing ? myKeywordIds.filter((id) => id !== keywordId) : [...myKeywordIds, keywordId];

        setSavingId(keywordId);
        try {
            await api.patch('/users/me', { learningKeywords: nextIds });
            setMyKeywordIds(nextIds);
            fetchSharedProjects(); // following/unfollowing a keyword can reveal or hide shared projects
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to update your learning list.', 'error');
        } finally {
            setSavingId(null);
        }
    };

    const handleUnlockProject = async (project) => {
        if (project.hasUnlocked) {
            navigate(`/app/projects/${project._id}`);
            return;
        }
        setUnlockingId(project._id);
        try {
            await api.post(`/projects/${project._id}/unlock`);
            setSharedProjects((prev) => prev.map((p) => p._id === project._id ? { ...p, hasUnlocked: true } : p));
            navigate(`/app/projects/${project._id}`);
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to unlock project.', 'error');
        } finally {
            setUnlockingId(null);
        }
    };

    const myKeywords = allKeywords.filter((k) => myKeywordIds.includes(k._id));
    const suggestedKeywords = allKeywords.filter((k) => !myKeywordIds.includes(k._id));

    // Same Main Topic -> Sub Topic hierarchy the admin adds keywords under (Management >
    // Keywords) - lets a user narrow "Discover Keywords" down the same way instead of
    // scanning one long flat list.
    const [topicFilter, setTopicFilter] = useState('All Topics');
    const [subTopicFilter, setSubTopicFilter] = useState('All Sub Topics');

    const topicOptions = useMemo(() => (
        [...new Set(allKeywords.map((k) => k.mainTopic))].sort((a, b) => a.localeCompare(b))
    ), [allKeywords]);

    const subTopicOptions = useMemo(() => (
        [...new Set(
            allKeywords
                .filter((k) => topicFilter === 'All Topics' || k.mainTopic === topicFilter)
                .map((k) => k.subTopic)
                .filter(Boolean)
        )].sort((a, b) => a.localeCompare(b))
    ), [allKeywords, topicFilter]);

    const filteredSuggestedKeywords = suggestedKeywords
        .filter((k) => topicFilter === 'All Topics' || k.mainTopic === topicFilter)
        .filter((k) => subTopicFilter === 'All Sub Topics' || k.subTopic === subTopicFilter);

    return (
        <div className="w-full h-[calc(100vh-64px)] bg-[#F4F9F8] overflow-y-auto custom-scrollbar font-sans">

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #c7c5d3; border-radius: 10px; }
            `}</style>

            <div className="w-full p-4 sm:p-6 md:p-8 pb-12 sm:pb-8 animate-in fade-in duration-300">
                <header className="mb-6 sm:mb-8">
                    <h1 className="text-[28px] sm:text-[32px] md:text-[40px] font-bold text-[#075e51] leading-[1.2] tracking-tight sm:tracking-[-0.02em]">My Learning List</h1>
                    <p className="text-[14px] sm:text-[16px] leading-[1.6] sm:leading-[1.85] text-[#464651] mt-1 sm:mt-2 max-w-2xl">Follow topics to get notified when a seminar is hosted in that category.</p>
                </header>

                <section className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] p-5 sm:p-6 mb-6 sm:mb-8">
                    <h3 className="text-[20px] sm:text-[24px] font-semibold text-[#075e51] mb-1 flex items-center gap-1.5">
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
                                    className="inline-flex items-center gap-2 bg-[#FEF9C3] text-[#854d0e] border border-[#EAB308]/50 rounded-full pl-3.5 pr-2 py-1.5 text-[13px] font-bold hover:bg-[#EAB308]/20 transition-colors disabled:opacity-60"
                                >
                                    {keyword.text}
                                    <span className="material-symbols-outlined text-[15px]">{savingId === keyword._id ? 'hourglass_empty' : 'close'}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </section>

                <section className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] p-5 sm:p-6 mb-6 sm:mb-8">
                    <h3 className="text-[20px] sm:text-[24px] font-semibold text-[#075e51] mb-1 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[20px] sm:text-[24px]">explore</span> Discover Keywords
                    </h3>
                    <p className="text-[13px] sm:text-[14px] text-[#777682] mb-4">Add a topic to start getting notified about it.</p>

                    {!isLoading && allKeywords.length > 0 && (
                        <div className="flex flex-col sm:flex-row gap-2.5 mb-4">
                            <div className="relative flex-1">
                                <select
                                    value={topicFilter}
                                    onChange={(e) => { setTopicFilter(e.target.value); setSubTopicFilter('All Sub Topics'); }}
                                    className="w-full appearance-none border border-[#c7c5d3] rounded-md py-2 px-3 pr-8 text-[13px] font-semibold text-[#181c22] outline-none focus:border-[#075e51] cursor-pointer"
                                >
                                    <option>All Topics</option>
                                    {topicOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[#777682] pointer-events-none text-[16px]">expand_more</span>
                            </div>
                            <div className="relative flex-1">
                                <select
                                    value={subTopicFilter}
                                    onChange={(e) => setSubTopicFilter(e.target.value)}
                                    disabled={subTopicOptions.length === 0}
                                    className="w-full appearance-none border border-[#c7c5d3] rounded-md py-2 px-3 pr-8 text-[13px] font-semibold text-[#181c22] outline-none focus:border-[#075e51] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <option>All Sub Topics</option>
                                    {subTopicOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[#777682] pointer-events-none text-[16px]">expand_more</span>
                            </div>
                        </div>
                    )}

                    {isLoading ? (
                        <p className="text-[13px] text-[#777682]">Loading...</p>
                    ) : suggestedKeywords.length === 0 ? (
                        <p className="text-[13px] text-[#c7c5d3] italic">{allKeywords.length === 0 ? 'No keywords have been added yet - check back soon.' : "You're following every available keyword."}</p>
                    ) : filteredSuggestedKeywords.length === 0 ? (
                        <p className="text-[13px] text-[#c7c5d3] italic">No keywords match this filter.</p>
                    ) : (
                        <div className="flex flex-wrap gap-2.5">
                            {filteredSuggestedKeywords.map((keyword) => (
                                <button
                                    key={keyword._id}
                                    onClick={() => toggleKeyword(keyword._id)}
                                    disabled={savingId === keyword._id}
                                    className="inline-flex items-center gap-2 bg-[#f1f3fc] text-[#075e51] border border-[#c7c5d3] rounded-full pl-3.5 pr-2 py-1.5 text-[13px] font-bold hover:bg-[#e0e2eb] transition-colors disabled:opacity-60"
                                >
                                    {keyword.text}
                                    <span className="material-symbols-outlined text-[15px]">{savingId === keyword._id ? 'hourglass_empty' : 'add'}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </section>

                {sharedProjects.length > 0 && (
                    <section className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] p-5 sm:p-6 mb-6 sm:mb-8">
                        <h3 className="text-[20px] sm:text-[24px] font-semibold text-[#075e51] mb-1 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[20px] sm:text-[24px]">folder_shared</span> Shared Projects
                        </h3>
                        <p className="text-[13px] sm:text-[14px] text-[#777682] mb-4">Projects shared by other users under a keyword you follow.</p>

                        <div className="space-y-3">
                            {sharedProjects.map((project) => (
                                <div key={project._id} className="flex items-center justify-between gap-3 border border-[#e0e2eb] rounded-lg p-3.5">
                                    <div className="min-w-0">
                                        <p className="font-bold text-[13px] sm:text-sm text-[#181c22] truncate">{project.name}</p>
                                        <p className="text-[12px] text-[#777682] truncate">by {project.ownerName}{project.description ? ` · ${project.description}` : ''}</p>
                                        {project.keywords?.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                {project.keywords.map((kw) => (
                                                    <span key={kw._id} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f1f3fc] text-[#464651] border border-[#e0e2eb]">{kw.text}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleUnlockProject(project)}
                                        disabled={unlockingId === project._id}
                                        className={`shrink-0 inline-flex items-center gap-1.5 text-[12px] font-bold px-3.5 py-2 rounded-full transition-colors disabled:opacity-60 ${
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
                    </section>
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
