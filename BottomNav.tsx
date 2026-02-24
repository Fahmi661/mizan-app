import React from 'react';
import { Tab } from '../types';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const navItems = [
    { id: Tab.HOME, icon: 'home' },
    { id: Tab.JADWAL, icon: 'calendar_today' },
    { id: Tab.IBADAH, icon: 'task_alt' },
    { id: Tab.TASBIH, icon: 'fingerprint' },
    { id: Tab.ZAKAT, icon: 'calculate' },
  ];

  return (
    <div className="w-full mx-auto mt-auto bg-white/90 dark:bg-slate-900/95 rounded-t-[2.5rem]" style={{ maxWidth: 'var(--app-max-width, 430px)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-800/50 px-6 py-3 pt-4 rounded-t-[2.5rem] shadow-[0_-5px_30px_-5px_rgba(0,0,0,0.1)] flex items-center justify-between transition-all">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 ${isActive
                ? 'bg-sage text-white shadow-lg scale-110 -translate-y-2 ring-4 ring-cream dark:ring-dark'
                : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-105'
                }`}
            >
              <span className={`material-icons-outlined text-2xl ${isActive ? 'animate-icon-bounce' : ''}`}>
                {item.icon}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};