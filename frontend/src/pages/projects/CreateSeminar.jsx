import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import { MapContainer, TileLayer, Marker, useMapEvents, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Use the beautiful custom marker from NearbySeminars
const customMarkerIcon = L.divIcon({
    className: 'bg-transparent border-none',
    html: `
        <div class="flex flex-col items-center" style="transform: translate(-50%, -100%); margin-top: 8px;">
            <div class="w-5 h-5 bg-[#00c2cb] rounded-full border-2 border-white shadow-md flex items-center justify-center relative">
                <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
                <div class="absolute inset-0 rounded-full border-2 border-[#00c2cb] animate-ping opacity-50"></div>
            </div>
            <div class="w-1 h-3 bg-gradient-to-b from-[#00c2cb] to-transparent mt-0.5"></div>
        </div>
    `,
    iconSize: [0, 0]
});

function LocationMapPicker({ locationString, setLocationString }) {
    // Default to Boston center
    const [position, setPosition] = useState([42.3601, -71.0589]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const mapRef = useRef(null);

    const MapEvents = () => {
        useMapEvents({
            click(e) {
                setPosition([e.latlng.lat, e.latlng.lng]);
                setLocationString(`${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`);
            },
        });
        return null;
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        
        setIsSearching(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
            const data = await res.json();
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                setPosition([lat, lon]);
                setLocationString(data[0].display_name);
                if (mapRef.current) {
                    mapRef.current.flyTo([lat, lon], 14);
                }
            } else {
                alert("Location not found.");
            }
        } catch (err) {
            console.error("Geocoding error", err);
        } finally {
            setIsSearching(false);
        }
    };

    // Handle Leaflet resize when expanding or initially loading
    useEffect(() => {
        if (mapRef.current) {
            setTimeout(() => {
                mapRef.current.invalidateSize();
            }, 100);
            setTimeout(() => {
                mapRef.current.invalidateSize();
            }, 400); // Wait for CSS transition
        }
    }, [isExpanded]);

    return (
        <div className={`w-full rounded-xl border border-[#c7c5d3] overflow-hidden mt-3 relative z-0 transition-all duration-300 ease-in-out bg-[#e0e2eb] ${isExpanded ? 'h-[65vh] shadow-[0_8px_30px_rgba(34,39,119,0.15)] ring-2 ring-[#00c2cb]/50' : 'h-64 hover:shadow-md'}`}>
            
            {/* Top Toolbar overlay - moved below map zoom controls by shifting right and styled better */}
            <div className="absolute top-3 left-3 right-3 z-[1000] flex gap-2 sm:gap-3 items-center pointer-events-none">
                <form onSubmit={handleSearch} className="flex-1 flex shadow-[0_4px_12px_rgba(0,0,0,0.1)] rounded-lg overflow-hidden bg-white/95 backdrop-blur pointer-events-auto border border-[#c7c5d3]/50 transition-all focus-within:ring-2 focus-within:ring-[#00c2cb]/50">
                    <span className="material-symbols-outlined text-[#777682] text-[18px] pl-3 py-2">search</span>
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search for a city, landmark, or address..."
                        className="flex-1 px-2 py-2 text-[13px] outline-none bg-transparent font-medium text-[#181c22] placeholder:text-[#777682]"
                    />
                    <button type="submit" disabled={isSearching} className="bg-transparent px-3 text-[#222777] border-l border-[#e0e2eb]/50 hover:bg-[#f1f3fc] transition-colors flex items-center justify-center">
                        <span className="material-symbols-outlined text-[18px]">{isSearching ? 'hourglass_empty' : 'arrow_forward'}</span>
                    </button>
                </form>
                
                <button 
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="bg-white/95 backdrop-blur shadow-[0_4px_12px_rgba(0,0,0,0.1)] rounded-lg w-9 h-9 sm:w-10 sm:h-10 text-[#222777] border border-[#c7c5d3]/50 hover:bg-[#f1f3fc] transition-colors flex items-center justify-center pointer-events-auto shrink-0"
                    title={isExpanded ? "Collapse Map" : "Expand Map"}
                >
                    <span className="material-symbols-outlined text-[20px]">{isExpanded ? 'fullscreen_exit' : 'fullscreen'}</span>
                </button>
            </div>

            <MapContainer 
                center={position} 
                zoom={13} 
                style={{ height: '100%', width: '100%' }} 
                attributionControl={false} 
                zoomControl={false}
                ref={mapRef}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                <ZoomControl position="bottomright" />
                <Marker position={position} icon={customMarkerIcon} />
                <MapEvents />
            </MapContainer>
        </div>
    );
}

export default function CreateSeminar() {
    const navigate = useNavigate();
    
    const user = useSelector(state => state.auth?.user);
    const token = useSelector(state => state.auth?.accessToken);
    const userName = user?.name || 'Dr. A. Turing';
    const userInitials = userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // --- FORM STATE ---
    const [title, setTitle] = useState('');
    const [abstract, setAbstract] = useState('');
    const [category, setCategory] = useState('Machine Learning');
    const [tags, setTags] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [locationInput, setLocationInput] = useState('');
    const [hostName, setHostName] = useState('');
    const [hostImageUrl, setHostImageUrl] = useState('');
    const [date, setDate] = useState(today);
    const [startTime, setStartTime] = useState('14:00');
    const [endTime, setEndTime] = useState('15:30');
    const [format, setFormat] = useState('Live Broadcast');
    const [rewardEnabled, setRewardEnabled] = useState(false);
    const [rewardPerUser, setRewardPerUser] = useState(0);
    const [rewardMaxRecipients, setRewardMaxRecipients] = useState(0);
    const availableCoins = user?.coins || 0;
    const totalRewardRequired = (Number(rewardPerUser) || 0) * (Number(rewardMaxRecipients) || 0);

    // --- CUSTOM TOAST STATE ---
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
    };

    const imageInputRef = useRef(null);
    const hostImageInputRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isUploadingHost, setIsUploadingHost] = useState(false);

    const handleImageUpload = async (e, isHost = false) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (isHost) setIsUploadingHost(true);
        else setIsUploading(true);

        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await api.post('/upload', formData);
            const data = response.data;
            if (isHost) setHostImageUrl(data.url);
            else setImageUrl(data.url);
            showToast('Image uploaded successfully!', 'success');
        } catch (error) {
            showToast('An error occurred during upload.', 'error');
        } finally {
            if (isHost) setIsUploadingHost(false);
            else setIsUploading(false);
        }
    };

    const formatOptions = [
        { id: 'Live Broadcast', icon: 'sensors' },
        { id: 'Pre-Recorded', icon: 'videocam' },
        { id: 'In-Person', icon: 'location_on' }
    ];

    const handleSchedule = async (statusToSave = 'scheduled') => {
        if (!title) return alert("Please enter a seminar title.");
        
        try {
            const payload = {
                title,
                abstract,
                category,
                tags,
                imageUrl,
                date,
                startTime,
                endTime,
                format,
                location: locationInput,
                hostName,
                hostImageUrl,
                status: statusToSave,
                rewardEnabled,
                rewardPerUser: Number(rewardPerUser) || 0,
                rewardMaxRecipients: Number(rewardMaxRecipients) || 0
            };
            await api.post('/seminars', payload);
            showToast(`Seminar "${title}" ${statusToSave === 'scheduled' ? 'scheduled' : 'saved as draft'} successfully!`, 'success');
            setTimeout(() => {
                navigate('/app/courses/seminars');
            }, 2000);
        } catch (error) {
            console.error(error);
            const errData = error.response?.data || {};
            showToast(`Failed to save seminar: ${errData.message || error.message || 'An error occurred while saving.'}`, 'error');
        }
    };

    return (
        <div className="w-full h-[calc(100vh-64px)] bg-[#f9f9ff] overflow-y-auto font-sans">
            <div className="max-w-[1280px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6 pb-20">

                {/* Page Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-[#e0e2eb] pb-6 gap-4">
                    <div className="w-full md:w-auto">
                        <h1 className="text-[28px] sm:text-[32px] font-bold text-[#222777] tracking-tight mb-1 sm:mb-2">Create a Seminar</h1>
                        <p className="text-[14px] sm:text-[15px] text-[#464651]">Schedule a new academic session or lecture for the community.</p>
                    </div>

                    {/* Responsive Button Group */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto mt-2 md:mt-0">
                        <div className="flex gap-2 sm:gap-3 w-full md:w-auto">
                            <button 
                                onClick={() => handleSchedule('draft')}
                                className="flex-1 md:flex-none px-4 sm:px-5 py-2 sm:py-2.5 border border-[#c7c5d3] rounded-md font-bold text-[12px] sm:text-[13px] text-[#181c22] hover:bg-[#f1f3fc] transition-colors bg-white justify-center"
                            >
                                Save Draft
                            </button>
                            <button 
                                onClick={() => alert('Live preview is continuously updated on the right panel (or below on mobile).')}
                                className="flex-1 md:flex-none px-4 sm:px-5 py-2 sm:py-2.5 border border-[#c7c5d3] rounded-md font-bold text-[12px] sm:text-[13px] text-[#181c22] hover:bg-[#f1f3fc] transition-colors flex items-center justify-center gap-1 sm:gap-2 bg-white"
                            >
                                <span className="material-symbols-outlined text-[16px] sm:text-[18px]">visibility</span> Preview
                            </button>
                        </div>
                        <button
                            onClick={() => handleSchedule('scheduled')}
                            className="w-full md:w-auto px-5 sm:px-6 py-2 sm:py-2.5 bg-[#222777] rounded-md font-bold text-[13px] text-white hover:bg-[#3a3f8f] transition-colors flex items-center justify-center gap-2 shadow-sm"
                        >
                            <span className="material-symbols-outlined text-[18px]">event</span> Schedule Seminar
                        </button>
                    </div>
                </div>

                {/* Main Content Split */}
                <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start mt-2">

                    {/* LEFT COLUMN: The Form */}
                    <div className="flex-1 w-full space-y-4 sm:space-y-6">

                        {/* Step 1: Basic Information */}
                        <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb] p-5 sm:p-6 md:p-8">
                            <div className="flex items-center gap-3 mb-5 sm:mb-6">
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#eef0f9] text-[#222777] font-bold flex items-center justify-center text-[13px] sm:text-[14px] shrink-0">1</div>
                                <h2 className="text-[18px] sm:text-[20px] font-bold text-[#222777]">Basic Information</h2>
                            </div>

                            <div className="space-y-4 sm:space-y-5 border-t border-[#e0e2eb] pt-5 sm:pt-6">
                                <div>
                                    <label className="block text-[11px] sm:text-[12px] font-bold text-[#464651] mb-2 uppercase tracking-wider">
                                        Seminar Title <span className="text-[#ba1a1a]">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g., Advanced Neural Architecture Search"
                                        className="w-full border border-[#c7c5d3] rounded-md p-2.5 sm:p-3 text-[14px] sm:text-[15px] text-[#181c22] bg-white focus:border-[#222777] focus:ring-1 focus:ring-[#222777] outline-none transition-shadow"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] sm:text-[12px] font-bold text-[#464651] mb-2 uppercase tracking-wider">
                                        Abstract / Description
                                    </label>
                                    <textarea
                                        value={abstract}
                                        onChange={(e) => setAbstract(e.target.value)}
                                        placeholder="Briefly describe the key topics..."
                                        className="w-full h-24 sm:h-32 border border-[#c7c5d3] rounded-md p-2.5 sm:p-3 text-[14px] sm:text-[15px] text-[#181c22] bg-white focus:border-[#222777] focus:ring-1 focus:ring-[#222777] outline-none resize-none transition-shadow"
                                    />
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
                                    <div className="flex-1">
                                        <label className="block text-[11px] sm:text-[12px] font-bold text-[#464651] mb-2 uppercase tracking-wider">Category</label>
                                        <div className="relative">
                                            <select
                                                value={category}
                                                onChange={(e) => setCategory(e.target.value)}
                                                className="w-full appearance-none border border-[#c7c5d3] rounded-md p-2.5 sm:p-3 pr-10 text-[14px] sm:text-[15px] text-[#181c22] bg-white focus:border-[#222777] focus:ring-1 focus:ring-[#222777] outline-none cursor-pointer"
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
                                        <label className="block text-[11px] sm:text-[12px] font-bold text-[#464651] mb-2 uppercase tracking-wider">Tags</label>
                                        <input
                                            type="text"
                                            value={tags}
                                            onChange={(e) => setTags(e.target.value)}
                                            placeholder="Add tags separated by commas"
                                            className="w-full border border-[#c7c5d3] rounded-md p-2.5 sm:p-3 text-[14px] sm:text-[15px] text-[#181c22] bg-white focus:border-[#222777] focus:ring-1 focus:ring-[#222777] outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] sm:text-[12px] font-bold text-[#464651] mb-2 uppercase tracking-wider">
                                        Cover Image
                                    </label>
                                    <div className="flex flex-col gap-3">
                                        {imageUrl && (
                                            <div className="w-full h-32 sm:h-40 bg-gray-100 rounded-md border border-[#c7c5d3] overflow-hidden relative group">
                                                <img src={imageUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                                                <button 
                                                    type="button" 
                                                    onClick={() => setImageUrl('')}
                                                    className="absolute top-2 right-2 bg-white/90 text-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">close</span>
                                                </button>
                                            </div>
                                        )}
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={imageUrl}
                                                onChange={(e) => setImageUrl(e.target.value)}
                                                placeholder="Paste image URL here..."
                                                className="flex-1 border border-[#c7c5d3] rounded-md p-2.5 sm:p-3 text-[14px] sm:text-[15px] text-[#181c22] bg-white focus:border-[#222777] focus:ring-1 focus:ring-[#222777] outline-none transition-shadow"
                                            />
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                ref={imageInputRef} 
                                                className="hidden" 
                                                onChange={(e) => handleImageUpload(e, false)} 
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => imageInputRef.current.click()}
                                                disabled={isUploading}
                                                className="bg-[#f1f3fc] text-[#222777] border border-[#c7c5d3] px-4 rounded-md font-bold text-[13px] hover:bg-[#e0e2eb] transition-colors flex items-center justify-center gap-1 shadow-sm shrink-0 whitespace-nowrap"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">
                                                    {isUploading ? 'hourglass_empty' : 'upload'}
                                                </span> 
                                                {isUploading ? 'Uploading...' : 'Upload'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-[11px] sm:text-[12px] font-bold text-[#464651] mb-2 uppercase tracking-wider">
                                        Guest Speaker / Host
                                    </label>
                                    <div className="flex flex-col gap-3">
                                        {hostImageUrl && (
                                            <div className="w-16 h-16 rounded-full border border-[#c7c5d3] overflow-hidden relative group self-center sm:self-start">
                                                <img src={hostImageUrl} alt="Host Preview" className="w-full h-full object-cover" />
                                                <button 
                                                    type="button" 
                                                    onClick={() => setHostImageUrl('')}
                                                    className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">close</span>
                                                </button>
                                            </div>
                                        )}
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={hostName}
                                                onChange={(e) => setHostName(e.target.value)}
                                                placeholder="e.g. Dr. Jane Doe"
                                                className="w-full border border-[#c7c5d3] rounded-md p-2.5 sm:p-3 text-[14px] sm:text-[15px] text-[#181c22] bg-white focus:border-[#222777] focus:ring-1 focus:ring-[#222777] outline-none transition-shadow"
                                            />
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                ref={hostImageInputRef} 
                                                className="hidden" 
                                                onChange={(e) => handleImageUpload(e, true)} 
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => hostImageInputRef.current.click()}
                                                disabled={isUploadingHost}
                                                className="bg-[#f1f3fc] text-[#222777] border border-[#c7c5d3] px-3 rounded-md font-bold text-[13px] hover:bg-[#e0e2eb] transition-colors flex items-center justify-center shadow-sm shrink-0 whitespace-nowrap"
                                                title="Upload Host Picture"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">
                                                    {isUploadingHost ? 'hourglass_empty' : 'add_a_photo'}
                                                </span> 
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[11px] sm:text-[12px] font-bold text-[#464651] mb-2 uppercase tracking-wider">
                                        Location / Stream Link
                                    </label>
                                    <input
                                        type="text"
                                        value={locationInput}
                                        onChange={(e) => setLocationInput(e.target.value)}
                                        placeholder={format === 'In-Person' ? 'Click map to drop pin or type address' : 'https://zoom.us/j/123456789 or click map for general location'}
                                        className="w-full border border-[#c7c5d3] rounded-md p-2.5 sm:p-3 text-[14px] sm:text-[15px] text-[#181c22] bg-white focus:border-[#222777] focus:ring-1 focus:ring-[#222777] outline-none transition-shadow"
                                    />
                                    <LocationMapPicker locationString={locationInput} setLocationString={setLocationInput} />
                                </div>
                            </div>
                        </div>

                        {/* Step 2: Scheduling */}
                        <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb] p-5 sm:p-6 md:p-8">
                            <div className="flex items-center gap-3 mb-5 sm:mb-6">
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#eef0f9] text-[#222777] font-bold flex items-center justify-center text-[13px] sm:text-[14px] shrink-0">2</div>
                                <h2 className="text-[18px] sm:text-[20px] font-bold text-[#222777]">Scheduling</h2>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 border-t border-[#e0e2eb] pt-5 sm:pt-6">
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-[11px] sm:text-[12px] font-bold text-[#464651] mb-2 uppercase tracking-wider">Date</label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#c7c5d3]">calendar_today</span>
                                        <input
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="w-full border border-[#c7c5d3] rounded-md py-2.5 sm:py-3 pl-10 pr-3 text-[14px] sm:text-[15px] font-mono text-[#181c22] bg-white focus:border-[#222777] outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] sm:text-[12px] font-bold text-[#464651] mb-2 uppercase tracking-wider">Start Time</label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#c7c5d3]">schedule</span>
                                        <input
                                            type="time"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            className="w-full border border-[#c7c5d3] rounded-md py-2.5 sm:py-3 pl-10 pr-2 sm:pr-3 text-[14px] sm:text-[15px] font-mono text-[#181c22] bg-white focus:border-[#222777] outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] sm:text-[12px] font-bold text-[#464651] mb-2 uppercase tracking-wider">End Time</label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#c7c5d3] md:hidden">schedule</span>
                                        <input
                                            type="time"
                                            value={endTime}
                                            onChange={(e) => setEndTime(e.target.value)}
                                            className="w-full border border-[#c7c5d3] rounded-md py-2.5 sm:py-3 pl-10 md:pl-3 md:p-3 text-[14px] sm:text-[15px] font-mono text-[#181c22] bg-white focus:border-[#222777] outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Step 3: Format & Location */}
                        <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb] p-5 sm:p-6 md:p-8">
                            <div className="flex items-center gap-3 mb-5 sm:mb-6">
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#eef0f9] text-[#222777] font-bold flex items-center justify-center text-[13px] sm:text-[14px] shrink-0">3</div>
                                <h2 className="text-[18px] sm:text-[20px] font-bold text-[#222777]">Format & Location</h2>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 border-t border-[#e0e2eb] pt-5 sm:pt-6">
                                {formatOptions.map((opt) => (
                                    <div
                                        key={opt.id}
                                        onClick={() => setFormat(opt.id)}
                                        className={`border rounded-lg p-4 sm:p-5 flex sm:flex-col items-center sm:justify-center gap-3 cursor-pointer transition-all
                                            ${format === opt.id
                                            ? 'border-2 border-[#00c2cb] bg-[#e6fbfc] text-[#006e73]'
                                            : 'border-[#c7c5d3] bg-white text-[#777682] hover:border-[#222777] hover:text-[#222777]'
                                        }`}
                                    >
                                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 ${format === opt.id ? 'bg-[#00c2cb]/20' : 'bg-[#f1f3fc]'}`}>
                                            <span className="material-symbols-outlined text-[20px] sm:text-[24px]">{opt.icon}</span>
                                        </div>
                                        <span className={`text-[13px] font-bold ${format === opt.id ? 'text-[#006e73]' : 'text-[#181c22]'}`}>{opt.id}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Step 4: Reward Campaign */}
                        <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb] p-5 sm:p-6 md:p-8">
                            <div className="flex items-center justify-between mb-5 sm:mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#eef0f9] text-[#222777] font-bold flex items-center justify-center text-[13px] sm:text-[14px] shrink-0">4</div>
                                    <h2 className="text-[18px] sm:text-[20px] font-bold text-[#222777]">Reward Campaign</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setRewardEnabled(v => !v)}
                                    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${rewardEnabled ? 'bg-[#00c2cb]' : 'bg-[#c7c5d3]'}`}
                                >
                                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${rewardEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            {rewardEnabled && (
                                <div className="space-y-4 sm:space-y-5 border-t border-[#e0e2eb] pt-5 sm:pt-6">
                                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
                                        <div className="flex-1">
                                            <label className="block text-[11px] sm:text-[12px] font-bold text-[#464651] mb-2 uppercase tracking-wider">Reward Per User (coins)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={rewardPerUser}
                                                onChange={(e) => setRewardPerUser(e.target.value)}
                                                className="w-full border border-[#c7c5d3] rounded-md p-2.5 sm:p-3 text-[14px] sm:text-[15px] text-[#181c22] bg-white focus:border-[#222777] focus:ring-1 focus:ring-[#222777] outline-none transition-shadow"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-[11px] sm:text-[12px] font-bold text-[#464651] mb-2 uppercase tracking-wider">Max Recipients</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={rewardMaxRecipients}
                                                onChange={(e) => setRewardMaxRecipients(e.target.value)}
                                                className="w-full border border-[#c7c5d3] rounded-md p-2.5 sm:p-3 text-[14px] sm:text-[15px] text-[#181c22] bg-white focus:border-[#222777] focus:ring-1 focus:ring-[#222777] outline-none transition-shadow"
                                            />
                                        </div>
                                    </div>
                                    <div className={`flex items-center justify-between rounded-lg p-4 border ${totalRewardRequired > availableCoins ? 'bg-[#ffdad6] border-[#ffb4ab]' : 'bg-[#f1f3fc] border-[#e0e2eb]'}`}>
                                        <div>
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-[#464651]">Total Coins Required</p>
                                            <p className={`text-[20px] font-bold ${totalRewardRequired > availableCoins ? 'text-[#ba1a1a]' : 'text-[#222777]'}`}>{totalRewardRequired.toLocaleString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-[#464651]">Your Available Coins</p>
                                            <p className="text-[16px] font-bold text-[#181c22]">{availableCoins.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    {totalRewardRequired > availableCoins && (
                                        <p className="text-[12px] text-[#ba1a1a] font-semibold">You don't have enough coins to fund this reward campaign. Reduce the reward or purchase more coins.</p>
                                    )}
                                </div>
                            )}
                        </div>

                    </div>

                    {/* RIGHT COLUMN: Live Preview */}
                    <div className="w-full lg:w-[320px] xl:w-[380px] shrink-0 lg:sticky lg:top-6 self-start space-y-6">
                        <h3 className="font-mono text-[12px] font-bold text-[#777682] uppercase tracking-wider mb-2 hidden lg:block">Live Preview</h3>

                        {/* Preview Card */}
                        <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(58,63,143,0.1)] border border-[#e0e2eb] overflow-hidden">
                            {/* Card Image Area */}
                            <div className="h-32 sm:h-40 bg-[#181c22] relative flex items-center justify-center bg-cover bg-center" style={{ backgroundImage: imageUrl ? `url(${imageUrl})` : 'none' }}>
                                {/* Abstract pattern or icon */}
                                {!imageUrl && <span className="material-symbols-outlined text-[48px] sm:text-[64px] text-white/10">biotech</span>}

                                {format === 'Live Broadcast' && (
                                    <div className="absolute top-3 right-3 bg-[#00696e] text-[#6bf6ff] text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded flex items-center gap-1 border border-[#00c2cb]">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#6bf6ff] animate-pulse"></span> LIVE
                                    </div>
                                )}
                            </div>

                            {/* Card Content Area */}
                            <div className="p-5 sm:p-6">
                                <div className="flex justify-between items-start mb-3 sm:mb-4">
                                    <span className="bg-[#f1f3fc] text-[#3a3f8f] font-mono text-[10px] sm:text-[11px] font-bold px-2 py-1 rounded line-clamp-1 max-w-[60%]">
                                        {category || 'Uncategorized'}
                                    </span>
                                    <span className="flex items-center gap-1 text-[11px] sm:text-[12px] font-mono font-bold text-[#777682] shrink-0">
                                        <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                        {date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Date TBD'}
                                    </span>
                                </div>

                                <h3 className="text-[18px] sm:text-[20px] font-bold text-[#181c22] leading-tight mb-2">
                                    {title || 'Advanced Neural Architecture Search'}
                                </h3>
                                <p className="text-[13px] sm:text-[14px] text-[#777682] line-clamp-2 leading-relaxed mb-5 sm:mb-6">
                                    {abstract || 'Briefly describe the key topics covered in this seminar...'}
                                </p>

                                <div className="flex items-center justify-between border-t border-[#e0e2eb] pt-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#222777] text-white flex items-center justify-center text-[10px] font-bold shrink-0">{userInitials}</div>
                                        <span className="text-[12px] sm:text-[13px] font-semibold text-[#464651] truncate">{userName}</span>
                                    </div>
                                    <div className="bg-[#e6fbfc] text-[#006e73] px-2 py-1 rounded-full flex items-center gap-1 border border-[#6bf6ff]/50 shrink-0">
                                        <span className="material-symbols-outlined text-[14px]">toll</span>
                                        <span className="text-[11px] sm:text-[12px] font-bold">+50</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Pro Tip Box */}
                        <div className="bg-[#f9f9ff] border-l-4 border-[#00c2cb] p-4 rounded-r-lg shadow-sm border-y border-r border-[#e0e2eb]">
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-[#00c2cb] shrink-0">lightbulb</span>
                                <div>
                                    <h4 className="text-[13px] font-bold text-[#181c22] mb-1">Pro Tip</h4>
                                    <p className="text-[12px] text-[#777682] leading-relaxed">
                                        Live seminars automatically record and add themselves to the seminar library after completion. Ensure your title is search-friendly.
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* --- CUSTOM TOAST NOTIFICATION --- */}
            <div className={`fixed bottom-24 right-6 z-50 transition-all duration-300 transform ${toast.show ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'}`}>
                <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${toast.type === 'error' ? 'bg-[#ffdad6] border-[#ba1a1a] text-[#ba1a1a]' : 'bg-[#e6fbfc] border-[#00c2cb] text-[#006e73]'}`}>
                    <span className="material-symbols-outlined text-[20px]">
                        {toast.type === 'error' ? 'error' : 'check_circle'}
                    </span>
                    <p className="font-bold text-[13px] tracking-wide">
                        {toast.message}
                    </p>
                    <button onClick={() => setToast(prev => ({...prev, show: false}))} className="ml-2 hover:opacity-70">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>
            </div>
        </div>
    );
}