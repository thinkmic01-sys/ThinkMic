import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import api from '../../services/api';

const AVATAR_COLORS = ['bg-[#075e51]', 'bg-[#097969]', 'bg-[#5156a7]', 'bg-[#181c22]'];
const DAY_OPTIONS = [7, 30, 90];

function downsampleCounts(series, buckets) {
    if (series.length === 0) return Array(buckets).fill(0);
    if (series.length <= buckets) return series.map((d) => d.count);
    const result = [];
    const size = series.length / buckets;
    for (let i = 0; i < buckets; i++) {
        const slice = series.slice(Math.floor(i * size), Math.floor((i + 1) * size));
        result.push(slice.reduce((s, d) => s + d.count, 0));
    }
    return result;
}

function sampleSeries(series, count) {
    if (series.length <= count) return series;
    const step = (series.length - 1) / (count - 1);
    return Array.from({ length: count }, (_, i) => series[Math.round(i * step)]);
}

function downloadCsv(filename, headers, rows) {
    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

export default function AdminDashboard() {
    const accessToken = useSelector((state) => state.auth?.accessToken);
    const [filters, setFilters] = useState({ days: 30, userId: '' });
    const [filterUsers, setFilterUsers] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [activitySearch, setActivitySearch] = useState('');

    useEffect(() => {
        if (!accessToken) return;
        api.get('/admin/users')
            .then((res) => setFilterUsers(res.data.users || []))
            .catch((err) => console.error('Failed to fetch users for filter:', err));
    }, [accessToken]);

    useEffect(() => {
        if (!accessToken) return;
        const fetchAnalytics = async () => {
            try {
                const res = await api.get('/analytics/submissions', {
                    params: { days: filters.days, ...(filters.userId ? { userId: filters.userId } : {}) }
                });
                setAnalytics(res.data);
            } catch (err) {
                console.error('Failed to fetch analytics:', err);
            }
        };
        fetchAnalytics();
    }, [accessToken, filters]);

    const kpis = analytics?.kpis || {
        submissions: { total: 0, deltaPct: 0, trend: [] },
        recordings: { total: 0, deltaPct: 0, trend: [] },
        reports: { total: 0, deltaPct: 0, trend: [] },
        activeUsers: { total: 0, deltaPct: 0, trend: [] },
        searchesRun: { total: 0, deltaPct: 0, trend: [] }
    };
    const completionByForm = analytics?.completionByForm || [];
    const fieldCompletions = analytics?.fieldCompletions || [];
    const topUsers = analytics?.topUsers || [];
    const recentActivity = analytics?.recentActivity || [];
    const range = analytics?.range;

    const filteredActivity = recentActivity.filter((a) =>
        !activitySearch ||
        a.user.toLowerCase().includes(activitySearch.toLowerCase()) ||
        a.email.toLowerCase().includes(activitySearch.toLowerCase()) ||
        a.form.toLowerCase().includes(activitySearch.toLowerCase())
    );

    // --- Submissions Trend chart geometry (same point/path approach as the regular
    // Dashboard's Recording Activity chart) ---
    const trend = kpis.submissions.trend;
    const trendRawMax = Math.max(0, ...trend.map((d) => d.count));
    // Always a multiple of 3 so the axis's 1/3 and 2/3 tick labels are distinct integers -
    // otherwise small maxes (e.g. 2) round to duplicate ticks like "0, 1, 1, 2".
    const trendNiceMax = trendRawMax === 0 ? 0 : Math.max(3, Math.ceil(trendRawMax / 3) * 3);
    const trendPoints = trend.map((d, i) => ({
        ...d,
        x: trend.length > 1 ? (i * 100) / (trend.length - 1) : 0,
        y: trendNiceMax > 0 ? 95 - (d.count / trendNiceMax) * 85 : 95
    }));
    const trendLinePath = trendPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const trendAreaPath = trendPoints.length > 0 ? `${trendLinePath} L100,100 L0,100 Z` : '';
    const trendXLabels = sampleSeries(trend, 5);

    const renderDelta = (deltaPct) => {
        if (deltaPct > 0) return <span className="text-[11px] sm:text-[12px] font-bold text-[#EAB308] mb-0.5 sm:mb-1">↑{deltaPct}%</span>;
        if (deltaPct < 0) return <span className="text-[11px] sm:text-[12px] font-bold text-[#ba1a1a] mb-0.5 sm:mb-1">↓{Math.abs(deltaPct)}%</span>;
        return <span className="text-[11px] sm:text-[12px] font-bold text-[#c7c5d3] mb-0.5 sm:mb-1">—0%</span>;
    };

    const renderSparkline = (metric) => {
        const bars = downsampleCounts(metric.trend, 6);
        const max = Math.max(...bars, 1);
        return (
            <div className="flex items-end gap-1 h-6 sm:h-8 mt-1 sm:mt-2">
                {bars.map((v, i) => (
                    <div key={i} className="flex-1 bg-[#CA8A04] rounded-t-sm" style={{ height: `${Math.max((v / max) * 100, 4)}%` }}></div>
                ))}
            </div>
        );
    };

    const handleExportTrendCsv = () => downloadCsv('submissions-trend.csv', ['Date', 'Submissions'], trend.map((d) => [d.date, d.count]));
    const handleExportCompletionCsv = () => downloadCsv('completion-rate.csv', ['Form', 'Completion %', 'Total Submissions'], completionByForm.map((c) => [c.name, c.percentage, c.totalSubmissions]));
    const handleExportTopUsersCsv = () => downloadCsv('top-users.csv', ['User', 'Submissions'], topUsers.map((u) => [u.name, u.submissions]));
    const handleExportActivityCsv = () => downloadCsv('recent-activity.csv', ['User', 'Email', 'Form', 'Submitted At', 'Status'], filteredActivity.map((a) => [a.user, a.email, a.form, a.submittedAt, a.status]));

    return (
        <div className="w-full h-[calc(100vh-64px)] overflow-y-auto bg-[#F4F9F8] font-sans custom-scrollbar">

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #c7c5d3; border-radius: 10px; }
            `}</style>

            <div className="flex flex-col gap-5 sm:gap-6 w-full p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto pb-12">

                {/* Time & User Filters */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 sm:gap-6">
                    <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-2 items-start sm:items-center w-full xl:w-auto">
                        <div className="flex gap-2">
                            {DAY_OPTIONS.map((d) => (
                                <button
                                    key={d}
                                    onClick={() => setFilters((prev) => ({ ...prev, days: d }))}
                                    className={`px-3 sm:px-4 py-1.5 rounded-md text-[12px] sm:text-[13px] font-bold transition-colors ${filters.days === d ? 'bg-[#075e51] text-white' : 'bg-[#eef0f9] text-[#464651] hover:bg-[#e0e2eb]'}`}
                                >
                                    {d}D
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center shadow-[0_1px_2px_rgba(0,0,0,0.05)] rounded-md overflow-hidden border border-[#c7c5d3] w-full sm:w-auto mt-1 sm:mt-0">
                            <div className="bg-[#075e51] text-white px-3 sm:px-4 py-2 sm:py-1.5 text-[12px] sm:text-[13px] font-bold tracking-wide">Range</div>
                            <div className="bg-white text-[#181c22] px-3 py-2 sm:py-1.5 flex items-center gap-1.5 sm:gap-2 flex-1 sm:flex-none">
                                <span className="font-mono text-[12px] sm:text-[13px] font-bold">{range?.startDate || '-'}</span>
                                <span className="text-[#c7c5d3]">-</span>
                                <span className="font-mono text-[12px] sm:text-[13px] font-bold">{range?.endDate || '-'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full xl:w-auto pt-2 xl:pt-0 border-t border-[#e0e2eb] xl:border-0">
                        <span className="text-[12px] sm:text-[13px] font-bold text-[#464651] whitespace-nowrap">Filter by User:</span>
                        <div className="relative w-full sm:w-auto">
                            <select
                                value={filters.userId}
                                onChange={(e) => setFilters((prev) => ({ ...prev, userId: e.target.value }))}
                                className="w-full sm:w-auto appearance-none bg-white border border-[#c7c5d3] rounded-md pl-3 pr-8 py-1.5 text-[12px] sm:text-[13px] font-bold text-[#181c22] focus:ring-1 focus:ring-[#075e51] focus:border-[#075e51] outline-none cursor-pointer shadow-sm"
                            >
                                <option value="">All Users</option>
                                {filterUsers.map((u) => (
                                    <option key={u._id} value={u._id}>{u.fullName}</option>
                                ))}
                            </select>
                            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-[#777682] pointer-events-none">expand_more</span>
                        </div>
                    </div>
                </div>

                {/* KPI Cards (5 Columns) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb] p-4 sm:p-5 flex flex-col gap-3 sm:gap-4">
                        <div className="flex justify-between items-center"><span className="text-[11px] sm:text-[13px] font-bold text-[#464651]">Submissions</span><span className="material-symbols-outlined text-[#c7c5d3] text-[16px] sm:text-[18px]">description</span></div>
                        <div className="flex items-end gap-1 sm:gap-2"><span className="text-2xl sm:text-3xl font-bold text-[#181c22]">{kpis.submissions.total}</span>{renderDelta(kpis.submissions.deltaPct)}</div>
                        {renderSparkline(kpis.submissions)}
                    </div>
                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb] p-4 sm:p-5 flex flex-col gap-3 sm:gap-4">
                        <div className="flex justify-between items-center"><span className="text-[11px] sm:text-[13px] font-bold text-[#464651]">Recordings</span><span className="material-symbols-outlined text-[#c7c5d3] text-[16px] sm:text-[18px]">mic</span></div>
                        <div className="flex items-end gap-1 sm:gap-2"><span className="text-2xl sm:text-3xl font-bold text-[#181c22]">{kpis.recordings.total}</span>{renderDelta(kpis.recordings.deltaPct)}</div>
                        {renderSparkline(kpis.recordings)}
                    </div>
                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb] p-4 sm:p-5 flex flex-col gap-3 sm:gap-4">
                        <div className="flex justify-between items-center"><span className="text-[11px] sm:text-[13px] font-bold text-[#464651]">Reports</span><span className="material-symbols-outlined text-[#c7c5d3] text-[16px] sm:text-[18px]">analytics</span></div>
                        <div className="flex items-end gap-1 sm:gap-2"><span className="text-2xl sm:text-3xl font-bold text-[#181c22]">{kpis.reports.total}</span>{renderDelta(kpis.reports.deltaPct)}</div>
                        {renderSparkline(kpis.reports)}
                    </div>
                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb] p-4 sm:p-5 flex flex-col gap-3 sm:gap-4">
                        <div className="flex justify-between items-center"><span className="text-[11px] sm:text-[13px] font-bold text-[#464651]">Active Users</span><span className="material-symbols-outlined text-[#c7c5d3] text-[16px] sm:text-[18px]">group</span></div>
                        <div className="flex items-end gap-1 sm:gap-2"><span className="text-2xl sm:text-3xl font-bold text-[#181c22]">{kpis.activeUsers.total}</span>{renderDelta(kpis.activeUsers.deltaPct)}</div>
                        {renderSparkline(kpis.activeUsers)}
                    </div>
                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.05)] border border-[#e0e2eb] p-4 sm:p-5 flex flex-col gap-3 sm:gap-4 sm:col-span-3 lg:col-span-1">
                        <div className="flex justify-between items-center"><span className="text-[11px] sm:text-[13px] font-bold text-[#464651]">Searches Run</span><span className="material-symbols-outlined text-[#c7c5d3] text-[16px] sm:text-[18px]">search</span></div>
                        <div className="flex items-end gap-1 sm:gap-2"><span className="text-2xl sm:text-3xl font-bold text-[#181c22]">{kpis.searchesRun.total}</span>{renderDelta(kpis.searchesRun.deltaPct)}</div>
                        {renderSparkline(kpis.searchesRun)}
                    </div>
                </div>

                {/* 2-Column Main Chart Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    <div className="shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] rounded-xl bg-white p-5 sm:p-6 flex flex-col h-64 sm:h-80">
                        <div className="flex justify-between items-center mb-4 sm:mb-6">
                            <h3 className="text-[16px] sm:text-lg font-bold text-[#181c22]">Submissions Trend</h3>
                            <button onClick={handleExportTrendCsv} className="text-[#464651] hover:text-[#075e51] text-[11px] sm:text-[13px] font-bold flex items-center gap-1 transition-colors">
                                Export CSV <span className="material-symbols-outlined text-[14px] sm:text-[16px]">download</span>
                            </button>
                        </div>
                        {trendRawMax > 0 ? (
                            <div className="flex-1 relative border-l border-b border-[#e0e2eb] pb-5 sm:pb-6 pl-3 sm:pl-4 flex flex-col justify-between">
                                <div className="absolute left-[-20px] sm:left-[-24px] top-0 bottom-5 sm:bottom-6 flex flex-col justify-between text-[9px] sm:text-[10px] font-mono font-bold text-[#c7c5d3]">
                                    <span>{trendNiceMax}</span><span>{Math.round(trendNiceMax * 2 / 3)}</span><span>{Math.round(trendNiceMax / 3)}</span><span>0</span>
                                </div>
                                <div className="absolute left-3 sm:left-4 right-0 bottom-[-20px] sm:bottom-[-24px] flex justify-between text-[9px] sm:text-[10px] font-mono font-bold text-[#c7c5d3]">
                                    {trendXLabels.map((d) => <span key={d.date}>{d.label}</span>)}
                                </div>
                                <div className="absolute inset-0 top-2 bottom-0 left-0 right-0 overflow-hidden">
                                    <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                                        <defs>
                                            <linearGradient id="areaGradient2" x1="0%" x2="0%" y1="0%" y2="100%">
                                                <stop offset="0%" stopColor="#CA8A04" stopOpacity="0.4"></stop>
                                                <stop offset="100%" stopColor="#CA8A04" stopOpacity="0"></stop>
                                            </linearGradient>
                                        </defs>
                                        <path d={trendAreaPath} fill="url(#areaGradient2)"></path>
                                        <path d={trendLinePath} fill="none" stroke="#075e51" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"></path>
                                    </svg>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-[13px] font-bold text-[#777682]">No submissions in this range.</div>
                        )}
                    </div>

                    <div className="shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] rounded-xl bg-white p-5 sm:p-6 flex flex-col h-64 sm:h-80">
                        <div className="flex justify-between items-center mb-4 sm:mb-6">
                            <h3 className="text-[16px] sm:text-lg font-bold text-[#181c22]">Completion Rate</h3>
                            <button onClick={handleExportCompletionCsv} className="text-[#464651] hover:text-[#075e51] text-[11px] sm:text-[13px] font-bold flex items-center gap-1 transition-colors">
                                Export CSV <span className="material-symbols-outlined text-[14px] sm:text-[16px]">download</span>
                            </button>
                        </div>
                        {completionByForm.length > 0 ? (
                            <div className="flex-1 relative border-l border-b border-[#e0e2eb] pb-5 sm:pb-6 pl-2 sm:pl-4 flex items-end justify-around gap-2 sm:gap-4 px-2 sm:px-4">
                                <div className="absolute left-2 sm:left-4 right-0 bottom-[-20px] sm:bottom-[-24px] flex justify-around text-[8px] sm:text-[10px] font-mono font-bold text-[#c7c5d3]">
                                    {completionByForm.map((f) => <span key={f.schemaId} className="truncate max-w-[60px]">{f.name}</span>)}
                                </div>
                                {completionByForm.map((f) => (
                                    <div key={f.schemaId} title={`${f.percentage}%`} className="w-full bg-[#097969] hover:bg-[#5156a7] transition-colors rounded-t-sm" style={{ height: `${Math.max(f.percentage, 3)}%` }}></div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-[13px] font-bold text-[#777682]">No forms submitted in this range.</div>
                        )}
                    </div>
                </div>

                {/* Top Users & Per-field Completion Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] p-5 sm:p-6 flex flex-col">
                        <div className="flex justify-between items-center mb-4 sm:mb-6">
                            <h3 className="text-[16px] sm:text-lg font-bold text-[#181c22]">Top Users</h3>
                            <button onClick={handleExportTopUsersCsv} className="text-[#464651] hover:text-[#075e51] text-[11px] sm:text-[13px] font-bold flex items-center gap-1 transition-colors">
                                Export CSV <span className="material-symbols-outlined text-[14px] sm:text-[16px]">download</span>
                            </button>
                        </div>
                        {topUsers.length > 0 ? (
                            <div className="flex-1 overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left min-w-[300px]">
                                    <thead>
                                    <tr className="border-b border-[#e0e2eb] text-[#777682] text-[11px] sm:text-[12px] font-bold uppercase tracking-wider">
                                        <th className="pb-2 sm:pb-3 font-mono whitespace-nowrap">User</th>
                                        <th className="pb-2 sm:pb-3 text-right font-mono whitespace-nowrap">Submissions</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {topUsers.map((user, idx) => (
                                        <tr key={user.userId} className={idx !== topUsers.length - 1 ? "border-b border-[#f1f3fc]" : ""}>
                                            <td className="py-3 sm:py-4 flex items-center gap-2 sm:gap-3 whitespace-nowrap">
                                                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full ${AVATAR_COLORS[idx % AVATAR_COLORS.length]} flex items-center justify-center text-white text-[10px] sm:text-[11px] font-bold shadow-sm`}>{user.initials}</div>
                                                <span className="font-semibold text-[#181c22] text-[13px] sm:text-[14px]">{user.name}</span>
                                            </td>
                                            <td className="py-3 sm:py-4 text-right">
                                                <span className="font-mono text-[13px] sm:text-[14px] font-bold text-[#464651]">{user.submissions}</span>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-[13px] font-bold text-[#777682] py-6">No submissions in this range.</div>
                        )}
                    </div>

                    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] p-5 sm:p-6 flex flex-col">
                        <div className="flex justify-between items-center mb-4 sm:mb-6">
                            <h3 className="text-[16px] sm:text-lg font-bold text-[#181c22]">Per-field Completion</h3>
                        </div>
                        {fieldCompletions.length > 0 ? (
                            <div className="flex flex-col gap-4 sm:gap-6 mt-1 sm:mt-2">
                                {fieldCompletions.map((field) => (
                                    <div key={field.label} className="flex flex-col gap-1.5 sm:gap-2">
                                        <div className="flex justify-between items-center text-[11px] sm:text-[12px] font-mono font-bold text-[#464651]">
                                            <span>{field.label}</span>
                                            <span>{field.percentage}%</span>
                                        </div>
                                        <div className="w-full h-1.5 sm:h-2 bg-[#e0e2eb] rounded-full overflow-hidden">
                                            <div className="h-full bg-[#CA8A04] rounded-full" style={{ width: `${field.percentage}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-[13px] font-bold text-[#777682] py-6">No data for this range.</div>
                        )}
                    </div>
                </div>

                {/* Recent Activity Full Table */}
                <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(58,63,143,0.08)] border border-[#e0e2eb] flex flex-col overflow-hidden mb-6">
                    <div className="p-4 sm:p-5 border-b border-[#e0e2eb] flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white gap-4 sm:gap-0">
                        <h3 className="text-[16px] sm:text-lg font-bold text-[#181c22]">Recent Activity Log</h3>
                        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                            <div className="relative flex items-center w-full sm:w-auto">
                                <span className="material-symbols-outlined absolute left-3 text-[#777682] text-[16px] sm:text-[18px]">search</span>
                                <input
                                    type="text" placeholder="Search rows..."
                                    value={activitySearch}
                                    onChange={(e) => setActivitySearch(e.target.value)}
                                    className="pl-8 sm:pl-9 pr-4 py-2 bg-[#F4F9F8] border border-[#e0e2eb] rounded-md text-[12px] sm:text-[13px] font-mono text-[#464651] focus:outline-none focus:border-[#075e51] focus:ring-1 focus:ring-[#075e51] w-full sm:w-64 placeholder:text-[#c7c5d3]"
                                />
                            </div>
                            <button onClick={handleExportActivityCsv} className="text-[#464651] hover:text-[#075e51] text-[11px] sm:text-[13px] font-bold flex items-center gap-1 transition-colors shrink-0">
                                Export CSV <span className="material-symbols-outlined text-[14px] sm:text-[16px]">download</span>
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                            <tr className="bg-[#F4F9F8] border-b border-[#e0e2eb] text-[#777682] font-bold text-[11px] sm:text-[12px] uppercase tracking-wider">
                                <th className="p-3 sm:p-4 pl-4 sm:pl-6 font-mono w-1/4 whitespace-nowrap">User</th>
                                <th className="p-3 sm:p-4 font-mono w-1/4 whitespace-nowrap">Form</th>
                                <th className="p-3 sm:p-4 font-mono w-1/5 whitespace-nowrap">Submitted At</th>
                                <th className="p-3 sm:p-4 font-mono w-1/6 whitespace-nowrap">Status</th>
                            </tr>
                            </thead>
                            <tbody className="text-[13px] sm:text-[14px]">
                            {filteredActivity.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-[#777682] text-[13px]">No activity found.</td></tr>
                            ) : filteredActivity.map((activity, idx) => (
                                <tr key={activity.id} className="border-b border-[#e0e2eb] hover:bg-[#f1f3fc] transition-colors">
                                    <td className="p-3 sm:p-4 pl-4 sm:pl-6 flex items-center gap-2 sm:gap-3">
                                        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full ${AVATAR_COLORS[idx % AVATAR_COLORS.length]} flex items-center justify-center text-white text-[10px] sm:text-[11px] font-bold shadow-sm shrink-0`}>{activity.initials}</div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-bold text-[#181c22] truncate">{activity.user}</span>
                                            <span className="font-mono text-[10px] sm:text-[11px] font-bold text-[#777682] truncate">{activity.email}</span>
                                        </div>
                                    </td>
                                    <td className="p-3 sm:p-4 text-[#464651] font-semibold whitespace-nowrap">{activity.form}</td>
                                    <td className="p-3 sm:p-4 font-mono text-[11px] sm:text-[12px] font-bold text-[#777682] whitespace-nowrap">{new Date(activity.submittedAt).toLocaleString()}</td>
                                    <td className="p-3 sm:p-4 whitespace-nowrap">
                                            <span className={`px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 w-fit border
                                                ${activity.status === 'Submitted' ? 'bg-[#FEF9C3] text-[#854d0e] border-[#b2f0f4]' : ''}
                                                ${activity.status === 'Draft' ? 'bg-[#fff8e1] text-[#b45309] border-[#ffe082]' : ''}
                                                ${activity.status === 'Overdue' ? 'bg-[#ffdad6] text-[#ba1a1a] border-[#ffb4ab]' : ''}
                                            `}>
                                                <span className="material-symbols-outlined text-[12px] sm:text-[14px]">
                                                    {activity.status === 'Submitted' && 'check_circle'}
                                                    {activity.status === 'Draft' && 'draft'}
                                                    {activity.status === 'Overdue' && 'error'}
                                                </span>
                                                {activity.status}
                                            </span>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
