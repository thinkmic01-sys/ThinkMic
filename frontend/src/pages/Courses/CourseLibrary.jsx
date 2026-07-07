import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// --- MOCK DATA ---
const featuredCourse = {
    id: 'featured',
    status: 'LIVE NOW',
    tag: 'Artificial Intelligence',
    time: '90m',
    title: 'The Future of Generative Models in Academic Synthesis',
    desc: 'Join Dr. Aris Varga for an exclusive deep-dive into how new LLM architectures are accelerating literature reviews and cross-disciplinary hypothesis generation.',
    host: 'Dr. Aris Varga',
    hostTitle: 'Director, Stanford AI Lab',
    img: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=1200',
    bullets: [
        'The shift from retrieval-augmented generation (RAG) to synthesis-first architectures.',
        'Handling citation hallucination in long-form academic writing.',
        'Case studies showing a 40% reduction in literature review times.'
    ]
};

const mockCourses = [
    {
        id: 1, status: 'UPCOMING', tag: 'Methodology', time: 'Tomorrow, 10:00 AM',
        title: 'Structuring Qualitative Data for AI Analysis',
        desc: 'Learn best practices for preparing interview transcripts and field notes for ingestion into specialized LLMs.',
        host: 'Dr. E. Chen', hostTitle: 'Lead Qualitative Researcher',
        img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=600',
        bullets: ['Data cleaning techniques for messy transcripts.', 'Prompt engineering for thematic extraction.', 'Bias detection in AI analysis.']
    },
    {
        id: 2, status: 'RECORDED', tag: 'Historical Studies', time: '45:20',
        title: 'Digitizing the Archives: AI in Historiography',
        desc: 'A case study on using computer vision to transcribe and categorize 18th-century mercantile records.',
        host: 'Prof. M. Rossi', hostTitle: 'Professor of Digital History',
        img: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=600',
        bullets: ['Setting up OCR pipelines for handwritten documents.', 'Training custom vision models on historical scripts.', 'Archival metadata structuring.']
    },
    {
        id: 3, status: 'LIVE', tag: 'Quantum Computing', time: '342 watching',
        title: 'Quantum Neural Networks: A Primer',
        desc: 'Live Q&A session discussing the theoretical limits and current practical applications of QNNs.',
        host: 'Dr. K. Sato', hostTitle: 'Senior Quantum Engineer',
        img: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=600',
        bullets: ['Qubit state mapping for neural pathways.', 'Error correction in quantum environments.', 'Current hardware limitations.']
    }
];

