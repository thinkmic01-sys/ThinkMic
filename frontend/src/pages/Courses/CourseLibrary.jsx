import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../../services/api';

// Safe placeholder shape so the drawer can render before any real seminar has been
// selected - avoids null-checks on every selectedCourse.* reference below.
const emptyCourse = { id: null, status: '', tag: '', time: '', title: '', desc: '', host: '', hostTitle: '', hostImage: '', img: '', bullets: [] };

export default function CourseLibrary() {
    const navigate = useNavigate();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState('All');
    const [searchInput, setSearchInput] = useState('');
    const [selectedCourse, setSelectedCourse] = useState(emptyCourse);
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const [courses, setCourses] = useState([]);
    const [myRegistrations, setMyRegistrations] = useState([]);
    // Without this, the pre-fetch state and a genuinely-empty seminar list looked identical -
    // both just showed the "no courses found" fallback with no way to tell them apart.
    const [isLoading, setIsLoading] = useState(true);
    const token = useSelector(state => state.auth?.accessToken);
    const user = useSelector(state => state.auth?.user);

    React.useEffect(() => {
        const fetchSeminars = async () => {
            try {
                const response = await api.get('/seminars');
                const seminarsData = response.data;

                try {
                    const regResponse = await api.get('/seminars/registrations');
                    const regData = regResponse.data;
                    setMyRegistrations(regData.map(r => r.seminarId));
                } catch (e) {}

                // Map seminars to match the Course card format
                const mappedSeminars = seminarsData.map(s => ({
                    id: s._id,
                    status: s.status === 'live' ? 'LIVE' : s.status === 'scheduled' ? 'UPCOMING' : s.status === 'draft' ? 'DRAFT' : 'RECORDED',
                    tag: s.category || 'Seminar',
                    time: s.startTime ? `${s.startTime} - ${s.endTime}` : 'TBA',
                    title: s.title,
                    desc: s.abstract || 'No description provided.',
                    host: s.hostName || 'Guest Speaker',
                    hostTitle: 'Host',
                    hostImage: s.hostImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.hostName || 'Guest Speaker')}&background=0D8ABC&color=fff&rounded=true&bold=true`,
                    img: s.imageUrl || 'https://images.unsplash.com/photo-1540317580384-e5d43616b9aa?auto=format&fit=crop&q=80&w=600',
                    bullets: s.tags || [],
                    type: 'seminar',
                    location: s.location,
                    hostId: s.hostId
                }));

                setCourses(mappedSeminars);
            } catch (error) {
                console.error("Failed to fetch seminars", error);
                setCourses([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSeminars();
    }, [token]);

    // A seminar is "mine" if the user hosts it or registered for it - used by the
    // "My Seminars" filter so a user can see how many seminars they're actually part of.
    const isMine = (course) => (user && course.hostId === user.id) || myRegistrations.includes(course.id);
    const myCount = courses.filter(isMine).length;

    // Featured hero slot now shows whichever seminar is actually live, if any - no
    // hardcoded placeholder when nothing is live.
    const featuredLive = courses.find((c) => c.status === 'LIVE') || null;

    // Filter Logic
    const searchQuery = searchInput.trim().toLowerCase();
    const filteredCourses = courses.filter(course => {
        if (searchQuery && !course.title?.toLowerCase().includes(searchQuery) && !course.desc?.toLowerCase().includes(searchQuery)) return false;
        if (activeFilter === 'Mine') return isMine(course);
        if (activeFilter !== 'All' && course.status !== activeFilter.toUpperCase()) return false;
        return true;
    });

    const handleCourseClick = async (course) => {
        setSelectedCourse(course);
        setIsDrawerOpen(true);

        // Recorded seminars need their playback URL + summary, which aren't in the
        // lightweight list payload - fetch the full detail only when actually opened.
        if (course.type === 'seminar' && course.status === 'RECORDED') {
            try {
                const res = await api.get(`/seminars/${course.id}`);
                setSelectedCourse(prev => (prev.id === course.id ? {
                    ...prev,
                    playbackUrl: res.data.recordingId?.playbackUrl || null,
                    summaryText: res.data.summaryId?.summaryText || null
                } : prev));
            } catch (err) {
                console.error('Failed to load seminar recording/summary', err);
            }
        }
    };

    const closeDrawer = () => {
        setIsDrawerOpen(false);
    };

    const handleRegister = async (e, courseId) => {
        e.stopPropagation();
        try {
            const response = await api.post(`/seminars/${courseId}/register`);
            setMyRegistrations(prev => [...prev, courseId]);
            showToast('Successfully registered for seminar!');
        } catch (err) {
            const data = err.response?.data || {};
            showToast(data.message || 'An error occurred during registration.', 'error');
        }
    };

    const renderButton = (course) => {
        const isHost = user && course.hostId === user.id;
        const isRegistered = myRegistrations.includes(course.id);

        // Only offer broadcast controls to the host while it's actually startable/live -
        // once it's completed there's nothing to start, so fall through to the normal
        // recorded-view button everyone (including the host) sees below.
        if (isHost && (course.status === 'UPCOMING' || course.status === 'DRAFT')) {
            return (
                <button onClick={(e) => { e.stopPropagation(); navigate(`/app/courses/broadcast/${course.id}`); }} className="w-full sm:w-auto justify-center font-bold text-[12px] px-3 sm:px-4 py-1.5 sm:py-2 rounded flex items-center gap-1 transition-colors bg-[#854d0e] text-white hover:bg-[#EAB308]">
                    <span className="material-symbols-outlined text-[14px] sm:text-[16px]">podcasts</span>
                    Start Broadcast
                </button>
            );
        }

        if (isHost && course.status === 'LIVE') {
            return (
                <button onClick={(e) => { e.stopPropagation(); navigate(`/app/courses/broadcast/${course.id}`); }} className="w-full sm:w-auto justify-center font-bold text-[12px] px-3 sm:px-4 py-1.5 sm:py-2 rounded flex items-center gap-1 transition-colors bg-[#ba1a1a] text-white hover:bg-[#93000a]">
                    <span className="material-symbols-outlined text-[14px] sm:text-[16px]">podcasts</span>
                    Manage Broadcast
                </button>
            );
        }

        if (course.status === 'LIVE' || course.status === 'LIVE NOW') {
            return (
                <button onClick={(e) => { e.stopPropagation(); }} className="w-full sm:w-auto justify-center font-bold text-[12px] px-3 sm:px-4 py-1.5 sm:py-2 rounded flex items-center gap-1 transition-colors bg-[#CA8A04] text-[#002022] hover:bg-[#EAB308]">
                    Join Broadcast
                </button>
            );
        }

        if (course.status === 'RECORDED') {
            return (
                <button onClick={(e) => { e.stopPropagation(); }} className="w-full sm:w-auto justify-center font-bold text-[12px] px-3 sm:px-4 py-1.5 sm:py-2 rounded flex items-center gap-1 transition-colors bg-[#f1f3fc] text-[#075e51] border border-[#c7c5d3] hover:bg-[#e0e2eb]">
                    <span className="material-symbols-outlined text-[14px] sm:text-[16px]">play_arrow</span> {isHost ? 'View Recording' : 'Resume'}
                </button>
            );
        }

        if (isRegistered) {
            return (
                <button onClick={(e) => { e.stopPropagation(); }} className="w-full sm:w-auto justify-center font-bold text-[12px] px-3 sm:px-4 py-1.5 sm:py-2 rounded flex items-center gap-1 transition-colors bg-white text-[#854d0e] border border-[#EAB308] cursor-default">
                    <span className="material-symbols-outlined text-[14px] sm:text-[16px]">check_circle</span> Registered
                </button>
            );
        }

        return (
            <button onClick={(e) => handleRegister(e, course.id)} className="w-full sm:w-auto justify-center font-bold text-[12px] px-3 sm:px-4 py-1.5 sm:py-2 rounded flex items-center gap-1 transition-colors bg-[#075e51] text-white hover:bg-[#097969]">
                Register
            </button>
        );
    };

    return (
        <div className="w-full h-[calc(100vh-64px)] bg-[#F4F9F8] overflow-y-auto relative font-sans custom-scrollbar">

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #c7c5d3; border-radius: 10px; }
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            <div className="w-full p-4 sm:p-6 md:p-8 pb-20">

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-5 sm:mb-6 border-b border-[#e0e2eb] pb-4 gap-4">
                    <div className="w-full sm:w-auto">
                        <h1 className="text-[24px] sm:text-[28px] md:text-[32px] font-bold text-[#075e51] leading-tight tracking-tight">Seminar Library</h1>
                        <p className="text-[13px] sm:text-[14px] md:text-[15px] text-[#464651] mt-1">Discover live seminars, recorded lectures, and interactive modules.</p>
                    </div>
                    <div className="flex gap-2 sm:gap-3 w-full sm:w-auto overflow-x-auto hide-scrollbar shrink-0">
                        <button
                            onClick={() => navigate('/app/projects/create-seminar')}
                            className="bg-[#075e51] text-white px-4 py-2.5 sm:py-2 rounded-lg font-bold text-[13px] hover:bg-[#097969] transition-colors flex items-center justify-center gap-2 shadow-sm shrink-0 whitespace-nowrap"
                        >
                            <span className="material-symbols-outlined text-[18px]">event</span> Create Seminar
                        </button>
                        <button
                            onClick={() => navigate('/app/courses/seminars')}
                            className="bg-[#FEF9C3] text-[#854d0e] border border-[#EAB308]/50 px-4 py-2.5 sm:py-2 rounded-lg font-bold text-[13px] hover:bg-[#EAB308]/20 transition-colors flex items-center justify-center gap-2 shadow-sm shrink-0 whitespace-nowrap"
                        >
                            <span className="material-symbols-outlined text-[18px]">location_on</span> Nearby Seminars
                        </button>
                    </div>
                </div>

                {/* Hero Banner: whichever seminar is actually live right now, if any */}
                {featuredLive && (
                    <section
                        className="mb-6 sm:mb-8 rounded-xl overflow-hidden relative shadow-[0_4px_16px_rgba(58,63,143,0.08)] group cursor-pointer border border-[#075e51]"
                        onClick={() => handleCourseClick(featuredLive)}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br md:bg-gradient-to-r from-[#075e51] to-[#097969] opacity-95 z-0"></div>
                        <div className="absolute inset-0 bg-cover bg-center mix-blend-overlay z-0 opacity-30 transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: `url('${featuredLive.img}')` }}></div>

                        <div className="relative z-10 p-5 sm:p-8 lg:p-12 flex flex-col md:flex-row gap-6 sm:gap-8 justify-between items-start md:items-center">
                            <div className="w-full max-w-2xl text-white">
                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                                    <span className="bg-[#ba1a1a] text-white font-bold text-[9px] sm:text-[10px] px-2 py-1 rounded-sm flex items-center gap-1.5 uppercase tracking-wider shadow-sm">
                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span> LIVE NOW
                                    </span>
                                </div>
                                <h2 className="text-[24px] sm:text-[32px] md:text-[40px] font-bold mb-2 sm:mb-3 text-white group-hover:text-[#EAB308] transition-colors leading-tight">
                                    {featuredLive.title}
                                </h2>
                                <p className="text-[#bfc2ff] text-[14px] sm:text-[16px] mb-6 sm:mb-8 max-w-xl leading-relaxed line-clamp-3 sm:line-clamp-none">
                                    {featuredLive.desc}
                                </p>

                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                                    <button className="w-full sm:w-auto justify-center bg-[#CA8A04] text-[#002022] font-bold px-6 py-3 sm:py-2.5 rounded-lg hover:bg-[#EAB308] transition-colors flex items-center gap-2 shadow-sm">
                                        <span className="material-symbols-outlined">play_arrow</span> Join Broadcast
                                    </button>
                                    <div className="flex items-center gap-3">
                                        <img src={featuredLive.hostImage} alt="Host" className="w-10 h-10 rounded-full border-2 border-[#097969]" />
                                        <div className="text-sm">
                                            <p className="font-bold text-white leading-tight">{featuredLive.host}</p>
                                            <p className="font-mono text-[10px] sm:text-[11px] text-[#bfc2ff]">{featuredLive.hostTitle}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Filters Row */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 sm:mb-6 gap-3 sm:gap-4">
                    <div className="flex items-center w-full min-w-0">
                        <div className="flex gap-2 sm:gap-4 overflow-x-auto hide-scrollbar">
                            {['All', 'Mine', 'Live', 'Upcoming', 'Recorded', 'Draft'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveFilter(tab)}
                                    className={`px-4 sm:px-5 py-1.5 rounded-full text-[12px] sm:text-[13px] font-bold whitespace-nowrap transition-colors ${activeFilter === tab ? 'bg-[#075e51] text-white shadow-sm' : 'bg-transparent text-[#464651] border border-[#c7c5d3] hover:border-[#075e51] hover:text-[#075e51]'}`}
                                >
                                    {tab === 'Draft' ? 'Drafts' : tab === 'Mine' ? `My Seminars (${myCount})` : tab}
                                </button>
                            ))}
                        </div>
                        <div className="h-6 w-px bg-[#c7c5d3] mx-2 hidden sm:block shrink-0"></div>
                        <button className="text-[#464651] hover:text-[#075e51] flex items-center gap-1 font-bold text-[12px] sm:text-[13px] p-2 rounded-lg hover:bg-[#ebeef6] transition-colors shrink-0 ml-auto sm:ml-0">
                            <span className="material-symbols-outlined text-[16px] sm:text-[18px]">tune</span> <span className="hidden sm:inline">Filters</span>
                        </button>
                    </div>
                    <div className="relative w-full md:w-64 shrink-0">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#777682] text-[18px]">search</span>
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search seminars by name..."
                            className="w-full border border-[#c7c5d3] rounded-md py-2 pl-9 pr-3 text-[13px] sm:text-[14px] outline-none focus:border-[#075e51] focus:ring-1 focus:ring-[#075e51]"
                        />
                    </div>
                </div>

                {/* Loading State */}
                {isLoading && (
                    <div className="flex items-center justify-center py-16">
                        <span className="material-symbols-outlined animate-spin text-[32px] text-[#075e51]">sync</span>
                    </div>
                )}

                {/* Grid Layout for Courses */}
                {!isLoading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {filteredCourses.map((course) => (
                        <div key={course.id} onClick={() => handleCourseClick(course)} className={`bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border overflow-hidden flex flex-col hover:shadow-md transition-shadow cursor-pointer group ${course.status === 'LIVE' ? 'border-[#EAB308] ring-1 ring-[#EAB308]/50' : 'border-[#e0e2eb]'}`}>
                            <div className="relative h-36 sm:h-40 bg-[#ebeef6]">
                                <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: `url('${course.img}')` }}></div>
                                <div className="absolute inset-0 bg-black/10"></div>
                                <div className="absolute top-3 left-3">
                                    {course.status === 'LIVE' ? (
                                        <span className="bg-[#ba1a1a] text-white font-bold text-[9px] sm:text-[10px] px-2 py-1 rounded-sm flex items-center gap-1 shadow-sm uppercase tracking-wider">
                                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span> {course.status}
                                        </span>
                                    ) : (
                                        <span className="bg-white text-[#075e51] font-bold text-[9px] sm:text-[10px] px-2 py-1 rounded-sm border border-[#e0e2eb] flex items-center gap-1 shadow-sm uppercase tracking-wider">
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
                                    <button className="text-[#c7c5d3] hover:text-[#075e51] transition-colors"><span className="material-symbols-outlined text-[18px] sm:text-[20px]">bookmark_border</span></button>
                                </div>
                                <h4 className="text-[16px] sm:text-[18px] font-bold text-[#181c22] mb-1.5 sm:mb-2 group-hover:text-[#075e51] transition-colors leading-snug">{course.title}</h4>
                                <p className="text-[13px] sm:text-[14px] text-[#464651] line-clamp-2 mb-4 flex-1">{course.desc}</p>
                                <div className="p-4 sm:p-5 pt-0 mt-auto">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <img src={course.hostImage || 'https://i.pravatar.cc/150?u=default'} alt="Host" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-[#c7c5d3] object-cover" />
                                        <span className="font-bold text-[12px] sm:text-[13px] text-[#181c22]">{course.host}</span>
                                    </div>
                                </div>
                                {renderButton(course)}
                            </div>
                        </div>
                    ))}

                    {/* Empty State Fallback */}
                    {filteredCourses.length === 0 && (
                        <div className="col-span-full py-12 text-center text-[#464651] font-bold text-[13px] sm:text-sm">
                            {searchQuery ? `No seminars match "${searchInput}".` : `No courses found for the "${activeFilter}" filter.`}
                        </div>
                    )}
                </div>
                )}
            </div>

            {/* Slide-out Drawer Overlay */}
            <div className={`fixed inset-0 bg-[#181c22]/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={closeDrawer}></div>

            {/* Slide-out Drawer Panel */}
            <aside className={`fixed top-0 right-0 h-full w-full sm:w-[480px] md:w-[540px] bg-white shadow-2xl z-50 flex flex-col border-l border-[#c7c5d3] overflow-hidden transform transition-transform duration-300 ease-in-out ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* Header Image Area */}
                <div className="relative h-48 sm:h-56 bg-[#075e51] shrink-0">
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
                        <img src={selectedCourse.hostImage || 'https://i.pravatar.cc/150?u=default'} alt="Host" className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-[#e0e2eb] object-cover shrink-0" />
                        <div>
                            <p className="font-bold text-[#181c22] text-[14px] sm:text-[15px]">{selectedCourse.host}</p>
                            <p className="font-mono text-[11px] sm:text-[12px] text-[#464651] mt-0.5">{selectedCourse.hostTitle}</p>
                        </div>
                    </div>

                    <hr className="border-[#e0e2eb] mb-5 sm:mb-6" />

                    <div className="text-[14px] sm:text-[16px] text-[#464651] leading-[1.6] sm:leading-[1.7] mb-6 sm:mb-8">
                        <p className="mb-5 sm:mb-6">{selectedCourse.desc}</p>

                        {selectedCourse.status === 'RECORDED' ? (
                            <>
                                {selectedCourse.playbackUrl && (
                                    <div className="mb-5 sm:mb-6">
                                        <p className="mb-2 sm:mb-3 font-bold text-[#181c22]">Recording</p>
                                        <audio controls className="w-full" src={selectedCourse.playbackUrl}>
                                            Your browser does not support the audio element.
                                        </audio>
                                    </div>
                                )}
                                <p className="mb-2 sm:mb-3 font-bold text-[#181c22]">Summary</p>
                                {selectedCourse.summaryText ? (
                                    <p className="whitespace-pre-line">{selectedCourse.summaryText}</p>
                                ) : (
                                    <p className="text-[#c7c5d3] italic">Summary is still being generated...</p>
                                )}
                            </>
                        ) : (
                            <>
                                <p className="mb-2 sm:mb-3 font-bold text-[#181c22]">In this seminar, we will cover:</p>
                                <ul className="list-disc pl-5 space-y-1.5 sm:space-y-2 marker:text-[#464651]">
                                    {selectedCourse.bullets.map((bullet, idx) => (
                                        <li key={idx}>{bullet}</li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>

                    {/* Completion Rewards Box */}
                    <div className="bg-[#F4F9F8] rounded-xl p-4 sm:p-5 border border-[#e0e2eb] mb-6">
                        <h4 className="font-bold text-[13px] sm:text-[14px] text-[#181c22] mb-2 sm:mb-3 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[18px] sm:text-[20px] text-[#EAB308]" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                            Completion Rewards
                        </h4>
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#FEF9C3] border border-[#CA8A04] w-fit">
                                <span className="material-symbols-outlined text-[#854d0e] text-[14px] sm:text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>generating_tokens</span>
                                <span className="font-bold text-[11px] sm:text-[12px] text-[#854d0e]">+500 Tokens</span>
                            </div>
                            <span className="font-mono text-[11px] sm:text-[12px] text-[#464651]">Awarded upon completion.</span>
                        </div>
                    </div>
                </div>

                {/* EXACT Sticky Footer */}
                <div className="p-4 sm:p-6 border-t border-[#e0e2eb] bg-white flex gap-2 sm:gap-3 shrink-0 items-center">
                    {(() => {
                        const isHost = user && selectedCourse.hostId === user.id;
                        const isRegistered = myRegistrations.includes(selectedCourse.id);

                        let btnText = 'Watch Recording';
                        let icon = 'play_circle';
                        let btnStyle = 'bg-[#f1f3fc] text-[#075e51] border-[#c7c5d3] hover:bg-[#e0e2eb]';
                        let onClick = (e) => e.stopPropagation();

                        if (isHost && (selectedCourse.status === 'UPCOMING' || selectedCourse.status === 'DRAFT')) {
                            btnText = 'Start Broadcast';
                            icon = 'podcasts';
                            btnStyle = 'bg-[#854d0e] text-white border-[#854d0e] hover:bg-[#EAB308]';
                            onClick = (e) => { e.stopPropagation(); navigate(`/app/courses/broadcast/${selectedCourse.id}`); };
                        } else if (isHost && selectedCourse.status === 'LIVE') {
                            btnText = 'Manage Broadcast';
                            icon = 'podcasts';
                            btnStyle = 'bg-[#ba1a1a] text-white border-[#ba1a1a] hover:bg-[#93000a]';
                            onClick = (e) => { e.stopPropagation(); navigate(`/app/courses/broadcast/${selectedCourse.id}`); };
                        } else if (selectedCourse.status === 'LIVE' || selectedCourse.status === 'LIVE NOW') {
                            btnText = 'Join Broadcast';
                            icon = 'play_arrow';
                            btnStyle = 'bg-[#CA8A04] text-[#002022] border-[#00696e] hover:bg-[#EAB308]';
                        } else if (selectedCourse.status === 'RECORDED') {
                            if (selectedCourse.playbackUrl) {
                                btnText = 'Download Audio';
                                icon = 'download';
                                onClick = (e) => { e.stopPropagation(); window.open(selectedCourse.playbackUrl, '_blank'); };
                            } else {
                                btnText = 'No Recording Available';
                                icon = 'block';
                                btnStyle = 'bg-[#f1f3fc] text-[#c7c5d3] border-[#e0e2eb] cursor-default';
                            }
                        } else if (selectedCourse.status === 'UPCOMING') {
                            if (isRegistered) {
                                btnText = 'Registered';
                                icon = 'check_circle';
                                btnStyle = 'bg-white text-[#854d0e] border-[#EAB308] cursor-default';
                            } else {
                                btnText = 'Register for Seminar';
                                icon = 'event_available';
                                btnStyle = 'bg-[#075e51] text-white border-[#075e51] hover:bg-[#097969]';
                                onClick = (e) => handleRegister(e, selectedCourse.id);
                            }
                        }

                        return (
                            <button onClick={onClick} className={`flex-1 font-bold text-[13px] sm:text-[15px] py-2.5 sm:py-3 rounded-lg transition-colors flex items-center justify-center gap-1 sm:gap-2 shadow-sm border ${btnStyle}`}>
                                <span className="material-symbols-outlined text-[18px] sm:text-[20px]">{icon}</span>
                                {btnText}
                            </button>
                        );
                    })()}

                    <button className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border border-[#c7c5d3] text-[#464651] flex items-center justify-center hover:bg-[#f1f3fc] hover:text-[#075e51] transition-colors shrink-0">
                        <span className="material-symbols-outlined text-[18px] sm:text-[20px]">bookmark_border</span>
                    </button>

                    <button className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border border-[#c7c5d3] text-[#464651] flex items-center justify-center hover:bg-[#f1f3fc] hover:text-[#075e51] transition-colors shrink-0">
                        <span className="material-symbols-outlined text-[18px] sm:text-[20px]">share</span>
                    </button>
                </div>
            </aside>

            {/* Custom Toast Notification */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-[60] animate-fade-in-up">
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border ${toast.type === 'error' ? 'bg-[#ba1a1a] text-white border-[#93000a]' : 'bg-[#075e51] text-white border-[#070963]'}`}>
                        <span className="material-symbols-outlined">
                            {toast.type === 'error' ? 'error' : 'check_circle'}
                        </span>
                        <span className="font-bold text-sm">{toast.message}</span>
                    </div>
                </div>
            )}
        </div>
    );
}