// frontend/src/pages/Courses.jsx
import React, { useState } from 'react';

// Dynamic Mock Data
const featuredCourse = {
    id: 'featured', status: 'LIVE', tag: 'Artificial Intelligence', timeLabel: '90m',
    title: 'The Future of Generative Models in Academic Synthesis',
    desc: 'Join Dr. Aris Varga for an exclusive deep-dive into how new LLM architectures are accelerating literature reviews and cross-disciplinary hypothesis generation.',
    instructor: 'Dr. Aris Varga', instructorTitle: 'Director, Stanford AI Lab',
    avatar: 'https://i.pravatar.cc/150?u=varga',
    bgImage: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=1200',
    bullets: [
        'The shift from retrieval-augmented generation (RAG) to synthesis-first architectures.',
        'Handling citation hallucination in long-form academic writing.',
        'Case studies showing a 40% reduction in literature review times.'
    ]
};

const courseList = [
    {
        id: 1, status: 'UPCOMING', tag: 'Methodology', timeLabel: 'Tomorrow, 10:00 AM',
        title: 'Structuring Qualitative Data for AI Analysis',
        desc: 'Learn best practices for preparing interview transcripts and field notes for ingestion into specialized LLMs.',
        instructor: 'Dr. E. Chen', instructorTitle: 'Lead Qualitative Researcher',
        avatar: 'https://i.pravatar.cc/150?u=chen',
        bgImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=600',
        bullets: ['Data cleaning techniques for messy transcripts.', 'Prompt engineering for thematic extraction.', 'Bias detection in AI analysis.']
    },
    {
        id: 2, status: 'RECORDED', tag: 'Historical Studies', timeLabel: '45:20',
        title: 'Digitizing the Archives: AI in Historiography',
        desc: 'A case study on using computer vision to transcribe and categorize 18th-century mercantile records.',
        instructor: 'Prof. M. Rossi', instructorTitle: 'Professor of Digital History',
        avatar: 'https://i.pravatar.cc/150?u=rossi',
        bgImage: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=600',
        bullets: ['Setting up OCR pipelines for handwritten documents.', 'Training custom vision models on historical scripts.', 'Archival metadata structuring.']
    },
    {
        id: 3, status: 'LIVE', tag: 'Quantum Computing', timeLabel: '342 watching',
        title: 'Quantum Neural Networks: A Primer',
        desc: 'Live Q&A session discussing the theoretical limits and current practical applications of QNNs.',
        instructor: 'Dr. K. Sato', instructorTitle: 'Senior Quantum Engineer',
        avatar: 'https://i.pravatar.cc/150?u=sato',
        bgImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=600',
        bullets: ['Qubit state mapping for neural pathways.', 'Error correction in quantum environments.', 'Current hardware limitations.']
    }
];

