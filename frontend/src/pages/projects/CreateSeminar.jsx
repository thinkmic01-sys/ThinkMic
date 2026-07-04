// frontend/src/pages/projects/CreateSeminar.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CreateSeminar() {
    const navigate = useNavigate();

    // --- FORM STATE ---
    const [title, setTitle] = useState('');
    const [abstract, setAbstract] = useState('');
    const [category, setCategory] = useState('Machine Learning');
    const [tags, setTags] = useState('');
    const [date, setDate] = useState('2023-11-15');
    const [startTime, setStartTime] = useState('14:00');
    const [endTime, setEndTime] = useState('15:30');
    const [format, setFormat] = useState('Live Broadcast');

    const formatOptions = [
        { id: 'Live Broadcast', icon: 'sensors' },
        { id: 'Pre-Recorded', icon: 'videocam' },
        { id: 'In-Person', icon: 'location_on' }
    ];

    const handleSchedule = () => {
        if (!title) return alert("Please enter a seminar title.");
        alert(`Seminar "${title}" scheduled successfully for ${date}!`);
        navigate('/app/projects');
    };

    return (
        <div className="w-full min-h-[calc(100vh-64px)] bg-[#f9f9ff] overflow-y-auto">
            <div className="max-w-[1280px] mx-auto p-6 md:p-8 flex flex-col gap-6 pb-20">

                {/* Page Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-[#e0e2eb] pb-6">
                    <div>
                        <h1 className="text-[32px] font-bold text-[#222777] tracking-tight mb-2">Create a Seminar</h1>
                        <p className="text-[15px] text-[#464651]">Schedule a new academic session or lecture for the community.</p>
                    </div>
                    <div className="flex items-center gap-3 mt-4 md:mt-0">
                        <button className="px-5 py-2 border border-[#c7c5d3] rounded-md font-bold text-[13px] text-[#181c22] hover:bg-[#f1f3fc] transition-colors bg-white">
                            Save Draft
                        </button>
                        <button className="px-5 py-2 border border-[#c7c5d3] rounded-md font-bold text-[13px] text-[#181c22] hover:bg-[#f1f3fc] transition-colors flex items-center gap-2 bg-white">
                            <span className="material-symbols-outlined text-[18px]">visibility</span> Preview
                        </button>
                        <button
                            onClick={handleSchedule}
                            className="px-6 py-2 bg-[#222777] rounded-md font-bold text-[13px] text-white hover:bg-[#3a3f8f] transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <span className="material-symbols-outlined text-[18px]">event</span> Schedule Seminar
                        </button>
                    </div>
                </div>

                {/* Main Content Split */}
                <div className="flex flex-col lg:flex-row gap-8 items-start mt-2">

                    {/* LEFT COLUMN: The Form */}
                    <div className="flex-1 w-full space-y-6">

                        {/* Step 1: Basic Information */}
                        <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb] p-6 md:p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-8 h-8 rounded-full bg-[#eef0f9] text-[#222777] font-bold flex items-center justify-center text-[14px]">1</div>
                                <h2 className="text-[20px] font-bold text-[#222777]">Basic Information</h2>
                            </div>

                            <div className="space-y-5 border-t border-[#e0e2eb] pt-6">
                                <div>
                                    <label className="block text-[12px] font-bold text-[#464651] mb-2 uppercase tracking-wider">
                                        Seminar Title <span className="text-[#ba1a1a]">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g., Advanced Neural Architecture Search"
                                        className="w-full border border-[#c7c5d3] rounded-md p-3 text-[15px] text-[#181c22] bg-white focus:border-[#222777] focus:ring-1 focus:ring-[#222777] outline-none transition-shadow"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[12px] font-bold text-[#464651] mb-2 uppercase tracking-wider">
                                        Abstract / Description
                                    </label>
                                    <textarea
                                        value={abstract}
                                        onChange={(e) => setAbstract(e.target.value)}
                                        placeholder="Briefly describe the key topics..."
                                        className="w-full h-32 border border-[#c7c5d3] rounded-md p-3 text-[15px] text-[#181c22] bg-white focus:border-[#222777] focus:ring-1 focus:ring-[#222777] outline-none resize-none transition-shadow"
                                    />
                                </div>
                                <div className="flex flex-col md:flex-row gap-5">
                                    <div className="flex-1">
                                        <label className="block text-[12px] font-bold text-[#464651] mb-2 uppercase tracking-wider">Category</label>
                                        <div className="relative">
                                            <select
                                                value={category}
                                                onChange={(e) => setCategory(e.target.value)}
                                                className="w-full appearance-none border border-[#c7c5d3] rounded-md p-3 pr-10 text-[15px] text-[#181c22] bg-white focus:border-[#222777] focus:ring-1 focus:ring-[#222777] outline-none cursor-pointer"
                                            >
                                                <option>Machine Learning</option>
                                                <option>Quantum Computing</option>
                                                <option>Bioinformatics</option>
                                                <option>Ethics in AI</option>
                                            </select>
                                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#777682] pointer-events-none">expand_more</span>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-[12px] font-bold text-[#464651] mb-2 uppercase tracking-wider">Tags</label>
                                        <input
                                            type="text"
                                            value={tags}
                                            onChange={(e) => setTags(e.target.value)}
                                            placeholder="Add tags separated by commas"
                                            className="w-full border border-[#c7c5d3] rounded-md p-3 text-[15px] text-[#181c22] bg-white focus:border-[#222777] focus:ring-1 focus:ring-[#222777] outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Step 2: Scheduling */}
                        <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb] p-6 md:p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-8 h-8 rounded-full bg-[#eef0f9] text-[#222777] font-bold flex items-center justify-center text-[14px]">2</div>
                                <h2 className="text-[20px] font-bold text-[#222777]">Scheduling</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 border-t border-[#e0e2eb] pt-6">
                                <div>
                                    <label className="block text-[12px] font-bold text-[#464651] mb-2 uppercase tracking-wider">Date</label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#c7c5d3]">calendar_today</span>
                                        <input
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="w-full border border-[#c7c5d3] rounded-md py-3 pl-10 pr-3 text-[15px] font-mono text-[#181c22] bg-white focus:border-[#222777] outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[12px] font-bold text-[#464651] mb-2 uppercase tracking-wider">Start Time</label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#c7c5d3]">schedule</span>
                                        <input
                                            type="time"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            className="w-full border border-[#c7c5d3] rounded-md py-3 pl-10 pr-3 text-[15px] font-mono text-[#181c22] bg-white focus:border-[#222777] outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[12px] font-bold text-[#464651] mb-2 uppercase tracking-wider">End Time</label>
                                    <input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="w-full border border-[#c7c5d3] rounded-md p-3 text-[15px] font-mono text-[#181c22] bg-white focus:border-[#222777] outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Step 3: Format & Location */}
                        <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb] p-6 md:p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-8 h-8 rounded-full bg-[#eef0f9] text-[#222777] font-bold flex items-center justify-center text-[14px]">3</div>
                                <h2 className="text-[20px] font-bold text-[#222777]">Format & Location</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-[#e0e2eb] pt-6">
                                {formatOptions.map((opt) => (
                                    <div
                                        key={opt.id}
                                        onClick={() => setFormat(opt.id)}
                                        className={`border rounded-lg p-5 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all
                                            ${format === opt.id
                                            ? 'border-2 border-[#00c2cb] bg-[#e6fbfc] text-[#006e73]'
                                            : 'border-[#c7c5d3] bg-white text-[#777682] hover:border-[#222777] hover:text-[#222777]'
                                        }`}
                                    >
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${format === opt.id ? 'bg-[#00c2cb]/20' : 'bg-[#f1f3fc]'}`}>
                                            <span className="material-symbols-outlined text-[24px]">{opt.icon}</span>
                                        </div>
                                        <span className={`text-[13px] font-bold ${format === opt.id ? 'text-[#006e73]' : 'text-[#181c22]'}`}>{opt.id}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* RIGHT COLUMN: Live Preview */}
                    <div className="w-full lg:w-[380px] shrink-0 sticky top-6 space-y-6">
                        <h3 className="font-mono text-[12px] font-bold text-[#777682] uppercase tracking-wider mb-2">Live Preview</h3>

                        {/* Preview Card */}
                        <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(58,63,143,0.1)] border border-[#e0e2eb] overflow-hidden">
                            {/* Card Image Area */}
                            <div className="h-40 bg-[#181c22] relative flex items-center justify-center">
                                {/* Abstract pattern or icon */}
                                <span className="material-symbols-outlined text-[64px] text-white/10">biotech</span>

                                {format === 'Live Broadcast' && (
                                    <div className="absolute top-3 right-3 bg-[#00696e] text-[#6bf6ff] text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded flex items-center gap-1 border border-[#00c2cb]">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#6bf6ff] animate-pulse"></span> LIVE
                                    </div>
                                )}
                            </div>

                            {/* Card Content Area */}
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="bg-[#f1f3fc] text-[#3a3f8f] font-mono text-[11px] font-bold px-2 py-1 rounded">
                                        {category || 'Uncategorized'}
                                    </span>
                                    <span className="flex items-center gap-1 text-[12px] font-mono font-bold text-[#777682]">
                                        <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                        {date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Date TBD'}
                                    </span>
                                </div>

                                <h3 className="text-[20px] font-bold text-[#181c22] leading-tight mb-2">
                                    {title || 'Advanced Neural Architecture Search'}
                                </h3>
                                <p className="text-[14px] text-[#777682] line-clamp-2 leading-relaxed mb-6">
                                    {abstract || 'Briefly describe the key topics covered in this seminar...'}
                                </p>

                                <div className="flex items-center justify-between border-t border-[#e0e2eb] pt-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-[#222777] text-white flex items-center justify-center text-[10px] font-bold">TM</div>
                                        <span className="text-[13px] font-semibold text-[#464651]">Dr. A. Turing</span>
                                    </div>
                                    <div className="bg-[#e6fbfc] text-[#006e73] px-2 py-1 rounded-full flex items-center gap-1 border border-[#6bf6ff]/50">
                                        <span className="material-symbols-outlined text-[14px]">toll</span>
                                        <span className="text-[12px] font-bold">+50</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Pro Tip Box */}
                        <div className="bg-[#f9f9ff] border-l-4 border-[#00c2cb] p-4 rounded-r-lg shadow-sm border-y border-r border-[#e0e2eb]">
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-[#00c2cb]">lightbulb</span>
                                <div>
                                    <h4 className="text-[13px] font-bold text-[#181c22] mb-1">Pro Tip</h4>
                                    <p className="text-[12px] text-[#777682] leading-relaxed">
                                        Live seminars automatically record and add themselves to the course library after completion. Ensure your title is search-friendly.
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}