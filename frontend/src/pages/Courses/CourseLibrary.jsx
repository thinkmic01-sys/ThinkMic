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
        <div className="w-full h-[calc(100vh-64px)] bg-[#f9f9ff] overflow-y-auto relative">
            <div className="max-w-[1280px] mx-auto p-4 md:p-8 pb-20">

                {/* Header */}
                <div className="flex justify-between items-end mb-6 border-b border-[#e0e2eb] pb-4">
                    <div>
                        <h1 className="text-[32px] font-bold text-[#222777]">Course Library</h1>
                        <p className="text-[15px] text-[#464651]">Discover live seminars, recorded lectures, and interactive modules.</p>
                    </div>
                    <button
                        onClick={() => navigate('/app/courses/my-learning')}
                        className="bg-[#f1f3fc] text-[#222777] border border-[#c7c5d3] px-4 py-2 rounded-lg font-bold text-[13px] hover:bg-[#e0e2eb] transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <span className="material-symbols-outlined text-[18px]">bookmark</span> My Learning List
                    </button>
                </div>

                {/* Hero Banner: Featured Live Session */}
                <section
                    className="mb-8 rounded-xl overflow-hidden relative shadow-[0_4px_16px_rgba(58,63,143,0.08)] group cursor-pointer border border-[#222777]"
                    onClick={() => handleCourseClick(featuredCourse)}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#222777] to-[#3a3f8f] opacity-95 z-0"></div>
                    <div className="absolute inset-0 bg-cover bg-center mix-blend-overlay z-0 opacity-30" style={{ backgroundImage: `url('${featuredCourse.img}')` }}></div>

                    <div className="relative z-10 p-8 lg:p-12 flex flex-col md:flex-row gap-8 justify-between items-start md:items-center">
                        <div className="max-w-2xl text-white">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="bg-[#ba1a1a] text-white font-bold text-[10px] px-2 py-1 rounded-sm flex items-center gap-1.5 uppercase tracking-wider shadow-sm">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span> LIVE NOW
                                </span>
                                <span className="font-mono text-xs text-[#bfc2ff] bg-[#070963]/30 px-2 py-1 rounded-sm border border-[#bfc2ff]/30 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">visibility</span> 1,248 watching
                                </span>
                            </div>
                            <h2 className="text-[32px] md:text-[40px] font-bold mb-3 text-white group-hover:text-[#6bf6ff] transition-colors leading-tight">
                                {featuredCourse.title}
                            </h2>
                            <p className="text-[#bfc2ff] text-[16px] mb-8 max-w-xl leading-relaxed">
                                {featuredCourse.desc}
                            </p>
                            <div className="flex flex-wrap items-center gap-6">
                                <button className="bg-[#61f4fd] text-[#002022] font-bold px-6 py-2.5 rounded-lg hover:bg-[#6bf6ff] transition-colors flex items-center gap-2 shadow-sm">
                                    <span className="material-symbols-outlined">play_arrow</span> Join Broadcast
                                </button>
                                <div className="flex items-center gap-3">
                                    <img src="https://i.pravatar.cc/150?u=varga" alt="Host" className="w-10 h-10 rounded-full border-2 border-[#3a3f8f]" />
                                    <div className="text-sm">
                                        <p className="font-bold text-white leading-tight">{featuredCourse.host}</p>
                                        <p className="font-mono text-[11px] text-[#bfc2ff]">{featuredCourse.hostTitle}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Filters Row */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                        {['All', 'Live', 'Upcoming', 'Recorded'].map(filter => (
                            <button
                                key={filter}
                                onClick={() => setActiveFilter(filter)}
                                className={`px-4 py-1.5 rounded-full text-[13px] font-bold border transition-colors
                                    ${activeFilter === filter ? 'bg-[#3a3f8f] text-white border-[#3a3f8f]' : 'bg-white text-[#464651] border-[#c7c5d3] hover:bg-[#f1f3fc]'}`}
                            >
                                {filter}
                            </button>
                        ))}
                        <div className="h-6 w-px bg-[#c7c5d3] mx-2 hidden sm:block"></div>
                        <button className="text-[#464651] hover:text-[#222777] flex items-center gap-1 font-bold text-[13px] p-2 rounded-lg hover:bg-[#ebeef6] transition-colors">
                            <span className="material-symbols-outlined text-[18px]">tune</span> Filters
                        </button>
                    </div>
                </div>

                {/* Grid Layout for Courses */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCourses.map((course) => (
                        <div key={course.id} onClick={() => handleCourseClick(course)} className={`bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border overflow-hidden flex flex-col hover:shadow-md transition-shadow cursor-pointer group ${course.status === 'LIVE' ? 'border-[#00c2cb] ring-1 ring-[#00c2cb]/50' : 'border-[#e0e2eb]'}`}>
                            <div className="relative h-40 bg-[#ebeef6]">
                                <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: `url('${course.img}')` }}></div>
                                <div className="absolute inset-0 bg-black/10"></div>
                                <div className="absolute top-3 left-3">
                                    {course.status === 'LIVE' ? (
                                        <span className="bg-[#ba1a1a] text-white font-bold text-[10px] px-2 py-1 rounded-sm flex items-center gap-1 shadow-sm uppercase tracking-wider">
                                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span> {course.status}
                                        </span>
                                    ) : (
                                        <span className="bg-white text-[#222777] font-bold text-[10px] px-2 py-1 rounded-sm border border-[#e0e2eb] flex items-center gap-1 shadow-sm uppercase tracking-wider">
                                            <span className="material-symbols-outlined text-[14px]">
                                                {course.status === 'UPCOMING' ? 'event' : 'movie'}
                                            </span> {course.status}
                                        </span>
                                    )}
                                </div>
                                <div className="absolute bottom-3 right-3">
                                    <span className="bg-[#181c22]/80 text-white font-mono text-[11px] px-2 py-1 rounded-sm backdrop-blur-sm flex items-center gap-1">
                                        {course.status === 'LIVE' && <span className="material-symbols-outlined text-[14px]">group</span>}
                                        {course.time}
                                    </span>
                                </div>
                            </div>
                            <div className="p-5 flex flex-col flex-1">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[#00696e] font-mono text-[11px] font-bold uppercase tracking-wider">{course.tag}</span>
                                    <button className="text-[#c7c5d3] hover:text-[#222777] transition-colors"><span className="material-symbols-outlined text-[20px]">bookmark_border</span></button>
                                </div>
                                <h4 className="text-[18px] font-bold text-[#181c22] mb-2 group-hover:text-[#222777] transition-colors leading-snug">{course.title}</h4>
                                <p className="text-[14px] text-[#464651] line-clamp-2 mb-4 flex-1">{course.desc}</p>
                                <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#e0e2eb]">
                                    <div className="flex items-center gap-2">
                                        <img src={course.host === 'Dr. E. Chen' ? 'https://i.pravatar.cc/150?u=chen' : course.host === 'Dr. K. Sato' ? 'https://i.pravatar.cc/150?u=sato' : 'https://i.pravatar.cc/150?u=rossi'} alt="Host" className="w-8 h-8 rounded-full border border-[#c7c5d3]" />
                                        <span className="font-bold text-[13px] text-[#181c22]">{course.host}</span>
                                    </div>
                                    <button className={`font-bold text-[12px] px-4 py-1.5 rounded flex items-center gap-1 transition-colors ${course.status === 'LIVE' ? 'bg-[#61f4fd] text-[#002022] hover:bg-[#6bf6ff]' : course.status === 'UPCOMING' ? 'bg-[#222777] text-white hover:bg-[#3a3f8f]' : 'bg-[#f1f3fc] text-[#222777] border border-[#c7c5d3] hover:bg-[#e0e2eb]'}`}>
                                        {course.status === 'RECORDED' && <span className="material-symbols-outlined text-[16px]">play_arrow</span>}
                                        {course.status === 'LIVE' ? 'Watch' : course.status === 'UPCOMING' ? 'Register' : 'Resume'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Empty State Fallback */}
                    {filteredCourses.length === 0 && (
                        <div className="col-span-full py-12 text-center text-[#464651] font-bold">
                            No courses found for the "{activeFilter}" filter.
                        </div>
                    )}
                </div>
            </div>

            {/* Slide-out Drawer Overlay */}
            <div className={`fixed inset-0 bg-[#181c22]/60 backdrop-blur-sm z-30 transition-opacity duration-300 ${isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={closeDrawer}></div>

            {/* Slide-out Drawer Panel */}
            <aside className={`fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white shadow-2xl z-40 flex flex-col border-l border-[#c7c5d3] overflow-hidden transform transition-transform duration-300 ease-in-out ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* Header Image Area */}
                <div className="relative h-56 bg-[#222777] shrink-0">
                    <div className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-60" style={{ backgroundImage: `url('${selectedCourse.img}')` }}></div>

                    <button className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[#181c22]/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-[#181c22]/60 transition-colors border border-white/20" onClick={closeDrawer}>
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>

                    {(selectedCourse.status === 'LIVE' || selectedCourse.status === 'LIVE NOW') && (
                        <div className="absolute bottom-4 left-6 flex gap-2">
                            <span className="bg-[#ba1a1a] text-white font-bold text-[11px] px-2.5 py-1 rounded shadow-sm flex items-center gap-1.5 tracking-wider">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span> LIVE NOW
                            </span>
                        </div>
                    )}
                </div>

                {/* Scrollable Body Area */}
                <div className="flex-1 overflow-y-auto p-6 md:px-8 md:py-8 bg-white">
                    <span className="text-[#00696e] font-mono text-[12px] font-bold uppercase tracking-widest mb-2 block">
                        {selectedCourse.tag}
                    </span>

                    <h2 className="text-[28px] font-bold text-[#181c22] mb-6 leading-[1.2]">
                        {selectedCourse.title}
                    </h2>

                    <hr className="border-[#e0e2eb]" />

                    <div className="flex items-center gap-4 py-5">
                        <img src={selectedCourse.host === 'Dr. E. Chen' ? 'https://i.pravatar.cc/150?u=chen' : selectedCourse.host === 'Dr. K. Sato' ? 'https://i.pravatar.cc/150?u=sato' : selectedCourse.host === 'Prof. M. Rossi' ? 'https://i.pravatar.cc/150?u=rossi' : 'https://i.pravatar.cc/150?u=varga'} alt="Host" className="w-14 h-14 rounded-full border-2 border-[#e0e2eb] object-cover" />
                        <div>
                            <p className="font-bold text-[#181c22] text-[15px]">{selectedCourse.host}</p>
                            <p className="font-mono text-[12px] text-[#464651] mt-0.5">{selectedCourse.hostTitle}</p>
                        </div>
                    </div>

                    <hr className="border-[#e0e2eb] mb-6" />

                    <div className="text-[16px] text-[#464651] leading-[1.7] mb-8">
                        <p className="mb-6">{selectedCourse.desc}</p>

                        <p className="mb-3 font-bold text-[#181c22]">In this seminar, we will cover:</p>
                        <ul className="list-disc pl-5 space-y-2 marker:text-[#464651]">
                            {selectedCourse.bullets.map((bullet, idx) => (
                                <li key={idx}>{bullet}</li>
                            ))}
                        </ul>
                    </div>

                    {/* Completion Rewards Box */}
                    <div className="bg-[#f9f9ff] rounded-xl p-5 border border-[#e0e2eb] mb-6">
                        <h4 className="font-bold text-[14px] text-[#181c22] mb-3 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[20px] text-[#00c2cb]" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                            Completion Rewards
                        </h4>
                        <div className="flex gap-3 items-center">
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#e6fbfc] border border-[#61f4fd]">
                                <span className="material-symbols-outlined text-[#006e73] text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>generating_tokens</span>
                                <span className="font-bold text-[12px] text-[#006e73]">+500 Tokens</span>
                            </div>
                            <span className="font-mono text-[12px] text-[#464651]">Awarded upon completion.</span>
                        </div>
                    </div>
                </div>

                {/* EXACT Sticky Footer matching HTML Design */}
                <div className="p-6 border-t border-[#e0e2eb] bg-white flex gap-3 shrink-0 items-center">
                    <button className="flex-1 bg-[#61f4fd] text-[#002022] font-bold text-[15px] py-3 rounded-lg hover:bg-[#6bf6ff] transition-colors flex items-center justify-center gap-2 shadow-sm border border-[#00696e]">
                        <span className="material-symbols-outlined text-[20px]">
                            {selectedCourse.status === 'LIVE' || selectedCourse.status === 'LIVE NOW' ? 'play_arrow' : selectedCourse.status === 'UPCOMING' ? 'event_available' : 'play_circle'}
                        </span>
                        {selectedCourse.status === 'LIVE' || selectedCourse.status === 'LIVE NOW' ? 'Join Broadcast' : selectedCourse.status === 'UPCOMING' ? 'Register' : 'Watch Recording'}
                    </button>

                    <button className="w-12 h-12 rounded-lg border border-[#c7c5d3] text-[#464651] flex items-center justify-center hover:bg-[#f1f3fc] hover:text-[#222777] transition-colors shrink-0">
                        <span className="material-symbols-outlined text-[20px]">bookmark_border</span>
                    </button>

                    <button className="w-12 h-12 rounded-lg border border-[#c7c5d3] text-[#464651] flex items-center justify-center hover:bg-[#f1f3fc] hover:text-[#222777] transition-colors shrink-0">
                        <span className="material-symbols-outlined text-[20px]">share</span>
                    </button>
                </div>
            </aside>
        </div>
    );
}