import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";

// --- MOCK DATA ---
const initialQueries = [
    { id: 1, text: "Efficacy of transformers in low-resource language translation", status: "running", results: 0 },
    { id: 2, text: "Attention mechanisms vs RNN memory retention metrics", status: "done", results: 12 },
    { id: 3, text: "Quantum computing implications on current encryption", status: "error", results: 0 },
];

const initialResults = [
    {
        id: 1, queryId: 2, domain: "arxiv.org", type: "Academic",
        title: "Comparative Analysis of Memory Retention in Transformer Architecture vs LSTM",
        snippet: "This paper evaluates the inherent limitations of context windows in standard transformer models compared to sequential memory handling in recurrent neural networks...",
        metrics: ["Cited by 142", "PDF Available"], icon: "menu_book",
        entities: ["Transformers", "RNNs", "Semantic Drift", "LSTM"],
        metadata: { author: "A. Vaswani et al.", published: "Aug 15, 2023", reliability: "98/100" },
        region: "North America", language: "English (US)", year: 2023
    },
    {
        id: 2, queryId: 2, domain: "towardsdatascience.com", type: "Blog",
        title: "Why Transformers Are Replacing RNNs in NLP Tasks",
        snippet: "A deep dive into the computational advantages of self-attention mechanisms. While RNNs struggle with vanishing gradients on long sequences, transformers process entire contexts in parallel...",
        metrics: ["Read Time: 8 min"], icon: "article",
        entities: ["Transformers", "RNNs", "Self-Attention", "Vanishing Gradient"],
        metadata: { author: "J. Doe et al.", published: "Oct 12, 2023", reliability: "94/100" },
        region: "Europe", language: "English (US)", year: 2023
    },
    {
        id: 3, queryId: 2, domain: "techcrunch.com", type: "News",
        title: "New AI Startup Claims Hybrid Architecture Beats Standard Transformers",
        snippet: "Emerging from stealth, Synthetica AI claims their new foundational model integrates legacy RNN gating mechanisms with modern self-attention to achieve superior memory retention...",
        metrics: [], icon: "newspaper",
        entities: ["Synthetica AI", "Hybrid Architecture", "Compute Optimization"],
        metadata: { author: "M. Tech Reporter", published: "Nov 02, 2026", reliability: "82/100" },
        region: "North America", language: "English (US)", year: 2026
    },
    {
        id: 4, queryId: 2, domain: "nature.com", type: "Academic",
        title: "Evaluating Semantic Drift in Large Language Models",
        snippet: "We present a systematic study of how self-attention weights degrade over context windows exceeding 32k tokens. By comparing state-of-the-art LLMs, we map the exact points where factual hallucination...",
        metrics: ["Cited by 45", "Peer Reviewed"], icon: "school",
        entities: ["Semantic Drift", "LLMs", "Context Windows", "Hallucination"],
        metadata: { author: "Dr. K. Sato", published: "Jan 19, 2024", reliability: "99/100" },
        region: "Asia", language: "English (US)", year: 2024
    }
];

export default function ResearchResults() {
    // --- STATE MANAGEMENT ---
    const navigate = useNavigate();
    const [queries, setQueries] = useState(initialQueries);
    const [activeQueryId, setActiveQueryId] = useState(2);
    const [activeSourceId, setActiveSourceId] = useState(2);
    const [selectedResultIds, setSelectedResultIds] = useState([1, 2]);

    // --- RESPONSIVE TOGGLE STATES ---
    const [isQueriesOpen, setIsQueriesOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // Filter States
    const [languageFilter, setLanguageFilter] = useState('English (US)');
    const [regionFilter, setRegionFilter] = useState('Any Region');
    const [dateFilter, setDateFilter] = useState('Past 5 Years');

    // --- HANDLERS ---
    const handleAddQuery = () => {
        const newQueryText = window.prompt("Enter your new research query:");
        if (newQueryText && newQueryText.trim() !== "") {
            const newId = Date.now();
            setQueries(prev => [
                ...prev,
                { id: newId, text: newQueryText, status: "running", results: 0 }
            ]);
            setActiveQueryId(newId);
            if (window.innerWidth < 768) setIsQueriesOpen(false); // Close drawer on mobile
        }
    };

    const handleSelectQuery = (id) => {
        setActiveQueryId(id);
        if (window.innerWidth < 768) setIsQueriesOpen(false); // Close drawer on mobile
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

    // --- FILTER LOGIC ---
    const currentResults = initialResults.filter(result => {
        if (result.queryId !== activeQueryId) return false;
        if (regionFilter !== 'Any Region' && result.region !== regionFilter) return false;
        const currentYear = 2026;
        if (dateFilter === 'Past Year' && result.year < currentYear - 1) return false;
        if (dateFilter === 'Past 5 Years' && result.year < currentYear - 5) return false;
        return true;
    });

    const activeSourceDetail = initialResults.find(r => r.id === activeSourceId);

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
                    {queries.map((query, idx) => (
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
                            <div className="flex-1">
                                <p className={`text-sm leading-snug ${activeQueryId === query.id ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                                    {query.text}
                                </p>
                                <div className="flex items-center gap-1 mt-1.5 font-mono text-[11px] font-bold">
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
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t border-gray-200 bg-gray-50 mt-auto">
                    <button
                        onClick={handleAddQuery}
                        className="w-full py-2 border border-primary text-primary font-bold text-sm rounded-lg hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span> Add Query
                    </button>
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
                                                ${result.type === 'News' ? 'bg-cyan-soft text-cyan' : ''}`}
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
                        onClick={() => navigate('/app/reports/preview')}
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