import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import VoiceRecorder from '../../components/VoiceRecorder';
import api from '../../services/api';

const STATUS_BADGE = {
    draft: { classes: 'bg-[#ffdad6] text-[#93000a] border-[#ffdad6]', dot: 'bg-[#ba1a1a]', label: 'Draft' },
    active: { classes: 'bg-[#e6fbfc] text-[#006e73] border-[#6bf6ff]/50', dot: 'bg-[#00c2cb]', label: 'Active' },
    archived: { classes: 'bg-[#f1f3fc] text-[#464651] border-[#e0e2eb]', dot: 'bg-[#777682]', label: 'Archived' }
};

function timeAgo(dateString) {
    if (!dateString) return 'Not saved yet';
    const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
}

const ICON_BY_TYPE = {
    'Text': 'short_text',
    'Long Text': 'notes',
    'Voice': 'mic',
    'Dropdown': 'arrow_drop_down_circle',
    'Checkbox': 'check_box',
    'Rating': 'star',
    'Date': 'calendar_today',
    'Number': 'pin',
    'File': 'upload_file'
};

export default function SchemaBuilder() {
    const accessToken = useSelector((state) => state.auth?.accessToken);
    const permissions = useSelector((state) => state.auth?.user?.permissions) || [];
    // Anyone without the blanket schemas.manage permission (e.g. a Lecturer with only
    // schemas.manage_own) can't pick an audience - the backend forces their forms to
    // targetRole 'own-students' regardless of what's sent, so the picker is just hidden.
    const canTargetAnyone = permissions.includes('schemas.manage');
    const [schemaName, setSchemaName] = useState(`New Form ${Math.floor(Math.random() * 10000)}`);
    const [schemaId, setSchemaId] = useState(null);
    const [schemaDescription, setSchemaDescription] = useState('');
    const [schemaStatus, setSchemaStatus] = useState('draft');
    const [schemaVersion, setSchemaVersion] = useState(1);
    const [lastSavedAt, setLastSavedAt] = useState(null);
    const [targetRole, setTargetRole] = useState(() => canTargetAnyone ? 'all' : 'own-students');
    const [availableTitles, setAvailableTitles] = useState([]);
    const { id } = useParams();

    // --- STATE MANAGEMENT ---
    const [fields, setFields] = useState([]);
    const activeField = fields.find(f => f.active);

    // Populate the "Target Title" picker from the professional Titles real users actually
    // have - skipped entirely for schemas.manage_own-only callers (e.g. a Lecturer), who
    // don't have users.view and wouldn't see the picker anyway.
    useEffect(() => {
        if (!accessToken || !canTargetAnyone) return;
        api.get('/admin/users/titles')
            .then(res => setAvailableTitles(res.data.titles || []))
            .catch(console.error);
    }, [accessToken, canTargetAnyone]);

    useEffect(() => {
        if (id && accessToken) {
            setSchemaId(id);
            api.get(`/schemas/${id}`)
            .then(res => {
                const data = res.data;
                if (data.schema) {
                    setSchemaName(data.schema.name);
                    setSchemaDescription(data.schema.description || '');
                    setSchemaStatus(data.schema.status || 'draft');
                    setSchemaVersion(data.schema.version || 1);
                    setLastSavedAt(data.schema.updatedAt || null);
                    setTargetRole(data.schema.targetRole);
                    const mapTypeFromDB = (dbType) => {
                        const t = dbType.toLowerCase();
                        if (t === 'select') return 'Dropdown';
                        if (t === 'textarea') return 'Long Text';
                        return t.charAt(0).toUpperCase() + t.slice(1);
                    };
                    const loadedFields = data.schema.fields.map((f, i) => {
                        const uiType = mapTypeFromDB(f.type);
                        return {
                            id: f.id,
                            type: uiType,
                            label: f.label,
                            required: f.required,
                            allowMultiple: f.allowMultiple,
                            options: f.options,
                            prompt: f.voicePrompt,
                            icon: ICON_BY_TYPE[uiType] || 'short_text',
                            active: i === 0
                        };
                    });
                    setFields(loadedFields);
                }
            })
            .catch(console.error);
        }
    }, [id, accessToken]);

    // Responsive Pane Toggles
    const [isPaletteOpen, setIsPaletteOpen] = useState(true);
    const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
    
    // Preview Modal State
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewAnswers, setPreviewAnswers] = useState({});
    const [isRecording, setIsRecording] = useState(false);

    const handlePreviewAnswerChange = (id, value) => {
        setPreviewAnswers(prev => ({ ...prev, [id]: value }));
    };

    // Custom Toast State
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type }), 4000);
    };

    // --- FUNCTIONAL HANDLERS ---

    const handleFieldClick = (id) => {
        setFields(fields.map(f => ({ ...f, active: f.id === id })));
        if (window.innerWidth < 1024) {
            setIsPropertiesOpen(true); // Auto-open properties on mobile/tablet
            setIsPaletteOpen(false);
        }
    };

    const handleAddField = (type, icon) => {
        const newField = {
            id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(), // Avoid impure Date.now() directly in render, though it's in a handler here so Date.now() was actually fine, but linter complained. Wait, linter complained about Date.now() in handler? Yes. We'll use a string id.
            type: type,
            label: `New ${type} Field`,
            required: false,
            active: true,
            icon: icon,
            prompt: type === 'Voice' ? 'Please record your answer after the beep.' : undefined,
            allowMultiple: type === 'Checkbox' ? true : undefined,
            options: (type === 'Dropdown' || type === 'Checkbox') ? ['Option 1', 'Option 2'] : undefined
        };
        setFields(fields.map(f => ({ ...f, active: false })).concat(newField));

        if (window.innerWidth < 1024) {
            setIsPaletteOpen(false); // Close palette
            setIsPropertiesOpen(true); // Open properties to edit new field
        }
    };

    const handleDeleteField = (e, id) => {
        e.stopPropagation();
        setFields(fields.filter(f => f.id !== id));
        if (activeField?.id === id) setIsPropertiesOpen(false);
    };

    const updateActiveField = (updates) => {
        setFields(fields.map(f => f.active ? { ...f, ...updates } : f));
    };

    // --- OPTION EDITOR HANDLERS ---
    const handleOptionChange = (index, newValue) => {
        const newOptions = [...activeField.options];
        newOptions[index] = newValue;
        updateActiveField({ options: newOptions });
    };

    const handleAddOption = () => {
        updateActiveField({ options: [...activeField.options, `Option ${activeField.options.length + 1}`] });
    };

    const handleRemoveOption = (index) => {
        const newOptions = activeField.options.filter((_, i) => i !== index);
        updateActiveField({ options: newOptions });
    };

    // --- ACTION BUTTON HANDLERS ---
    const saveSchema = async (isActive) => {
        if (!accessToken) return showToast("Not authenticated", "error");
        if (fields.length === 0) return showToast("You must add at least one field.", "error");
        
        try {
            const mapTypeToDB = (uiType) => {
                switch (uiType.toLowerCase()) {
                    case 'text': return 'text';
                    case 'dropdown': return 'select';
                    case 'checkbox': return 'checkbox';
                    case 'voice': return 'voice';
                    case 'date': return 'date';
                    case 'textarea': return 'textarea';
                    case 'long text': return 'textarea';
                    case 'rating': return 'rating';
                    case 'number': return 'number';
                    case 'file': return 'file';
                    default: return 'text';
                }
            };

            const endpoint = schemaId ? `/schemas/${schemaId}` : '/schemas';
            const method = schemaId ? 'PUT' : 'POST';

            const res = await api({
                method: method,
                url: endpoint,
                data: {
                    name: schemaName,
                    description: schemaDescription,
                    targetRole: targetRole,
                    fields: fields.map(f => ({
                        id: f.id || Math.random().toString(),
                        label: f.label,
                        type: mapTypeToDB(f.type),
                        required: f.required,
                        allowMultiple: f.allowMultiple !== undefined ? f.allowMultiple : true,
                        options: f.options,
                        voicePrompt: f.prompt || f.voicePrompt
                    }))
                }
            });
            
            const data = res.data;
            if (!schemaId) setSchemaId(data.schema._id);
            setLastSavedAt(data.schema.updatedAt || new Date().toISOString());

            if (isActive) {
                const pubRes = await api.post(`/schemas/${data.schema._id}/publish`);
                if (pubRes.status === 200 || pubRes.status === 201) {
                    setSchemaStatus(pubRes.data.schema?.status || 'active');
                    setSchemaVersion(pubRes.data.version || schemaVersion);
                    setLastSavedAt(pubRes.data.schema?.updatedAt || new Date().toISOString());
                    showToast("Schema Published Successfully!", "success");
                } else {
                    showToast("Draft saved, but failed to publish", "error");
                }
            } else {
                setSchemaStatus(data.schema.status || 'draft');
                showToast("Draft saved!", "success");
            }
        } catch (err) {
            console.error(err);
            const data = err.response?.data || {};
            if (data.error && data.error.includes('duplicate key error')) {
                return showToast("Failed: A form with this name already exists.", "error");
            }
            showToast("Error saving schema: " + (data.message || "Unknown error"), "error");
        }
    };

    const handleSaveDraft = () => saveSchema(false);
    const handlePreview = () => setIsPreviewOpen(true);
    const handlePublish = () => saveSchema(true);

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] w-full bg-[#f9f9ff] overflow-hidden font-sans">

            {/* --- MOBILE BACKDROPS --- */}
            {(isPaletteOpen || isPropertiesOpen) && (
                <div
                    className="fixed inset-0 bg-[#181c22]/40 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => { setIsPaletteOpen(false); setIsPropertiesOpen(false); }}
                ></div>
            )}

            {/* TopAppBar Contextual */}
            <header className="h-16 md:h-20 border-b border-[#c7c5d3] bg-white flex flex-wrap items-center justify-between px-4 sm:px-6 shrink-0 z-20">
                <div className="flex items-center gap-3 sm:gap-6">
                    <div className="flex items-center gap-1 sm:gap-2 group cursor-pointer">
                        <input 
                            value={schemaName} 
                            onChange={(e) => setSchemaName(e.target.value)} 
                            className="text-[18px] sm:text-[22px] md:text-2xl font-bold text-[#181c22] truncate max-w-[150px] sm:max-w-[300px] bg-transparent outline-none border-b border-transparent focus:border-[#c7c5d3] transition-colors"
                        />
                        <span className="material-symbols-outlined text-[#777682] group-hover:text-[#222777] transition-colors text-[16px] sm:text-[20px]">edit</span>
                    </div>
                    <div className="hidden lg:flex items-center gap-4 text-[#464651] font-mono text-[13px] font-bold">
                        <input
                            type="text"
                            value={schemaDescription}
                            onChange={(e) => setSchemaDescription(e.target.value)}
                            placeholder="Add a description..."
                            className="bg-transparent outline-none border-b border-transparent focus:border-[#c7c5d3] transition-colors font-mono text-[13px] font-bold text-[#464651] placeholder:text-[#c7c5d3] placeholder:font-normal max-w-[260px]"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-6">
                    {canTargetAnyone ? (
                        <div className="hidden sm:flex items-center gap-2">
                            <span className="text-[12px] font-bold text-[#777682]">Target Title:</span>
                            <select
                                value={targetRole}
                                onChange={(e) => setTargetRole(e.target.value)}
                                className="border border-[#c7c5d3] rounded-md py-1 px-2 bg-[#f9f9ff] text-[#181c22] focus:border-[#222777] focus:ring-1 focus:ring-[#222777] outline-none text-[12px] sm:text-sm font-semibold"
                            >
                                <option value="all">Everyone</option>
                                {/* A lecturer-owned schema an admin is now editing - keep it selectable/labeled
                                    rather than falling into the "not a current title" fallback below. */}
                                {targetRole === 'own-students' && (
                                    <option value="own-students">Own Students Only</option>
                                )}
                                {/* Preserve an old role-based or since-removed title value as its own option so
                                    editing an existing schema doesn't silently lose/reinterpret it */}
                                {targetRole !== 'all' && targetRole !== 'own-students' && !availableTitles.some(t => t.toLowerCase() === targetRole.toLowerCase()) && (
                                    <option value={targetRole}>{targetRole} (not a current title)</option>
                                )}
                                {availableTitles.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div className="hidden sm:flex items-center gap-2">
                            <span className="text-[12px] font-bold text-[#777682]">Visible to:</span>
                            <span className="border border-[#c7c5d3] rounded-md py-1 px-2 bg-[#f9f9ff] text-[#181c22] text-[12px] sm:text-sm font-semibold">
                                Your Students Only
                            </span>
                        </div>
                    )}
                    <div className={`px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-[12px] font-bold flex items-center gap-1.5 shadow-sm border shrink-0 ${(STATUS_BADGE[schemaStatus] || STATUS_BADGE.draft).classes}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${(STATUS_BADGE[schemaStatus] || STATUS_BADGE.draft).dot}`}></span>
                        {(STATUS_BADGE[schemaStatus] || STATUS_BADGE.draft).label}
                    </div>
                </div>
            </header>

            {/* Builder Layout */}
            <div className="flex-1 flex overflow-hidden relative">

                {/* --- LEFT PANEL: Field Palette --- */}
                <aside className={`
                    fixed lg:relative top-[64px] lg:top-0 left-0 h-[calc(100vh-64px)] lg:h-full 
                    w-[260px] lg:w-[22%] lg:min-w-[250px] border-r border-[#c7c5d3] bg-[#f1f3fc] flex flex-col z-50 lg:z-10
                    transform transition-transform duration-300 ease-in-out lg:translate-x-0
                    ${isPaletteOpen ? 'translate-x-0' : '-translate-x-full absolute lg:static'}
                `}>
                    <div className="p-4 border-b border-[#c7c5d3] bg-[#eef0f9] flex justify-between items-center">
                        <h3 className="font-mono text-[13px] font-bold text-[#222777] uppercase tracking-wider">Field Types</h3>
                        <button className="lg:hidden text-[#777682]" onClick={() => setIsPaletteOpen(false)}>
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <div className="p-4 overflow-y-auto pb-24 lg:pb-4">
                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                            {[
                                { name: 'Text', icon: 'short_text' },
                                { name: 'Long Text', icon: 'notes' },
                                { name: 'Voice', icon: 'mic', special: true },
                                { name: 'Dropdown', icon: 'arrow_drop_down_circle' },
                                { name: 'Checkbox', icon: 'check_box' },
                                { name: 'Rating', icon: 'star' },
                                { name: 'Date', icon: 'calendar_today' },
                                { name: 'Number', icon: 'pin' },
                                { name: 'File', icon: 'upload_file' }
                            ].map((tile, i) => (
                                <div
                                    key={i}
                                    onClick={() => handleAddField(tile.name, tile.icon)}
                                    className={`bg-white border rounded-lg p-2 sm:p-3 flex flex-col items-center justify-center gap-1.5 sm:gap-2 cursor-pointer transition-all hover:-translate-y-0.5 group
                                    ${tile.special ? 'border-[#222777] border-dashed shadow-sm hover:shadow-md relative overflow-hidden bg-[#f9f9ff]' : 'border-[#e0e2eb] hover:border-[#3a3f8f] hover:shadow-sm'}`}
                                >
                                    {tile.special && <div className="absolute top-1 right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#00c2cb] rounded-full"></div>}
                                    <span className={`material-symbols-outlined text-[20px] sm:text-[24px] ${tile.special ? 'text-[#222777]' : 'text-[#3a3f8f]'}`}>{tile.icon}</span>
                                    <span className={`text-[11px] sm:text-[12px] font-bold text-center leading-tight ${tile.special ? 'text-[#222777]' : 'text-[#181c22]'}`}>{tile.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* --- CENTER PANEL: Canvas --- */}
                <section className="flex-1 w-full flex flex-col relative bg-white min-w-0">
                    <div className="absolute inset-0 z-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #e0e2eb 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}></div>

                    {/* Mobile Only: Top Action Bar */}
                    <div className="lg:hidden flex items-center justify-between p-3 bg-white border-b border-[#e0e2eb] z-10 shrink-0">
                        <button onClick={() => setIsPaletteOpen(true)} className="flex items-center gap-1 text-[#222777] font-bold text-[13px] bg-[#f1f3fc] px-3 py-1.5 rounded-lg border border-[#e0e2eb]">
                            <span className="material-symbols-outlined text-[18px]">add</span> Add Field
                        </button>
                        <button onClick={() => setIsPropertiesOpen(true)} className="flex items-center gap-1 text-[#006e73] font-bold text-[13px] bg-[#e6fbfc] px-3 py-1.5 rounded-lg border border-[#6bf6ff]/50">
                            Properties <span className="material-symbols-outlined text-[18px]">tune</span>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-4 z-10 relative pb-32">
                        {fields.map((field) => (
                            <div
                                key={field.id}
                                onClick={() => handleFieldClick(field.id)}
                                className={`bg-white rounded-lg flex flex-col group cursor-pointer transition-all border
                                    ${field.active ? 'border-2 border-[#222777] shadow-[0_4px_16px_rgba(58,63,143,0.12)]' : 'border-[#c7c5d3] shadow-[0_1px_4px_rgba(58,63,143,0.08)] hover:border-[#3a3f8f]'}`}
                            >
                                {field.active && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#222777] rounded-l-md"></div>}

                                <div className="p-3 sm:p-4 flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-4 relative">
                                    <span className="hidden sm:block material-symbols-outlined text-[#c7c5d3] cursor-grab hover:text-[#222777] transition-colors shrink-0">drag_indicator</span>
                                    <span className={`material-symbols-outlined p-1.5 rounded-md shrink-0 text-[18px] sm:text-[24px]
                                        ${field.active && field.type === 'Voice' ? 'text-white bg-[#00c2cb]' : 'text-[#3a3f8f] bg-[#f1f3fc]'}`}>
                                        {field.icon}
                                    </span>
                                    <div className="flex-1 min-w-[120px]">
                                        <span className={`font-mono text-[12px] sm:text-[14px] truncate block ${field.active ? 'font-bold text-[#181c22]' : 'font-semibold text-[#464651]'}`}>{field.label}</span>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        {field.required && (
                                            <span className="px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-[#ffdad6] text-[#ba1a1a]">Req</span>
                                        )}
                                        <div className={`flex items-center gap-1 sm:gap-2 transition-opacity ${field.active ? 'opacity-100' : 'opacity-100 lg:opacity-0 lg:group-hover:opacity-100'}`}>
                                            <button className="text-[#3a3f8f] hover:text-[#222777] transition-colors p-1"><span className="material-symbols-outlined text-[18px] sm:text-[20px]">edit</span></button>
                                            <button onClick={(e) => handleDeleteField(e, field.id)} className="text-[#c7c5d3] hover:text-[#ba1a1a] transition-colors p-1">
                                                <span className="material-symbols-outlined text-[18px] sm:text-[20px]">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Canvas preview for Voice Prompt */}
                                {field.active && field.type === 'Voice' && field.prompt && (
                                    <div className="bg-[#f9f9ff] px-4 sm:px-6 py-3 border-t border-[#e0e2eb] flex items-start gap-2 sm:gap-3 rounded-b-lg">
                                        <span className="material-symbols-outlined text-[#00c2cb] text-[16px] sm:text-[18px] mt-0.5">smart_toy</span>
                                        <p className="font-mono text-[11px] sm:text-[12px] text-[#464651] italic leading-relaxed">"{field.prompt}"</p>
                                    </div>
                                )}

                                {/* Canvas preview for Dropdown/Checkbox options */}
                                {field.active && (field.type === 'Dropdown' || field.type === 'Checkbox') && field.options && (
                                    <div className="bg-[#f9f9ff] px-4 sm:px-6 py-3 border-t border-[#e0e2eb] flex flex-wrap gap-2 rounded-b-lg">
                                        {field.options.map((opt, i) => (
                                            <span key={i} className="bg-white border border-[#e0e2eb] text-[#777682] text-[10px] sm:text-[11px] font-bold px-2 py-1 rounded shadow-sm">
                                                {field.type === 'Checkbox' ? '☐' : '▾'} {opt}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Drop Zone */}
                        {fields.length === 0 ? (
                            <div className="border-2 border-dashed border-[#c7c5d3] bg-[#f9f9ff]/50 rounded-lg p-6 sm:h-32 flex flex-col items-center justify-center text-[#777682] hover:border-[#222777] hover:text-[#222777] hover:bg-[#f1f3fc] transition-colors text-center">
                                <span className="material-symbols-outlined text-3xl mb-2">add_box</span>
                                <span className="font-mono text-[12px] sm:text-[13px] font-bold">Tap "+ Add Field" or click left palette to begin</span>
                            </div>
                        ) : (
                            <div
                                onClick={() => { if(window.innerWidth < 1024) setIsPaletteOpen(true); }}
                                className="border-2 border-dashed border-[#c7c5d3] bg-[#f9f9ff]/50 rounded-lg h-20 sm:h-24 flex items-center justify-center text-[#777682] font-mono text-[12px] sm:text-[13px] font-bold cursor-pointer lg:cursor-default hover:border-[#222777] hover:text-[#222777] transition-colors"
                            >
                                Add more fields...
                            </div>
                        )}
                    </div>
                </section>

                {/* --- RIGHT PANEL: Properties --- */}
                <aside className={`
                    fixed lg:relative top-[64px] lg:top-0 right-0 h-[calc(100vh-64px)] lg:h-full 
                    w-[280px] lg:w-[26%] lg:min-w-[300px] border-l border-[#c7c5d3] bg-white flex flex-col z-50 lg:z-10
                    transform transition-transform duration-300 ease-in-out lg:translate-x-0
                    ${isPropertiesOpen ? 'translate-x-0' : 'translate-x-full absolute lg:static'}
                `}>
                    <div className="p-4 border-b border-[#c7c5d3] bg-[#f9f9ff] flex justify-between items-center">
                        <h3 className="font-mono text-[13px] font-bold text-[#222777] uppercase tracking-wider">Field Properties</h3>
                        <div className="flex gap-2">
                            <span className="material-symbols-outlined text-[#777682] text-[20px] hidden lg:block">settings</span>
                            <button className="lg:hidden text-[#777682]" onClick={() => setIsPropertiesOpen(false)}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6 pb-24 lg:pb-6">
                        {activeField ? (
                            <>
                                {/* Selected Type Indicator */}
                                <div className="flex items-center gap-2 sm:gap-3 bg-[#f1f3fc] p-3 rounded-lg border border-[#e0e2eb]">
                                    <span className="material-symbols-outlined text-[#222777] text-[20px]">{activeField.icon}</span>
                                    <span className="font-mono text-[12px] sm:text-[13px] font-bold text-[#181c22]">{activeField.type} Input</span>
                                </div>

                                {/* Basic Props */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[11px] sm:text-[12px] font-bold text-[#464651] mb-2 uppercase tracking-wider">Field Label</label>
                                        <input
                                            type="text"
                                            value={activeField.label}
                                            onChange={(e) => updateActiveField({ label: e.target.value })}
                                            className="w-full border border-[#c7c5d3] rounded-md p-2.5 text-[13px] sm:text-[14px] text-[#181c22] bg-[#f9f9ff] focus:border-[#222777] focus:ring-1 focus:ring-[#222777] outline-none transition-shadow font-semibold"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between pt-1">
                                        <label className="text-[12px] sm:text-[13px] font-bold text-[#464651]">Required Field</label>
                                        <div
                                            onClick={() => updateActiveField({ required: !activeField.required })}
                                            className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${activeField.required ? 'bg-[#222777]' : 'bg-[#c7c5d3]'}`}
                                        >
                                            <div className={`absolute top-[2px] w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${activeField.required ? 'translate-x-[22px]' : 'translate-x-[2px]'}`}></div>
                                        </div>
                                    </div>
                                </div>

                                {/* MULTI-CHOICE EDITOR */}
                                {(activeField.type === 'Dropdown' || activeField.type === 'Checkbox') && (
                                    <div className="pt-5 sm:pt-6 border-t border-[#e0e2eb]">
                                        <label className="block text-[11px] sm:text-[12px] font-bold text-[#464651] mb-3 uppercase tracking-wider">Field Options</label>
                                        <div className="space-y-2 sm:space-y-3">
                                            {activeField.options?.map((option, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-[#c7c5d3] text-[16px] sm:text-[18px] cursor-grab hidden sm:block">drag_indicator</span>
                                                    <input
                                                        type="text"
                                                        value={option}
                                                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                                                        className="flex-1 border border-[#c7c5d3] rounded-md p-2 text-[13px] sm:text-[14px] text-[#181c22] bg-[#f9f9ff] focus:border-[#222777] outline-none"
                                                    />
                                                    <button onClick={() => handleRemoveOption(idx)} className="text-[#c7c5d3] hover:text-[#ba1a1a] transition-colors p-1">
                                                        <span className="material-symbols-outlined text-[18px] sm:text-[20px]">close</span>
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                onClick={handleAddOption}
                                                className="mt-2 text-[#3a3f8f] font-bold text-[12px] sm:text-[13px] hover:text-[#222777] transition-colors flex items-center gap-1"
                                            >
                                                <span className="material-symbols-outlined text-[16px] sm:text-[18px]">add</span> Add Option
                                            </button>
                                        </div>
                                        {activeField.type === 'Checkbox' && (
                                            <div className="mt-4 pt-4 border-t border-[#e0e2eb]">
                                                <label className="flex items-center gap-3 cursor-pointer group">
                                                    <div className="relative">
                                                        <input
                                                            type="checkbox"
                                                            checked={activeField.allowMultiple !== false}
                                                            onChange={(e) => updateActiveField({ allowMultiple: e.target.checked })}
                                                            className="sr-only"
                                                        />
                                                        <div className={`w-10 h-5 rounded-full transition-colors ${activeField.allowMultiple !== false ? 'bg-[#222777]' : 'bg-[#c7c5d3]'}`}></div>
                                                        <div className={`absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform ${activeField.allowMultiple !== false ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                                    </div>
                                                    <div>
                                                        <span className="text-[13px] sm:text-[14px] font-bold text-[#181c22]">Allow Multiple Selections</span>
                                                        <p className="text-[10px] sm:text-[11px] font-mono text-[#777682] mt-0.5">If disabled, users can only select one option.</p>
                                                    </div>
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Voice Specific Settings */}
                                {activeField.type === 'Voice' && (
                                    <div className="pt-5 sm:pt-6 border-t border-[#e0e2eb]">
                                        <label className="flex items-center gap-2 text-[12px] sm:text-[13px] font-bold text-[#222777] mb-2">
                                            <span className="material-symbols-outlined text-[16px] sm:text-[18px]">record_voice_over</span> AI Voice Prompt
                                        </label>
                                        <p className="font-mono text-[10px] sm:text-[11px] text-[#777682] mb-3 leading-relaxed">This text will be spoken to prompt the user before recording.</p>

                                        <div className="relative border border-[#c7c5d3] rounded-lg overflow-hidden focus-within:border-[#222777] focus-within:ring-1 focus-within:ring-[#222777] transition-shadow">
                                            <textarea
                                                value={activeField.prompt || ''}
                                                onChange={(e) => updateActiveField({ prompt: e.target.value })}
                                                className="w-full p-2.5 sm:p-3 h-24 sm:h-28 text-[13px] sm:text-[14px] text-[#181c22] bg-[#f9f9ff] outline-none resize-none"
                                            />
                                            <div className="absolute bottom-2 right-2 flex gap-2">
                                                <button className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white border border-[#e0e2eb] flex items-center justify-center text-[#222777] hover:bg-[#f1f3fc] transition-colors shadow-sm">
                                                    <span className="material-symbols-outlined text-[16px] sm:text-[18px]">play_arrow</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-[#777682] text-[12px] sm:text-[13px] font-bold text-center gap-3 sm:gap-4 opacity-50 px-4">
                                <span className="material-symbols-outlined text-3xl sm:text-4xl">touch_app</span>
                                Select a field from the canvas to edit its properties.
                            </div>
                        )}
                    </div>
                </aside>
            </div>

            {/* Bottom Action Bar */}
            <footer className="h-auto md:h-16 py-3 md:py-0 border-t border-[#c7c5d3] bg-white flex flex-col md:flex-row items-center justify-between px-4 sm:px-8 shrink-0 z-20 gap-3 md:gap-0 absolute md:static bottom-0 w-full">
                <div className="font-mono text-[10px] sm:text-[11px] md:text-[12px] font-bold text-[#777682] text-center md:text-left w-full md:w-auto">
                    Version {schemaVersion} ({(STATUS_BADGE[schemaStatus] || STATUS_BADGE.draft).label}) • {lastSavedAt ? `Last saved ${timeAgo(lastSavedAt)}` : 'Not saved yet'}
                </div>
                <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 sm:gap-4 w-full md:w-auto">
                    <button
                        onClick={handleSaveDraft}
                        className="flex-1 md:flex-none px-3 sm:px-5 py-2 border border-[#c7c5d3] rounded-md font-bold text-[12px] sm:text-[13px] text-[#181c22] hover:bg-[#f9f9ff] transition-colors text-center"
                    >
                        Save
                    </button>
                    <button
                        onClick={handlePreview}
                        className="flex-1 md:flex-none px-3 sm:px-5 py-2 border border-[#00c2cb] rounded-md font-bold text-[12px] sm:text-[13px] text-[#006e73] bg-[#e6fbfc] hover:bg-[#00c2cb] hover:text-white transition-colors text-center"
                    >
                        Preview
                    </button>
                    <button
                        onClick={handlePublish}
                        className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-[#222777] rounded-md font-bold text-[12px] sm:text-[13px] text-white hover:bg-[#3a3f8f] transition-colors shadow-sm text-center"
                    >
                        Publish Schema
                    </button>
                </div>
            </footer>
            
            {/* --- CUSTOM TOAST --- */}
            {toast.show && (
                <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl z-[100] flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 font-sans border-l-4 ${
                    toast.type === 'error' ? 'bg-[#ffdad6] text-[#ba1a1a] border-[#ba1a1a]' : 'bg-[#181c22] text-white border-[#00c2cb]'
                }`}>
                    <span className="material-symbols-outlined text-[24px]">
                        {toast.type === 'error' ? 'error' : 'check_circle'}
                    </span>
                    <span className="font-bold text-[14px] sm:text-[15px]">{toast.message}</span>
                </div>
            )}

            {/* --- PREVIEW OVERLAY --- */}
            {isPreviewOpen && (
                <div className="fixed inset-0 bg-[#181c22]/60 backdrop-blur-sm z-[99] flex items-center justify-center p-4 lg:p-8">
                    <div className="bg-[#f9f9ff] w-full max-w-3xl h-full lg:h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="bg-[#222777] text-white px-6 sm:px-8 py-5 sm:py-6 flex justify-between items-center shrink-0 shadow-md z-10 relative">
                            <div>
                                <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-1">{schemaName}</h2>
                                <p className="text-[#c7c5d3] text-xs sm:text-sm font-semibold">Previewing as {targetRole === 'all' ? 'Everyone' : targetRole === 'own-students' ? 'Your Students Only' : targetRole}</p>
                            </div>
                            <button
                                onClick={() => setIsPreviewOpen(false)}
                                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
                            >
                                <span className="material-symbols-outlined text-[24px]">close</span>
                            </button>
                        </div>
                        
                        {/* Scrollable Form Body */}
                        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar relative">
                            {fields.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-[#777682] opacity-50">
                                    <span className="material-symbols-outlined text-[48px] mb-4">edit_note</span>
                                    <p className="font-bold">No fields added to this schema yet.</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-6 sm:gap-8 max-w-2xl mx-auto">
                                    {fields.map(field => (
                                        <div key={field.id} className="flex flex-col gap-2">
                                            <label className="text-[14px] sm:text-[15px] font-bold text-[#181c22]">
                                                {field.label} {field.required && <span className="text-[#ba1a1a]">*</span>}
                                            </label>
                                            
                                            {field.type.toLowerCase() === 'voice' ? (
                                                <VoiceRecorder
                                                    value={previewAnswers[field.id] || ''}
                                                    onChange={(val) => handlePreviewAnswerChange(field.id, val)}
                                                    prompt={field.prompt}
                                                />
                                            ) : field.type.toLowerCase() === 'textarea' ? (
                                                <textarea
                                                    value={previewAnswers[field.id] || ''} onChange={(e) => handlePreviewAnswerChange(field.id, e.target.value)}
                                                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                                                    className="w-full bg-white border border-[#c7c5d3] rounded-xl p-4 text-[14px] sm:text-[15px] focus:border-[#222777] focus:ring-1 focus:ring-[#222777] outline-none text-[#181c22] resize-none h-32 shadow-sm transition-shadow"
                                                />
                                            ) : field.type.toLowerCase() === 'dropdown' || field.type.toLowerCase() === 'select' ? (
                                                <div className="relative">
                                                    <select value={previewAnswers[field.id] || ''} onChange={(e) => handlePreviewAnswerChange(field.id, e.target.value)} className="w-full appearance-none bg-white border border-[#c7c5d3] rounded-xl py-3 sm:py-3.5 pl-4 pr-10 text-[14px] sm:text-[15px] font-semibold text-[#464651] focus:border-[#222777] focus:ring-1 focus:ring-[#222777] outline-none shadow-sm transition-shadow cursor-pointer">
                                                        <option value="">Select an option</option>
                                                        {field.options?.map((opt, i) => (
                                                            <option key={i} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-[#777682] pointer-events-none text-[20px]">expand_more</span>
                                                </div>
                                            ) : field.type.toLowerCase() === 'checkbox' ? (
                                                <div className="flex flex-col gap-3 mt-2">
                                                    {field.options?.map((opt, i) => (
                                                        <label key={i} className="flex items-center gap-3 group cursor-pointer">
                                                            <input type={field.allowMultiple === false ? "radio" : "checkbox"} name={`preview_${field.id}`} checked={(previewAnswers[field.id] || []).includes(opt)} onChange={() => {
                                                                if (field.allowMultiple === false) {
                                                                    handlePreviewAnswerChange(field.id, [opt]);
                                                                } else {
                                                                    const current = previewAnswers[field.id] || [];
                                                                    const next = current.includes(opt) ? current.filter(x => x !== opt) : [...current, opt];
                                                                    handlePreviewAnswerChange(field.id, next);
                                                                }
                                                            }} className={`w-5 h-5 border-[#c7c5d3] text-[#222777] focus:ring-[#222777] cursor-pointer ${field.allowMultiple === false ? 'rounded-full' : 'rounded'}`} />
                                                            <span className="text-[#464651] text-[14px] sm:text-[15px] font-semibold group-hover:text-[#181c22] transition-colors">{opt}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            ) : field.type.toLowerCase() === 'date' ? (
                                                <div className="relative">
                                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#777682] text-[20px]">calendar_today</span>
                                                    <input
                                                        type="date"
                                                        value={previewAnswers[field.id] || ''} onChange={(e) => handlePreviewAnswerChange(field.id, e.target.value)}
                                                        className="w-full bg-white border border-[#c7c5d3] rounded-xl py-3 sm:py-3.5 pl-11 pr-4 text-[14px] sm:text-[15px] font-semibold text-[#464651] focus:border-[#222777] focus:ring-1 focus:ring-[#222777] outline-none shadow-sm transition-shadow"
                                                    />
                                                </div>
                                            ) : field.type.toLowerCase() === 'number' ? (
                                                <input
                                                    type="number"
                                                    value={previewAnswers[field.id] || ''} onChange={(e) => handlePreviewAnswerChange(field.id, e.target.value)}
                                                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                                                    className="w-full bg-white border border-[#c7c5d3] rounded-xl px-4 py-3 sm:py-3.5 text-[14px] sm:text-[15px] focus:border-[#222777] focus:ring-1 focus:ring-[#222777] outline-none text-[#181c22] shadow-sm transition-shadow"
                                                />
                                            ) : field.type.toLowerCase() === 'rating' ? (
                                                <div className="flex gap-2">
                                                    {[1,2,3,4,5].map(star => (
                                                        <button key={star} onClick={() => handlePreviewAnswerChange(field.id, star)} className={`material-symbols-outlined text-[28px] sm:text-[32px] hover:text-[#e06c43] transition-colors cursor-pointer ${(previewAnswers[field.id] >= star) ? 'text-[#e06c43]' : 'text-[#c7c5d3]'}`} style={{ fontVariationSettings: (previewAnswers[field.id] >= star) ? "'FILL' 1" : "'FILL' 0" }}>star</button>
                                                    ))}
                                                </div>
                                            ) : field.type.toLowerCase() === 'file' ? (
                                                <input type="file" className="text-[14px] file:mr-4 file:py-2.5 file:px-5 file:rounded-md file:border-0 file:text-[14px] file:font-semibold file:bg-[#f1f3fc] file:text-[#222777] hover:file:bg-[#e0e2eb] cursor-pointer" />
                                            ) : (
                                                <input
                                                    type="text"
                                                    value={previewAnswers[field.id] || ''} onChange={(e) => handlePreviewAnswerChange(field.id, e.target.value)}
                                                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                                                    className="w-full bg-white border border-[#c7c5d3] rounded-xl px-4 py-3 sm:py-3.5 text-[14px] sm:text-[15px] focus:border-[#222777] focus:ring-1 focus:ring-[#222777] outline-none text-[#181c22] shadow-sm transition-shadow"
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        {/* Footer */}
                        <div className="border-t border-[#e0e2eb] bg-white p-5 sm:p-6 shrink-0 flex justify-end">
                            <button
                                onClick={() => setIsPreviewOpen(false)}
                                className="bg-[#222777] text-white font-bold text-[14px] sm:text-[15px] px-8 py-3 rounded-lg hover:bg-[#3a3f8f] transition-colors shadow-md"
                            >
                                Close Preview
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}