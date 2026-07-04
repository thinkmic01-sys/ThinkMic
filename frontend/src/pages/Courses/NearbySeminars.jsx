import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// --- CUSTOM MAP ICONS (Using your exact Tailwind HTML) ---
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

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] w-full bg-[#f9f9ff] font-sans">

            {/* Top Toolbar matching screenshot exactly */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e0e2eb] bg-white shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-4">
                    {/* Optional: Add back button to match your other pages */}
                    <button onClick={() => navigate('/app/courses/my-learning')} className="text-[#777682] hover:text-[#222777] transition-colors w-8 h-8 rounded-full hover:bg-[#f1f3fc] flex items-center justify-center">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h1 className="text-[28px] font-bold text-[#222777]">Nearby Seminars</h1>
                </div>
                <div className="flex gap-4">
                    <div className="relative">
                        <select className="appearance-none bg-white border border-[#c7c5d3] rounded text-[#181c22] px-4 py-2 pr-10 text-[14px] font-medium outline-none focus:border-[#222777] cursor-pointer">
                            <option>All Topics</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#777682] pointer-events-none">expand_more</span>
                    </div>
                    <div className="relative">
                        <select className="appearance-none bg-white border border-[#c7c5d3] rounded text-[#181c22] px-4 py-2 pr-10 text-[14px] font-medium outline-none focus:border-[#222777] cursor-pointer">
                            <option>Any Distance</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#777682] pointer-events-none">expand_more</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">

                {/* Left List Column */}
                <div className="w-[420px] border-r border-[#e0e2eb] bg-white overflow-y-auto p-5 space-y-4 shrink-0 shadow-[2px_0_10px_rgba(0,0,0,0.03)] z-10">

                    {/* Card 1 */}
                    <div className="bg-white border border-[#c7c5d3] rounded-lg p-5 hover:border-[#222777] transition-colors cursor-pointer relative shadow-sm">
                        <div className="absolute top-0 left-0 w-1 h-full bg-[#00c2cb] rounded-l-lg"></div>
                        <div className="flex justify-between items-start mb-3 pl-2">
                            <span className="bg-[#e6fbfc] text-[#006e73] font-mono text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 uppercase">
                                <span className="material-symbols-outlined text-[14px]">school</span> Workshop
                            </span>
                            <span className="text-[12px] font-mono font-bold text-[#00c2cb] flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">location_on</span> 1.2 km
                            </span>
                        </div>
                        <h3 className="text-[18px] font-bold text-[#181c22] mb-2 leading-snug pl-2">Applied NLP in Clinical Research</h3>
                        <p className="text-[14px] text-[#464651] line-clamp-2 mb-5 pl-2 leading-relaxed">Exploring transformer models for extracting patient outcomes from unstructured medical records...</p>
                        <div className="flex items-center justify-between pt-4 border-t border-[#e0e2eb] pl-2">
                            <div className="flex items-center gap-2 font-mono text-[11px] font-semibold text-[#777682]">
                                <span className="material-symbols-outlined text-[14px]">calendar_today</span> Oct 24 • 14:00 - 16:30
                            </div>
                            <button className="bg-[#222777] text-white px-5 py-1.5 rounded text-[12px] font-bold hover:bg-[#3a3f8f] transition-colors shadow-sm">Register</button>
                        </div>
                    </div>

                    {/* Card 2 */}
                    <div className="bg-white border border-[#e0e2eb] rounded-lg p-5 hover:border-[#c7c5d3] transition-colors cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                        <div className="flex justify-between items-start mb-3">
                            <span className="bg-[#f1f3fc] text-[#464651] font-mono text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 uppercase">
                                <span className="material-symbols-outlined text-[14px]">record_voice_over</span> Lecture
                            </span>
                            <span className="text-[12px] font-mono font-bold text-[#777682] flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">location_on</span> 3.8 km
                            </span>
                        </div>
                        <h3 className="text-[18px] font-bold text-[#181c22] mb-2 leading-snug">Ethics of Autonomous Agents</h3>
                        <p className="text-[14px] text-[#464651] line-clamp-2 mb-5 leading-relaxed">A panel discussion on alignment, bias, and regulatory frameworks for next-generation intelligence...</p>
                        <div className="flex items-center justify-between pt-4 border-t border-[#e0e2eb]">
                            <div className="flex items-center gap-2 font-mono text-[11px] font-semibold text-[#777682]">
                                <span className="material-symbols-outlined text-[14px]">calendar_today</span> Oct 26 • 18:00 - 20:00
                            </div>
                            <button className="bg-white border border-[#222777] text-[#222777] px-5 py-1.5 rounded text-[12px] font-bold hover:bg-[#f1f3fc] transition-colors">Register</button>
                        </div>
                    </div>

                    {/* Card 3 */}
                    <div className="bg-white border border-[#e0e2eb] rounded-lg p-5 hover:border-[#c7c5d3] transition-colors cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                        <div className="flex justify-between items-start mb-3">
                            <span className="bg-[#ebeef6] text-[#464651] font-mono text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 uppercase">
                                <span className="material-symbols-outlined text-[14px]">code</span> Hackathon
                            </span>
                            <span className="text-[12px] font-mono font-bold text-[#777682] flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">location_on</span> 5.1 km
                            </span>
                        </div>
                        <h3 className="text-[18px] font-bold text-[#181c22] mb-2 leading-snug">Edge Computing Solutions</h3>
                        <p className="text-[14px] text-[#464651] line-clamp-2 mb-5 leading-relaxed">Building low-latency inference pipelines for IoT devices.</p>
                        <div className="flex items-center justify-between pt-4 border-t border-[#e0e2eb]">
                            <div className="flex items-center gap-2 font-mono text-[11px] font-semibold text-[#777682]">
                                <span className="material-symbols-outlined text-[14px]">calendar_today</span> Nov 02 • 09:00 - 21:00
                            </div>
                            <button className="bg-white border border-[#222777] text-[#222777] px-5 py-1.5 rounded text-[12px] font-bold hover:bg-[#f1f3fc] transition-colors">Register</button>
                        </div>
                    </div>
                </div>

                {/* REAL MAP AREA */}
                <div className="hidden md:flex flex-1 relative overflow-hidden bg-[#d7dae2]">
                    <MapContainer
                        center={[42.3601, -71.0589]} // Coordinates for Boston
                        zoom={14}
                        zoomControl={false} // Disabled so we can use your custom buttons
                        style={{ height: '100%', width: '100%', zIndex: 0 }}
                    >
                        {/* Light theme tiles matching the screenshot */}
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

                    {/* Area Activity Overlay Chart (Floats over the map via z-index) */}
                    <div className="absolute bottom-6 right-6 bg-white p-5 rounded border border-[#e0e2eb] w-[280px] shadow-lg z-[1000] pointer-events-none">
                        <h4 className="font-mono text-[11px] font-bold text-[#181c22] uppercase tracking-wider mb-4">Area Activity</h4>
                        <div className="flex items-end gap-1.5 h-16 mb-4">
                            <div className="flex-1 bg-[#e0e0ff] rounded-sm" style={{ height: '30%' }}></div>
                            <div className="flex-1 bg-[#bfc2ff] rounded-sm" style={{ height: '60%' }}></div>
                            <div className="flex-1 bg-[#6bf6ff] rounded-sm" style={{ height: '100%' }}></div>
                            <div className="flex-1 bg-[#e0e0ff] rounded-sm" style={{ height: '40%' }}></div>
                            <div className="flex-1 bg-[#e0e0ff] rounded-sm" style={{ height: '20%' }}></div>
                        </div>
                        <p className="text-[11px] font-mono text-[#464651] leading-relaxed">High concentration of events in the innovation district this week.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}