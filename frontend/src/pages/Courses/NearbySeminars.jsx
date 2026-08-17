import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import api from '../../services/api';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// --- CUSTOM MAP ICONS ---
const userLocationIcon = L.divIcon({
    className: 'bg-transparent border-none',
    html: `
        <div class="flex flex-col items-center" style="transform: translate(-50%, -100%); margin-top: 8px;">
            <span class="bg-white text-[#464651] font-mono font-bold text-[10px] px-2 py-0.5 rounded shadow-sm mb-1 whitespace-nowrap">You are here</span>
            <div class="w-4 h-4 bg-[#EAB308] rounded-full border-2 border-white" style="box-shadow: 0 0 0 4px rgba(0,194,203,0.2)"></div>
        </div>
    `,
    iconSize: [0, 0]
});

// Built per-seminar so the pin's label always shows that seminar's real title/distance
const seminarMarkerIcon = (title, distanceLabel) => L.divIcon({
    className: 'bg-transparent border-none',
    html: `
        <div class="flex flex-col items-center cursor-pointer transition-transform hover:scale-105" style="transform: translate(-50%, -100%); margin-top: 10px;">
            <div class="bg-white px-3 py-2 rounded shadow-md mb-2 whitespace-nowrap border border-[#e0e2eb]">
                <p class="text-[14px] font-bold text-[#075e51] mb-0.5">${title}</p>
                ${distanceLabel ? `<p class="text-[10px] font-mono text-[#777682] font-semibold tracking-wide">${distanceLabel}</p>` : ''}
            </div>
            <div class="w-5 h-5 bg-[#61f4fd] rounded-full border-2 border-white shadow-md"></div>
        </div>
    `,
    iconSize: [0, 0]
});

// Fallback map center only used while the user's real location hasn't loaded/was denied
const DEFAULT_CENTER = [42.3601, -71.0589];

// --- CUSTOM MAP CONTROLS COMPONENT ---
const CustomMapControls = ({ userLocation }) => {
    const map = useMap();

    return (
        <div className="absolute top-4 right-4 flex flex-col gap-3 z-[1000]">
            <button
                onClick={() => userLocation && map.flyTo(userLocation, 14)}
                disabled={!userLocation}
                title={userLocation ? 'Recenter on my location' : 'Location not available'}
                className="w-10 h-10 bg-white rounded shadow-sm flex items-center justify-center text-[#464651] hover:text-[#181c22] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
                <span className="material-symbols-outlined">my_location</span>
            </button>
            <div className="flex flex-col bg-white rounded shadow-sm overflow-hidden border border-[#e0e2eb]">
                <button
                    onClick={() => map.zoomIn()}
                    className="w-10 h-10 border-b border-[#e0e2eb] flex items-center justify-center text-[#464651] hover:bg-[#F4F9F8] transition-colors"
                >
                    <span className="material-symbols-outlined">add</span>
                </button>
                <button
                    onClick={() => map.zoomOut()}
                    className="w-10 h-10 flex items-center justify-center text-[#464651] hover:bg-[#F4F9F8] transition-colors"
                >
                    <span className="material-symbols-outlined">remove</span>
                </button>
            </div>
        </div>
    );
};

// Only seminars created via the map-pin picker store "lat, lng" in their location field
// (stream links/addresses won't match) - those are the only ones we can actually place on
// the map or compute a real distance for.
const parseLatLng = (locationStr) => {
    if (!locationStr) return null;
    const match = String(locationStr).match(/^\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*$/);
    if (!match) return null;
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return [lat, lng];
};

const haversineDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDistance = (km) => km < 1 ? `${Math.round(km * 1000)} m away` : `${km.toFixed(1)} km away`;

