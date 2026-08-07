import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function Dashboard() {
    const navigate = useNavigate();
    const accessToken = useSelector((state) => state.auth?.accessToken);
    const userName = useSelector((state) => state.auth?.user?.name || 'User');
    const firstName = userName.split(' ')[0];
    const [currentDate] = useState(() => {
        const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
        return new Date().toLocaleDateString('en-US', options);
    });
    const [greeting] = useState(() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    });
    const [stats, setStats] = useState({ recordings: 0, reports: 0, searchesRun: 0 });
    const [timelineActivity, setTimelineActivity] = useState([]);
    const [chartData, setChartData] = useState([]);

    useEffect(() => {
        if (!accessToken) return;

        const fetchData = async () => {
            try {
                // Fetch KPIs
                const kpiRes = await api.get('/analytics/usage');
                const kpiData = kpiRes.data;

                // Fetch Recent Recordings
                const recRes = await api.get('/recordings');
                const recData = recRes.data;

                if (kpiData.kpis) {
                    setStats({
                        recordings: kpiData.kpis.recordings || recData.count || 0,
                        reports: kpiData.kpis.reports || 0,
                        searchesRun: kpiData.kpis.searchesRun || 0
                    });
                }

                if (kpiData.chartData) {
                    setChartData(kpiData.chartData);
                }

                if (recData.recordings) {
                    const activity = recData.recordings.map((rec, index) => ({
                        id: rec._id,
                        recordingId: rec._id,
                        transcriptId: rec.transcriptId,
                        text: `Recording "${rec.title}" saved.`,
                        time: new Date(rec.createdAt).toLocaleString(),
                        color: index === 0 ? 'bg-[#6bf6ff]' : 'bg-[#222777]',
                        pulse: index === 0
                    }));
                    setTimelineActivity(activity);
                }
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            }
        };

        fetchData();
    }, [accessToken]);

    // Derive the 7-day recording activity chart from real chartData rather than
    // hardcoded points - rounds the y-axis max to a friendlier number and lays
    // the points out with straight segments across the same 0-100 viewBox.
    const rawMax = Math.max(0, ...chartData.map((d) => d.count));
    const hasActivity = rawMax > 0;
    // Always a multiple of 3 so the axis's 1/3 and 2/3 tick labels are distinct integers -
    // otherwise small maxes (e.g. 2) round to duplicate ticks like "0, 1, 1, 2".
    const niceMax = rawMax === 0 ? 0 : Math.max(3, Math.ceil(rawMax / 3) * 3);
    const chartPoints = chartData.map((d, i) => ({
        ...d,
        x: chartData.length > 1 ? (i * 100) / (chartData.length - 1) : 0,
        y: niceMax > 0 ? 95 - (d.count / niceMax) * 85 : 95
    }));
    const chartLinePath = chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const chartAreaPath = chartPoints.length > 0 ? `${chartLinePath} L100,100 L0,100 Z` : '';

    return (
        <div className="h-[calc(100vh-64px)] overflow-y-auto bg-[#f9f9ff] w-full relative">
            <style>{`
                .shadow-card { box-shadow: 0 1px 4px rgba(58,63,143,0.08), 0 4px 16px rgba(58,63,143,0.06); }
                .pulse-ring { animation: pulse 1.8s infinite; box-shadow: 0 0 0 0 rgba(0, 194, 203, 0.7); }
                @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(0, 194, 203, 0.7); } 70% { box-shadow: 0 0 0 8px rgba(0, 194, 203, 0); } 100% { box-shadow: 0 0 0 0 rgba(0, 194, 203, 0); } }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #c7c5d3; border-radius: 10px; }
            `}</style>

            <div className="flex flex-col gap-8 w-full p-6 md:p-8 max-w-[1280px] mx-auto pb-12">

                {/* Welcome Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end">
                    <div>
                        <h2 className="text-[32px] text-[#222777] font-bold mb-1 tracking-tight">{greeting}, {firstName}</h2>
                        <p className="font-mono text-[12px] text-[#777682] uppercase tracking-wider">{currentDate}</p>
                    </div>
                    <div className="mt-4 md:mt-0 flex gap-3">
                        <button onClick={() => navigate('/app/research')} className="bg-[#222777] text-white font-bold text-[12px] px-4 py-2 rounded-md hover:bg-[#222777]/90 transition-colors flex items-center gap-2 shadow-sm">
                            <span className="material-symbols-outlined text-[18px]">mic</span> New Session
                        </button>
                        <button onClick={() => navigate('/app/research')} className="border border-[#6bf6ff] text-[#006e73] bg-[#e6fbfc] font-bold text-[12px] px-4 py-2 rounded-md hover:bg-[#6bf6ff]/20 transition-colors flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">search</span> New Research
                        </button>
                        <button onClick={() => navigate('/app/reports')} className="text-[#222777] font-bold text-[12px] px-4 py-2 rounded-md hover:bg-[#e0e2eb] transition-colors flex items-center gap-2 border border-transparent">
                            <span className="material-symbols-outlined text-[18px]">description</span> View Reports
                        </button>
                    </div>
                </div>

                {/* 4 KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white shadow-card rounded-lg p-5 border-l-[8px] border-[#222777] flex flex-col justify-between h-[120px]">
                        <p className="font-mono text-[14px] font-bold text-[#464651] uppercase tracking-wider">Total Recordings</p>
                        <div className="flex items-end justify-between">
                            <p className="text-[32px] font-bold text-[#222777] leading-none">{stats.recordings}</p>
                            <span className="material-symbols-outlined text-[#c7c5d3] text-[24px]">mic</span>
                        </div>
                    </div>
                    <div className="bg-white shadow-card rounded-lg p-5 border-l-[8px] border-[#222777] flex flex-col justify-between h-[120px]">
                        <p className="font-mono text-[14px] font-bold text-[#464651] uppercase tracking-wider">Reports Generated</p>
                        <div className="flex items-end justify-between">
                            <p className="text-[32px] font-bold text-[#222777] leading-none">{stats.reports}</p>
                            <span className="material-symbols-outlined text-[#c7c5d3] text-[24px]">description</span>
                        </div>
                    </div>
                    <div className="bg-white shadow-card rounded-lg p-5 border-l-[8px] border-[#222777] flex flex-col justify-between h-[120px]">
                        <p className="font-mono text-[14px] font-bold text-[#464651] uppercase tracking-wider">Searches Run</p>
                        <div className="flex items-end justify-between">
                            <p className="text-[32px] font-bold text-[#222777] leading-none">{stats.searchesRun}</p>
                            <span className="material-symbols-outlined text-[#c7c5d3] text-[24px]">search</span>
                        </div>
                    </div>
                    <div className="bg-white shadow-card rounded-lg p-5 border-l-[8px] border-[#222777] flex flex-col justify-between h-[120px]">
                        <p className="font-mono text-[14px] font-bold text-[#464651] uppercase tracking-wider">Storage Used</p>
                        <div className="flex items-end justify-between">
                            <p className="text-[32px] font-bold text-[#222777] leading-none">45%</p>
                            <span className="material-symbols-outlined text-[#c7c5d3] text-[24px]">cloud</span>
                        </div>
                    </div>
                </div>

                {/* Bento Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Recent Activity */}
                    <div className="lg:col-span-1 bg-white shadow-card rounded-lg p-6 border border-[#e0e2eb] h-[550px] flex flex-col">
                        <h3 className="text-[20px] font-bold text-[#181c22] mb-4 pb-2 border-b border-[#e0e2eb]">Recent Activity</h3>
                        <div className="flex-1 overflow-y-auto pr-2 space-y-5 custom-scrollbar">
                            {timelineActivity.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => navigate(`/app/research?recordingId=${item.recordingId}${item.transcriptId ? `&transcriptId=${item.transcriptId}` : ''}`)}
                                    className="flex items-start gap-3 cursor-pointer hover:bg-[#f9f9ff] rounded-md -mx-2 px-2 py-1 transition-colors"
                                >
                                    <div className={`w-2.5 h-2.5 mt-1.5 rounded-full shrink-0 ${item.color} ${item.pulse ? 'pulse-ring' : ''}`}></div>
                                    <div>
                                        <p className="text-[14px] text-[#181c22]" dangerouslySetInnerHTML={{ __html: item.text.replace(/"([^"]+)"/, '<span class="font-bold">"$1"</span>') }}></p>
                                        <p className="font-mono text-[11px] font-bold text-[#777682] mt-1">{item.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="lg:col-span-2 flex flex-col gap-6">
                        {/* SVG Line Chart */}
                        <div className="bg-white shadow-card rounded-lg p-8 border border-[#e0e2eb] h-[390px] flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-[20px] font-bold text-[#181c22]">Recording Activity (7 Days)</h3>
                                <button onClick={() => navigate('/app/research')} className="text-[#777682] hover:text-[#222777] transition-colors" title="Start a new recording">
                                    <span className="material-symbols-outlined">add_circle</span>
                                </button>
                            </div>
                            {hasActivity ? (
                                <div className="flex-1 relative w-full border-l border-b border-[#e0e2eb] pb-6 pl-4 flex flex-col justify-between">
                                    <div className="absolute left-[-28px] top-0 bottom-6  flex flex-col justify-between items-end text-[11px] font-mono font-bold text-[#777682]">
                                        <span>{niceMax}</span><span>{Math.round(niceMax * 2 / 3)}</span><span>{Math.round(niceMax / 3)}</span><span>0</span>
                                    </div>
                                    <div className="absolute left-4 right-0 bottom-[-24px] flex justify-between text-[12px] font-bold text-[#777682]">
                                        {chartData.map((d) => <span key={d.date}>{d.label}</span>)}
                                    </div>
                                    <div className="absolute inset-0 top-2 bottom-0 left-0 right-0 overflow-hidden">
                                        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                                            <defs>
                                                <linearGradient id="chartGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                                                    <stop offset="0%" stopColor="#3a3f8f" stopOpacity="0.2"></stop>
                                                    <stop offset="100%" stopColor="#3a3f8f" stopOpacity="0"></stop>
                                                </linearGradient>
                                            </defs>
                                            <path d={chartAreaPath} fill="url(#chartGradient)"></path>
                                            <path d={chartLinePath} fill="none" stroke="#3a3f8f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"></path>
                                            {chartPoints.map((p) => (
                                                <circle key={p.date} cx={p.x} cy={p.y} r="1.5" fill="#00c2cb" stroke="#ffffff" strokeWidth="0.5">
                                                    <title>{p.label} ({p.date}): {p.count} recording{p.count === 1 ? '' : 's'}</title>
                                                </circle>
                                            ))}
                                        </svg>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
                                    <span className="material-symbols-outlined text-[#c7c5d3] text-[40px]">mic_off</span>
                                    <p className="text-[13px] font-bold text-[#777682]">No recordings in the last 7 days.</p>
                                    <button onClick={() => navigate('/app/research')} className="text-[#222777] text-[13px] font-bold hover:text-[#00c2cb] transition-colors">
                                        Start your first recording
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Storage */}
                        <div className="bg-white shadow-card rounded-lg p-6 border border-[#e0e2eb]">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-[18px] font-bold text-[#181c22] flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#777682]">cloud_done</span> Storage Allocation
                                </h3>
                                <p className="font-mono text-[14px] font-bold text-[#777682]">45GB / 100GB</p>
                            </div>
                            <div className="w-full bg-[#e6e8f1] rounded-full h-3 mb-2 overflow-hidden">
                                <div className="bg-gradient-to-r from-[#222777] to-[#6bf6ff] h-3 rounded-full" style={{ width: '45%' }}></div>
                            </div>
                            <p className="font-mono text-[12px] font-bold text-[#464651] text-right">45% Used. Upgrade for more capacity.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}