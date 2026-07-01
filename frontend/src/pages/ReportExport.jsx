// frontend/src/pages/ReportExport.jsx
import React, { useState } from 'react';

export default function ReportExport() {
    // State to manage the live preview updates
    const [title, setTitle] = useState("Market Analysis: Q4 AI Adoption Trends");
    const [subtitle, setSubtitle] = useState("Prepared by ThinkMic AI");
    const [sections, setSections] = useState({
        execSummary: true,
        findings: true,
        transcripts: false,
        sources: true,
    });
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

    const toggleSection = (section) => {
        setSections((prev) => ({ ...prev, [section]: !prev[section] }));
    };

    return (
        <div className="flex flex-col h-full w-full">
            {/* Header */}
            <div className="mb-8 px-4 flex justify-between items-end">
                <div>
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                        <span className="hover:text-primary transition-colors cursor-pointer">Research</span>
                        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                        <span className="hover:text-primary transition-colors cursor-pointer">Projects</span>
                        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                        <span className="text-gray-900 font-medium">Preview</span>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900">Report Export</h2>
                </div>
                <div className="flex items-center gap-2 text-gray-500 font-mono text-sm">
                    <span className="material-symbols-outlined text-[18px]">history</span>
                    Generated 2 min ago
                </div>
            </div>

            {/* Split Layout */}
            <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0">

                {/* Left Panel: Live Preview (65%) */}
                <div className="lg:w-[65%] flex flex-col h-[calc(100vh-180px)] bg-gray-50 rounded-xl border border-gray-200 shadow-inner p-4 relative overflow-hidden">
                    <div className="flex justify-between items-center mb-4 z-10 relative">
                        <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Preview</span>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 font-semibold">Template:</span>
                            <select className="bg-white border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 focus:ring-1 focus:ring-primary focus:border-primary outline-none">
                                <option>Standard Academic</option>
                                <option>Executive Brief</option>
                                <option>Data Dense</option>
                            </select>
                        </div>
                    </div>

                    {/* Report Canvas */}
                    <div className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm overflow-y-auto p-10 relative">

                        {/* Cover */}
                        <div className="text-center py-12 border-b border-gray-200 mb-8">
                            <h1 className="text-4xl font-bold text-primary mb-4 leading-tight">{title}</h1>
                            <p className="text-lg text-gray-600 mb-8">A comprehensive study of enterprise integration patterns.</p>
                            <div className="font-mono text-sm text-gray-500">{subtitle}</div>
                            <div className="font-mono text-xs text-gray-400 mt-2">October 24, 2026</div>
                        </div>

                        {/* Conditional Sections based on State */}
                        {sections.execSummary && (
                            <div className="mb-8">
                                <h3 className="text-2xl font-bold text-gray-900 border-b-2 border-gray-100 pb-2 mb-4">Executive Summary</h3>
                                <p className="text-base text-gray-600 leading-relaxed mb-4">This report synthesizes findings from 45 enterprise interviews regarding their Q4 AI adoption strategies. The data reveals a significant shift from exploratory pilot programs to operational integration, particularly in customer service and internal knowledge management workflows.</p>
                                <div className="bg-cyan-soft/30 rounded-lg p-4 border-l-4 border-cyan">
                                    <span className="text-xs text-cyan font-bold uppercase block mb-1">Key Insight</span>
                                    <p className="text-sm text-gray-800 italic">"Enterprises are prioritizing data privacy and security compliance over raw capability in their latest vendor selection cycles."</p>
                                </div>
                            </div>
                        )}

                        {sections.findings && (
                            <div className="mb-8">
                                <h3 className="text-2xl font-bold text-gray-900 border-b-2 border-gray-100 pb-2 mb-4">Research Findings</h3>
                                <p className="text-base text-gray-600 leading-relaxed mb-4">Analysis of the transcribed data indicates three primary vectors of adoption:</p>
                                <ul className="list-disc pl-6 text-base text-gray-600 space-y-2 mb-4 marker:text-primary">
                                    <li><strong>Workflow Automation:</strong> 68% of respondents cite this as their immediate ROI driver.</li>
                                    <li><strong>Predictive Analytics:</strong> A growing interest (up 22% quarter-over-quarter) in leveraging historical data.</li>
                                    <li><strong>Creative Augmentation:</strong> Slower adoption, primarily localized to marketing departments.</li>
                                </ul>
                            </div>
                        )}

                        {sections.transcripts && (
                            <div className="mb-8 opacity-70">
                                <h3 className="text-2xl font-bold text-gray-900 border-b-2 border-gray-100 pb-2 mb-4">Full Transcripts</h3>
                                <p className="text-sm text-gray-500 italic">[Transcript data hidden for brevity in preview mode]</p>
                            </div>
                        )}

                        {sections.sources && (
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900 border-b-2 border-gray-100 pb-2 mb-4">Sources & Transcripts</h3>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3 text-sm text-gray-600">
                                        <span className="material-symbols-outlined text-gray-400 text-[20px] mt-0.5">mic</span>
                                        <span>Interview: VP Engineering, TechCorp (Oct 12) - <em>"Security is paramount."</em></span>
                                    </div>
                                    <div className="flex items-start gap-3 text-sm text-gray-600">
                                        <span className="material-symbols-outlined text-gray-400 text-[20px] mt-0.5">description</span>
                                        <span>Internal Survey Data Q3-Q4 2026</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Controls (35%) */}
                <div className="lg:w-[35%] flex flex-col gap-6 h-[calc(100vh-180px)] overflow-y-auto pr-2 pb-8">

                    {/* Meta Setup */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Report Configuration</h3>
                        <div className="mb-4">
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Report Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-[#f9f9ff] border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-shadow"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Author / Subtitle</label>
                            <input
                                type="text"
                                value={subtitle}
                                onChange={(e) => setSubtitle(e.target.value)}
                                className="w-full bg-[#f9f9ff] border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-shadow"
                            />
                        </div>
                    </div>

                    {/* Sections Toggle */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Include Sections</h3>
                        <div className="space-y-4">
                            {[
                                { id: 'execSummary', label: 'Executive Summary', icon: 'summarize' },
                                { id: 'findings', label: 'Research Findings', icon: 'science' },
                                { id: 'transcripts', label: 'Full Transcripts', icon: 'record_voice_over' },
                                { id: 'sources', label: 'Sources', icon: 'link' },
                            ].map((item) => (
                                <div key={item.id} className={`flex justify-between items-center ${!sections[item.id] ? 'opacity-60' : ''}`}>
                                    <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined text-[20px] ${sections[item.id] ? 'text-primary' : 'text-gray-400'}`}>
                      {item.icon}
                    </span>
                                        <span className="text-sm text-gray-900 font-medium">{item.label}</span>
                                    </div>
                                    {/* Tailwind Custom Toggle */}
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={sections[item.id]}
                                            onChange={() => toggleSection(item.id)}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Export Actions */}
                    <div className="mt-auto pt-6 border-t border-gray-200 flex flex-col gap-3">
                        <button className="w-full bg-primary text-white text-sm font-bold py-3 px-6 rounded-lg shadow-sm hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
                            Download PDF
                        </button>
                        <button className="w-full bg-transparent border border-primary text-primary text-sm font-bold py-3 px-6 rounded-lg hover:bg-primary/5 transition-colors flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-[20px]">description</span>
                            Download Word
                        </button>
                        <button
                            onClick={() => setIsEmailModalOpen(true)}
                            className="w-full bg-transparent text-primary text-sm font-bold py-3 px-6 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[20px]">send</span>
                            Send via Email
                        </button>
                    </div>
                </div>
            </div>

            {/* Email Modal */}
            {isEmailModalOpen && (
                <div className="fixed inset-0 bg-[#1E2255]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-[#f9f9ff]">
                            <h3 className="text-xl font-bold text-gray-900">Email Report</h3>
                            <button className="text-gray-400 hover:text-gray-600 transition-colors" onClick={() => setIsEmailModalOpen(false)}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 flex flex-col gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">To:</label>
                                <input type="email" placeholder="colleague@company.com" className="w-full bg-[#f9f9ff] border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:ring-1 focus:ring-primary focus:border-primary outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Message (Optional):</label>
                                <textarea rows="3" placeholder="Here is the latest AI adoption report..." className="w-full bg-[#f9f9ff] border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:ring-1 focus:ring-primary focus:border-primary outline-none"></textarea>
                            </div>
                            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <span className="material-symbols-outlined text-primary text-[24px]">picture_as_pdf</span>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-900 truncate">Market_Analysis_Q4.pdf</div>
                                    <div className="font-mono text-xs text-gray-500">2.4 MB</div>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-200 bg-[#f9f9ff] flex justify-end gap-3">
                            <button className="px-4 py-2 text-gray-600 text-sm font-bold hover:bg-gray-200 rounded-lg transition-colors" onClick={() => setIsEmailModalOpen(false)}>Cancel</button>
                            <button className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-lg shadow-sm hover:bg-opacity-90 transition-colors flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">send</span> Send
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}