export default function NearbySeminars() {
    const navigate = useNavigate();
    const token = useSelector(state => state.auth?.accessToken);
    const [seminars, setSeminars] = useState([]);
    const [topicFilter, setTopicFilter] = useState('All Topics');
    const [distanceFilter, setDistanceFilter] = useState('Any Distance');
    const [registeredIds, setRegisteredIds] = useState(new Set());
    const [registeringId, setRegisteringId] = useState(null);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
    };

    // --- REAL BROWSER GEOLOCATION ---
    const [userLocation, setUserLocation] = useState(null);
    // requesting/unsupported is knowable synchronously, so it's the lazy initial state
    // rather than a setState call inside the effect; granted/denied come from the async
    // getCurrentPosition callbacks below.
    const [locationStatus, setLocationStatus] = useState(() => (
        typeof navigator !== 'undefined' && navigator.geolocation ? 'requesting' : 'unsupported'
    ));

    useEffect(() => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setUserLocation([pos.coords.latitude, pos.coords.longitude]);
                setLocationStatus('granted');
            },
            () => {
                setLocationStatus('denied');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }, []);

    useEffect(() => {
        const fetchSeminars = async () => {
            try {
                const response = await api.get('/seminars');
                setSeminars(response.data);
            } catch (error) {
                console.error("Failed to fetch seminars", error);
            }
        };
        const fetchRegistrations = async () => {
            try {
                const response = await api.get('/seminars/registrations');
                setRegisteredIds(new Set(response.data.map(r => r.seminarId)));
            } catch (error) {
                console.error("Failed to fetch registrations", error);
            }
        };
        fetchSeminars();
        fetchRegistrations();
    }, [token]);

    const handleRegister = async (seminar) => {
        if (registeredIds.has(seminar._id) || registeringId) return;
        setRegisteringId(seminar._id);
        try {
            const res = await api.post(`/seminars/${seminar._id}/register`);
            setRegisteredIds(prev => new Set(prev).add(seminar._id));
            if (res.data?.rewardClaimed) {
                showToast(`You joined and earned +${res.data.rewardAmount} coins!`, 'success');
            } else {
                showToast('You are now registered for this seminar!', 'success');
            }
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to register for this seminar.', 'error');
        } finally {
            setRegisteringId(null);
        }
    };

    // Enrich each seminar with real coordinates + real distance from the user, when available
    const enrichedSeminars = seminars.map((s) => {
        const coords = parseLatLng(s.location);
        const distanceKm = (coords && userLocation)
            ? haversineDistanceKm(userLocation[0], userLocation[1], coords[0], coords[1])
            : null;
        return { ...s, coords, distanceKm };
    });

    const distanceThresholdKm = distanceFilter === '< 5 km' ? 5 : distanceFilter === '< 10 km' ? 10 : null;

    const filteredSeminars = enrichedSeminars
        .filter((s) => topicFilter === 'All Topics' || s.category === topicFilter)
        .filter((s) => distanceThresholdKm === null || (s.distanceKm !== null && s.distanceKm < distanceThresholdKm))
        .sort((a, b) => {
            if (a.distanceKm === null && b.distanceKm === null) return 0;
            if (a.distanceKm === null) return 1;
            if (b.distanceKm === null) return -1;
            return a.distanceKm - b.distanceKm;
        });

    const seminarsWithCoords = enrichedSeminars.filter((s) => s.coords);

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] w-full bg-[#F4F9F8] font-sans">

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #c7c5d3; border-radius: 10px; }
            `}</style>

            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[#e0e2eb] bg-white shrink-0 shadow-sm z-20 gap-3 sm:gap-0">
                <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                    <button onClick={() => navigate('/app/courses')} className="text-[#777682] hover:text-[#075e51] transition-colors w-8 h-8 rounded-full hover:bg-[#f1f3fc] flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[20px] sm:text-[24px]">arrow_back</span>
                    </button>
                    <h1 className="text-[20px] sm:text-[24px] md:text-[28px] font-bold text-[#075e51] truncate">Nearby Seminars</h1>
                </div>
                <div className="flex gap-2 sm:gap-4 w-full sm:w-auto pl-11 sm:pl-0">
                    <div className="relative flex-1 sm:flex-none">
                        <select value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)} className="w-full appearance-none bg-[#F4F9F8] sm:bg-white border border-[#e0e2eb] sm:border-[#c7c5d3] rounded text-[#181c22] px-3 sm:px-4 py-2 pr-8 sm:pr-10 text-[13px] sm:text-[14px] font-medium outline-none focus:border-[#075e51] cursor-pointer">
                            <option>All Topics</option>
                            <option>Machine Learning</option>
                            <option>Quantum Computing</option>
                            <option>Bioinformatics</option>
                            <option>Ethics in AI</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-[#777682] pointer-events-none text-[18px]">expand_more</span>
                    </div>
                    <div className="relative flex-1 sm:flex-none">
                        <select value={distanceFilter} onChange={(e) => setDistanceFilter(e.target.value)} className="w-full appearance-none bg-[#F4F9F8] sm:bg-white border border-[#e0e2eb] sm:border-[#c7c5d3] rounded text-[#181c22] px-3 sm:px-4 py-2 pr-8 sm:pr-10 text-[13px] sm:text-[14px] font-medium outline-none focus:border-[#075e51] cursor-pointer">
                            <option>Any Distance</option>
                            <option>&lt; 5 km</option>
                            <option>&lt; 10 km</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-[#777682] pointer-events-none text-[18px]">expand_more</span>
                    </div>
                </div>
            </div>

            {/* Location permission notice - only shown when we couldn't get real location */}
            {(locationStatus === 'denied' || locationStatus === 'unsupported') && (
                <div className="flex items-center gap-2 px-4 sm:px-6 py-2 bg-[#fff8e1] border-b border-[#e0e2eb] text-[#8a6d00] text-[12px] sm:text-[13px] font-semibold shrink-0">
                    <span className="material-symbols-outlined text-[16px] sm:text-[18px]">location_off</span>
                    {locationStatus === 'unsupported'
                        ? "Your browser doesn't support location services - distances can't be shown."
                        : 'Location access denied - enable it in your browser to see distances to nearby seminars.'}
                </div>
            )}

            {/* Changed to flex-col on mobile, flex-row on desktop */}
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden relative">

                {/* Left List Column: takes 50% height on mobile, full height on desktop */}
                <div className="w-full md:w-[360px] lg:w-[420px] h-[50vh] md:h-full border-b md:border-b-0 md:border-r border-[#e0e2eb] bg-[#F4F9F8] overflow-y-auto p-4 sm:p-5 space-y-4 shrink-0 shadow-[2px_0_10px_rgba(0,0,0,0.03)] z-10 custom-scrollbar pb-6 md:pb-20">

                    {/* Dynamic Cards */}
                    {filteredSeminars.length === 0 ? (
                        <div className="text-center py-10 text-[#777682] text-[14px]">No seminars found.</div>
                    ) : (
                        filteredSeminars.map((seminar, idx) => (
                            <div key={seminar._id || idx} className="bg-white border border-[#e0e2eb] rounded-lg p-4 sm:p-5 hover:border-[#075e51] transition-colors cursor-pointer relative shadow-sm">
                                {idx === 0 && <div className="absolute top-0 left-0 w-1 h-full bg-[#EAB308] rounded-l-lg"></div>}
                                <div className="flex justify-between items-start mb-2 sm:mb-3 pl-2">
                                    <span className="bg-[#FEF9C3] text-[#006e73] font-mono text-[9px] sm:text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 uppercase">
                                        <span className="material-symbols-outlined text-[12px] sm:text-[14px]">{seminar.format === 'Live Broadcast' ? 'sensors' : seminar.format === 'In-Person' ? 'location_on' : 'videocam'}</span> {seminar.format}
                                    </span>
                                    {seminar.distanceKm !== null && (
                                        <span className="text-[11px] sm:text-[12px] font-mono font-bold text-[#EAB308] flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[12px] sm:text-[14px]">location_on</span> {formatDistance(seminar.distanceKm)}
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-[16px] sm:text-[18px] font-bold text-[#181c22] mb-1.5 sm:mb-2 leading-snug pl-2">{seminar.title}</h3>
                                <p className="text-[13px] sm:text-[14px] text-[#464651] line-clamp-2 mb-4 sm:mb-5 pl-2 leading-relaxed">{seminar.abstract || 'No description provided.'}</p>

                                {seminar.location && (
                                    <div className="text-[12px] sm:text-[13px] text-[#075e51] font-semibold mb-3 pl-2 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[16px]">link</span>
                                        <span className="truncate">{seminar.location}</span>
                                    </div>
                                )}

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 sm:pt-4 border-t border-[#e0e2eb] pl-2 gap-3 sm:gap-0">
                                    <div className="flex items-center gap-1.5 font-mono text-[10px] sm:text-[11px] font-semibold text-[#777682]">
                                        <span className="material-symbols-outlined text-[14px]">calendar_today</span> {new Date(seminar.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {seminar.startTime} - {seminar.endTime}
                                    </div>
                                    <button
                                        onClick={() => handleRegister(seminar)}
                                        disabled={registeredIds.has(seminar._id) || registeringId === seminar._id}
                                        className={`w-full sm:w-auto px-5 py-2 sm:py-1.5 rounded text-[12px] font-bold transition-colors text-center disabled:opacity-70 disabled:cursor-not-allowed ${registeredIds.has(seminar._id) ? 'bg-[#FEF9C3] border border-[#EAB308] text-[#006e73]' : idx === 0 ? 'bg-[#075e51] text-white hover:bg-[#097969] shadow-sm' : 'bg-white border border-[#075e51] text-[#075e51] hover:bg-[#f1f3fc]'}`}
                                    >
                                        {registeredIds.has(seminar._id)
                                            ? 'Registered'
                                            : registeringId === seminar._id
                                                ? 'Joining...'
                                                : seminar.format === 'Pre-Recorded' ? 'Watch Now' : 'Register'}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Map Area: flex-1 ensures it takes the remaining height on mobile and width on desktop */}
                <div className="flex flex-1 relative overflow-hidden bg-[#d7dae2] min-h-[300px] md:min-h-0">
                    <MapContainer
                        center={userLocation || DEFAULT_CENTER}
                        zoom={14}
                        zoomControl={false}
                        style={{ height: '100%', width: '100%', zIndex: 0 }}
                    >
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        />

                        {/* Custom Controls */}
                        <CustomMapControls userLocation={userLocation} />

                        {/* Real user location, once granted */}
                        {userLocation && <Marker position={userLocation} icon={userLocationIcon} />}

                        {/* Real seminar pins - only seminars with actual parseable coordinates */}
                        {seminarsWithCoords.map((seminar) => (
                            <Marker
                                key={seminar._id}
                                position={seminar.coords}
                                icon={seminarMarkerIcon(seminar.title, seminar.distanceKm !== null ? formatDistance(seminar.distanceKm) : null)}
                            />
                        ))}
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

            {/* --- CUSTOM TOAST NOTIFICATION --- */}
            <div className={`fixed bottom-24 right-6 z-50 transition-all duration-300 transform ${toast.show ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'}`}>
                <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${toast.type === 'error' ? 'bg-[#ffdad6] border-[#ba1a1a] text-[#ba1a1a]' : 'bg-[#FEF9C3] border-[#EAB308] text-[#006e73]'}`}>
                    <span className="material-symbols-outlined text-[20px]">
                        {toast.type === 'error' ? 'error' : 'check_circle'}
                    </span>
                    <span className="text-[13px] sm:text-[14px] font-bold">{toast.message}</span>
                    <button onClick={() => setToast(prev => ({ ...prev, show: false }))} className="ml-2 hover:opacity-70">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
