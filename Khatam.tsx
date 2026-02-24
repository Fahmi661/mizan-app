import React, { useState } from 'react';
import { Bookmark } from 'lucide-react';

// Mock Data for UI demonstration
const SURAHS = [
   { number: 1, name: "Al-Fatihah", english: "Pembukaan", verses: 7, type: "Makkiyah" },
   { number: 2, name: "Al-Baqarah", english: "Sapi Betina", verses: 286, type: "Madaniyah" },
   { number: 3, name: "Ali 'Imran", english: "Keluarga Imran", verses: 200, type: "Madaniyah" },
   { number: 4, name: "An-Nisa", english: "Wanita", verses: 176, type: "Madaniyah" },
   { number: 5, name: "Al-Ma'idah", english: "Hidangan", verses: 120, type: "Madaniyah" },
   { number: 6, name: "Al-An'am", english: "Binatang Ternak", verses: 165, type: "Makkiyah" },
   { number: 7, name: "Al-A'raf", english: "Tempat Tertinggi", verses: 206, type: "Makkiyah" },
   { number: 8, name: "Al-Anfal", english: "Harta Rampasan", verses: 75, type: "Madaniyah" },
   { number: 9, name: "At-Tawbah", english: "Pengampunan", verses: 129, type: "Madaniyah" },
   { number: 10, name: "Yunus", english: "Yunus", verses: 109, type: "Makkiyah" },
];

export const Khatam: React.FC = () => {
   const [activeTab, setActiveTab] = useState<'surah' | 'juz'>('surah');

   return (
      <div className="flex-1 flex flex-col bg-cream dark:bg-dark text-slate-800 dark:text-slate-100">
         <header className="py-6 pt-12 safe-top sticky top-0 bg-cream/90 dark:bg-dark/90 backdrop-blur-md z-20 border-b border-slate-100 dark:border-slate-800" style={{ padding: '48px var(--app-padding-x) 24px' }}>
            <div className="flex justify-between items-center mb-4">
               <h1 className="text-2xl font-bold font-display text-sage-dark dark:text-sage">Al-Quran</h1>
               <div className="flex gap-2">
                  <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                     <span className="material-icons-outlined">search</span>
                  </button>
               </div>
            </div>

            {/* Continue Reading Card */}
            <div className="bg-gradient-to-r from-sage to-emerald-600 rounded-2xl p-5 text-white shadow-lg shadow-sage/30 relative overflow-hidden mb-2">
               <div className="relative z-10 flex justify-between items-center">
                  <div>
                     <div className="flex items-center gap-2 text-white/80 text-xs font-semibold mb-1">
                        <span className="material-icons-outlined text-sm">auto_stories</span>
                        Terakhir Dibaca
                     </div>
                     <h3 className="text-xl font-bold font-display">Al-Baqarah</h3>
                     <p className="text-sm opacity-90">Ayat 255</p>
                  </div>
                  <button className="w-10 h-10 bg-white text-sage-dark rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform">
                     <span className="material-icons-outlined">play_arrow</span>
                  </button>
               </div>

               {/* Decor */}
               <div className="absolute right-0 bottom-0 opacity-10">
                  <span className="material-icons-outlined text-8xl">menu_book</span>
               </div>
            </div>
         </header>

         <div className="py-2" style={{ padding: '8px var(--app-padding-x)' }}>
            <div className="flex p-1 bg-slate-200 dark:bg-slate-800 rounded-xl mb-4">
               <button
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'surah' ? 'bg-white dark:bg-slate-700 shadow-sm text-sage-dark dark:text-white' : 'text-slate-500'}`}
                  onClick={() => setActiveTab('surah')}
               >
                  Surah
               </button>
               <button
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'juz' ? 'bg-white dark:bg-slate-700 shadow-sm text-sage-dark dark:text-white' : 'text-slate-500'}`}
                  onClick={() => setActiveTab('juz')}
               >
                  Juz
               </button>
            </div>
         </div>

         <main className="flex-1 pb-4" style={{ padding: '0 var(--app-padding-x) 16px' }}>
            {activeTab === 'surah' ? (
               <div className="space-y-3">
                  {SURAHS.map((surah) => (
                     <div key={surah.number} className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-sage/50 transition-colors cursor-pointer group">
                        <div className="w-10 h-10 relative flex items-center justify-center">
                           <div className="absolute inset-0 rotate-45 border-2 border-sage/30 rounded-lg group-hover:border-sage transition-colors"></div>
                           <span className="text-sm font-bold text-slate-700 dark:text-slate-200 relative z-10">{surah.number}</span>
                        </div>

                        <div className="flex-1">
                           <h4 className="font-bold text-slate-800 dark:text-slate-100">{surah.name}</h4>
                           <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                              <span>{surah.type}</span>
                              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                              <span>{surah.verses} Ayat</span>
                           </div>
                        </div>

                        <div className="text-right">
                           <span className="font-arabic text-xl text-sage dark:text-sage-dark block mb-1">
                              {/* Simple mapping for demo, ideally real Arabic names */}
                              {surah.number === 1 ? 'الفاتحة' : surah.number === 2 ? 'البقرة' : '...'}
                           </span>
                        </div>
                     </div>
                  ))}
               </div>
            ) : (
               <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 30 }).map((_, i) => (
                     <div key={i} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col justify-between h-24 cursor-pointer hover:border-sage/50 transition-colors">
                        <div className="flex justify-between items-start">
                           <span className="text-xs font-bold text-slate-400 uppercase">Juz</span>
                           <Bookmark size={18} className="text-slate-300" />
                        </div>
                        <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{i + 1}</span>
                     </div>
                  ))}
               </div>
            )}
         </main>
      </div>
   );
};