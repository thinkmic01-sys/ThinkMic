import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// --- CUSTOM MAP ICONS ---
const mainSeminarIcon = L.divIcon({
    className: 'bg-transparent border-none',
    html: `
        <div class="flex flex-col items-center cursor-pointer transition-transform hover:scale-105" style="transform: translate(-50%, -100%); margin-top: 10px;">
            <div class="bg-white px-3 py-2 rounded shadow-md mb-2 whitespace-nowrap border border-[#e0e2eb]">
                <p class="text-[14px] font-bold text-[#222777] mb-0.5">Applied NLP in Clinic</p>
                <p class="text-[10px] font-mono text-[#777682] font-semibold tracking-wide">1.2 km away • Today</p>
            </div>
            <div class="w-5 h-5 bg-[#61f4fd] rounded-full border-2 border-white shadow-md"></div>
        </div>
    `,
    iconSize: [0, 0]
});

const userLocationIcon = L.divIcon({
    className: 'bg-transparent border-none',
    html: `
        <div class="flex flex-col items-center" style="transform: translate(-50%, -100%); margin-top: 8px;">
            <span class="bg-white text-[#464651] font-mono font-bold text-[10px] px-2 py-0.5 rounded shadow-sm mb-1 whitespace-nowrap">You are here</span>
            <div class="w-4 h-4 bg-[#00c2cb] rounded-full border-2 border-white" style="box-shadow: 0 0 0 4px rgba(0,194,203,0.2)"></div>
        </div>
    `,
    iconSize: [0, 0]
});

const backgroundPinIcon = L.divIcon({
    className: 'bg-transparent border-none',
    html: `
        <div style="transform: translate(-50%, -50%);">
            <div class="w-4 h-4 bg-[#3a3f8f] rounded-full border-2 border-white shadow-sm opacity-80"></div>
        </div>
    `,
    iconSize: [0, 0]
});

// --- CUSTOM MAP CONTROLS COMPONENT ---
const CustomMapControls = () => {
    const map = useMap();

    return (
        <div className="absolute top-4 right-4 flex flex-col gap-3 z-[1000]">
            <button
                onClick={() => map.flyTo([42.355, -71.060], 14)}
                className="w-10 h-10 bg-white rounded shadow-sm flex items-center justify-center text-[#464651] hover:text-[#181c22] transition-colors"
            >
                <span className="material-symbols-outlined">my_location</span>
            </button>
            <div className="flex flex-col bg-white rounded shadow-sm overflow-hidden border border-[#e0e2eb]">
                <button
                    onClick={() => map.zoomIn()}
                    className="w-10 h-10 border-b border-[#e0e2eb] flex items-center justify-center text-[#464651] hover:bg-[#f9f9ff] transition-colors"
                >
                    <span className="material-symbols-outlined">add</span>
                </button>
                <button
                    onClick={() => map.zoomOut()}
                    className="w-10 h-10 flex items-center justify-center text-[#464651] hover:bg-[#f9f9ff] transition-colors"
                >
                    <span className="material-symbols-outlined">remove</span>
                </button>
            </div>
        </div>
    );
};

