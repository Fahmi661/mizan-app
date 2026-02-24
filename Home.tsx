/**
 * Home.tsx — Beranda Utama
 * ──────────────────────────────────────────────────────────────
 * Perbaikan:
 *  2. Waktu sholat real-time & auto update setiap detik
 *  3. Asmaul Husna clickable → bottom sheet 99 nama
 *  5. Desain jam premium (gradient gelap, glow, pulse colon)
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Tab, UserSettings } from '../types';
import { usePrayerData, ASMA_ID } from '../hooks/usePrayerData';
import { useLastRead } from '../context/LastReadContext';

interface HomeProps {
  onNavigate: (tab: Tab) => void;
  settings: UserSettings;
  onInstall?: () => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate, settings, onInstall }) => {
  const { lastRead } = useLastRead();
  const {
    clock, seconds, colonVisible, dateLabel,
    prayers, hijri,
    cityName, countryName,
    allAsma, todayAsma, todayAsmaIndex,
    activePrayerIdx, nextPrayerIdx,
    countdown, nextPrayerName,
  } = usePrayerData(settings.city, settings.country);

  // ── Asmaul Husna Modal State ────────────────────────────────
  const [asmaOpen, setAsmaOpen] = useState(false);
  const [asmaSearch, setAsmaSearch] = useState('');

  // ── Profil Developer Modal State ────────────────────────────
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileClosing, setProfileClosing] = useState(false);

  const openLastRead = () => {
    if (lastRead) {
      localStorage.setItem('quran_jump_to', JSON.stringify({
        surah: lastRead.surah,
        ayah: lastRead.ayah
      }));
      onNavigate(Tab.QURAN);
    }
  };

  const closeProfile = () => {
    if (profileClosing) return;
    setProfileClosing(true);
    setTimeout(() => {
      setProfileOpen(false);
      setProfileClosing(false);
    }, 250);
  };

  const filteredAsma = useMemo(() => {
    if (!asmaSearch.trim()) return allAsma;
    const q = asmaSearch.toLowerCase();
    return allAsma.filter(a =>
      a.transliteration.toLowerCase().includes(q) ||
      a.name.includes(q) ||
      (a.en?.meaning ?? '').toLowerCase().includes(q) ||
      (ASMA_ID[a.en?.meaning] ?? '').toLowerCase().includes(q)
    );
  }, [allAsma, asmaSearch]);

  const ASMA_ID_LOCAL: Record<string, string> = ASMA_ID;

  return (
    <div className="bg-cream dark:bg-dark text-slate-800 dark:text-slate-200 flex-1 flex flex-col">
      <header className="pt-12 animate-page-enter" style={{ padding: '48px var(--app-padding-x) 0' }}>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-1 text-[#1a4231] text-xs font-bold mb-1">
              <span className="material-icons-outlined text-[14px]">location_on</span>
              {cityName}, {countryName}
            </div>
            <h1 className="text-3xl font-display text-[#0B2D18] font-extrabold leading-tight">Mizan</h1>
          </div>
          <div className="flex items-center gap-2">
            {onInstall && (
              <button
                onClick={onInstall}
                style={{ cursor: 'pointer', zIndex: 50, position: 'relative' }}
                className="px-3 py-1.5 rounded-full bg-[#4caf6e] text-white flex items-center gap-1.5 shadow-sm border border-[#4caf6e] active:scale-95 transition-transform hover:scale-105"
              >
                <span className="material-icons-outlined text-[16px]">install_mobile</span>
                <span className="text-xs font-bold leading-none">Install Mizan</span>
              </button>
            )}
            <button
              onClick={() => setProfileOpen(true)}
              style={{ cursor: 'pointer', zIndex: 50, position: 'relative' }}
              className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95 transition-transform hover:scale-105"
            >
              <span className="material-icons-outlined text-gold">notifications_none</span>
            </button>
          </div>
        </div>
      </header>

      <div className="stagger-appear">

        {/* ═══════════════════════════════════════════════════════
            PREMIUM CLOCK CARD (Fix 5)
            ═══════════════════════════════════════════════════════ */}
        <section className="mt-6" style={{ padding: '0 var(--app-padding-x)' }}>
          <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#0B2D18] via-[#15432a] to-[#1a4a2a] p-6 shadow-2xl shadow-[#0B2D18]/40">
            {/* Subtle mosque silhouette pattern at 5% opacity */}
            <div className="absolute -right-4 -bottom-4 opacity-[0.05] pointer-events-none">
              <span className="material-symbols-rounded text-[120px] text-white">mosque</span>
            </div>
            {/* Glow effect behind clock */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              {/* Hijri date label */}
              <p className="text-[10px] font-semibold tracking-[0.2em] text-[#D4AF37]/80 uppercase mb-2">
                {hijri ? `${hijri.day} ${hijri.month} ${hijri.year} ${hijri.designation}` : ''}
              </p>

              {/* Clock — HH:MM with blinking colon & smaller :SS */}
              <div className="flex items-baseline gap-0">
                <span
                  className="text-[56px] font-extrabold text-white leading-none tracking-tight"
                  style={{
                    fontVariantNumeric: 'tabular-nums',
                    textShadow: '0 0 30px rgba(212,175,55,0.25)',
                  }}
                >
                  {clock}
                </span>
                <span
                  className="text-2xl font-bold text-[#4caf6e] ml-0.5 transition-opacity duration-300"
                  style={{
                    opacity: colonVisible ? 1 : 0.3,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {seconds}
                </span>
              </div>

              {/* Date Masehi */}
              <p className="text-xs text-white/60 font-medium mt-2">{dateLabel}</p>
            </div>

            {/* Next prayer pill */}
            <div className="relative z-10 flex items-center gap-2 bg-white/10 backdrop-blur-sm self-start px-3 py-1.5 rounded-full mt-4 w-fit">
              <span className="material-icons-outlined text-[16px] text-[#4caf6e] animate-pulse">schedule</span>
              <p className="text-xs font-medium text-white/90">
                Selanjutnya <span className="font-bold text-[#D4AF37]">{nextPrayerName} {nextPrayerIdx >= 0 && prayers[nextPrayerIdx] ? prayers[nextPrayerIdx].time : ''}</span>
              </p>
              {countdown && (
                <span className="text-[10px] font-bold text-[#4caf6e] ml-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  ({countdown})
                </span>
              )}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            PRAYER GRID — 5 COLUMNS REDESIGN
            ═══════════════════════════════════════════════════════ */}
        <section className="mt-6" style={{ padding: '0 var(--app-padding-x)' }}>
          <div className="bg-white dark:bg-slate-800 rounded-[16px] p-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-slate-100 dark:border-slate-700">
            <div className="grid grid-cols-5 gap-0">
              {(prayers.length > 0 ? prayers : Array.from({ length: 5 }, (_, i) => ({
                id: `ph-${i}`,
                name: ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'][i],
                time: '--:--',
                icon: ['wb_twilight', 'sunny', 'wb_sunny', 'partly_cloudy_night', 'nightlight'][i],
                minutes: 0,
              }))).map((p, i, arr) => {
                const hasData = prayers.length > 0;
                const isActive = hasData && i === activePrayerIdx;
                const isNext = hasData && i === nextPrayerIdx;
                const isPast = hasData && activePrayerIdx >= 0 && i < activePrayerIdx;
                const isLoading = !hasData;

                return (
                  <div key={p.id} className="relative flex items-stretch">
                    {/* Separator line */}
                    {i < arr.length - 1 && (
                      <div className="absolute right-0 top-2 bottom-2 w-px bg-slate-100 dark:bg-slate-700 z-0" />
                    )}
                    {/* Column */}
                    <div className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 px-0.5 rounded-xl transition-all duration-300 relative ${isActive
                      ? 'bg-[#4caf6e]/10 border-[1.5px] border-[#4caf6e] mx-0.5'
                      : isPast
                        ? 'opacity-[0.35]'
                        : isNext
                          ? 'opacity-100'
                          : isLoading
                            ? 'opacity-30'
                            : 'opacity-70'
                      }`}>
                      {/* Badge KINI */}
                      {isActive && (
                        <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[7px] font-black bg-[#4caf6e] text-white px-2 py-[1px] rounded-full uppercase tracking-wider leading-none shadow-sm z-10">
                          Kini
                        </span>
                      )}
                      {/* Name */}
                      <span className={`text-[9px] font-bold uppercase tracking-wide leading-none mt-1 ${isActive ? 'text-[#4caf6e]' : 'text-slate-500 dark:text-slate-400'
                        }`}>{p.name}</span>
                      {/* Icon circle */}
                      <div className="relative">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isActive ? 'bg-[#4caf6e]/15 ring-1 ring-[#4caf6e]/30' : ''
                          }`}>
                          <span className={`material-symbols-outlined text-[22px] ${isActive ? 'text-[#4caf6e]' : isPast ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'
                            }`}>{p.icon}</span>
                        </div>
                        {isNext && !isActive && (
                          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#D4AF37] border-2 border-white dark:border-slate-800 shadow-sm" />
                        )}
                      </div>
                      {/* Time */}
                      <span className={`font-bold leading-none ${isActive ? 'text-[14px] text-[#4caf6e]' : 'text-[12px] text-slate-700 dark:text-slate-300'
                        }`} style={{ fontVariantNumeric: 'tabular-nums' }}>{p.time}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            AKSES CEPAT — Redesigned Premium Icons (Fix 1 + Fix 2)
            ═══════════════════════════════════════════════════════ */}
        <section className="mt-6" style={{ padding: '0 var(--app-padding-x)' }}>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Akses Cepat</h3>
          <div className="grid grid-cols-4 gap-4">
            {/* Zakat */}
            <button
              onClick={() => onNavigate(Tab.ZAKAT)}
              className="flex flex-col items-center group akses-cepat-item"
              style={{ '--ac-delay': '0ms' } as React.CSSProperties}
            >
              <div
                className="akses-cepat-card"
                style={{
                  width: 64, height: 64, borderRadius: 18,
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  boxShadow: '0 4px 14px rgba(245,158,11,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'transform 0.08s ease, box-shadow 0.08s ease, filter 0.08s ease',
                }}
              >
                <span className="material-icons-outlined" style={{ fontSize: 28, color: '#fff' }}>account_balance</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#555', marginTop: 8 }}>Zakat</span>
            </button>

            {/* Tasbih */}
            <button
              onClick={() => onNavigate(Tab.TASBIH)}
              className="flex flex-col items-center group akses-cepat-item"
              style={{ '--ac-delay': '80ms' } as React.CSSProperties}
            >
              <div
                className="akses-cepat-card"
                style={{
                  width: 64, height: 64, borderRadius: 18,
                  background: 'linear-gradient(135deg, #4caf6e, #2e7d50)',
                  boxShadow: '0 4px 14px rgba(76,175,110,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'transform 0.08s ease, box-shadow 0.08s ease, filter 0.08s ease',
                }}
              >
                <span className="material-icons-outlined" style={{ fontSize: 28, color: '#fff' }}>fingerprint</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#555', marginTop: 8 }}>Tasbih</span>
            </button>

            {/* Asmaul Husna */}
            <button
              onClick={() => setAsmaOpen(true)}
              className="flex flex-col items-center group akses-cepat-item"
              style={{ '--ac-delay': '160ms' } as React.CSSProperties}
            >
              <div
                className="akses-cepat-card"
                style={{
                  width: 64, height: 64, borderRadius: 18,
                  background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  boxShadow: '0 4px 14px rgba(139,92,246,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'transform 0.08s ease, box-shadow 0.08s ease, filter 0.08s ease',
                }}
              >
                <span className="material-icons-outlined" style={{ fontSize: 28, color: '#fff' }}>auto_awesome</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#555', marginTop: 8 }}>Asmaul</span>
            </button>

            {/* Al-Quran — navigates to Quran page (Fix 2) + idle glow */}
            <button
              onClick={() => onNavigate(Tab.QURAN)}
              className="flex flex-col items-center group akses-cepat-item"
              style={{ '--ac-delay': '240ms' } as React.CSSProperties}
            >
              <div
                className="akses-cepat-card akses-cepat-quran-glow"
                style={{
                  width: 64, height: 64, borderRadius: 18,
                  background: 'linear-gradient(135deg, #0B2D18, #1a4a2a)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'transform 0.08s ease, box-shadow 0.08s ease, filter 0.08s ease',
                }}
              >
                <span className="material-icons-outlined" style={{ fontSize: 28, color: '#D4AF37' }}>menu_book</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#555', marginTop: 8 }}>Al-Quran</span>
            </button>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            BOTTOM CARDS — Balanced Layout
            ═══════════════════════════════════════════════════════ */}
        <section className="mt-6 pb-6" style={{ padding: '0 var(--app-padding-x) 16px' }}>

          {/* ── LAST READ QURAN ── */}
          {lastRead && (
            <div
              onClick={openLastRead}
              className="mb-4 bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 dark:border-slate-700 active:scale-[0.98] transition-all relative overflow-hidden group cursor-pointer"
            >
              {/* Background Glow */}
              <div className="absolute -right-12 -top-12 w-40 h-40 bg-[#4caf6e]/5 rounded-full blur-3xl group-hover:bg-[#4caf6e]/10 transition-colors" />

              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#4caf6e]/10 flex items-center justify-center text-[#4caf6e]">
                    <span className="material-icons-outlined" style={{ fontSize: 26 }}>menu_book</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#4caf6e] uppercase tracking-widest mb-0.5">Terakhir Dibaca</p>
                    <h3 className="text-base font-bold text-[#0B2D18] dark:text-white leading-tight">
                      Surah {lastRead.surahName} - Ayat {lastRead.ayah}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Ketuk untuk melanjutkan membaca</p>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-[#4caf6e] group-hover:translate-x-1 transition-transform">
                  <span className="material-icons-outlined">chevron_right</span>
                </div>
              </div>
            </div>
          )}

          {/* ── ROW 1: ZAKAT full width horizontal ── */}
          <div
            onClick={() => onNavigate(Tab.ZAKAT)}
            className="cursor-pointer active:scale-[0.97] transition-all duration-200"
            style={{
              background: 'linear-gradient(145deg, #0B2D18, #1e5c38)',
              borderRadius: 18, padding: 16,
              display: 'flex', alignItems: 'center', gap: 12,
              position: 'relative', overflow: 'hidden',
              marginBottom: 12,
            }}
          >
            {/* Islamic pattern overlay */}
            <div style={{
              position: 'absolute', inset: 0, opacity: 0.04, pointerEvents: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0L40 20L20 40L0 20Z' fill='none' stroke='white' stroke-width='0.5'/%3E%3C/svg%3E")`,
              backgroundSize: '40px 40px',
            }} />
            <div style={{ position: 'absolute', top: -20, right: 80, width: 80, height: 80, background: 'rgba(212,175,55,0.08)', borderRadius: '50%', filter: 'blur(25px)' }} />

            {/* LEFT — info (60%) */}
            <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
              {/* Badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'rgba(212,175,55,0.2)', border: '1px solid rgba(212,175,55,0.3)',
                borderRadius: 999, padding: '3px 8px',
                fontSize: 10, fontWeight: 700, color: '#D4AF37', marginBottom: 6,
              }}>
                💰 Zakat & Sedekah
              </div>
              <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 17, lineHeight: 1.2 }}>Sucikan Harta</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2, marginBottom: 8 }}>Hitung & Bayar Zakat</p>
              {/* Price row */}
              <div className="flex items-center gap-1.5" style={{ marginBottom: 8 }}>
                <span className="material-icons-outlined" style={{ fontSize: 13, color: '#D4AF37' }}>trending_up</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#D4AF37' }}>Rp 1.2jt<span style={{ fontSize: 10, fontWeight: 400, opacity: 0.7 }}>/gr</span></span>
              </div>
              {/* CTA pill */}
              <div style={{
                display: 'inline-flex', alignItems: 'center',
                background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 999, padding: '5px 14px',
                fontSize: 10, fontWeight: 700, color: '#fff',
              }}>
                Hitung Zakat →
              </div>
            </div>

            {/* RIGHT — icon circle (40%) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, position: 'relative', zIndex: 1, flexShrink: 0 }}>
              <div style={{
                width: 68, height: 68, borderRadius: '50%',
                background: 'rgba(212,175,55,0.1)', border: '1.5px solid rgba(212,175,55,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="material-icons-outlined" style={{ fontSize: 32, color: '#D4AF37' }}>account_balance</span>
              </div>
              <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>Auto update</p>
            </div>
          </div>

          {/* ── ROW 2: KALENDER ISLAM + KIBLAT ── */}
          <div style={{ display: 'flex', gap: 12 }}>
            {/* ── CARD 2-3 Wrapper ── */}
            <div
              onClick={() => { onNavigate(Tab.KALENDER); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="cursor-pointer"
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              <div
                style={{
                  width: '100%',
                  aspectRatio: '1/1',
                  background: '#7c3a00',
                  borderRadius: 20,
                  padding: 0,
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(124,58,0,0.2)',
                }}
              >
                <svg width="100%" height="100%" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="64" height="64" fill="url(#calBg)" />
                  <circle cx="32" cy="20" r="28" fill="white" opacity="0.04" />
                  <rect x="9" y="9" width="46" height="17" rx="5" fill="url(#calHeader)" />
                  <rect x="9" y="28" width="46" height="27" rx="5" fill="white" opacity="0.09" />
                  <path d="M42 18A7 7 0 0 1 35 11 7 7 0 1 0 42 18Z" fill="white" opacity="0.92" />
                  <path d="M45 12l.7 2H48l-1.7 1.2.6 2-1.9-1.3-1.9 1.3.7-2L42 14h2.3z" fill="white" opacity="0.75" />
                  <rect x="13" y="32" width="6" height="5" rx="1.5" fill="white" opacity="0.5" />
                  <rect x="22" y="32" width="6" height="5" rx="1.5" fill="white" opacity="0.5" />
                  <rect x="31" y="32" width="6" height="5" rx="1.5" fill="white" opacity="0.5" />
                  <rect x="40" y="32" width="6" height="5" rx="1.5" fill="white" opacity="0.5" />
                  <rect x="13" y="40" width="6" height="5" rx="1.5" fill="white" opacity="0.5" />
                  <rect x="22" y="40" width="6" height="5" rx="1.5" fill="url(#todayGold)" />
                  <rect x="31" y="40" width="6" height="5" rx="1.5" fill="white" opacity="0.5" />
                  <rect x="40" y="40" width="6" height="5" rx="1.5" fill="white" opacity="0.3" />
                  <rect x="13" y="48" width="6" height="5" rx="1.5" fill="white" opacity="0.5" />
                  <rect x="22" y="48" width="6" height="5" rx="1.5" fill="white" opacity="0.5" />
                  <rect x="31" y="48" width="6" height="5" rx="1.5" fill="white" opacity="0.3" />
                  <defs>
                    <linearGradient id="calBg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#7c3a00" /><stop offset="100%" stopColor="#3d1a00" />
                    </linearGradient>
                    <linearGradient id="calHeader" x1="9" y1="9" x2="55" y2="26" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#e8a020" /><stop offset="100%" stopColor="#c47800" />
                    </linearGradient>
                    <linearGradient id="todayGold" x1="22" y1="40" x2="28" y2="45" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#ffd060" /><stop offset="100%" stopColor="#e09020" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <span style={{ fontWeight: 800, fontSize: 13, color: '#4A2F10', marginTop: 10 }}>Kalender Islam</span>
            </div>

            {/* ── CARD 3 — KIBLAT ── */}
            <div
              onClick={() => onNavigate(Tab.KIBLAT)}
              className="cursor-pointer"
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              <div
                style={{
                  width: '100%',
                  aspectRatio: '1/1',
                  background: '#0a2a4a',
                  borderRadius: 20,
                  padding: 0,
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(10,42,74,0.2)',
                }}
              >
                <svg width="100%" height="100%" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="64" height="64" fill="url(#kibBg)" />
                  <circle cx="32" cy="32" r="22" fill="#D4AF37" opacity="0.05" />
                  <circle cx="32" cy="32" r="22" stroke="white" strokeOpacity="0.12" strokeWidth="1.5" />
                  <circle cx="32" cy="32" r="14" stroke="white" strokeOpacity="0.07" strokeWidth="1" />
                  <rect x="31.3" y="10" width="1.4" height="4.5" rx="0.7" fill="#D4AF37" />
                  <rect x="31.3" y="49.5" width="1.4" height="4.5" rx="0.7" fill="white" opacity="0.2" />
                  <rect x="10" y="31.3" width="4.5" height="1.4" rx="0.7" fill="white" opacity="0.2" />
                  <rect x="49.5" y="31.3" width="4.5" height="1.4" rx="0.7" fill="white" opacity="0.2" />
                  <text x="32" y="9" fontFamily="system-ui" fontSize="6" fontWeight="800" fill="#D4AF37" dominantBaseline="middle" textAnchor="middle">U</text>
                  <text x="32" y="58" fontFamily="system-ui" fontSize="6" fontWeight="700" fill="white" opacity="0.25" dominantBaseline="middle" textAnchor="middle">S</text>
                  <text x="12" y="34.5" fontFamily="system-ui" fontSize="6" fontWeight="700" fill="white" opacity="0.25" dominantBaseline="middle" textAnchor="middle">B</text>
                  <text x="52" y="34.5" fontFamily="system-ui" fontSize="6" fontWeight="700" fill="white" opacity="0.25" dominantBaseline="middle" textAnchor="middle">T</text>
                  <path d="M32 13 L34.8 30.5 L32 33 L29.2 30.5 Z" fill="url(#needleGold)" />
                  <path d="M32 51 L34.8 33.5 L32 31 L29.2 33.5 Z" fill="white" opacity="0.15" />
                  <rect x="29.5" y="10.5" width="5" height="5" rx="1.5" fill="none" stroke="#D4AF37" strokeWidth="1" opacity="0.65" />
                  <rect x="30.8" y="11.8" width="2.4" height="3.2" rx="1.2" fill="none" stroke="#D4AF37" strokeWidth="0.8" opacity="0.8" />
                  <circle cx="32" cy="32" r="4.5" fill="white" opacity="0.9" />
                  <circle cx="32" cy="32" r="2.5" fill="url(#hubGold)" />
                  <circle cx="32" cy="32" r="1" fill="white" />
                  <defs>
                    <linearGradient id="kibBg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#0a2a4a" /><stop offset="100%" stopColor="#051525" />
                    </linearGradient>
                    <linearGradient id="needleGold" x1="32" y1="13" x2="32" y2="33" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#f8e070" /><stop offset="100%" stopColor="#c9a84c" />
                    </linearGradient>
                    <linearGradient id="hubGold" x1="29" y1="29" x2="35" y2="35" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#D4AF37" /><stop offset="100%" stopColor="#8a6a10" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <span style={{ fontWeight: 800, fontSize: 13, color: '#1B263B', marginTop: 10 }}>Kiblat</span>
            </div>
          </div>
        </section>
      </div>

      {/* ═══════════════════════════════════════════════════════
          ASMAUL HUSNA BOTTOM SHEET (Fix 3)
          ═══════════════════════════════════════════════════════ */}
      {
        asmaOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center">
            {/* Overlay */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => { setAsmaOpen(false); setAsmaSearch(''); }}
            />
            {/* Sheet */}
            <div className="bg-cream dark:bg-slate-900 w-full max-w-md h-[85vh] rounded-t-[2.5rem] relative flex flex-col shadow-2xl animate-[slideIn_0.3s_ease-out]">
              {/* Handle */}
              <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-4 mb-3 shrink-0" />

              {/* Header */}
              <div className="px-6 pb-3 shrink-0">
                <h2 className="text-xl font-extrabold dark:text-white mb-3">99 Asma Al-Husna</h2>
                {/* Search */}
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                  <input
                    type="text"
                    value={asmaSearch}
                    onChange={(e) => setAsmaSearch(e.target.value)}
                    placeholder="Cari nama…"
                    className="w-full bg-slate-100 dark:bg-slate-800 pl-10 pr-4 py-3 rounded-xl text-sm font-medium outline-none dark:text-white placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto px-6 pb-8 space-y-2">
                {filteredAsma.map((a) => {
                  const isToday = a.number === (todayAsmaIndex + 1);
                  return (
                    <div
                      key={a.number}
                      className={`p-4 rounded-2xl border transition-all ${isToday
                        ? 'bg-[#D4AF37]/10 border-[#D4AF37]/30 ring-1 ring-[#D4AF37]/20'
                        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${isToday ? 'bg-[#D4AF37] text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                          }`}>
                          {a.number}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-2xl font-arabic text-slate-800 dark:text-white leading-relaxed">{a.name}</p>
                          <p className="text-sm font-bold text-sage-dark dark:text-sage mt-1">{a.transliteration}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {ASMA_ID_LOCAL[a.en?.meaning] || a.en?.meaning || ''}
                          </p>
                        </div>
                        {isToday && (
                          <span className="text-[9px] font-bold bg-[#D4AF37] text-white px-2 py-0.5 rounded-full uppercase shrink-0">
                            Hari Ini
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filteredAsma.length === 0 && (
                  <p className="text-center text-sm text-slate-400 py-8">Tidak ditemukan</p>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* ═══════════════════════════════════════════════════════
          DEVELOPER PROFILE MODAL
          ═══════════════════════════════════════════════════════ */}
      {
        profileOpen && (
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center px-6"
            style={{
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
              animation: profileClosing ? 'fadeOut 0.25s ease forwards' : 'fadeIn 0.25s ease forwards'
            }}
            onClick={closeProfile}
          >
            {/* Modal Card */}
            <div
              className="w-full max-w-[320px] bg-gradient-to-br from-[#0B2D18] via-[#0d4523] to-[#042814] rounded-[24px] overflow-hidden shadow-2xl relative"
              style={{
                animation: profileClosing ? 'fadeOut 0.25s ease forwards' : 'fadeIn 0.3s ease forwards'
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={closeProfile}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white/50 hover:bg-white/20 transition-colors z-20"
                style={{ cursor: 'pointer' }}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>

              {/* Glowing accents & Background Particles */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                {Array.from({ length: 15 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute bg-[#D4AF37] rounded-full animate-float"
                    style={{
                      width: Math.random() * 2 + 1 + 'px',
                      height: Math.random() * 2 + 1 + 'px',
                      top: Math.random() * 100 + '%',
                      left: Math.random() * 100 + '%',
                      opacity: Math.random() * 0.4 + 0.1,
                      animationDelay: `${Math.random() * 5}s`,
                      animationDuration: `${Math.random() * 4 + 4}s`
                    }}
                  />
                ))}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#D4AF37]/20 rounded-full blur-[60px] animate-pulse-slow" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[#10B981]/20 rounded-full blur-[60px] animate-pulse-slow" style={{ animationDelay: '1.5s' }} />
              </div>

              <div className="px-8 py-16 flex flex-col items-center text-center relative z-10 w-full">
                {/* Top Label */}
                <p
                  className="text-[10px] font-bold text-[#D4AF37]/60 uppercase tracking-[0.5em] mb-6 opacity-0 animate-[fadeInUp_0.8s_ease-out_forwards]"
                  style={{ animationDelay: '0.2s' }}
                >
                  Developed By
                </p>

                {/* Main Name Premium Serif */}
                <h3
                  className="text-[32px] font-display text-white leading-[1.1] tracking-wide mb-4 opacity-0 animate-[fadeInUp_0.8s_ease-out_forwards] transition-all duration-500 hover:scale-[1.04] cursor-default select-none"
                  style={{
                    animationDelay: '0.4s',
                    textShadow: '0 0 20px rgba(212,175,55,0.4), 0 0 10px rgba(212,175,55,0.2)',
                    color: '#FDFBF4'
                  }}
                >
                  Ahmad Fahmi<br /><span className="italic text-[#D4AF37]">Fadillah</span>
                </h3>

                {/* Role & Animated Underline */}
                <div
                  className="relative mb-12 opacity-0 animate-[fadeInUp_0.8s_ease-out_forwards] flex flex-col items-center"
                  style={{ animationDelay: '0.6s' }}
                >
                  <p className="text-[12px] font-semibold text-[#10B981]/80 tracking-widest pb-3 uppercase relative z-10">
                    Mobile App Developer
                  </p>
                  {/* Underline grows from center outward utilizing the animate-fill class */}
                  <div
                    className="absolute bottom-0 h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37]/70 to-transparent opacity-0 animate-[fillWidth_1s_ease-out_forwards]"
                    style={{ animationDelay: '1.2s' }}
                  />
                </div>

                {/* Copyright */}
                <p
                  className="text-[9px] font-medium text-white/30 tracking-[0.2em] uppercase opacity-0 animate-[fadeInUp_0.8s_ease-out_forwards]"
                  style={{ animationDelay: '0.8s' }}
                >
                  &copy; 2026 All Rights Reserved
                </p>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};