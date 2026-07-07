import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";

export default function ProjectNotes() {
    const navigate = useNavigate();

    // --- RESPONSIVE STATE ---
    const [isLeftPaneOpen, setIsLeftPaneOpen] = useState(false);
    const [isRightPaneOpen, setIsRightPaneOpen] = useState(false);

    // --- MOCK DATA STATE ---
    const [notes, setNotes] = useState([
        {
            id: 1,
            title: "Q3 Generative AI Research Draft",
            time: "10:42 AM",
            preview: "Key findings from the latest multimodal model evaluations. Highlighting the differences...",
            content: `<p>This document serves as the primary scratchpad for assembling findings from the recent evaluation of several multimodal large language models. The focus is specifically on how these models handle extended context windows containing a mix of text, tables, and embedded chart data.</p>
                      <h2 class="text-[24px] font-bold mt-8 mb-4 text-[#181c22]">Initial Observations on Context Retrieval</h2>
                      <p>In our tests, models frequently struggled with "needle in a haystack" retrieval tasks when the target information was located in the middle 30% of a 100k+ token document. We need to document specific failure modes here.</p>
                      <ul class="list-disc pl-6 space-y-2 my-4 text-[#464651]">
                          <li><span class="bg-[#e6fbfc] text-[#00696e] px-1.5 py-0.5 rounded font-mono text-[13px] font-bold">Model A</span> degraded significantly after 60k tokens.</li>
                          <li><span class="bg-[#e6fbfc] text-[#00696e] px-1.5 py-0.5 rounded font-mono text-[13px] font-bold">Model B</span> maintained better accuracy but hallucinated citations.</li>
                          <li>Need to re-run the benchmark suite specifically isolating table data extraction.</li>
                      </ul>
                      <div class="bg-[#f1f3fc] border border-[#c7c5d3] p-4 rounded-lg my-6 font-mono text-[13px] text-[#464651]">
                          <span class="block text-[#222777] mb-2 font-bold uppercase text-[11px] tracking-wider">Transcribed Audio Snippet - 10:45 AM</span>
                          "Yeah, so when looking at the charts, it seems like the y-axis scaling is throwing off the model's interpretation of the trend line. It assumes a linear progression even when the data points clearly curve downwards in the last quarter."
                      </div>
                      <p>Based on the transcription above, I'll need to pull the specific chart references from the dataset to verify if the scaling issue is consistent across different chart types or isolated to line graphs.</p>`,
            links: ["Recording_Oct14.wav", "Transcript_Session2"],
            outline: ["Initial Observations", "Retrieval Metrics", "Hallucination Rates"],
            tags: ["#multimodal", "#evaluation", "#context-window"]
        },
        {
            id: 2,
            title: "Meeting Notes: API Integration",
            time: "Yesterday",
            preview: "Discussed the new endpoints for user authentication. Need to update the swagger docs...",
            content: "<p>We finalized the JWT payload structures. Next steps: ensure backend middleware validates the new scopes.</p>",
            links: ["Backend_Repo_Link"],
            outline: ["Authentication", "Payload Struct", "Next Steps"],
            tags: ["#api", "#backend", "#security"]
        },
        {
            id: 3,
            title: "Literature Review - Neural Nets",
            time: "Oct 12",
            preview: "Summary of Smith et al. (2023) regarding optimization algorithms in deep learning...",
            content: "<p>Smith et al. prove that stochastic gradient descent can be bypassed in highly specific edge cases...</p>",
            links: ["Smith_2023.pdf"],
            outline: ["Abstract", "Methodology", "Conclusion"],
            tags: ["#lit-review", "#neural-nets", "#optimization"]
        }
    ]);

    const [activeNoteId, setActiveNoteId] = useState(1);
    const activeNote = notes.find(n => n.id === activeNoteId);

    // --- FUNCTIONAL HANDLERS ---
    const handleAddNote = () => {
        const newNote = {
            id: Date.now(),
            title: "Untitled Note",
            time: "Just now",
            preview: "Start typing...",
            content: "<p>Start typing your research notes here...</p>",
            links: [],
            outline: ["New Section"],
            tags: ["#draft"]
        };
        setNotes([newNote, ...notes]);
        setActiveNoteId(newNote.id);
        if (window.innerWidth < 768) setIsLeftPaneOpen(false); // Close drawer on mobile after adding
    };

    const handleTitleChange = (e) => {
        const updatedNotes = notes.map(n =>
            n.id === activeNoteId ? { ...n, title: e.target.value } : n
        );
        setNotes(updatedNotes);
    };

    const handleToolbarAction = (action) => {
        alert(`${action} formatting applied!`);
    };

    const handleVoiceNote = () => {
        alert("Microphone activated. Dictating directly into document...");
    };

    const selectNoteOnMobile = (id) => {
        setActiveNoteId(id);
        if (window.innerWidth < 768) setIsLeftPaneOpen(false);
    };

    return (
        <div className="flex w-full h-[calc(100vh-64px)] bg-[#f9f9ff] overflow-hidden relative">

            <style>{`
                .pulse-ring { animation: pulse-ring-animation 1.8s infinite; }
                @keyframes pulse-ring-animation {
                    0% { box-shadow: 0 0 0 0 rgba(0, 194, 203, 0.4); }
                    70% { box-shadow: 0 0 0 8px rgba(0, 194, 203, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(0, 194, 203, 0); }
                }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .hide-scroll-x::-webkit-scrollbar { display: none; }
            `}</style>

            {/* --- MOBILE BACKDROP OVERLAYS --- */}
            {(isLeftPaneOpen || isRightPaneOpen) && (
                <div
                    className="fixed inset-0 bg-[#181c22]/40 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => { setIsLeftPaneOpen(false); setIsRightPaneOpen(false); }}
                ></div>
            )}

            {/* --- LEFT PANE: Notes List --- */}
            <div className={`
                fixed md:relative top-[64px] md:top-0 left-0 h-[calc(100vh-64px)] md:h-full 
                w-[280px] lg:w-80 bg-white border-r border-[#c7c5d3] flex flex-col shrink-0 shadow-[1px_0_4px_rgba(58,63,143,0.04)] z-50 md:z-10
                transform transition-transform duration-300 ease-in-out md:translate-x-0
                ${isLeftPaneOpen ? 'translate-x-0' : '-translate-x-full absolute'}
            `}>
                <div className="p-4 border-b border-[#c7c5d3] flex flex-col gap-3 bg-[#f1f3fc]">
                    <div className="flex justify-between items-center md:block">
                        <h3 className="text-[20px] font-bold text-[#181c22]">Workspace</h3>
                        <button className="md:hidden text-[#777682]" onClick={() => setIsLeftPaneOpen(false)}>
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleAddNote}
                            className="flex-1 bg-white border border-[#c7c5d3] text-[#222777] hover:bg-[#f9f9ff] py-1.5 rounded-md text-[12px] font-bold flex items-center justify-center gap-1 transition-colors shadow-sm"
                        >
                            <span className="material-symbols-outlined text-[16px]">edit_document</span> New Note
                        </button>
                        <button
                            onClick={() => navigate('/app/projects/create-seminar')}
                            className="flex-1 bg-[#222777] text-white hover:bg-[#3a3f8f] py-1.5 rounded-md text-[12px] font-bold flex items-center justify-center gap-1 transition-colors shadow-sm"
                        >
                            <span className="material-symbols-outlined text-[16px]">record_voice_over</span> <span className="hidden sm:inline">Seminar</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar pb-20 md:pb-0">
                    {notes.map(note => (
                        <div
                            key={note.id}
                            onClick={() => selectNoteOnMobile(note.id)}
                            className={`p-4 border-b border-[#e0e2eb] cursor-pointer transition-colors group
                                ${activeNoteId === note.id ? 'bg-[#e0e0ff]/30 border-l-4 border-l-[#222777]' : 'hover:bg-[#f1f3fc] border-l-4 border-l-transparent'}
                            `}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <h4 className={`text-[15px] truncate pr-2 ${activeNoteId === note.id ? 'font-bold text-[#181c22]' : 'font-semibold text-[#181c22] group-hover:text-[#222777]'}`}>
                                    {note.title}
                                </h4>
                                <span className="font-mono text-[11px] text-[#777682] shrink-0 mt-0.5">{note.time}</span>
                            </div>
                            <p className="text-[13px] text-[#464651] line-clamp-2 leading-tight">
                                {note.preview}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- CENTER PANE: Editor --- */}
            <div className="flex-1 w-full flex flex-col h-full bg-white relative z-0 md:z-10 min-w-0">

                {/* Mobile Top Context Bar (Only visible on small screens) */}
                <div className="md:hidden h-12 bg-[#f9f9ff] border-b border-[#e0e2eb] flex items-center justify-between px-4 shrink-0">
                    <button onClick={() => setIsLeftPaneOpen(true)} className="flex items-center gap-1 text-[#222777] font-bold text-[13px]">
                        <span className="material-symbols-outlined text-[18px]">menu_open</span> Notes
                    </button>
                    <button onClick={() => setIsRightPaneOpen(true)} className="flex items-center gap-1 text-[#00696e] font-bold text-[13px]">
                        Context <span className="material-symbols-outlined text-[18px]">info</span>
                    </button>
                </div>

                {/* Toolbar */}
                <div className="h-14 border-b border-[#c7c5d3] bg-white flex items-center px-2 md:px-4 space-x-1 md:space-x-2 shrink-0 z-20 overflow-x-auto hide-scroll-x">
                    <button onClick={() => handleToolbarAction('Bold')} className="p-1 md:p-1.5 shrink-0 text-[#464651] hover:text-[#222777] hover:bg-[#f1f3fc] rounded transition-colors"><span className="material-symbols-outlined text-[18px] md:text-[20px]">format_bold</span></button>
                    <button onClick={() => handleToolbarAction('Italic')} className="p-1 md:p-1.5 shrink-0 text-[#464651] hover:text-[#222777] hover:bg-[#f1f3fc] rounded transition-colors"><span className="material-symbols-outlined text-[18px] md:text-[20px]">format_italic</span></button>
                    <div className="w-px h-6 bg-[#c7c5d3] mx-1 shrink-0"></div>
                    <button onClick={() => handleToolbarAction('H1')} className="p-1 md:p-1.5 shrink-0 text-[#464651] hover:text-[#222777] hover:bg-[#f1f3fc] rounded transition-colors text-[12px] md:text-[13px] font-bold">H1</button>
                    <button onClick={() => handleToolbarAction('H2')} className="p-1 md:p-1.5 shrink-0 text-[#464651] hover:text-[#222777] hover:bg-[#f1f3fc] rounded transition-colors text-[12px] md:text-[13px] font-bold">H2</button>
                    <div className="w-px h-6 bg-[#c7c5d3] mx-1 shrink-0"></div>
                    <button onClick={() => handleToolbarAction('Bullet List')} className="p-1 md:p-1.5 shrink-0 text-[#464651] hover:text-[#222777] hover:bg-[#f1f3fc] rounded transition-colors"><span className="material-symbols-outlined text-[18px] md:text-[20px]">format_list_bulleted</span></button>
                    <button onClick={() => handleToolbarAction('Numbered List')} className="p-1 md:p-1.5 shrink-0 text-[#464651] hover:text-[#222777] hover:bg-[#f1f3fc] rounded transition-colors"><span className="material-symbols-outlined text-[18px] md:text-[20px]">format_list_numbered</span></button>
                    <button onClick={() => handleToolbarAction('Task List')} className="p-1 md:p-1.5 shrink-0 text-[#464651] hover:text-[#222777] hover:bg-[#f1f3fc] rounded transition-colors"><span className="material-symbols-outlined text-[18px] md:text-[20px]">check_box</span></button>
                    <div className="w-px h-6 bg-[#c7c5d3] mx-1 shrink-0 hidden sm:block"></div>
                    <button onClick={() => handleToolbarAction('Code Block')} className="p-1 md:p-1.5 shrink-0 text-[#464651] hover:text-[#222777] hover:bg-[#f1f3fc] rounded transition-colors hidden sm:block"><span className="material-symbols-outlined text-[18px] md:text-[20px]">code</span></button>
                    <button onClick={() => handleToolbarAction('Highlight')} className="p-1 md:p-1.5 shrink-0 text-[#464651] hover:text-[#222777] hover:bg-[#f1f3fc] rounded transition-colors hidden sm:block"><span className="material-symbols-outlined text-[18px] md:text-[20px]">format_ink_highlighter</span></button>
                    <button onClick={() => handleToolbarAction('Add Link')} className="p-1 md:p-1.5 shrink-0 text-[#464651] hover:text-[#222777] hover:bg-[#f1f3fc] rounded transition-colors"><span className="material-symbols-outlined text-[18px] md:text-[20px]">link</span></button>
                </div>

                {/* Editor Area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 relative no-scrollbar">
                    <div className="max-w-3xl mx-auto pb-32 md:pb-24">
                        <input
                            className="w-full bg-transparent border-none outline-none text-[24px] sm:text-[32px] md:text-[36px] font-bold text-[#181c22] mb-4 sm:mb-6 p-0 focus:ring-0 placeholder:text-[#c7c5d3] tracking-tight leading-tight"
                            placeholder="Note Title..."
                            type="text"
                            value={activeNote.title}
                            onChange={handleTitleChange}
                        />
                        <div
                            className="text-[15px] md:text-[16px] text-[#181c22] leading-[1.7] md:leading-[1.85] outline-none min-h-[400px]"
                            contentEditable="true"
                            suppressContentEditableWarning={true}
                            dangerouslySetInnerHTML={{ __html: activeNote.content }}
                        ></div>
                    </div>
                </div>

                {/* Floating Voice Note Button */}
                <button
                    onClick={handleVoiceNote}
                    className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 bg-white text-[#222777] border border-[#c7c5d3] shadow-[0_4px_16px_rgba(58,63,143,0.12)] rounded-full px-4 md:px-6 py-2 md:py-3 flex items-center space-x-2 md:space-x-3 hover:bg-[#f9f9ff] hover:shadow-[0_8px_24px_rgba(58,63,143,0.16)] transition-all group z-30"
                >
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-[#222777] flex items-center justify-center pulse-ring shrink-0">
                        <span className="material-symbols-outlined text-white text-[14px] md:text-[18px]">mic</span>
                    </div>
                    <span className="text-[12px] md:text-[13px] font-bold tracking-wide uppercase text-[#222777] whitespace-nowrap">Voice Note</span>
                </button>
            </div>

            {/* --- RIGHT PANE: Context/Outline --- */}
            <div className={`
                fixed md:relative top-[64px] md:top-0 right-0 h-[calc(100vh-64px)] md:h-full 
                w-[280px] lg:w-72 bg-white border-l border-[#c7c5d3] flex flex-col shrink-0 z-50 md:z-10
                transform transition-transform duration-300 ease-in-out md:translate-x-0
                ${isRightPaneOpen ? 'translate-x-0' : 'translate-x-full absolute'}
                md:flex md:absolute lg:relative md:translate-x-full lg:translate-x-0
            `}>
                <div className="p-4 border-b border-[#c7c5d3] flex justify-between items-center bg-[#f1f3fc]">
                    <h3 className="font-mono text-[13px] font-bold text-[#181c22] uppercase tracking-wider">Contextual Links</h3>
                    <button className="text-[#777682] hover:text-[#222777] transition-colors md:hidden" onClick={() => setIsRightPaneOpen(false)}>
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-8 no-scrollbar pb-20 md:pb-5">

                    {/* Linked Items */}
                    <div>
                        <h4 className="text-[13px] font-bold text-[#777682] mb-3 flex items-center uppercase tracking-wider">
                            <span className="material-symbols-outlined text-[16px] mr-1.5">link</span> Linked Items
                        </h4>
                        <div className="flex flex-col gap-2">
                            {activeNote.links.map((link, idx) => (
                                <span key={idx} className="inline-flex items-center px-3 py-1.5 rounded bg-[#e6fbfc] text-[#004f53] font-mono text-[12px] font-bold border border-[#6bf6ff]/50 cursor-pointer hover:bg-[#6bf6ff]/20 transition-colors">
                                    <span className="material-symbols-outlined text-[14px] mr-2">description</span>
                                    {link}
                                </span>
                            ))}
                            <span className="inline-flex items-center justify-center px-3 py-1.5 rounded bg-[#f9f9ff] text-[#464651] font-mono text-[12px] font-bold border border-[#c7c5d3] border-dashed cursor-pointer hover:bg-[#e0e2eb] hover:border-solid transition-all mt-1">
                                <span className="material-symbols-outlined text-[14px] mr-1">add</span> Link Asset
                            </span>
                        </div>
                    </div>

                    {/* Document Outline */}
                    <div>
                        <h4 className="text-[13px] font-bold text-[#777682] mb-3 flex items-center uppercase tracking-wider">
                            <span className="material-symbols-outlined text-[16px] mr-1.5">segment</span> Outline
                        </h4>
                        <ul className="space-y-3 border-l-2 border-[#e0e2eb] ml-2 pl-4">
                            {activeNote.outline.map((item, idx) => (
                                <li
                                    key={idx}
                                    className={`text-[13px] cursor-pointer relative 
                                        ${idx === 0 ? 'text-[#222777] font-bold before:content-[\'\'] before:absolute before:-left-[21px] before:top-1.5 before:w-2 before:h-2 before:bg-[#222777] before:rounded-full' : 'text-[#464651] font-semibold hover:text-[#181c22]'}
                                    `}
                                >
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* AI Insights / Tags */}
                    <div>
                        <h4 className="text-[13px] font-bold text-[#777682] mb-3 flex items-center uppercase tracking-wider">
                            <span className="material-symbols-outlined text-[16px] mr-1.5 text-[#00c2cb]">auto_awesome</span> Suggested Tags
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {activeNote.tags.map((tag, idx) => (
                                <span key={idx} className="px-2.5 py-1 bg-[#ebeef6] rounded text-[11px] font-mono font-bold text-[#464651] border border-[#c7c5d3]/50 cursor-pointer hover:bg-[#e0e2eb]">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}