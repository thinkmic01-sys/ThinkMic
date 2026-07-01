// frontend/src/components/KpiCard.jsx
import React from 'react';

export default function KpiCard({ title, icon, value, trend, trendValue, isPositive, children }) {
    return (
        <div className="shadow-card rounded-xl bg-surface-container-lowest p-4 flex flex-col gap-2 relative overflow-hidden h-32">
            <div className="flex justify-between items-start">
                <span className="font-semibold text-xs text-on-surface-variant uppercase tracking-wider">{title}</span>
                <span className="material-symbols-outlined text-outline-variant" style={{ fontSize: '18px' }}>{icon}</span>
            </div>

            <div className="flex items-end gap-2">
                <span className="font-bold text-3xl text-on-surface font-mono">{value}</span>
                <span className={`text-xs mb-1 font-mono flex items-center ${isPositive ? 'text-secondary-container' : 'text-error'}`}>
          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>
            {isPositive ? 'arrow_upward' : 'arrow_downward'}
          </span>
                    {trendValue}
        </span>
            </div>

            {/* The mini sparkline chart gets injected here */}
            <div className="h-8 mt-auto flex items-end gap-0.5 opacity-70">
                {children}
            </div>
        </div>
    );
}