export default function Courses() {
    const [activeFilter, setActiveFilter] = useState('All');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(featuredCourse); // Default to avoid null errors

    // FRONTEND LOGIC: Filter the array based on the selected tab
    const filteredCourses = courseList.filter((course) => {
        if (activeFilter === 'All') return true;
        return course.status === activeFilter.toUpperCase();
    });

    const openCourseDetails = (course) => {
        setSelectedCourse(course);
        setIsDrawerOpen(true);
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col pb-20 relative">

            {/* Hero Banner: Featured Live Session */}
            <section
                className="mb-8 rounded-xl overflow-hidden relative shadow-card group cursor-pointer border border-gray-100"
                onClick={() => openCourseDetails(featuredCourse)}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 z-0"></div>
                <div
                    className="absolute inset-0 bg-cover bg-center mix-blend-overlay z-0 opacity-40"
                    style={{ backgroundImage: `url('${featuredCourse.bgImage}')` }}
                ></div>

                <div className="relative z-10 p-8 lg:p-12 flex flex-col md:flex-row gap-8 justify-between items-start md:items-center">
                    <div className="max-w-2xl text-white">
                        <div className="flex items-center gap-3 mb-4">
              <span className="bg-error text-white font-bold text-[10px] px-2 py-1 rounded-sm flex items-center gap-1.5 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                Live Now
              </span>
                            <span className="font-mono text-xs text-white bg-white/20 px-2 py-1 rounded-sm border border-white/30 flex items-center">
                <span className="material-symbols-outlined text-[14px] mr-1">visibility</span>
                1,248 watching
              </span>
                        </div>

                        <h2 className="text-3xl md:text-4xl font-bold mb-3 group-hover:text-cyan transition-colors leading-tight">
                            {featuredCourse.title}
                        </h2>
                        <p className="text-white/90 text-lg mb-8 max-w-xl leading-relaxed">
                            {featuredCourse.desc}
                        </p>

                        <div className="flex flex-wrap items-center gap-6">
                            <button className="bg-cyan text-primary font-bold px-6 py-2.5 rounded-lg hover:bg-cyan/90 transition-colors flex items-center gap-2 shadow-lg">
                                <span className="material-symbols-outlined">play_arrow</span>
                                Join Broadcast
                            </button>

                            <div className="flex items-center gap-3 border-l border-white/20 pl-6">
                                <img src={featuredCourse.avatar} alt="Host" className="w-10 h-10 rounded-full border-2 border-white ring-2 ring-cyan/50" />
                                <div className="text-sm">
                                    <p className="font-bold text-white leading-tight">{featuredCourse.instructor}</p>
                                    <p className="font-mono text-xs text-white/70">Stanford AI Lab</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Filters Row */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h3 className="text-2xl font-bold text-gray-900">Course Library</h3>
                <div className="flex flex-wrap items-center gap-2">
                    {['All', 'Live', 'Upcoming', 'Recorded'].map(filter => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={`px-4 py-1.5 rounded-full text-sm font-bold border transition-colors
                ${activeFilter === filter
                                ? 'bg-primary text-white border-primary'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
            </div>

            {/* Course Grid (Now uses filteredCourses!) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map((course) => (
                    <div
                        key={course.id}
                        onClick={() => openCourseDetails(course)}
                        className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer group border flex flex-col overflow-hidden relative
              ${course.status === 'LIVE' ? 'border-cyan ring-1 ring-cyan' : 'border-gray-200'}`}
                    >
                        <div className="relative h-40 bg-gray-100">
                            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: `url('${course.bgImage}')` }}></div>
                            <div className="absolute inset-0 bg-black/20"></div>

                            <div className="absolute top-3 left-3">
                <span className={`font-bold text-[10px] px-2 py-1 rounded-sm flex items-center gap-1 uppercase tracking-wider shadow-sm backdrop-blur-md
                  ${course.status === 'LIVE' ? 'bg-error text-white' : 'bg-white text-gray-700 border border-gray-200'}`}>
                  {course.status === 'LIVE' ? <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span> : null}
                    {course.status}
                </span>
                            </div>

                            <div className="absolute bottom-3 right-3">
                <span className="bg-black/70 text-white font-mono text-xs px-2 py-1 rounded-sm backdrop-blur-sm flex items-center gap-1">
                  {course.timeLabel}
                </span>
                            </div>
                        </div>

                        <div className="p-5 flex flex-col flex-1">
                            <span className="text-cyan font-mono text-xs uppercase tracking-wider font-bold mb-2">{course.tag}</span>
                            <h4 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors leading-snug">{course.title}</h4>
                            <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1">{course.desc}</p>

                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                                <div className="flex items-center gap-2">
                                    <img src={course.avatar} alt="Host" className="w-7 h-7 rounded-full border border-gray-200" />
                                    <span className="font-bold text-xs text-gray-700">{course.instructor}</span>
                                </div>
                                <button className="text-xs font-bold px-3 py-1.5 rounded bg-gray-50 text-gray-700 border border-gray-200">
                                    {course.status === 'LIVE' ? 'Watch' : course.status === 'UPCOMING' ? 'Register' : 'Resume'}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                {filteredCourses.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-500 font-bold">No courses found for this filter.</div>
                )}
            </div>

            {/* Slide-out Drawer Overlay */}
            <div
                className={`fixed inset-0 bg-[#1E2255]/40 backdrop-blur-sm z-50 transition-opacity duration-300 ${isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsDrawerOpen(false)}
            ></div>

            {/* Slide-out Drawer Panel (Now uses selectedCourse dynamically!) */}
            <aside className={`fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200 overflow-hidden transform transition-transform duration-300 ease-in-out ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                <div className="relative h-48 bg-primary shrink-0">
                    <div className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-40" style={{ backgroundImage: `url('${selectedCourse.bgImage}')` }}></div>
                    <button
                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/40 transition-colors border border-white/20 z-10"
                        onClick={() => setIsDrawerOpen(false)}
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                    <div className="absolute bottom-4 left-4 flex gap-2">
             <span className="bg-white/90 text-primary font-bold text-[10px] px-2 py-1 rounded-sm shadow-sm flex items-center gap-1 uppercase tracking-wider">
               {selectedCourse.status}
             </span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-background">
                    <div className="mb-8">
                        <span className="text-cyan font-mono text-xs uppercase tracking-wider mb-1 block font-bold">{selectedCourse.tag}</span>
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 leading-tight">{selectedCourse.title}</h2>

                        <div className="flex items-center gap-4 py-4 border-y border-gray-200 my-4">
                            <img src={selectedCourse.avatar} alt="Host" className="w-12 h-12 rounded-full border-2 border-primary" />
                            <div>
                                <p className="font-bold text-gray-900 text-sm">{selectedCourse.instructor}</p>
                                <p className="font-mono text-xs text-gray-500">{selectedCourse.instructorTitle}</p>
                            </div>
                        </div>

                        <div className="text-sm text-gray-600 leading-relaxed">
                            <p className="mb-4">{selectedCourse.desc}</p>
                            <p className="mb-2 font-semibold text-gray-900">In this session, we will cover:</p>
                            <ul className="list-disc pl-5 mb-4 space-y-2 marker:text-cyan">
                                {selectedCourse.bullets.map((bullet, idx) => (
                                    <li key={idx}>{bullet}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-200 bg-white flex gap-3 shrink-0 shadow-[0_-4px_16px_rgba(0,0,0,0.02)]">
                    <button className="flex-1 bg-cyan text-primary font-bold text-sm py-3 rounded-lg hover:bg-cyan/90 transition-colors shadow-sm">
                        {selectedCourse.status === 'RECORDED' ? 'Watch Recording' : 'Join / Register'}
                    </button>
                    <button className="w-12 h-12 rounded-lg border border-gray-200 text-gray-500 flex items-center justify-center hover:bg-gray-50 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined">bookmark_border</span>
                    </button>
                </div>
            </aside>

        </div>
    );
}