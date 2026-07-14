import React, { useState } from 'react';
import { useSelector } from 'react-redux';

export default function SchemaBuilder() {
    const accessToken = useSelector((state) => state.auth?.accessToken);
    const [schemaName, setSchemaName] = useState('New Dynamic Form');
    // --- STATE MANAGEMENT ---
    const [fields, setFields] = useState([]);

    const activeField = fields.find(f => f.active);

    // Responsive Pane Toggles
    const [isPaletteOpen, setIsPaletteOpen] = useState(false);
    const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);

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
        if (!accessToken) return alert("Not authenticated");
        if (fields.length === 0) return alert("You must add at least one field.");
        
        try {
            const res = await fetch('http://localhost:5000/api/v1/schemas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    name: schemaName,
                    description: "Custom built schema",
                    isActive,
                    fields: fields.map(f => ({
                        label: f.label,
                        type: f.type,
                        required: f.required,
                        options: f.options,
                        prompt: f.prompt
                    }))
                })
            });
            if (res.ok) alert(isActive ? "Schema Published Successfully!" : "Draft saved!");
            else alert("Failed to save schema");
        } catch (err) {
            console.error(err);
            alert("Error saving schema");
        }
    };

    const handleSaveDraft = () => saveSchema(false);
    const handlePreview = () => alert("Launching Preview Mode...");
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
                        <span>Clinical standard data collection</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-6">
                    <div className="hidden sm:flex items-center gap-2">
                        <span className="text-[12px] font-bold text-[#777682]">Target Role:</span>
                        <select className="border border-[#c7c5d3] rounded-md py-1 px-2 bg-[#f9f9ff] text-[#181c22] focus:border-[#222777] focus:ring-1 focus:ring-[#222777] outline-none text-[12px] sm:text-sm font-semibold">
                            <option>Nurse Practitioner</option>
                            <option>Physician</option>
                            <option>Admin</option>
                        </select>
                    </div>
                    <div className="px-2 sm:px-3 py-1 rounded-full bg-[#ffdad6] text-[#93000a] text-[10px] sm:text-[12px] font-bold flex items-center gap-1.5 shadow-sm border border-[#ffdad6] shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a]"></span>
                        Draft
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
                    Version 1 (Draft) • Last saved 2 mins ago
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
        </div>
    );
}