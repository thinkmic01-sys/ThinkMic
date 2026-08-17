import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import api from '../../services/api';

export default function ProjectNotes({ projectId }) {
    const navigate = useNavigate();
    const token = useSelector(state => state.auth?.accessToken);

    // --- RESPONSIVE STATE ---
    const [isLeftPaneOpen, setIsLeftPaneOpen] = useState(false);

    // --- MOCK DATA STATE ---
    const [notes, setNotes] = useState([]);
    const [activeNoteId, setActiveNoteId] = useState(null);
    
    // --- DICTATION STATE ---
    const [isDictating, setIsDictating] = useState(false);
    const [dictationText, setDictationText] = useState('');
    const recognitionRef = React.useRef(null);
    const editorRef = React.useRef(null);

    React.useEffect(() => {
        const fetchNotes = async () => {
            try {
                const url = projectId ? `/notes?projectId=${projectId}` : '/notes';
                const response = await api.get(url);
                const data = response.data;
                setNotes(data);
                if (data.length > 0) setActiveNoteId(data[0]._id);
            } catch (error) {
                console.error("Failed to fetch notes", error);
            }
        };
        fetchNotes();
    }, [projectId]);

    React.useEffect(() => {
        if (editorRef.current && activeNoteId) {
            const currentNote = notes.find(n => n._id === activeNoteId);
            if (currentNote) {
                editorRef.current.innerHTML = currentNote.content || '';
            }
        }
    }, [activeNoteId]); // Only update DOM on active note switch



    const activeNote = notes.find(n => n._id === activeNoteId);

    // --- FUNCTIONAL HANDLERS ---
    const handleAddNote = async () => {
        try {
            const payload = {
                title: "Untitled Note",
                content: "<p>Start typing your research notes here...</p>",
                preview: "Start typing...",
                tags: ["#draft"],
                outline: ["New Section"],
                links: []
            };
            if (projectId) {
                payload.projectId = projectId;
            }
            const response = await api.post('/notes', payload);
            const newNote = response.data;
            setNotes([newNote, ...notes]);
            setActiveNoteId(newNote._id);
            if (window.innerWidth < 768) setIsLeftPaneOpen(false);
        } catch (error) {
            console.error("Failed to create note", error);
        }
    };

    const handleTitleChange = async (e) => {
        const val = e.target.value;
        setNotes(notes.map(n => n._id === activeNoteId ? { ...n, title: val } : n));
        try {
            await api.put(`/notes/${activeNoteId}`, { title: val });
        } catch (error) {}
    };

    const handleDeleteNote = (e, noteId) => {
        e.stopPropagation();
        setNoteToDelete(noteId);
        setDeleteModalOpen(true);
    };

    const confirmDeleteNote = async () => {
        if (!noteToDelete) return;
        const noteId = noteToDelete;
        setDeleteModalOpen(false);
        setNoteToDelete(null);
        
        setNotes(notes.filter(n => n._id !== noteId));
        if (activeNoteId === noteId) {
            setActiveNoteId(notes.find(n => n._id !== noteId && n._id !== activeNoteId)?._id || null);
        }
        try {
            await api.delete(`/notes/${noteId}`);
            showToast("Note deleted");
        } catch (error) {
            console.error("Failed to delete note", error);
            showToast("Failed to delete note");
        }
    };



    const handleDownloadNote = async () => {
        if (!activeNoteId) return;
        showToast("Generating document...");
        try {
            const response = await api.get(`/notes/${activeNoteId}/export`, { responseType: 'blob' });
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const currentNote = notes.find(n => n._id === activeNoteId);
            a.download = `${currentNote?.title || 'Note'}.docx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast("Document downloaded!");
        } catch (error) {
            console.error("Failed to download note", error);
            showToast("Failed to download document.");
        }
    };

    const [toast, setToast] = useState({ show: false, message: '' });
    const showToast = (message) => {
        setToast({ show: true, message });
        setTimeout(() => setToast({ show: false, message: '' }), 3000);
    };

    const handleToolbarAction = (action) => {
        if (editorRef.current && document.activeElement !== editorRef.current) {
            editorRef.current.focus();
        }

        let command = '';
        let value = null;
        
        switch (action) {
            case 'Bold': command = 'bold'; break;
            case 'Italic': command = 'italic'; break;
            case 'H1': command = 'formatBlock'; value = '<h1>'; break;
            case 'H2': command = 'formatBlock'; value = '<h2>'; break;
            case 'Bullet List': command = 'insertUnorderedList'; break;
            case 'Numbered List': command = 'insertOrderedList'; break;
            case 'Task List': command = 'insertHTML'; value = '<div><input type="checkbox" style="margin-right:8px;" /></div>'; break;
            case 'Code Block': command = 'formatBlock'; value = '<pre>'; break;
            case 'Highlight': command = 'hiliteColor'; value = 'yellow'; break;
            case 'Add Link': 
                const sel = window.getSelection();
                if (sel.rangeCount > 0) {
                    setSavedSelection(sel.getRangeAt(0).cloneRange());
                } else {
                    setSavedSelection(null);
                }
                setLinkUrlInput('');
                setLinkModalOpen(true);
                break;
            default:
                command = null;
        }

        if (command) {
            let isActive = false;
            try {
                if (command === 'formatBlock') {
                    const currentBlock = document.queryCommandValue('formatBlock');
                    isActive = currentBlock.toLowerCase() === value.replace(/[<>]/g, '').toLowerCase();
                } else if (command === 'hiliteColor') {
                    // Modern browsers don't easily return a boolean for hiliteColor, check if value exists
                    const color = document.queryCommandValue('hiliteColor');
                    isActive = color && color !== 'transparent' && color !== 'rgba(0, 0, 0, 0)';
                } else {
                    isActive = document.queryCommandState(command);
                }
            } catch (e) {}

            if (command === 'hiliteColor' && !document.queryCommandSupported('hiliteColor')) {
                command = 'backColor'; // fallback for Firefox/Safari
            }

            if (command === 'hiliteColor' || command === 'backColor') {
                if (isActive) {
                    document.execCommand(command, false, 'transparent');
                    showToast(`${action} formatting removed!`);
                } else {
                    document.execCommand(command, false, value);
                    showToast(`${action} formatting applied!`);
                }
            } else if (command === 'formatBlock') {
                if (isActive) {
                    document.execCommand(command, false, '<div>');
                    showToast(`${action} formatting removed!`);
                } else {
                    document.execCommand(command, false, value);
                    showToast(`${action} formatting applied!`);
                }
            } else {
                document.execCommand(command, false, value);
                if (command === 'insertHTML' || command === 'createLink') {
                     showToast(`${action} applied!`);
                } else {
                     showToast(`${action} formatting ${isActive ? 'removed' : 'applied'}!`);
                }
            }
        }
    };

    const handleAddLinkSubmit = (e) => {
        e.preventDefault();
        if (!linkUrlInput) return;
        
        if (editorRef.current) editorRef.current.focus();
        
        const sel = window.getSelection();
        if (savedSelection) {
            sel.removeAllRanges();
            sel.addRange(savedSelection);
        }

        let text = sel.toString() || linkUrlInput;
        let finalUrl = linkUrlInput.startsWith('http') ? linkUrlInput : `https://${linkUrlInput}`;
        
        const aTag = `<a href="${finalUrl}" target="_blank" class="text-[#2563eb] underline cursor-pointer" rel="noopener noreferrer">${text}</a>`;
        document.execCommand('insertHTML', false, aTag);
        
        setLinkModalOpen(false);
        showToast("Link added!");
    };

    const handleVoiceNote = () => {
        if (isDictating) {
            if (recognitionRef.current) recognitionRef.current.stop();
            setIsDictating(false);
            
            if (dictationText.trim() && activeNoteId && editorRef.current) {
                const currentContent = editorRef.current.innerHTML;
                const newContent = currentContent + `<p><em>🎙️ ${dictationText}</em></p>`;
                editorRef.current.innerHTML = newContent; // instantly show it in the editor
                setNotes(prev => prev.map(n => n._id === activeNoteId ? { ...n, content: newContent } : n));
                api.put(`/notes/${activeNoteId}`, { content: newContent }).catch(() => {});
            }
            setDictationText('');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return showToast("Browser Speech API not supported.");

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => {
            setIsDictating(true);
            setDictationText('');
        };

        recognition.onresult = (event) => {
            let text = '';
            for (let i = 0; i < event.results.length; ++i) {
                text += event.results[i][0].transcript;
            }
            setDictationText(text);
        };

        recognition.onerror = (e) => {
            showToast("Microphone error.");
            setIsDictating(false);
        };

        recognition.onend = () => {
            if (isDictating) {
                // If it ends automatically, we shouldn't lose text.
                setIsDictating(false);
                setDictationText(prev => {
                    if (prev.trim() && activeNoteId && editorRef.current) {
                        const currentContent = editorRef.current.innerHTML;
                        const newContent = currentContent + `<p><em>🎙️ ${prev}</em></p>`;
                        editorRef.current.innerHTML = newContent; // instantly show it in the editor
                        setNotes(notes => notes.map(n => n._id === activeNoteId ? { ...n, content: newContent } : n));
                        api.put(`/notes/${activeNoteId}`, { content: newContent }).catch(() => {});
                    }
                    return '';
                });
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    const selectNoteOnMobile = (id) => {
        setActiveNoteId(id);
        if (window.innerWidth < 768) setIsLeftPaneOpen(false);
    };

    // --- LINK MODAL STATE ---
    const [linkModalOpen, setLinkModalOpen] = useState(false);
    const [linkUrlInput, setLinkUrlInput] = useState('');
    const [savedSelection, setSavedSelection] = useState(null);

    // --- DELETE MODAL STATE ---
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [noteToDelete, setNoteToDelete] = useState(null);

    return (
        <div className="flex w-full h-[calc(100vh-64px)] bg-[#F4F9F8] overflow-hidden relative">

            {/* Custom Toast */}
            {toast.show && (
                <div className="fixed bottom-6 right-6 bg-[#075e51] text-white px-6 py-3 rounded-lg shadow-xl font-bold text-[14px] z-[100] animate-fade-in-up flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#CA8A04]">info</span>
                    {toast.message}
                </div>
            )}

            {/* Custom Link Modal */}
            {linkModalOpen && (
                <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
                        <div className="bg-[#F4F9F8] px-4 py-3 border-b border-[#e0e2eb] flex items-center justify-between">
                            <h3 className="font-bold text-[#181c22] text-[15px]">Add Link</h3>
                            <button onClick={() => setLinkModalOpen(false)} className="text-[#777682] hover:text-[#ba1a1a]">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleAddLinkSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-[12px] font-bold text-[#464651] mb-1 uppercase tracking-wide">URL</label>
                                <input
                                    type="text"
                                    autoFocus
                                    className="w-full bg-[#f1f3fc] border border-[#c7c5d3] rounded-md px-3 py-2 text-[14px] text-[#181c22] focus:outline-none focus:border-[#075e51] focus:ring-1 focus:ring-[#075e51]"
                                    placeholder="https://example.com"
                                    value={linkUrlInput}
                                    onChange={(e) => setLinkUrlInput(e.target.value)}
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setLinkModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-[#464651] hover:bg-[#f1f3fc] rounded-md transition-colors">Cancel</button>
                                <button type="submit" className="px-4 py-2 text-[13px] font-bold bg-[#075e51] text-white rounded-md hover:bg-[#151958] transition-colors">Apply Link</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Custom Delete Modal */}
            {deleteModalOpen && (
                <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
                        <div className="bg-[#fff9f9] px-4 py-3 border-b border-[#ffdada] flex items-center justify-between">
                            <h3 className="font-bold text-[#ba1a1a] text-[15px] flex items-center gap-1">
                                <span className="material-symbols-outlined text-[18px]">warning</span> Delete Note
                            </h3>
                            <button onClick={() => { setDeleteModalOpen(false); setNoteToDelete(null); }} className="text-[#777682] hover:text-[#ba1a1a]">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <p className="text-[13px] text-[#464651]">
                                Are you sure you want to permanently delete this note? This action cannot be undone.
                            </p>
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => { setDeleteModalOpen(false); setNoteToDelete(null); }} className="px-4 py-2 text-[13px] font-bold text-[#464651] hover:bg-[#f1f3fc] rounded-md transition-colors">Cancel</button>
                                <button type="button" onClick={confirmDeleteNote} className="px-4 py-2 text-[13px] font-bold bg-[#ba1a1a] text-white rounded-md hover:bg-[#8c1212] transition-colors shadow-sm flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[16px]">delete</span> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .pulse-ring { animation: pulse-ring-animation 1.8s infinite; }
                @keyframes pulse-ring-animation {
                    0% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.4); }
                    70% { box-shadow: 0 0 0 8px rgba(234, 179, 8, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0); }
                }
                
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
                
                @keyframes scale-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                .animate-scale-in { animation: scale-in 0.2s ease-out forwards; }
                
                @keyframes fade-in-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
                
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .hide-scroll-x::-webkit-scrollbar { display: none; }
                
                /* Tailwind overrides for the rich text editor */
                .editor-content h1 { font-size: 2em; font-weight: 800; margin: 0.67em 0; line-height: 1.2; }
                .editor-content h2 { font-size: 1.5em; font-weight: 700; margin: 0.83em 0; line-height: 1.3; }
                .editor-content ul { list-style-type: disc; padding-left: 1.5em; margin: 1em 0; }
                .editor-content ol { list-style-type: decimal; padding-left: 1.5em; margin: 1em 0; }
                .editor-content li { margin-bottom: 0.25em; }
                .editor-content pre { background-color: #f1f3fc; padding: 12px; border-radius: 6px; font-family: monospace; overflow-x: auto; font-size: 0.9em; margin: 1em 0; }
                .editor-content blockquote { border-left: 4px solid #c7c5d3; padding-left: 16px; font-style: italic; color: #464651; margin: 1em 0; }
            `}</style>

            {/* --- MOBILE BACKDROP OVERLAYS --- */}
            {isLeftPaneOpen && (
                <div
                    className="fixed inset-0 bg-[#181c22]/40 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setIsLeftPaneOpen(false)}
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
                            className="flex-1 bg-white border border-[#c7c5d3] text-[#075e51] hover:bg-[#F4F9F8] py-1.5 rounded-md text-[12px] font-bold flex items-center justify-center gap-1 transition-colors shadow-sm"
                        >
                            <span className="material-symbols-outlined text-[16px]">edit_document</span> New Note
                        </button>
                        <button
                            onClick={() => navigate(projectId ? `/app/projects/create-seminar?projectId=${projectId}` : '/app/projects/create-seminar')}
                            className="flex-1 bg-[#075e51] text-white hover:bg-[#097969] py-1.5 rounded-md text-[12px] font-bold flex items-center justify-center gap-1 transition-colors shadow-sm"
                        >
                            <span className="material-symbols-outlined text-[16px]">record_voice_over</span> <span className="hidden sm:inline">Seminar</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar pb-20 md:pb-0">
                    {notes.map(note => (
                        <div
                            key={note._id}
                            onClick={() => selectNoteOnMobile(note._id)}
                            className={`p-4 border-b border-[#e0e2eb] cursor-pointer transition-colors group
                                ${activeNoteId === note._id ? 'bg-[#e0e0ff]/30 border-l-4 border-l-[#075e51]' : 'hover:bg-[#f1f3fc] border-l-4 border-l-transparent'}
                            `}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <h4 className={`text-[15px] truncate pr-2 flex-1 ${activeNoteId === note._id ? 'font-bold text-[#181c22]' : 'font-semibold text-[#181c22] group-hover:text-[#075e51]'}`}>
                                    {note.title}
                                </h4>
                                <div className="flex items-center gap-2 shrink-0 h-5">
                                    <span className="font-mono text-[11px] text-[#777682] mt-0.5 md:group-hover:hidden transition-all">{new Date(note.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <button 
                                        onClick={(e) => handleDeleteNote(e, note._id)}
                                        className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-[#777682] hover:text-[#ba1a1a] transition-all hidden md:block"
                                        title="Delete Note"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">delete</span>
                                    </button>
                                </div>
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
                <div className="md:hidden h-12 bg-[#F4F9F8] border-b border-[#e0e2eb] flex items-center px-4 shrink-0">
                    <button onClick={() => setIsLeftPaneOpen(true)} className="flex items-center gap-1 text-[#075e51] font-bold text-[13px]">
                        <span className="material-symbols-outlined text-[18px]">menu_open</span> Notes
                    </button>
                </div>

                {/* Toolbar */}
                <div className="h-14 border-b border-[#c7c5d3] bg-white flex items-center px-2 md:px-4 space-x-1 md:space-x-2 shrink-0 z-20 overflow-x-auto hide-scroll-x">
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbarAction('Bold')} className="p-1 md:p-1.5 shrink-0 text-[#464651] hover:text-[#075e51] hover:bg-[#f1f3fc] rounded transition-colors"><span className="material-symbols-outlined text-[18px] md:text-[20px]">format_bold</span></button>
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbarAction('Italic')} className="p-1 md:p-1.5 shrink-0 text-[#464651] hover:text-[#075e51] hover:bg-[#f1f3fc] rounded transition-colors"><span className="material-symbols-outlined text-[18px] md:text-[20px]">format_italic</span></button>
                    <div className="w-px h-6 bg-[#c7c5d3] mx-1 shrink-0"></div>
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbarAction('H1')} className="p-1 md:p-1.5 shrink-0 text-[#464651] hover:text-[#075e51] hover:bg-[#f1f3fc] rounded transition-colors text-[12px] md:text-[13px] font-bold">H1</button>
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbarAction('H2')} className="p-1 md:p-1.5 shrink-0 text-[#464651] hover:text-[#075e51] hover:bg-[#f1f3fc] rounded transition-colors text-[12px] md:text-[13px] font-bold">H2</button>
                    <div className="w-px h-6 bg-[#c7c5d3] mx-1 shrink-0"></div>
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbarAction('Bullet List')} className="p-1 md:p-1.5 shrink-0 text-[#464651] hover:text-[#075e51] hover:bg-[#f1f3fc] rounded transition-colors"><span className="material-symbols-outlined text-[18px] md:text-[20px]">format_list_bulleted</span></button>
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbarAction('Numbered List')} className="p-1 md:p-1.5 shrink-0 text-[#464651] hover:text-[#075e51] hover:bg-[#f1f3fc] rounded transition-colors"><span className="material-symbols-outlined text-[18px] md:text-[20px]">format_list_numbered</span></button>
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbarAction('Task List')} className="p-1 md:p-1.5 shrink-0 text-[#464651] hover:text-[#075e51] hover:bg-[#f1f3fc] rounded transition-colors"><span className="material-symbols-outlined text-[18px] md:text-[20px]">check_box</span></button>
                    <div className="w-px h-6 bg-[#c7c5d3] mx-1 shrink-0 hidden sm:block"></div>
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbarAction('Code Block')} className="p-1 md:p-1.5 shrink-0 text-[#464651] hover:text-[#075e51] hover:bg-[#f1f3fc] rounded transition-colors hidden sm:block"><span className="material-symbols-outlined text-[18px] md:text-[20px]">code</span></button>
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbarAction('Highlight')} className="p-1 md:p-1.5 shrink-0 text-[#464651] hover:text-[#075e51] hover:bg-[#f1f3fc] rounded transition-colors hidden sm:block"><span className="material-symbols-outlined text-[18px] md:text-[20px]">format_ink_highlighter</span></button>
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbarAction('Add Link')} className="p-1 md:p-1.5 shrink-0 text-[#464651] hover:text-[#075e51] hover:bg-[#f1f3fc] rounded transition-colors"><span className="material-symbols-outlined text-[18px] md:text-[20px]">link</span></button>
                    <div className="flex-1"></div>
                    <button onMouseDown={(e) => e.preventDefault()} onClick={handleDownloadNote} className="p-1 md:p-1.5 shrink-0 text-[#00696e] hover:text-[#004f53] hover:bg-[#FEF9C3] rounded transition-colors flex items-center gap-1"><span className="material-symbols-outlined text-[18px] md:text-[20px]">download</span> <span className="text-[12px] font-bold hidden sm:block">Export DOCX</span></button>
                </div>

                {/* Editor Area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 relative no-scrollbar">
                    {activeNote ? (
                    <div className="max-w-3xl mx-auto pb-32 md:pb-24">
                        <input
                            className="w-full bg-transparent border-none outline-none text-[24px] sm:text-[32px] md:text-[36px] font-bold text-[#181c22] mb-4 sm:mb-6 p-0 focus:ring-0 placeholder:text-[#c7c5d3] tracking-tight leading-tight"
                            placeholder="Note Title..."
                            type="text"
                            value={activeNote.title}
                            onChange={handleTitleChange}
                        />
                        <div
                            ref={editorRef}
                            className="text-[15px] md:text-[16px] text-[#181c22] leading-[1.7] md:leading-[1.85] outline-none min-h-[400px] editor-content"
                            contentEditable="true"
                            suppressContentEditableWarning={true}
                            onClick={(e) => {
                                const link = e.target.closest('a');
                                if (link && link.href) {
                                    window.open(link.href, '_blank');
                                }
                            }}
                            onBlur={async (e) => {
                                const html = e.target.innerHTML;
                                setNotes(prev => prev.map(n => n._id === activeNoteId ? { ...n, content: html } : n));
                                try {
                                    await api.put(`/notes/${activeNoteId}`, { content: html });
                                } catch (err) {}
                            }}
                        ></div>

                {/* Inline Voice Note Status Block */}
                {isDictating && (
                    <div className="mt-10 mb-6 p-5 pt-7 bg-[#F4F9F8] border border-[#c7c5d3] rounded-xl relative shadow-md max-w-sm">
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30">
                            <button
                                onClick={handleVoiceNote}
                                className="bg-white text-[#075e51] border border-[#e0e2eb] shadow-sm rounded-full px-3 py-1 flex items-center space-x-2 hover:bg-[#f1f3fc] transition-all group"
                            >
                                <div className="w-5 h-5 rounded-full bg-[#075e51] flex items-center justify-center pulse-ring shrink-0">
                                    <span className="material-symbols-outlined text-white text-[12px]">stop</span>
                                </div>
                                <span className="text-[10px] font-bold tracking-widest uppercase text-[#075e51] whitespace-nowrap">Stop Voice Note</span>
                            </button>
                        </div>
                        <div className="flex items-center justify-between mb-3">
                            <h5 className="font-mono text-[10px] font-bold text-[#075e51] tracking-widest uppercase">
                                Transcribed
                            </h5>
                            <span className="font-mono text-[10px] font-bold text-[#075e51] tracking-widest uppercase">
                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        <p className="text-[13px] text-[#464651] font-mono leading-relaxed min-h-[40px] max-h-[150px] overflow-y-auto custom-scrollbar">
                            "{dictationText || 'Listening...'}"
                        </p>
                    </div>
                )}
                    </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-[#c7c5d3]">Select or create a note</div>
                    )}
                </div>

                {/* Floating Voice Note Button */}
                {!isDictating && (
                    <button
                        onClick={handleVoiceNote}
                        className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 bg-white text-[#075e51] border border-[#c7c5d3] shadow-[0_4px_16px_rgba(58,63,143,0.12)] rounded-full px-4 md:px-6 py-2 md:py-3 flex items-center space-x-2 md:space-x-3 hover:bg-[#F4F9F8] hover:shadow-[0_8px_24px_rgba(58,63,143,0.16)] transition-all group z-30"
                    >
                        <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-[#075e51] flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-white text-[14px] md:text-[18px]">mic</span>
                        </div>
                        <span className="text-[12px] md:text-[13px] font-bold tracking-wide uppercase text-[#075e51] whitespace-nowrap">Voice Note</span>
                    </button>
                )}
            </div>



        </div>
    );
}