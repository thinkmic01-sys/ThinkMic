const STORAGE_KEY = 'thinkmic_selected_mic_device_id';

export const getSelectedMicDeviceId = () => localStorage.getItem(STORAGE_KEY) || '';

export const setSelectedMicDeviceId = (deviceId) => {
    if (deviceId) {
        localStorage.setItem(STORAGE_KEY, deviceId);
    } else {
        localStorage.removeItem(STORAGE_KEY);
    }
};

// Requests the microphone chosen in "Configure Mic" (Sidebar). Falls back to the browser's
// default input if none was chosen, or if the previously-chosen device was unplugged/no
// longer valid (getUserMedia throws OverconstrainedError in that case) - clearing the stale
// id so future recordings don't keep retrying a dead device.
export const getMicStream = async () => {
    const deviceId = getSelectedMicDeviceId();
    if (!deviceId) {
        return navigator.mediaDevices.getUserMedia({ audio: true });
    }
    try {
        return await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: deviceId } } });
    } catch (err) {
        console.warn('Selected microphone unavailable, falling back to default input:', err);
        setSelectedMicDeviceId('');
        return navigator.mediaDevices.getUserMedia({ audio: true });
    }
};
