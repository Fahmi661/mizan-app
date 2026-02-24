/**
 * Jadwal.tsx — Jadwal Sholat (uses shared usePrayerData hook)
 * ──────────────────────────────────────────────────────────────
 * Fix 3B: Asmaul Husna card REMOVED from this page (moved to Home)
 * Uses same shared prayer data as Home for consistency.
 */

import React, { useState, useEffect } from 'react';
import { UserSettings } from '../types';
import { usePrayerData } from '../hooks/usePrayerData';

interface JadwalProps { settings: UserSettings; }

export const Jadwal: React.FC<JadwalProps> = ({ settings }) => {
   const {
      clock, prayers, hijri,
      cityName, countryName,
      activePrayerIdx, nextPrayerIdx,
      countdown, nextPrayerName,
   } = usePrayerData(settings.city, settings.country);

   // Notification toggles (localStorage)
   const [notifs, setNotifs] = useState<Record<string, boolean>>(() => {
      try {
         const s = localStorage.getItem('jadwal_notifs');
         return s ? JSON.parse(s) : { Subuh: true, Dzuhur: true, Ashar: true, Maghrib: true, Isya: true };
      } catch { return { Subuh: true, Dzuhur: true, Ashar: true, Maghrib: true, Isya: true }; }
   });

   useEffect(() => {
      localStorage.setItem('jadwal_notifs', JSON.stringify(notifs));
   }, [notifs]);

   const toggleNotif = (name: string) => {
      setNotifs(prev => ({ ...prev, [name]: !prev[name] }));
   };

   // Ramadan progress ring
   const ramadanDay = hijri ? parseInt(hijri.day, 10) : 0;
   const ramadanProgress = ramadanDay > 0 ? Math.round((ramadanDay / 30) * 100) : 0;
   const strokeCircumference = 2 * Math.PI * 32;
   const strokeOffset = strokeCircumference - (ramadanProgress / 100) * strokeCircumference;

   const isBeforeMaghrib = nextPrayerIdx >= 0 && prayers[nextPrayerIdx]?.id === 'maghrib';

   return (
      <div className="bg-cream dark:bg-dark flex-1 flex flex-col">
         <div className="pt-6 pb-2 animate-page-enter space-y-4" style={{ padding: '24px var(--app-padding-x) 8px' }}>

            {/* Top Bar */}
            <div className="flex justify-between items-center px-1 mb-2">
               <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-sage/20 flex items-center justify-center text-sage-dark">
                     <span className="material-symbols-rounded text-xl">calendar_month</span>
                  </div>
                  <h1 className="text-lg font-extrabold tracking-tight text-slate-800 dark:text-white font-display">Jadwal Sholat</h1>
               </div>
               <div className="text-right">
                  <p className="text-2xl font-black text-slate-800 dark:text-white tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
                     {clock}
                  </p>
               </div>
            </div>

            {/* Hero Banner */}
            <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#2d4a35] via-[#3D6B4F] to-[#1a3524] p-6 text-white shadow-xl shadow-[#2d4a35]/30">
               <div className="relative z-10 flex items-center justify-between">
                  <div className="space-y-1.5">
                     <p className="text-[11px] font-bold opacity-90 uppercase tracking-[0.2em] text-white/80">Ramadan Kareem</p>
                     <h2 className="text-[22px] font-extrabold leading-tight tracking-tight">
                        {hijri ? `Hari ke-${hijri.day} ${hijri.month}` : 'Memuat…'}
                     </h2>
                     <div className="flex items-center gap-2 mt-1">
                        <span className="material-icons-outlined text-sm text-white/70">location_on</span>
                        <p className="text-xs text-white/70 font-medium">{cityName}, {countryName}</p>
                     </div>
                     <p className="text-[11px] text-white/60 font-medium">
                        {hijri ? `${hijri.day} ${hijri.month} ${hijri.year} ${hijri.designation}` : ''}
                     </p>
                  </div>
                  <div className="relative flex items-center justify-center shrink-0">
                     <svg className="w-20 h-20" viewBox="0 0 80 80">
                        <circle className="text-white/15" cx="40" cy="40" fill="transparent" r="32" stroke="currentColor" strokeWidth="5" />
                        <circle className="text-[#FFCC33]" cx="40" cy="40" fill="transparent" r="32"
                           stroke="currentColor" strokeDasharray={strokeCircumference} strokeDashoffset={strokeOffset}
                           strokeLinecap="round" strokeWidth="5"
                           style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 1s ease' }}
                        />
                     </svg>
                     <div className="absolute flex flex-col items-center">
                        <span className="text-sm font-extrabold leading-none">{ramadanDay || '–'}</span>
                        <span className="text-[8px] uppercase font-bold text-white/60 tracking-wide">/ 30</span>
                     </div>
                  </div>
               </div>
               <div className="absolute -right-6 -bottom-6 opacity-[0.08] pointer-events-none">
                  <span className="material-symbols-rounded text-[140px]">mosque</span>
               </div>
            </section>

            {/* Countdown Card */}
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 text-center shadow-md border border-slate-100 dark:border-slate-700">
               <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-sage-dark dark:text-sage mb-3 block">
                  {isBeforeMaghrib ? 'Menuju Buka Puasa' : `Menuju ${nextPrayerName}`}
               </span>
               <h2 className="text-5xl font-extrabold text-slate-900 dark:text-white mb-3 tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {countdown || '—:—:—'}
               </h2>
               <div className="flex items-center justify-center gap-2 text-slate-600 dark:text-slate-300 font-semibold bg-sage/10 rounded-full py-1.5 px-5 w-fit mx-auto text-sm">
                  <span className="material-symbols-rounded text-lg text-gold-dark">wb_twilight</span>
                  <span>
                     {nextPrayerIdx >= 0 && prayers[nextPrayerIdx]
                        ? `${prayers[nextPrayerIdx].name} • ${prayers[nextPrayerIdx].time}`
                        : '—'}
                  </span>
               </div>
            </div>
         </div>

         {/* Prayer List */}
         {prayers.length > 0 && (
            <div className="flex-1 pb-4 stagger-appear" style={{ padding: '0 var(--app-padding-x) 16px' }}>
               <div className="flex items-center justify-between mb-4 px-1 mt-2">
                  <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                     <span className="w-1 h-5 bg-sage rounded-full" />
                     Waktu Sholat
                  </h3>
                  <span className="text-[10px] text-slate-500 font-bold bg-slate-200 dark:bg-slate-800 px-3 py-1 rounded-full uppercase tracking-wide">Live</span>
               </div>

               <div className="space-y-3">
                  {prayers.map((p, i) => {
                     const isActive = i === activePrayerIdx;
                     const isNext = i === nextPrayerIdx;
                     const isPast = activePrayerIdx >= 0 && i < activePrayerIdx;

                     return (
                        <div
                           key={p.id}
                           className={`flex items-center justify-between p-5 rounded-[2rem] transition-all ${isActive
                              ? 'golden-hour-gradient text-white shadow-lg shadow-gold/30 scale-[1.03] relative z-10'
                              : isPast
                                 ? 'bg-white/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 opacity-40'
                                 : isNext
                                    ? 'bg-white dark:bg-slate-800 border-2 border-sage/40 shadow-md'
                                    : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm'
                              }`}
                        >
                           <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isActive ? 'bg-white/20 text-white backdrop-blur-sm' : 'bg-sage/20 text-sage-dark'
                                 }`}>
                                 <span className="material-symbols-rounded">{p.icon}</span>
                              </div>
                              <div>
                                 <div className="flex items-center gap-2">
                                    <p className={`font-bold text-base ${isActive ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{p.name}</p>
                                    {isActive && (
                                       <span className="text-[10px] bg-white/30 px-2 py-0.5 rounded-full font-bold uppercase">Sekarang</span>
                                    )}
                                    {isNext && !isActive && (
                                       <span className="text-[10px] bg-sage/20 text-sage-dark px-2 py-0.5 rounded-full font-bold uppercase">Berikutnya</span>
                                    )}
                                 </div>
                                 <p className={`text-sm ${isActive ? 'text-white/90' : 'text-slate-500'}`}>
                                    {p.time}
                                    {isActive && p.id === 'maghrib' && ' • Buka Puasa'}
                                 </p>
                              </div>
                           </div>
                           <button
                              onClick={() => toggleNotif(p.name)}
                              className={`w-12 h-7 rounded-full relative transition-colors ${notifs[p.name] ? (isActive ? 'bg-white/30' : 'bg-sage') : 'bg-slate-200 dark:bg-slate-700'
                                 }`}
                           >
                              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${notifs[p.name] ? 'right-1' : 'left-1'
                                 }`} />
                           </button>
                        </div>
                     );
                  })}
               </div>

               {/* No more Asma Al-Husna card here (moved to Home) */}
            </div>
         )}
      </div>
   );
};