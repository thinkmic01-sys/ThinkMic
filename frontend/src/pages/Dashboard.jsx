// frontend/src/pages/Dashboard.jsx
import React from 'react';
import KpiCard from '../components/KpiCard';

export default function Dashboard() {
    return (
        <div className="flex flex-col gap-8 w-full p-4 md:p-8">
            {/* Top Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-wrap gap-2">
                    <button className="px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-semibold hover:bg-surface-container-highest transition-colors">7D</button>
                    <button className="px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-semibold hover:bg-surface-container-highest transition-colors">30D</button>
                    <button className="px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-semibold hover:bg-surface-container-highest transition-colors">90D</button>
                    <div className="flex items-center bg-primary text-white rounded-full pl-3 pr-1 py-1 gap-2">
                        <span className="text-xs font-semibold">Custom</span>
                        <div className="flex items-center gap-1 bg-white text-gray-900 rounded-full px-2 py-0.5">
                            <span className="font-mono text-xs">2023-10-01</span>
                            <span>-</span>
                            <span className="font-mono text-xs">2023-10-31</span>
                            <span className="material-symbols-outlined text-gray-400 ml-1 cursor-pointer" style={{ fontSize: '14px' }}>calendar_today</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI Row using our Reusable Component */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <KpiCard title="Submissions" icon="description" value="1,492" trendValue="12%" isPositive={true}>
                    <div className="w-1/6 bg-cyan h-1/4 rounded-t-sm"></div>
                    <div className="w-1/6 bg-cyan h-2/4 rounded-t-sm"></div>
                    <div className="w-1/6 bg-cyan h-1/3 rounded-t-sm"></div>
                    <div className="w-1/6 bg-cyan h-3/4 rounded-t-sm"></div>
                    <div className="w-1/6 bg-cyan h-2/3 rounded-t-sm"></div>
                    <div className="w-1/6 bg-cyan h-full rounded-t-sm"></div>
                </KpiCard>

                <KpiCard title="Recordings" icon="mic" value="384" trendValue="3%" isPositive={false}>
                    <div className="w-1/6 bg-cyan h-full rounded-t-sm"></div>
                    <div className="w-1/6 bg-cyan h-2/3 rounded-t-sm"></div>
                    <div className="w-1/6 bg-cyan h-3/4 rounded-t-sm"></div>
                    <div className="w-1/6 bg-cyan h-1/2 rounded-t-sm"></div>
                    <div className="w-1/6 bg-cyan h-1/4 rounded-t-sm"></div>
                    <div className="w-1/6 bg-cyan h-1/3 rounded-t-sm"></div>
                </KpiCard>

                <KpiCard title="Reports" icon="analytics" value="89" trendValue="24%" isPositive={true}>
                    <div className="w-1/6 bg-cyan h-1/6 rounded-t-sm"></div>
                    <div className="w-1/6 bg-cyan h-1/3 rounded-t-sm"></div>
                    <div className="w-1/6 bg-cyan h-1/2 rounded-t-sm"></div>
                    <div className="w-1/6 bg-cyan h-2/3 rounded-t-sm"></div>
                    <div className="w-1/6 bg-cyan h-5/6 rounded-t-sm"></div>
                    <div className="w-1/6 bg-cyan h-full rounded-t-sm"></div>
                </KpiCard>
            </div>

            {/* 2-Column Chart Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Submissions Trend Chart */}
                <div className="shadow-md rounded-xl bg-white p-6 flex flex-col h-80 border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-900">Submissions Trend</h3>
                        <button className="text-gray-500 hover:text-primary text-xs font-semibold flex items-center gap-1">
                            Export CSV <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
                        </button>
                    </div>

                    <div className="flex-1 relative border-l border-b border-gray-200 pb-4 pl-2">
                        <div className="absolute inset-0 top-2 bottom-8 left-2 overflow-hidden flex items-end">
                            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                                <defs>
                                    <linearGradient id="areaGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                                        <stop offset="0%" stopColor="#00C2CB" stopOpacity="0.3"></stop>
                                        <stop offset="100%" stopColor="#00C2CB" stopOpacity="0"></stop>
                                    </linearGradient>
                                </defs>
                                <path d="M0,80 Q10,70 20,60 T40,40 T60,50 T80,20 T100,10 L100,100 L0,100 Z" fill="url(#areaGradient)"></path>
                                <path d="M0,80 Q10,70 20,60 T40,40 T60,50 T80,20 T100,10" fill="none" stroke="#3A3F8F" strokeWidth="2"></path>
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Completion Rate Bar Chart */}
                <div className="shadow-md rounded-xl bg-white p-6 flex flex-col h-80 border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-900">Completion Rate</h3>
                        <button className="text-gray-500 hover:text-primary text-xs font-semibold flex items-center gap-1">
                            Export CSV <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
                        </button>
                    </div>
                    <div className="flex-1 relative border-l border-b border-gray-200 pb-4 pl-2 flex items-end justify-around gap-2 px-4 pt-4">
                        <div className="w-full bg-primary hover:bg-cyan transition-colors rounded-t-sm h-[80%]"></div>
                        <div className="w-full bg-primary hover:bg-cyan transition-colors rounded-t-sm h-[65%]"></div>
                        <div className="w-full bg-primary hover:bg-cyan transition-colors rounded-t-sm h-[90%]"></div>
                        <div className="w-full bg-primary hover:bg-cyan transition-colors rounded-t-sm h-[45%]"></div>
                        <div className="w-full bg-primary hover:bg-cyan transition-colors rounded-t-sm h-[75%]"></div>
                    </div>
                </div>

            </div>
        </div>
    );
}