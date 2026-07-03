// frontend/src/pages/SchemaBuilder.jsx
import React, { useState } from 'react';

export default function SchemaBuilder() {
    // --- STATE MANAGEMENT ---
    const [fields, setFields] = useState([
        { id: 1, type: 'Text', label: 'Patient Full Name', required: true, active: false, icon: 'short_text' },
        { id: 2, type: 'Voice', label: 'Chief Complaint (Audio)', required: true, active: true, icon: 'mic', prompt: 'Please describe your primary reason for visiting today, including when symptoms started.' }
    ]);

    const activeField = fields.find(f => f.active);

    // --- FUNCTIONAL HANDLERS ---

    const handleFieldClick = (id) => {
        setFields(fields.map(f => ({ ...f, active: f.id === id })));
    };

    const handleAddField = (type, icon) => {
        const newField = {
            id: Date.now(),
            type: type,
            label: `New ${type} Field`,
            required: false,
            active: true,
            icon: icon,
            // Attach a prompt if it's voice, or default options if it's a multi-choice field
            prompt: type === 'Voice' ? 'Please record your answer after the beep.' : undefined,
            options: (type === 'Dropdown' || type === 'Checkbox') ? ['Option 1', 'Option 2'] : undefined
        };
        setFields(fields.map(f => ({ ...f, active: false })).concat(newField));
    };

    const handleDeleteField = (e, id) => {
        e.stopPropagation();
        setFields(fields.filter(f => f.id !== id));
    };

    const updateActiveField = (updates) => {
        setFields(fields.map(f => f.active ? { ...f, ...updates } : f));
    };

    // --- OPTION EDITOR HANDLERS (For Dropdowns & Checkboxes) ---
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
    const handleSaveDraft = () => {
        alert("Draft saved! (This will trigger POST /api/schemas with status: 'draft')");
    };

    const handlePreview = () => {
        alert("Launching Preview Mode... (This will open a modal showing the form exactly as users see it)");
    };

    const handlePublish = () => {
        if (fields.length === 0) return alert("You must add at least one field to publish a schema.");
        alert("Schema Published Successfully! It is now active for Nurse Practitioners. (This triggers POST /schemas/:id/publish)");
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] w-full bg-[#f9f9ff] overflow-hidden">
            {/* TopAppBar Contextual */}
            <header className="h-16 border-b border-[#c7c5d3] bg-white flex items-center justify-between px-6 shrink-0 z-10">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 group cursor-pointer">
                        <h2 className="text-2xl font-bold text-[#181c22]">Patient Intake Form</h2>
                        <span className="material-symbols-outlined text-[#777682] group-hover:text-[#222777] transition-colors text-[20px]">edit</span>
                    </div>
                    <div className="flex items-center gap-4 text-[#464651] font-mono text-[13px] font-bold">
                        <span>Clinical standard data collection</span>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="text-[12px] font-bold text-[#777682]">Target Role:</span>
                        <select className="border border-[#c7c5d3] rounded-md py-1 px-2 bg-[#f9f9ff] text-[#181c22] focus:border-[#222777] focus:ring-1 focus:ring-[#222777] outline-none text-sm font-semibold">
                            <option>Nurse Practitioner</option>
                            <option>Physician</option>
                            <option>Admin</option>
                        </select>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-[#ffdad6] text-[#93000a] text-[12px] font-bold flex items-center gap-1.5 shadow-sm border border-[#ffdad6]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a]"></span>
                        Draft
                    </div>
                </div>
            </header>

            {/* Builder Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* LEFT PANEL: Field Palette (22%) */}
                <aside className="w-[22%] min-w-[250px] border-r border-[#c7c5d3] bg-[#f1f3fc] flex flex-col h-full z-10">
                    <div className="p-4 border-b border-[#c7c5d3] bg-[#eef0f9]">
                        <h3 className="font-mono text-[13px] font-bold text-[#222777] uppercase tracking-wider">Field Types</h3>
                    </div>
                    <div className="p-4 overflow-y-auto">
                        <div className="grid grid-cols-2 gap-3">
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
                                    className={`bg-white border rounded-lg p-3 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5 group
                                    ${tile.special ? 'border-[#222777] border-dashed shadow-sm hover:shadow-md relative overflow-hidden bg-[#f9f9ff]' : 'border-[#e0e2eb] hover:border-[#3a3f8f] hover:shadow-sm'}`}
                                >
                                    {tile.special && <div className="absolute top-1 right-1 w-2 h-2 bg-[#00c2cb] rounded-full"></div>}
                                    <span className={`material-symbols-outlined ${tile.special ? 'text-[#222777]' : 'text-[#3a3f8f]'}`}>{tile.icon}</span>
                                    <span className={`text-[12px] font-bold ${tile.special ? 'text-[#222777]' : 'text-[#181c22]'}`}>{tile.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* CENTER PANEL: Canvas (52%) */}
                <section className="w-[52%] flex-1 flex flex-col relative bg-white">
                    <div className="absolute inset-0 z-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #e0e2eb 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}></div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-4 z-10 relative">
                        {fields.map((field) => (
                            <div
                                key={field.id}
                                onClick={() => handleFieldClick(field.id)}
                                className={`bg-white rounded-lg flex flex-col group cursor-pointer transition-all border
                                    ${field.active ? 'border-2 border-[#222777] shadow-[0_4px_16px_rgba(58,63,143,0.12)]' : 'border-[#c7c5d3] shadow-[0_1px_4px_rgba(58,63,143,0.08)] hover:border-[#3a3f8f]'}`}
                            >
                                {field.active && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#222777] rounded-l-md"></div>}

                                <div className="p-4 flex items-center gap-4 relative">
                                    <span className="material-symbols-outlined text-[#c7c5d3] cursor-grab hover:text-[#222777] transition-colors">drag_indicator</span>
                                    <span className={`material-symbols-outlined p-1.5 rounded-md
                                        ${field.active && field.type === 'Voice' ? 'text-white bg-[#00c2cb]' : 'text-[#3a3f8f] bg-[#f1f3fc]'}`}>
                                        {field.icon}
                                    </span>
                                    <div className="flex-1">
                                        <span className={`font-mono text-[14px] ${field.active ? 'font-bold text-[#181c22]' : 'font-semibold text-[#464651]'}`}>{field.label}</span>
                                    </div>
                                    {field.required && (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#ffdad6] text-[#ba1a1a]">Required</span>
                                    )}
                                    <div className={`flex items-center gap-2 ml-4 transition-opacity ${field.active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                        <button className="text-[#3a3f8f] hover:text-[#222777] transition-colors"><span className="material-symbols-outlined text-[20px]">edit</span></button>
                                        <button
                                            onClick={(e) => handleDeleteField(e, field.id)}
                                            className="text-[#c7c5d3] hover:text-[#ba1a1a] transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">delete</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Canvas preview for Voice Prompt */}
                                {field.active && field.type === 'Voice' && field.prompt && (
                                    <div className="bg-[#f9f9ff] px-6 py-3 border-t border-[#e0e2eb] flex items-start gap-3 rounded-b-lg">
                                        <span className="material-symbols-outlined text-[#00c2cb] text-[18px] mt-0.5">smart_toy</span>
                                        <p className="font-mono text-[12px] text-[#464651] italic leading-relaxed">"{field.prompt}"</p>
                                    </div>
                                )}

                                {/* Canvas preview for Dropdown/Checkbox options */}
                                {field.active && (field.type === 'Dropdown' || field.type === 'Checkbox') && field.options && (
                                    <div className="bg-[#f9f9ff] px-6 py-3 border-t border-[#e0e2eb] flex flex-wrap gap-2 rounded-b-lg">
                                        {field.options.map((opt, i) => (
                                            <span key={i} className="bg-white border border-[#e0e2eb] text-[#777682] text-[11px] font-bold px-2 py-1 rounded shadow-sm">
                                                {field.type === 'Checkbox' ? '☐' : '▾'} {opt}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Drop Zone */}
                        {fields.length === 0 ? (
                            <div className="border-2 border-dashed border-[#c7c5d3] bg-[#f9f9ff]/50 rounded-lg h-32 flex flex-col items-center justify-center text-[#777682] hover:border-[#222777] hover:text-[#222777] hover:bg-[#f1f3fc] transition-colors">
                                <span className="material-symbols-outlined text-3xl mb-2">add_box</span>
                                <span className="font-mono text-[13px] font-bold">Click fields on the left to add them to your form</span>
                            </div>
                        ) : (
                            <div className="border-2 border-dashed border-[#c7c5d3] bg-[#f9f9ff]/50 rounded-lg h-24 flex items-center justify-center text-[#777682] font-mono text-[13px] font-bold">
                                Add more fields...
                            </div>
                        )}
                    </div>
                </section>

                {/* RIGHT PANEL: Properties (26%) */}
                <aside className="w-[26%] min-w-[300px] border-l border-[#c7c5d3] bg-white flex flex-col h-full z-10">
                    <div className="p-4 border-b border-[#c7c5d3] bg-[#f9f9ff] flex justify-between items-center">
                        <h3 className="font-mono text-[13px] font-bold text-[#222777] uppercase tracking-wider">Field Properties</h3>
                        <span className="material-symbols-outlined text-[#777682] text-[20px]">settings</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {activeField ? (
                            <>
                                {/* Selected Type Indicator */}
                                <div className="flex items-center gap-3 bg-[#f1f3fc] p-3 rounded-lg border border-[#e0e2eb]">
                                    <span className="material-symbols-outlined text-[#222777]">{activeField.icon}</span>
                                    <span className="font-mono text-[13px] font-bold text-[#181c22]">{activeField.type} Input</span>
                                </div>

                                {/* Basic Props */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[12px] font-bold text-[#464651] mb-2 uppercase tracking-wider">Field Label</label>
                                        <input
                                            type="text"
                                            value={activeField.label}
                                            onChange={(e) => updateActiveField({ label: e.target.value })}
                                            className="w-full border border-[#c7c5d3] rounded-md p-2.5 text-[14px] text-[#181c22] bg-[#f9f9ff] focus:border-[#222777] focus:ring-1 focus:ring-[#222777] outline-none transition-shadow font-semibold"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between pt-1">
                                        <label className="text-[13px] font-bold text-[#464651]">Required Field</label>
                                        <div
                                            onClick={() => updateActiveField({ required: !activeField.required })}
                                            className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${activeField.required ? 'bg-[#222777]' : 'bg-[#c7c5d3]'}`}
                                        >
                                            <div className={`absolute top-[2px] w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${activeField.required ? 'translate-x-[22px]' : 'translate-x-[2px]'}`}></div>
                                        </div>
                                    </div>
                                </div>

                                {/* MULTI-CHOICE EDITOR (Dropdown/Checkbox) */}
                                {(activeField.type === 'Dropdown' || activeField.type === 'Checkbox') && (
                                    <div className="pt-6 border-t border-[#e0e2eb]">
                                        <label className="block text-[12px] font-bold text-[#464651] mb-3 uppercase tracking-wider">Field Options</label>
                                        <div className="space-y-3">
                                            {activeField.options?.map((option, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-[#c7c5d3] text-[18px] cursor-grab">drag_indicator</span>
                                                    <input
                                                        type="text"
                                                        value={option}
                                                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                                                        className="flex-1 border border-[#c7c5d3] rounded-md p-2 text-[14px] text-[#181c22] bg-[#f9f9ff] focus:border-[#222777] outline-none"
                                                    />
                                                    <button
                                                        onClick={() => handleRemoveOption(idx)}
                                                        className="text-[#c7c5d3] hover:text-[#ba1a1a] transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-[20px]">close</span>
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                onClick={handleAddOption}
                                                className="mt-2 text-[#3a3f8f] font-bold text-[13px] hover:text-[#222777] transition-colors flex items-center gap-1"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">add</span> Add Option
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Voice Specific Settings */}
                                {activeField.type === 'Voice' && (
                                    <div className="pt-6 border-t border-[#e0e2eb]">
                                        <label className="flex items-center gap-2 text-[13px] font-bold text-[#222777] mb-2">
                                            <span className="material-symbols-outlined text-[18px]">record_voice_over</span> AI Voice Prompt
                                        </label>
                                        <p className="font-mono text-[11px] text-[#777682] mb-3 leading-relaxed">This text will be spoken to prompt the user before recording.</p>

                                        <div className="relative border border-[#c7c5d3] rounded-lg overflow-hidden focus-within:border-[#222777] focus-within:ring-1 focus-within:ring-[#222777] transition-shadow">
                                            <textarea
                                                value={activeField.prompt || ''}
                                                onChange={(e) => updateActiveField({ prompt: e.target.value })}
                                                className="w-full p-3 h-28 text-[14px] text-[#181c22] bg-[#f9f9ff] outline-none resize-none"
                                            />
                                            <div className="absolute bottom-2 right-2 flex gap-2">
                                                <button className="w-8 h-8 rounded-full bg-white border border-[#e0e2eb] flex items-center justify-center text-[#222777] hover:bg-[#f1f3fc] transition-colors shadow-sm">
                                                    <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-[#777682] text-[13px] font-bold text-center gap-4 opacity-50">
                                <span className="material-symbols-outlined text-4xl">touch_app</span>
                                Select a field from the canvas to edit its properties.
                            </div>
                        )}
                    </div>
                </aside>
            </div>

            {/* Bottom Action Bar */}
            <footer className="h-16 border-t border-[#c7c5d3] bg-white flex items-center justify-between px-8 shrink-0 z-20">
                <div className="font-mono text-[12px] font-bold text-[#777682]">
                    Version 1 (Draft) • Last saved 2 mins ago
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleSaveDraft}
                        className="px-5 py-2 border border-[#c7c5d3] rounded-md font-bold text-[13px] text-[#181c22] hover:bg-[#f9f9ff] transition-colors"
                    >
                        Save Draft
                    </button>
                    <button
                        onClick={handlePreview}
                        className="px-5 py-2 border border-[#00c2cb] rounded-md font-bold text-[13px] text-[#006e73] bg-[#e6fbfc] hover:bg-[#00c2cb] hover:text-white transition-colors"
                    >
                        Preview
                    </button>
                    <button
                        onClick={handlePublish}
                        className="px-6 py-2 bg-[#222777] rounded-md font-bold text-[13px] text-white hover:bg-[#3a3f8f] transition-colors shadow-sm"
                    >
                        Publish Schema
                    </button>
                </div>
            </footer>
        </div>
    );
}