export default function CourseLibrary() {
    const navigate = useNavigate();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState('All');
    const [selectedCourse, setSelectedCourse] = useState(featuredCourse);

    // Filter Logic
    const filteredCourses = mockCourses.filter(course => {
        if (activeFilter === 'All') return true;
        return course.status === activeFilter.toUpperCase();
    });

    const handleCourseClick = (course) => {
        setSelectedCourse(course);
        setIsDrawerOpen(true);
    };

    const closeDrawer = () => {
        setIsDrawerOpen(false);
    };

    return (
        <div className="w-full h-[calc(100vh-64px)] bg-[#f9f9ff] overflow-y-auto relative font-sans custom-scrollbar">

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #c7c5d3; border-radius: 10px; }
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            <div className="max-w-[1280px] mx-auto p-4 sm:p-6 md:p-8 pb-20">

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-5 sm:mb-6 border-b border-[#e0e2eb] pb-4 gap-4">
                    <div className="w-full sm:w-auto">
                        <h1 className="text-[24px] sm:text-[28px] md:text-[32px] font-bold text-[#222777] leading-tight tracking-tight">Course Library</h1>
                        <p className="text-[13px] sm:text-[14px] md:text-[15px] text-[#464651] mt-1">Discover live seminars, recorded lectures, and interactive modules.</p>
                    </div>
                    <button
                        onClick={() => navigate('/app/courses/my-learning')}
                        className="w-full sm:w-auto bg-[#f1f3fc] text-[#222777] border border-[#c7c5d3] px-4 py-2.5 sm:py-2 rounded-lg font-bold text-[13px] hover:bg-[#e0e2eb] transition-colors flex items-center justify-center gap-2 shadow-sm shrink-0"
                    >
                        <span className="material-symbols-outlined text-[18px]">bookmark</span> My Learning List
                    </button>
                </div>

                {/* Hero Banner: Featured Live Session */}
                <section
                    className="mb-6 sm:mb-8 rounded-xl overflow-hidden relative shadow-[0_4px_16px_rgba(58,63,143,0.08)] group cursor-pointer border border-[#222777]"
                    onClick={() => handleCourseClick(featuredCourse)}
                >
                    <div className="absolute inset-0 bg-gradient-to-br md:bg-gradient-to-r from-[#222777] to-[#3a3f8f] opacity-95 z-0"></div>
                    <div className="absolute inset-0 bg-cover bg-center mix-blend-overlay z-0 opacity-30 transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: `url('${featuredCourse.img}')` }}></div>

                    <div className="relative z-10 p-5 sm:p-8 lg:p-12 flex flex-col md:flex-row gap-6 sm:gap-8 justify-between items-start md:items-center">
                        <div className="w-full max-w-2xl text-white">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                                <span className="bg-[#ba1a1a] text-white font-bold text-[9px] sm:text-[10px] px-2 py-1 rounded-sm flex items-center gap-1.5 uppercase tracking-wider shadow-sm">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span> LIVE NOW
                                </span>
                                <span className="font-mono text-[10px] sm:text-xs text-[#bfc2ff] bg-[#070963]/30 px-2 py-1 rounded-sm border border-[#bfc2ff]/30 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px] sm:text-[14px]">visibility</span> 1,248 watching
                                </span>
                            </div>
                            <h2 className="text-[24px] sm:text-[32px] md:text-[40px] font-bold mb-2 sm:mb-3 text-white group-hover:text-[#6bf6ff] transition-colors leading-tight">
                                {featuredCourse.title}
                            </h2>
                            <p className="text-[#bfc2ff] text-[14px] sm:text-[16px] mb-6 sm:mb-8 max-w-xl leading-relaxed line-clamp-3 sm:line-clamp-none">
                                {featuredCourse.desc}
                            </p>

                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                                <button className="w-full sm:w-auto justify-center bg-[#61f4fd] text-[#002022] font-bold px-6 py-3 sm:py-2.5 rounded-lg hover:bg-[#6bf6ff] transition-colors flex items-center gap-2 shadow-sm">
                                    <span className="material-symbols-outlined">play_arrow</span> Join Broadcast
                                </button>
                                <div className="flex items-center gap-3">
                                    <img src="https://i.pravatar.cc/150?u=varga" alt="Host" className="w-10 h-10 rounded-full border-2 border-[#3a3f8f]" />
                                    <div className="text-sm">
                                        <p className="font-bold text-white leading-tight">{featuredCourse.host}</p>
                                        <p className="font-mono text-[10px] sm:text-[11px] text-[#bfc2ff]">{featuredCourse.hostTitle}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Filters Row */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 sm:mb-6 gap-3 sm:gap-4">
                    <div className="flex items-center w-full min-w-0">
                        <div className="flex overflow-x-auto hide-scrollbar flex-1 -mx-4 px-4 sm:mx-0 sm:px-0 gap-2 items-center pb-1 sm:pb-0">
                            {['All', 'Live', 'Upcoming', 'Recorded'].map(filter => (
                                <button
                                    key={filter}
                                    onClick={() => setActiveFilter(filter)}
                                    className={`px-3 sm:px-4 py-1.5 rounded-full text-[12px] sm:text-[13px] font-bold border transition-colors shrink-0 whitespace-nowrap
                                        ${activeFilter === filter ? 'bg-[#3a3f8f] text-white border-[#3a3f8f]' : 'bg-white text-[#464651] border-[#c7c5d3] hover:bg-[#f1f3fc]'}`}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>
                        <div className="h-6 w-px bg-[#c7c5d3] mx-2 hidden sm:block shrink-0"></div>
                        <button className="text-[#464651] hover:text-[#222777] flex items-center gap-1 font-bold text-[12px] sm:text-[13px] p-2 rounded-lg hover:bg-[#ebeef6] transition-colors shrink-0 ml-auto sm:ml-0">
                            <span className="material-symbols-outlined text-[16px] sm:text-[18px]">tune</span> <span className="hidden sm:inline">Filters</span>
                        </button>
                    </div>
                </div>

                {/* Grid Layout for Courses */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {filteredCourses.map((course) => (
                        <div key={course.id} onClick={() => handleCourseClick(course)} className={`bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border overflow-hidden flex flex-col hover:shadow-md transition-shadow cursor-pointer group ${course.status === 'LIVE' ? 'border-[#00c2cb] ring-1 ring-[#00c2cb]/50' : 'border-[#e0e2eb]'}`}>
                            <div className="relative h-36 sm:h-40 bg-[#ebeef6]">
                                <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: `url('${course.img}')` }}></div>
                                <div className="absolute inset-0 bg-black/10"></div>
                                <div className="absolute top-3 left-3">
                                    {course.status === 'LIVE' ? (
                                        <span className="bg-[#ba1a1a] text-white font-bold text-[9px] sm:text-[10px] px-2 py-1 rounded-sm flex items-center gap-1 shadow-sm uppercase tracking-wider">
                                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span> {course.status}
                                        </span>
                                    ) : (
                                        <span className="bg-white text-[#222777] font-bold text-[9px] sm:text-[10px] px-2 py-1 rounded-sm border border-[#e0e2eb] flex items-center gap-1 shadow-sm uppercase tracking-wider">
                                            <span className="material-symbols-outlined text-[12px] sm:text-[14px]">
                                                {course.status === 'UPCOMING' ? 'event' : 'movie'}
                                            </span> {course.status}
                                        </span>
                                    )}
                                </div>
                                <div className="absolute bottom-3 right-3">
                                    <span className="bg-[#181c22]/80 text-white font-mono text-[10px] sm:text-[11px] px-2 py-1 rounded-sm backdrop-blur-sm flex items-center gap-1">
                                        {course.status === 'LIVE' && <span className="material-symbols-outlined text-[12px] sm:text-[14px]">group</span>}
                                        {course.time}
                                    </span>
                                </div>
                            </div>
                            <div className="p-4 sm:p-5 flex flex-col flex-1">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[#00696e] font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">{course.tag}</span>
                                    <button className="text-[#c7c5d3] hover:text-[#222777] transition-colors"><span className="material-symbols-outlined text-[18px] sm:text-[20px]">bookmark_border</span></button>
                                </div>
                                <h4 className="text-[16px] sm:text-[18px] font-bold text-[#181c22] mb-1.5 sm:mb-2 group-hover:text-[#222777] transition-colors leading-snug">{course.title}</h4>
                                <p className="text-[13px] sm:text-[14px] text-[#464651] line-clamp-2 mb-4 flex-1">{course.desc}</p>
                                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between mt-auto pt-3 sm:pt-4 border-t border-[#e0e2eb] gap-3 sm:gap-0">
                                    <div className="flex items-center gap-2">
                                        <img src={course.host === 'Dr. E. Chen' ? 'https://i.pravatar.cc/150?u=chen' : course.host === 'Dr. K. Sato' ? 'https://i.pravatar.cc/150?u=sato' : 'https://i.pravatar.cc/150?u=rossi'} alt="Host" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-[#c7c5d3]" />
                                        <span className="font-bold text-[12px] sm:text-[13px] text-[#181c22]">{course.host}</span>
                                    </div>
                                    <button className={`w-full sm:w-auto justify-center font-bold text-[12px] px-3 sm:px-4 py-1.5 sm:py-2 rounded flex items-center gap-1 transition-colors ${course.status === 'LIVE' ? 'bg-[#61f4fd] text-[#002022] hover:bg-[#6bf6ff]' : course.status === 'UPCOMING' ? 'bg-[#222777] text-white hover:bg-[#3a3f8f]' : 'bg-[#f1f3fc] text-[#222777] border border-[#c7c5d3] hover:bg-[#e0e2eb]'}`}>
                                        {course.status === 'RECORDED' && <span className="material-symbols-outlined text-[14px] sm:text-[16px]">play_arrow</span>}
                                        {course.status === 'LIVE' ? 'Watch' : course.status === 'UPCOMING' ? 'Register' : 'Resume'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Empty State Fallback */}
                    {filteredCourses.length === 0 && (
                        <div className="col-span-full py-12 text-center text-[#464651] font-bold text-[13px] sm:text-sm">
                            No courses found for the "{activeFilter}" filter.
                        </div>
                    )}
                </div>
            </div>

            {/* Slide-out Drawer Overlay */}
            <div className={`fixed inset-0 bg-[#181c22]/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={closeDrawer}></div>

            {/* Slide-out Drawer Panel */}
            <aside className={`fixed top-0 right-0 h-full w-full sm:w-[480px] md:w-[540px] bg-white shadow-2xl z-50 flex flex-col border-l border-[#c7c5d3] overflow-hidden transform transition-transform duration-300 ease-in-out ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* Header Image Area */}
                <div className="relative h-48 sm:h-56 bg-[#222777] shrink-0">
                    <div className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-60" style={{ backgroundImage: `url('${selectedCourse.img}')` }}></div>

                    <button className="absolute top-4 right-4 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#181c22]/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-[#181c22]/60 transition-colors border border-white/20" onClick={closeDrawer}>
                        <span className="material-symbols-outlined text-[18px] sm:text-[20px]">close</span>
                    </button>

                    {(selectedCourse.status === 'LIVE' || selectedCourse.status === 'LIVE NOW') && (
                        <div className="absolute bottom-4 left-4 sm:left-6 flex gap-2">
                            <span className="bg-[#ba1a1a] text-white font-bold text-[10px] sm:text-[11px] px-2 sm:px-2.5 py-1 rounded shadow-sm flex items-center gap-1.5 tracking-wider">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span> LIVE NOW
                            </span>
                        </div>
                    )}
                </div>

                {/* Scrollable Body Area */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 md:px-8 md:py-8 bg-white">
                    <span className="text-[#00696e] font-mono text-[11px] sm:text-[12px] font-bold uppercase tracking-widest mb-2 block">
                        {selectedCourse.tag}
                    </span>

                    <h2 className="text-[22px] sm:text-[28px] font-bold text-[#181c22] mb-5 sm:mb-6 leading-tight">
                        {selectedCourse.title}
                    </h2>

                    <hr className="border-[#e0e2eb]" />

                    <div className="flex items-center gap-3 sm:gap-4 py-4 sm:py-5">
                        <img src={selectedCourse.host === 'Dr. E. Chen' ? 'https://i.pravatar.cc/150?u=chen' : selectedCourse.host === 'Dr. K. Sato' ? 'https://i.pravatar.cc/150?u=sato' : selectedCourse.host === 'Prof. M. Rossi' ? 'https://i.pravatar.cc/150?u=rossi' : 'https://i.pravatar.cc/150?u=varga'} alt="Host" className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-[#e0e2eb] object-cover shrink-0" />
                        <div>
                            <p className="font-bold text-[#181c22] text-[14px] sm:text-[15px]">{selectedCourse.host}</p>
                            <p className="font-mono text-[11px] sm:text-[12px] text-[#464651] mt-0.5">{selectedCourse.hostTitle}</p>
                        </div>
                    </div>

                    <hr className="border-[#e0e2eb] mb-5 sm:mb-6" />

                    <div className="text-[14px] sm:text-[16px] text-[#464651] leading-[1.6] sm:leading-[1.7] mb-6 sm:mb-8">
                        <p className="mb-5 sm:mb-6">{selectedCourse.desc}</p>

                        <p className="mb-2 sm:mb-3 font-bold text-[#181c22]">In this seminar, we will cover:</p>
                        <ul className="list-disc pl-5 space-y-1.5 sm:space-y-2 marker:text-[#464651]">
                            {selectedCourse.bullets.map((bullet, idx) => (
                                <li key={idx}>{bullet}</li>
                            ))}
                        </ul>
                    </div>

                    {/* Completion Rewards Box */}
                    <div className="bg-[#f9f9ff] rounded-xl p-4 sm:p-5 border border-[#e0e2eb] mb-6">
                        <h4 className="font-bold text-[13px] sm:text-[14px] text-[#181c22] mb-2 sm:mb-3 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[18px] sm:text-[20px] text-[#00c2cb]" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                            Completion Rewards
                        </h4>
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#e6fbfc] border border-[#61f4fd] w-fit">
                                <span className="material-symbols-outlined text-[#006e73] text-[14px] sm:text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>generating_tokens</span>
                                <span className="font-bold text-[11px] sm:text-[12px] text-[#006e73]">+500 Tokens</span>
                            </div>
                            <span className="font-mono text-[11px] sm:text-[12px] text-[#464651]">Awarded upon completion.</span>
                        </div>
                    </div>
                </div>

                {/* EXACT Sticky Footer */}
                <div className="p-4 sm:p-6 border-t border-[#e0e2eb] bg-white flex gap-2 sm:gap-3 shrink-0 items-center">
                    <button className="flex-1 bg-[#61f4fd] text-[#002022] font-bold text-[13px] sm:text-[15px] py-2.5 sm:py-3 rounded-lg hover:bg-[#6bf6ff] transition-colors flex items-center justify-center gap-1 sm:gap-2 shadow-sm border border-[#00696e]">
                        <span className="material-symbols-outlined text-[18px] sm:text-[20px]">
                            {selectedCourse.status === 'LIVE' || selectedCourse.status === 'LIVE NOW' ? 'play_arrow' : selectedCourse.status === 'UPCOMING' ? 'event_available' : 'play_circle'}
                        </span>
                        {selectedCourse.status === 'LIVE' || selectedCourse.status === 'LIVE NOW' ? 'Join Broadcast' : selectedCourse.status === 'UPCOMING' ? 'Register' : 'Watch Recording'}
                    </button>

                    <button className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border border-[#c7c5d3] text-[#464651] flex items-center justify-center hover:bg-[#f1f3fc] hover:text-[#222777] transition-colors shrink-0">
                        <span className="material-symbols-outlined text-[18px] sm:text-[20px]">bookmark_border</span>
                    </button>

                    <button className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border border-[#c7c5d3] text-[#464651] flex items-center justify-center hover:bg-[#f1f3fc] hover:text-[#222777] transition-colors shrink-0">
                        <span className="material-symbols-outlined text-[18px] sm:text-[20px]">share</span>
                    </button>
                </div>
            </aside>
        </div>
    );
}