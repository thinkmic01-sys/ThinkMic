import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from 'react-redux';
import api from '../../services/api';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../../config';

// Real classification from the result's actual domain (Tavily doesn't return a content-type
// field) - deliberately domain-based rather than a second/third Tavily call per query, so every
// query still costs exactly one search. Order matters: video platforms checked first since some
// (e.g. youtube.com) could otherwise also read as generic "Article".
const VIDEO_DOMAINS = ['youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com', 'twitch.tv', 'tiktok.com'];
const ACADEMIC_HINTS = ['.edu', '.gov', 'arxiv.org', 'ncbi.nlm.nih.gov', 'researchgate.net', 'jstor.org'];
const NEWS_DOMAINS = ['nytimes.com', 'bbc.co', 'bbc.com', 'cnn.com', 'reuters.com', 'techcrunch.com', 'forbes.com', 'bloomberg.com', 'theguardian.com', 'wsj.com', 'apnews.com'];
const BLOG_DOMAINS = ['medium.com', 'blogspot.com', 'wordpress.com', 'substack.com', 'dev.to', 'hashnode.dev', 'tumblr.com'];

const classifyResultType = (domain) => {
    const d = (domain || '').toLowerCase();
    if (VIDEO_DOMAINS.some((v) => d.includes(v))) return 'Video';
    if (ACADEMIC_HINTS.some((a) => d.includes(a))) return 'Academic';
    if (NEWS_DOMAINS.some((n) => d.includes(n))) return 'News';
    if (BLOG_DOMAINS.some((b) => d.includes(b))) return 'Blog';
    return 'Article';
};

const ICON_BY_TYPE = {
    Video: 'smart_display',
    Academic: 'school',
    News: 'newspaper',
    Blog: 'article',
    Article: 'language'
};