export default function NearbySeminars() {
    const navigate = useNavigate();
    const token = useSelector(state => state.auth?.accessToken);
    const [seminars, setSeminars] = useState([]);

    useEffect(() => {
        const fetchSeminars = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/v1/seminars', {
                    headers: { 'Authorization': `Bearer ${token}` },
                    credentials: 'include'
                });
                if (response.ok) {
                    const data = await response.json();
                    setSeminars(data);
                }
            } catch (error) {
                console.error("Failed to fetch seminars", error);
            }
        };
        fetchSeminars();
    }, [token]);

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] w-full bg-[#f9f9ff] font-sans">

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #c7c5d3; border-radius: 10px; }
            `}</style>

            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[#e0e2eb] bg-white shrink-0 shadow-sm z-20 gap-3 sm:gap-0">
                <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                    <button onClick={() => navigate('/app/courses/my-learning')} className="text-[#777682] hover:text-[#222777] transition-colors w-8 h-8 rounded-full hover:bg-[#f1f3fc] flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[20px] sm:text-[24px]">arrow_back</span>
                    </button>
                    <h1 className="text-[20px] sm:text-[24px] md:text-[28px] font-bold text-[#222777] truncate">Nearby Seminars</h1>
                </div>
                <div className="flex gap-2 sm:gap-4 w-full sm:w-auto pl-11 sm:pl-0">
                    <div className="relative flex-1 sm:flex-none">
                        <select className="w-full appearance-none bg-[#f9f9ff] sm:bg-white border border-[#e0e2eb] sm:border-[#c7c5d3] rounded text-[#181c22] px-3 sm:px-4 py-2 pr-8 sm:pr-10 text-[13px] sm:text-[14px] font-medium outline-none focus:border-[#222777] cursor-pointer">
                            <option>All Topics</option>
                            <option>Machine Learning</option>
                            <option>Ethics</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-[#777682] pointer-events-none text-[18px]">expand_more</span>
                    </div>
                    <div className="relative flex-1 sm:flex-none">
                        <select className="w-full appearance-none bg-[#f9f9ff] sm:bg-white border border-[#e0e2eb] sm:border-[#c7c5d3] rounded text-[#181c22] px-3 sm:px-4 py-2 pr-8 sm:pr-10 text-[13px] sm:text-[14px] font-medium outline-none focus:border-[#222777] cursor-pointer">
                            <option>Any Distance</option>
                            <option>&lt; 5 km</option>
                            <option>&lt; 10 km</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-[#777682] pointer-events-none text-[18px]">expand_more</span>
                    </div>
                </div>
            </div>

            {/* Changed to flex-col on mobile, flex-row on desktop */}
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden relative">

                {/* Left List Column: takes 50% height on mobile, full height on desktop */}
                <div className="w-full md:w-[360px] lg:w-[420px] h-[50vh] md:h-full border-b md:border-b-0 md:border-r border-[#e0e2eb] bg-[#f9f9ff] overflow-y-auto p-4 sm:p-5 space-y-4 shrink-0 shadow-[2px_0_10px_rgba(0,0,0,0.03)] z-10 custom-scrollbar pb-6 md:pb-20">

                    {/* Dynamic Cards */}
                    {seminars.length === 0 ? (
                        <div className="text-center py-10 text-[#777682] text-[14px]">No seminars found.</div>
                    ) : (
                        seminars.map((seminar, idx) => (
                            <div key={seminar._id || idx} className="bg-white border border-[#e0e2eb] rounded-lg p-4 sm:p-5 hover:border-[#222777] transition-colors cursor-pointer relative shadow-sm">
                                {idx === 0 && <div className="absolute top-0 left-0 w-1 h-full bg-[#00c2cb] rounded-l-lg"></div>}
                                <div className="flex justify-between items-start mb-2 sm:mb-3 pl-2">
                                    <span className="bg-[#e6fbfc] text-[#006e73] font-mono text-[9px] sm:text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 uppercase">
                                        <span className="material-symbols-outlined text-[12px] sm:text-[14px]">{seminar.format === 'Live Broadcast' ? 'sensors' : seminar.format === 'In-Person' ? 'location_on' : 'videocam'}</span> {seminar.format}
                                    </span>
                                    {seminar.format === 'In-Person' && (
                                        <span className="text-[11px] sm:text-[12px] font-mono font-bold text-[#00c2cb] flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[12px] sm:text-[14px]">location_on</span> Near you
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-[16px] sm:text-[18px] font-bold text-[#181c22] mb-1.5 sm:mb-2 leading-snug pl-2">{seminar.title}</h3>
                                <p className="text-[13px] sm:text-[14px] text-[#464651] line-clamp-2 mb-4 sm:mb-5 pl-2 leading-relaxed">{seminar.abstract || 'No description provided.'}</p>
                                
                                {seminar.location && (
                                    <div className="text-[12px] sm:text-[13px] text-[#222777] font-semibold mb-3 pl-2 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[16px]">link</span>
                                        <span className="truncate">{seminar.location}</span>
                                    </div>
                                )}
                                
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 sm:pt-4 border-t border-[#e0e2eb] pl-2 gap-3 sm:gap-0">
                                    <div className="flex items-center gap-1.5 font-mono text-[10px] sm:text-[11px] font-semibold text-[#777682]">
                                        <span className="material-symbols-outlined text-[14px]">calendar_today</span> {new Date(seminar.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {seminar.startTime} - {seminar.endTime}
                                    </div>
                                    <button className={`w-full sm:w-auto px-5 py-2 sm:py-1.5 rounded text-[12px] font-bold transition-colors text-center ${idx === 0 ? 'bg-[#222777] text-white hover:bg-[#3a3f8f] shadow-sm' : 'bg-white border border-[#222777] text-[#222777] hover:bg-[#f1f3fc]'}`}>
                                        {seminar.format === 'Pre-Recorded' ? 'Watch Now' : 'Register'}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Map Area: flex-1 ensures it takes the remaining height on mobile and width on desktop */}
                <div className="flex flex-1 relative overflow-hidden bg-[#d7dae2] min-h-[300px] md:min-h-0">
                    <MapContainer
                        center={[42.3601, -71.0589]}
                        zoom={14}
                        zoomControl={false}
                        style={{ height: '100%', width: '100%', zIndex: 0 }}
                    >
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        />

                        {/* Custom Controls */}
                        <CustomMapControls />

                        {/* Interactive Pins */}
                        <Marker position={[42.365, -71.050]} icon={mainSeminarIcon} />
                        <Marker position={[42.355, -71.060]} icon={userLocationIcon} />

                        {/* Background Pins */}
                        <Marker position={[42.375, -71.030]} icon={backgroundPinIcon} />
                        <Marker position={[42.345, -71.080]} icon={backgroundPinIcon} />
                    </MapContainer>

                    {/* Area Activity Overlay Chart */}
                    <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 bg-white p-3 sm:p-5 rounded border border-[#e0e2eb] w-[200px] sm:w-[280px] shadow-lg z-[1000] pointer-events-none">
                        <h4 className="font-mono text-[9px] sm:text-[11px] font-bold text-[#181c22] uppercase tracking-wider mb-2 sm:mb-4">Area Activity</h4>
                        <div className="flex items-end gap-1 sm:gap-1.5 h-10 sm:h-16 mb-2 sm:mb-4">
                            <div className="flex-1 bg-[#e0e0ff] rounded-sm" style={{ height: '30%' }}></div>
                            <div className="flex-1 bg-[#bfc2ff] rounded-sm" style={{ height: '60%' }}></div>
                            <div className="flex-1 bg-[#6bf6ff] rounded-sm" style={{ height: '100%' }}></div>
                            <div className="flex-1 bg-[#e0e0ff] rounded-sm" style={{ height: '40%' }}></div>
                            <div className="flex-1 bg-[#e0e0ff] rounded-sm" style={{ height: '20%' }}></div>
                        </div>
                        <p className="text-[9px] sm:text-[11px] font-mono text-[#464651] leading-relaxed hidden sm:block">High concentration of events in the innovation district this week.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}