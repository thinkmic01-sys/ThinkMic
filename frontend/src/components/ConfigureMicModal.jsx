import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getSelectedMicDeviceId, setSelectedMicDeviceId } from '../services/micDevice';

export default function ConfigureMicModal({ onClose }) {
    const [devices, setDevices] = useState([]);
    const [selected, setSelected] = useState(getSelectedMicDeviceId());
    const [status, setStatus] = useState('loading'); // loading, ready, denied, error

    useEffect(() => {
        let tempStream = null;
        (async () => {
            try {
                // Device labels stay blank until permission is granted - request briefly just
                // to unlock labels, then stop the temp stream immediately.
                tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const all = await navigator.mediaDevices.enumerateDevices();
                setDevices(all.filter((d) => d.kind === 'audioinput'));
                setStatus('ready');
            } catch (err) {
                setStatus(err.name === 'NotAllowedError' ? 'denied' : 'error');
            } finally {
                if (tempStream) tempStream.getTracks().forEach((t) => t.stop());
            }
        })();
        return () => {
            if (tempStream) tempStream.getTracks().forEach((t) => t.stop());
        };
    }, []);

    const handleSave = () => {
        setSelectedMicDeviceId(selected);
        onClose();
    };

    // Portaled to document.body - Sidebar's translate-x transform (for the mobile slide-in/out
    // drawer) makes it a containing block for fixed-position descendants, which would clip a
    // nested modal to the 280px sidebar instead of covering the full viewport.
    return createPortal(
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-[#075e51]">Configure Microphone</h3>
                    <button onClick={onClose} className="text-[#777682] hover:text-[#181c22]">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {status === 'loading' && (
                    <p className="text-sm text-[#777682] py-6 text-center">Requesting microphone access...</p>
                )}
                {status === 'denied' && (
                    <p className="text-sm text-[#ba1a1a] py-6 text-center">Microphone access was denied. Allow microphone access in your browser's site settings to choose a device.</p>
                )}
                {status === 'error' && (
                    <p className="text-sm text-[#ba1a1a] py-6 text-center">Couldn't list your microphones. Make sure a microphone is connected and try again.</p>
                )}

                {status === 'ready' && (
                    <>
                        <p className="text-xs text-[#777682] mb-3">Choose which microphone ThinkMic should use for recordings and live seminars.</p>
                        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                            <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${selected === '' ? 'border-[#075e51] bg-[#f1f3fc]' : 'border-[#e0e2eb]'}`}>
                                <input type="radio" name="mic" checked={selected === ''} onChange={() => setSelected('')} />
                                <span className="text-sm font-semibold text-[#181c22]">System Default</span>
                            </label>
                            {devices.map((d, i) => (
                                <label key={d.deviceId} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${selected === d.deviceId ? 'border-[#075e51] bg-[#f1f3fc]' : 'border-[#e0e2eb]'}`}>
                                    <input type="radio" name="mic" checked={selected === d.deviceId} onChange={() => setSelected(d.deviceId)} />
                                    <span className="text-sm font-semibold text-[#181c22] truncate">{d.label || `Microphone ${i + 1}`}</span>
                                </label>
                            ))}
                            {devices.length === 0 && (
                                <p className="text-xs text-[#777682] py-4 text-center">No additional microphones found - only the system default is available.</p>
                            )}
                        </div>
                        <button onClick={handleSave} className="mt-5 w-full bg-[#075e51] text-white font-bold text-sm py-2.5 rounded-lg hover:bg-[#097969] transition-colors">
                            Save
                        </button>
                    </>
                )}
            </div>
        </div>,
        document.body
    );
}
