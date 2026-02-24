import React, { useState, useEffect } from 'react';
import { UserSettings, Tab } from '../types';
import { Analytics } from './Analytics';
import { TilawahJournal } from './TilawahJournal';
import { useIbadahData } from '../hooks/useIbadahData';
import { usePrayerData } from '../hooks/usePrayerData';

interface IbadahTrackerProps {
    settings: UserSettings;
    onNavigate?: (tab: Tab) => void;
}

export const IbadahTracker: React.FC<IbadahTrackerProps> = ({ settings, onNavigate }) => {
    const { tasks, toggleTask, stats, analyticsData } = useIbadahData();
    const { hijri, cityName } = usePrayerData(settings.city, settings.country);
    const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
    const [isTilawahOpen, setIsTilawahOpen] = useState(false);

    // Auto-open Tilawah Journal if navigated from Home's Al-Quran button
    useEffect(() => {
        const flag = localStorage.getItem('open_tilawah_from_home');
        if (flag === 'true') {
            localStorage.removeItem('open_tilawah_from_home');
            setIsTilawahOpen(true);
        }
    }, []);

    // Dynamic Ramadan data from API
    const ramadanDay = hijri ? parseInt(hijri.day, 10) : 0;
    const ramadanProgress = ramadanDay > 0 ? Math.round((ramadanDay / 30) * 100) : 0;
    const strokeCircumference = 2 * Math.PI * 32;
    const strokeOffset = strokeCircumference - (ramadanProgress / 100) * strokeCircumference;

    if (isAnalyticsOpen) {
        return <Analytics onBack={() => setIsAnalyticsOpen(false)} />;
    }

    if (isTilawahOpen) {
        return (
            <TilawahJournal
                onBack={() => {
                    setIsTilawahOpen(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
            />
        );
    }

    return (
        <div className="bg-cream dark:bg-dark flex-1 flex flex-col pb-4 pt-12 space-y-6 animate-page-enter" style={{ padding: '48px var(--app-padding-x) 16px' }}>
            {/* Premium Banner — DYNAMIC HIJRI */}
            <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#11d462] to-[#0a8a3d] p-6 text-white shadow-lg">
                <div className="relative z-10 flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-sm font-medium opacity-90 uppercase tracking-widest">Ramadan Kareem</p>
                        <h2 className="text-2xl font-bold">
                            {hijri ? `Hari ke-${hijri.day} ${hijri.month}` : 'Memuat…'}
                        </h2>
                        <p className="text-xs opacity-75">
                            {hijri ? `${hijri.year} ${hijri.designation}` : ''} • {cityName}
                        </p>
                    </div>
                    <div className="relative flex items-center justify-center shrink-0">
                        <svg className="w-20 h-20" viewBox="0 0 80 80">
                            <circle className="text-white/20" cx="40" cy="40" fill="transparent" r="32" stroke="currentColor" strokeWidth="6"></circle>
                            <circle className="text-gold-accent transition-all duration-1000 ease-out" cx="40" cy="40" fill="transparent" r="32" stroke="currentColor" strokeDasharray={strokeCircumference} strokeDashoffset={strokeOffset} strokeLinecap="round" strokeWidth="6" style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}></circle>
                        </svg>
                        <span className="absolute text-sm font-bold">{ramadanProgress}%</span>
                    </div>
                </div>
                <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
                    <span className="material-symbols-outlined text-[150px]">mosque</span>
                </div>
            </section>

            {/* Streak Card - CLICKABLE */}
            <section
                onClick={() => setIsAnalyticsOpen(true)}
                className="cursor-pointer hover:scale-[1.02] transition-transform bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between"
            >
                <div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Streak Saat Ini</p>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-4xl font-extrabold text-[#D4AF37]">{stats.streak}</span>
                        <span className="material-symbols-outlined text-orange-500 filled-icon text-2xl">local_fire_department</span>
                    </div>
                </div>
                <div className="flex items-end gap-1 h-12">
                    {[1 / 3, 1 / 2, 4 / 5, 2 / 3, 1, 5 / 6, 1].map((h, i) => (
                        <div key={i} className="w-2 bg-[#11d462] rounded-t-sm" style={{ height: `${h * 100}%`, opacity: h }}></div>
                    ))}
                </div>
            </section>

            {/* Checklists Grouped by Type */}
            {['Sholat Wajib', 'Ibadah Sunnah', 'Amalan Khusus'].map((category, idx) => (
                <section key={category} className="space-y-3 stagger-appear">
                    <h3 className="text-slate-800 dark:text-slate-200 font-bold text-lg px-2 flex items-center gap-2">
                        <span className={`w-1.5 h-6 rounded-full ${idx === 0 ? 'bg-[#11d462]' : idx === 1 ? 'bg-[#D4AF37]' : 'bg-blue-500'}`}></span>
                        {category}
                    </h3>
                    <div className="space-y-3">
                        {tasks.filter(t => t.type === category).map(task => (
                            <div
                                key={task.id}
                                onClick={() => toggleTask(task.id)}
                                className={`group flex items-center justify-between p-4 rounded-xl shadow-sm transition-all cursor-pointer bg-white dark:bg-slate-800 ${task.checked ? 'border-l-4 border-[#11d462] ring-1 ring-[#11d462]/10' : 'border border-transparent hover:border-[#11d462]/20'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${task.color}`}>
                                        <span className="material-symbols-outlined filled-icon">{task.icon}</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 dark:text-slate-100">{task.title}</p>
                                        {task.subtitle && <p className="text-xs text-slate-500">{task.subtitle}</p>}
                                    </div>
                                </div>
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${task.checked ? 'bg-[#11d462]' : 'border-2 border-slate-200 dark:border-slate-600'}`}>
                                    {task.checked && <span className="material-symbols-outlined text-white text-sm">check</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            ))}

            {/* Tilawah Journal Shortcut Card */}
            <div
                onClick={() => setIsTilawahOpen(true)}
                className="cursor-pointer active:scale-[0.98] transition-transform"
                style={{
                    background: 'linear-gradient(135deg, #0B2D18, #1a4a2a)',
                    borderRadius: '20px',
                    padding: '18px 20px',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: '14px',
                }}
            >
                <div
                    style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: 'rgba(212,175,55,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                    }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#D4AF37' }}>auto_stories</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: '15px', color: '#ffffff', margin: 0 }}>Tilawah Journal</p>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: '2px 0 0' }}>Catat & pantau progress bacaanmu</p>
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)' }}>arrow_forward_ios</span>
            </div>
        </div>
    );
};
