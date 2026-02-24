import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BottomNav } from './components/BottomNav';
import { Home } from './screens/Home';
import { Jadwal } from './screens/Jadwal';
import { IbadahTracker } from './screens/IbadahTracker';
import { Tasbih } from './screens/Tasbih';
import { Zakat } from './screens/Zakat';
import { Quran } from './screens/Quran';
import { KalenderIslam } from './screens/KalenderIslam';
import { Kiblat } from './screens/Kiblat';
import { Tab, UserSettings } from './types';
import { DEFAULT_SETTINGS } from './constants';
import { LastReadProvider } from './context/LastReadContext';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.HOME);
  // Track which screens have been visited (lazy-mount — mount once, keep alive)
  const [mounted, setMounted] = useState<Set<Tab>>(() => new Set([Tab.HOME]));
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('ramadan_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  // Fade state for smooth transition
  const [fading, setFading] = useState(false);
  const fadeTimeout = useRef<ReturnType<typeof setTimeout>>();

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleGlobalInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert('Fitur instalasi belum didukung oleh browser Anda atau aplikasi Mizan sudah terpasang. Coba tekan Add to Home Screen dari menu browser.');
    }
  };

  // Save settings when changed
  useEffect(() => {
    localStorage.setItem('ramadan_settings', JSON.stringify(settings));
    document.documentElement.classList.remove('dark');
  }, [settings]);

  // Navigate with a gentle fade
  const handleNavigate = useCallback((tab: Tab) => {
    if (tab === activeTab) return;
    // Trigger fade-out
    setFading(true);
    clearTimeout(fadeTimeout.current);
    fadeTimeout.current = setTimeout(() => {
      // Mount the new screen if not yet mounted
      setMounted(prev => {
        const next = new Set(prev);
        next.add(tab);
        return next;
      });
      setActiveTab(tab);
      // Trigger fade-in on next frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setFading(false));
      });
    }, 80); // short fade-out duration
  }, [activeTab]);

  // Scroll to top on tab change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as any });
    document.getElementById('scroll-container')?.scrollTo({ top: 0, behavior: 'instant' as any });
  }, [activeTab]);

  // Screen definitions — only render if mounted
  const screens: { tab: Tab; element: React.ReactNode }[] = [
    { tab: Tab.HOME, element: <Home onNavigate={handleNavigate} settings={settings} onInstall={handleGlobalInstallClick} /> },
    { tab: Tab.JADWAL, element: <Jadwal settings={settings} /> },
    { tab: Tab.IBADAH, element: <IbadahTracker settings={settings} /> },
    { tab: Tab.TASBIH, element: <Tasbih /> },
    { tab: Tab.ZAKAT, element: <Zakat onInstall={handleGlobalInstallClick} /> },
    { tab: Tab.QURAN, element: <Quran onNavigate={handleNavigate} /> },
    { tab: Tab.KALENDER, element: <KalenderIslam onNavigate={handleNavigate} /> },
    { tab: Tab.KIBLAT, element: <Kiblat onNavigate={handleNavigate} /> },
  ];

  return (
    <LastReadProvider>
      <div
        className="bg-cream dark:bg-dark flex flex-col"
        style={{ minHeight: '100dvh', width: '100vw' }}
      >
        <div
          className="relative mx-auto flex flex-col flex-1 bg-cream dark:bg-dark shadow-2xl w-full"
          style={{ maxWidth: 'var(--app-max-width, 430px)', minHeight: '100dvh' }}
        >
          {/* Stable page container — no key remount, no layout shift */}
          <div
            id="scroll-container"
            className="flex-1 flex flex-col relative !overflow-y-auto !overflow-x-hidden no-scrollbar"
            style={{
              zIndex: 20,
              opacity: fading ? 0 : 1,
              transition: 'opacity 0.12s ease-in-out',
              willChange: 'opacity',
              paddingBottom: 'calc(160px + env(safe-area-inset-bottom))'
            }}
          >
            {screens.map(({ tab, element }) => {
              if (!mounted.has(tab)) return null; // not yet visited — skip
              const isActive = tab === activeTab;
              return (
                <div
                  key={tab}
                  className="flex-1 flex flex-col min-h-full"
                  style={{
                    display: isActive ? 'flex' : 'none',
                  }}
                >
                  {element}
                </div>
              );
            })}
          </div>

          {/* Fixed Navigation Bar & Banner */}
          <div className="fixed bottom-0 left-0 right-0 z-[9999] flex justify-center w-full pointer-events-none">
            <div className="w-full relative pointer-events-auto" style={{ maxWidth: 'var(--app-max-width, 430px)' }}>

              <BottomNav activeTab={activeTab} onTabChange={handleNavigate} />
            </div>
          </div>
        </div>
      </div>
    </LastReadProvider>
  );
};

export default App;