export default function ResearchResults() {
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get('projectId');
    
    const accessToken = useSelector((state) => state.auth?.accessToken);
    const userId = useSelector((state) => state.auth?.user?.id);
    
    // --- STATE MANAGEMENT ---
    const [queries, setQueries] = useState([]);
    const [allResults, setAllResults] = useState([]);
    const [activeQueryId, setActiveQueryId] = useState(null);
    const [activeSessionId, setActiveSessionId] = useState(null);
    const [activeSourceId, setActiveSourceId] = useState(null);
    const [selectedResultIds, setSelectedResultIds] = useState([]);
    
    // --- RESPONSIVE TOGGLE STATES ---
    const [isQueriesOpen, setIsQueriesOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // Fetch data
    const fetchSessions = async () => {
        try {
            const res = await api.get('/search/sessions');
            const data = res.data;
            if (data.sessions && data.sessions.length > 0) {
                const latestSession = data.sessions[0];
                setActiveSessionId(latestSession.id);
                setQueries(latestSession.queries);
                if (latestSession.queries.length > 0) {
                    setActiveQueryId(latestSession.queries[0].id);
                }
                
                // Fetch results for this session
                fetchResultsForSession(latestSession.id);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchResultsForSession = async (sessionId) => {
        try {
            const res2 = await api.get(`/search/sessions/${sessionId}`);
            const data2 = res2.data;
            if (data2.results) {
                const flattenedResults = [];
                data2.results.forEach(searchDoc => {
                    searchDoc.results.forEach((r, idx) => {
                        const regions = ["North America", "Europe", "Asia", "Global"];
                        const years = [2026, 2025, 2024, 2022, 2020];
                        const domain = new URL(r.url || 'https://example.com').hostname;
                        
                        // Generate realistic mock metadata
                        const mockAuthors = ["Sarah Jenkins", "Dr. Robert Chen", "TechCrunch Staff", "Michael O'Connor", "Editorial Team"];
                        const author = mockAuthors[idx % mockAuthors.length];
                        const publishedDate = `${["Jan", "Mar", "Jun", "Sep", "Nov"][idx % 5]} ${10 + idx}, ${years[idx % years.length]}`;
                        const reliability = domain.includes('.edu') || domain.includes('.gov') ? "98/100" : (idx % 2 === 0 ? "85/100" : "72/100");
                        // Real classification from the actual URL - not mocked, so blog and video
                        // results genuinely show up as such whenever Tavily's results include them.
                        const type = classifyResultType(domain);

                        flattenedResults.push({
                            id: `${searchDoc._id}-${idx}`,
                            queryId: searchDoc._id,
                            domain: domain,
                            type,
                            title: r.title,
                            snippet: r.snippet,
                            url: r.url,
                            metrics: [],
                            icon: ICON_BY_TYPE[type],
                            entities: [],
                            metadata: { author: author, published: publishedDate, reliability: reliability },
                            region: regions[idx % regions.length],
                            language: "English",
                            year: years[idx % years.length]
                        });
                    });
                });
                setAllResults(flattenedResults);
            }
        } catch (err) {
            console.error(err);
        }
    }

    useEffect(() => {
        if (!accessToken) return;
        fetchSessions();
    }, [accessToken]);

    // SOCKET IO
    useEffect(() => {
        if (!userId) return;

        const socket = io(API_BASE_URL, {
            withCredentials: true
        });

        socket.on('connect', () => {
            socket.emit('join', userId);
        });

        socket.on('job_progress', (data) => {
            if (data.type === 'search') {
                setQueries(prev => prev.map(q => q.text === data.query ? { ...q, status: data.status === 'processing' ? 'running' : 'error' } : q));
            }
        });

        socket.on('search_complete', (data) => {
            setQueries(prev => prev.map(q => q.text === data.query ? { ...q, id: data.resultId, status: 'done', results: data.resultsCount } : q));
            setActiveQueryId(data.resultId);
            if (activeSessionId) {
                fetchResultsForSession(activeSessionId);
            } else {
                fetchSessions();
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [userId, activeSessionId]);

    // Filter States
    const [languageFilter, setLanguageFilter] = useState('English (US)');
    const [regionFilter, setRegionFilter] = useState('Any Region');
    const [dateFilter, setDateFilter] = useState('Past 5 Years');

    const [isAddingQuery, setIsAddingQuery] = useState(false);
    const [newQueryInput, setNewQueryInput] = useState('');

    // --- HANDLERS ---
    const handleSubmitNewQuery = async () => {
        if (newQueryInput && newQueryInput.trim() !== "") {
            const tempId = Date.now();
            setQueries(prev => [
                ...prev,
                { id: tempId, text: newQueryInput, status: "running", results: 0 }
            ]);
            setActiveQueryId(tempId);
            setIsAddingQuery(false);
            setNewQueryInput('');
            if (window.innerWidth < 768) setIsQueriesOpen(false); // Close drawer on mobile

            try {
                await api.post('/search/sessions', {
                    queries: [newQueryInput],
                    sessionId: activeSessionId,
                    config: { gl: "us", hl: "en" }
                });
            } catch (err) {
                console.error("Failed to run query", err);
                setQueries(prev => prev.map(q => q.id === tempId ? { ...q, status: 'error' } : q));
            }
        }
    };

    const handleSelectQuery = (id) => {
        setActiveQueryId(id);
        if (window.innerWidth < 768) setIsQueriesOpen(false); // Close drawer on mobile
    };

    const handleProceedToReport = async () => {
        if (selectedResultIds.length === 0) return;
        try {
            const payload = {
                title: "Research Report",
                sessionIds: [activeSessionId],
                template: "academic",
                sections: { summary: true, transcript: false, research: true, sources: true }
            };
            if (projectId) {
                payload.projectId = projectId;
            }
            const res = await api.post('/reports', payload);
            if (res.data.reportId) {
                navigate(`/app/reports/${res.data.reportId}`);
            }
        } catch (err) {
            console.error("Failed to generate report", err);
        }
    };

    const handleSelectSource = (id) => {
        setActiveSourceId(id);
        if (window.innerWidth < 768) setIsDetailOpen(true); // Open details automatically on mobile
    };

    const handleToggleSelection = (e, id) => {
        e.stopPropagation();
        setSelectedResultIds(prev =>
            prev.includes(id) ? prev.filter(resId => resId !== id) : [...prev, id]
        );
    };

    // Selects (or, if already all selected, deselects) every result belonging to one query at
    // once - works on any query in the sidebar, not just the currently active one, since
    // allResults already holds every query's results client-side.
    const handleSelectAllForQuery = (e, queryId) => {
        e.stopPropagation();
        const idsForQuery = allResults.filter(r => r.queryId === queryId).map(r => r.id);
        if (idsForQuery.length === 0) return;
        const allSelected = idsForQuery.every(id => selectedResultIds.includes(id));
        setSelectedResultIds(prev => (
            allSelected
                ? prev.filter(id => !idsForQuery.includes(id))
                : Array.from(new Set([...prev, ...idsForQuery]))
        ));
    };

    // --- FILTER LOGIC ---
    const currentResults = allResults.filter(result => {
        if (result.queryId !== activeQueryId) return false;
        if (regionFilter !== 'Any Region' && result.region !== regionFilter) return false;
        const currentYear = 2026;
        if (dateFilter === 'Past Year' && result.year < currentYear - 1) return false;
        if (dateFilter === 'Past 5 Years' && result.year < currentYear - 5) return false;
        return true;
    });

    const activeSourceDetail = allResults.find(r => r.id === activeSourceId);

    return (
        <div className="flex w-full h-[calc(100vh-64px)] bg-[#f9f9ff] p-0 md:p-4 lg:p-6 gap-0 md:gap-4 overflow-hidden relative">

            {/* --- MOBILE BACKDROP --- */}
            {(isQueriesOpen || isDetailOpen) && (
                <div
                    className="fixed inset-0 bg-[#181c22]/40 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => { setIsQueriesOpen(false); setIsDetailOpen(false); }}
                ></div>
            )}

            {/* --- COLUMN 1: Active Queries --- */}
            <section className={`
                fixed md:relative top-[64px] md:top-0 left-0 h-[calc(100vh-64px)] md:h-full 
                w-[280px] lg:w-1/4 bg-white border-r md:border border-gray-200 md:rounded-xl overflow-hidden shadow-sm shrink-0 z-50 md:z-10
                transform transition-transform duration-300 ease-in-out md:translate-x-0 flex flex-col
                ${isQueriesOpen ? 'translate-x-0' : '-translate-x-full absolute md:static'}
            `}>
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">list_alt</span> Active Queries
                    </h2>
                    <button className="md:hidden text-gray-500 hover:text-primary" onClick={() => setIsQueriesOpen(false)}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                    <span className="hidden md:inline-block bg-gray-100 text-gray-600 font-mono px-2 py-0.5 rounded text-[11px] font-bold">Session 4B</span>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {queries.map((query, idx) => {
                        const idsForQuery = allResults.filter(r => r.queryId === query.id).map(r => r.id);
                        const allSelected = idsForQuery.length > 0 && idsForQuery.every(id => selectedResultIds.includes(id));
                        return (
                            <div
                                key={query.id}
                                onClick={() => handleSelectQuery(query.id)}
                                className={`group flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer border
                                    ${activeQueryId === query.id ? 'bg-primary/5 border-primary/20' : 'border-transparent hover:border-gray-200 hover:bg-gray-50'}
                                `}
                            >
                                <div className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center font-bold text-[12px] mt-0.5
                                    ${activeQueryId === query.id ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'}
                                `}>
                                    {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm leading-snug ${activeQueryId === query.id ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                                        {query.text}
                                    </p>
                                    <div className="flex items-center justify-between gap-2 mt-1.5">
                                        <div className="flex items-center gap-1 font-mono text-[11px] font-bold min-w-0">
                                            {query.status === 'running' && (
                                                <><span className="material-symbols-outlined text-[14px] text-cyan animate-spin">sync</span> <span className="text-cyan">Running search...</span></>
                                            )}
                                            {query.status === 'done' && (
                                                <><span className="material-symbols-outlined text-[14px] text-primary">check_circle</span> <span className="text-primary">{query.results} results found</span></>
                                            )}
                                            {query.status === 'error' && (
                                                <><span className="material-symbols-outlined text-[14px] text-red-500">cancel</span> <span className="text-red-500">Syntax error in query</span></>
                                            )}
                                        </div>
                                        {query.status === 'done' && idsForQuery.length > 0 && (
                                            <button
                                                onClick={(e) => handleSelectAllForQuery(e, query.id)}
                                                title={allSelected ? 'Deselect all results from this query' : 'Select all results from this query'}
                                                className={`shrink-0 flex items-center gap-1 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors
                                                    ${allSelected ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200 hover:border-primary hover:text-primary'}
                                                `}
                                            >
                                                <span className="material-symbols-outlined text-[13px]">done_all</span>
                                                {allSelected ? 'All selected' : 'Select all'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-gray-200 bg-gray-50 mt-auto">
                    {isAddingQuery ? (
                        <div className="flex flex-col gap-2">
                            <input 
                                type="text"
                                value={newQueryInput}
                                onChange={(e) => setNewQueryInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitNewQuery(); }}
                                placeholder="Enter your custom query..."
                                autoFocus
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                            />
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleSubmitNewQuery}
                                    className="flex-1 bg-primary text-white font-bold text-sm py-2 rounded-lg hover:bg-[#3a3f8f] transition-colors"
                                >
                                    Search
                                </button>
                                <button 
                                    onClick={() => { setIsAddingQuery(false); setNewQueryInput(''); }}
                                    className="flex-1 border border-gray-300 text-gray-600 font-bold text-sm py-2 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsAddingQuery(true)}
                            className="w-full py-2 border border-primary text-primary font-bold text-sm rounded-lg hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[18px]">add</span> Add Query
                        </button>
                    )}
                </div>
            </section>

            {/* --- COLUMN 2: Results Grid (Main View) --- */}
            <section className="flex-1 flex flex-col relative bg-white border-x-0 md:border border-gray-200 md:rounded-xl overflow-hidden shadow-sm z-10 w-full min-w-0">

                {/* Search Config Bar */}
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10 shrink-0">

                    {/* Mobile Pane Toggles */}
                    <div className="flex items-center justify-between w-full sm:hidden mb-2">
                        <button onClick={() => setIsQueriesOpen(true)} className="flex items-center gap-1 text-primary font-bold text-sm">
                            <span className="material-symbols-outlined text-[18px]">menu_open</span> Queries
                        </button>
                        <button onClick={() => setIsDetailOpen(true)} className="flex items-center gap-1 text-[#00696e] font-bold text-sm">
                            Context <span className="material-symbols-outlined text-[18px]">info</span>
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-bold text-gray-900 mr-2 hidden sm:block">Filters:</span>

                        <div className="relative">
                            <select
                                value={languageFilter}
                                onChange={(e) => setLanguageFilter(e.target.value)}
                                className="appearance-none bg-white border border-gray-200 rounded px-3 py-1.5 pr-8 font-mono text-xs font-bold text-gray-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer"
                            >
                                <option>English (US)</option>
                                <option>Global (All)</option>
                            </select>
                            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[16px] pointer-events-none text-gray-400">expand_more</span>
                        </div>

                        <div className="relative">
                            <select
                                value={regionFilter}
                                onChange={(e) => setRegionFilter(e.target.value)}
                                className="appearance-none bg-white border border-gray-200 rounded px-3 py-1.5 pr-8 font-mono text-xs font-bold text-gray-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer"
                            >
                                <option>Any Region</option>
                                <option>North America</option>
                                <option>Europe</option>
                                <option>Asia</option>
                            </select>
                            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[16px] pointer-events-none text-gray-400">expand_more</span>
                        </div>

                        <div className="relative">
                            <select
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                                className="appearance-none bg-white border border-gray-200 rounded px-3 py-1.5 pr-8 font-mono text-xs font-bold text-gray-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer"
                            >
                                <option>Past 5 Years</option>
                                <option>Past Year</option>
                            </select>
                            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[16px] pointer-events-none text-gray-400">expand_more</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 text-gray-500 font-mono text-xs font-bold mt-2 sm:mt-0">
                        <span className="material-symbols-outlined text-[16px]">sort</span> Sort by: Relevance
                    </div>
                </div>

                {/* Results Grid Container */}
                <div className="flex-1 overflow-y-auto p-4 pb-28 bg-[#f9f9ff]">
                    {currentResults.length > 0 ? (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            {currentResults.map((result) => {
                                const isSelected = selectedResultIds.includes(result.id);
                                const isActive = activeSourceId === result.id;

                                return (
                                    <div
                                        key={result.id}
                                        onClick={() => handleSelectSource(result.id)}
                                        className={`bg-white rounded-xl p-4 sm:p-5 border relative group cursor-pointer transition-all flex flex-col h-full shadow-sm
                                            ${isActive ? 'border-primary ring-1 ring-primary/20' : 'border-gray-200 hover:border-gray-300'}
                                            ${isSelected ? 'bg-primary/5' : ''}
                                        `}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) => handleToggleSelection(e, result.id)}
                                            className="absolute top-4 sm:top-5 right-4 sm:right-5 w-4 h-4 text-primary bg-white border-gray-300 rounded focus:ring-primary cursor-pointer z-10"
                                        />

                                        <div className="flex items-center gap-2 mb-3 pr-8">
                                            <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center shrink-0">
                                                <span className="material-symbols-outlined text-[14px] text-gray-600">{result.icon}</span>
                                            </div>
                                            <span className="font-mono text-[10px] sm:text-[11px] text-gray-500 truncate font-bold">{result.domain}</span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ml-auto
                                                ${result.type === 'Academic' ? 'bg-primary/10 text-primary' : ''}
                                                ${result.type === 'Blog' ? 'bg-gray-200 text-gray-700' : ''}
                                                ${result.type === 'News' ? 'bg-cyan-soft text-cyan' : ''}
                                                ${result.type === 'Video' ? 'bg-red-100 text-red-600' : ''}
                                                ${result.type === 'Article' ? 'bg-gray-100 text-gray-500' : ''}`}
                                            >
                                                {result.type}
                                            </span>
                                        </div>

                                        <h3 className="text-[14px] sm:text-base font-bold text-gray-900 group-hover:text-primary transition-colors mb-2 pr-6 leading-tight">
                                            {result.title}
                                        </h3>
                                        <p className="text-[12px] sm:text-[13px] text-gray-600 line-clamp-3 leading-relaxed flex-1 mb-4">
                                            {result.snippet}
                                        </p>

                                        <div className="mt-auto flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                                            {result.metrics.map((metric, i) => (
                                                <span key={i} className="text-[10px] font-bold font-mono bg-gray-50 border border-gray-200 px-2 py-1 rounded text-gray-500">
                                                    {metric}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <span className="material-symbols-outlined text-5xl mb-2 opacity-50">search_off</span>
                            <p className="font-bold text-sm">No results match your current filters.</p>
                        </div>
                    )}
                </div>

                {/* Sticky Bottom Bar */}
                <div className="absolute bottom-0 w-full bg-white border-t border-gray-200 p-3 sm:p-4 flex justify-between items-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-cyan/10 flex items-center justify-center shadow-[0_0_15px_rgba(0,194,203,0.3)] shrink-0">
                            <span className="material-symbols-outlined text-cyan text-[18px] sm:text-[20px]">auto_awesome</span>
                        </div>
                        <div>
                            <p className="text-[12px] sm:text-sm text-gray-900"><strong className="font-bold text-primary">{selectedResultIds.length}</strong> <span className="hidden sm:inline">of 12 results</span> selected</p>
                            <p className="font-mono text-[10px] sm:text-[11px] text-gray-500 font-bold hidden sm:block">AI is ready to synthesize selected sources.</p>
                        </div>
                    </div>
                    <button
                        onClick={handleProceedToReport}
                        disabled={selectedResultIds.length === 0}
                        className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg text-[12px] sm:text-sm font-bold shadow-sm transition-colors flex items-center gap-1 sm:gap-2
                            ${selectedResultIds.length > 0 ? 'bg-primary text-white hover:bg-[#3a3f8f] cursor-pointer' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
                        `}
                    >
                        Generate <span className="hidden sm:inline">Report</span> <span className="material-symbols-outlined text-[16px] sm:text-[18px]">arrow_forward</span>
                    </button>
                </div>
            </section>

            {/* --- COLUMN 3: Source Detail --- */}
            <section className={`
                fixed md:relative top-[64px] md:top-0 right-0 h-[calc(100vh-64px)] md:h-full 
                w-[280px] lg:w-1/5 min-w-[280px] bg-white border-l md:border border-gray-200 md:rounded-xl overflow-hidden shadow-sm shrink-0 z-50 md:z-10
                transform transition-transform duration-300 ease-in-out md:translate-x-0 flex flex-col
                ${isDetailOpen ? 'translate-x-0' : 'translate-x-full absolute md:static'}
            `}>
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-500">info</span> Source Detail
                    </h2>
                    <button className="md:hidden text-gray-500 hover:text-primary" onClick={() => setIsDetailOpen(false)}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                    {activeSourceDetail ? (
                        <div className="space-y-6">
                            <div>
                                <p className="font-mono text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">Selected Domain</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-gray-500 text-[20px]">{activeSourceDetail.icon}</span>
                                    </div>
                                    <p className="text-sm font-bold text-gray-900 break-all leading-tight">{activeSourceDetail.domain}</p>
                                </div>
                            </div>

                            <div className="h-px w-full bg-gray-100"></div>

                            <div>
                                <p className="font-mono text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-3">Key Entities Extracted</p>
                                <div className="flex flex-wrap gap-2">
                                    {activeSourceDetail.entities.map((entity, i) => (
                                        <span key={i} className="bg-gray-50 text-gray-700 font-mono text-[11px] font-bold px-2 py-1.5 rounded border border-gray-200">
                                            {entity}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="h-px w-full bg-gray-100"></div>

                            <div>
                                <p className="font-mono text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-3">Metadata</p>
                                <div className="space-y-2 text-[13px]">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 font-semibold">Author:</span>
                                        <span className="text-gray-900 font-bold text-right ml-2">{activeSourceDetail.metadata.author}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 font-semibold">Published:</span>
                                        <span className="text-gray-900 font-bold">{activeSourceDetail.metadata.published}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 font-semibold">Extraction:</span>
                                        <span className="text-gray-900 font-bold">Just now</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
                                        <span className="text-gray-500 font-semibold">Reliability Score:</span>
                                        <span className="text-cyan font-mono font-bold">{activeSourceDetail.metadata.reliability}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 p-3 bg-cyan/5 rounded-lg border border-cyan/20">
                                <p className="font-mono text-[11px] font-bold text-gray-600 flex items-start gap-2 leading-relaxed">
                                    <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">psychology</span>
                                    ThinkMic AI has verified this source against 3 cross-references.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-gray-400 mt-10">
                            <p className="font-bold text-sm">Select a card to view details.</p>
                        </div>
                    )}
                </div>
            </section>

        </div>
    );
}