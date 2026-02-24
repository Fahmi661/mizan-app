/**
 * Kiblat.tsx — Qibla Finder / Penunjuk Arah Kiblat
 * ──────────────────────────────────────────────────────────────
 * § Explicit location permission prompt with Izinkan/Nanti buttons
 * § watchPosition for continuous updates
 * § deviceorientationabsolute → deviceorientation fallback
 * § Low-pass filter α=0.15, requestAnimationFrame, transition 0.1s linear
 * § iOS DeviceOrientationEvent.requestPermission()
 * § Calibration warning, never silently falls back to Jakarta
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Tab } from '../types';

interface KiblatProps {
    onNavigate: (tab: Tab) => void;
}

const KAABAH_LAT = 21.422487;
const KAABAH_LNG = 39.826206;

function calculateQibla(userLat: number, userLon: number): number {
    const dLon = (KAABAH_LNG - userLon) * Math.PI / 180;
    const lat1 = userLat * Math.PI / 180;
    const lat2 = KAABAH_LAT * Math.PI / 180;
    const x = Math.sin(dLon) * Math.cos(lat2);
    const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    return (Math.atan2(x, y) * 180 / Math.PI + 360) % 360;
}

function calculateDistance(lat: number, lng: number): number {
    const R = 6371;
    const toR = (d: number) => d * Math.PI / 180;
    const dLat = toR(KAABAH_LAT - lat);
    const dLng = toR(KAABAH_LNG - lng);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toR(lat)) * Math.cos(toR(KAABAH_LAT)) * Math.sin(dLng / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function getDirectionLabel(deg: number): string {
    if (deg >= 337.5 || deg < 22.5) return 'Utara';
    if (deg >= 22.5 && deg < 67.5) return 'Timur Laut';
    if (deg >= 67.5 && deg < 112.5) return 'Timur';
    if (deg >= 112.5 && deg < 157.5) return 'Tenggara';
    if (deg >= 157.5 && deg < 202.5) return 'Selatan';
    if (deg >= 202.5 && deg < 247.5) return 'Barat Daya';
    if (deg >= 247.5 && deg < 292.5) return 'Barat';
    return 'Barat Laut';
}

type PermissionStage = 'prompt' | 'requesting' | 'granted' | 'denied' | 'unavailable';

export const Kiblat: React.FC<KiblatProps> = ({ onNavigate }) => {
    // ── Permission flow state ──
    const [permStage, setPermStage] = useState<PermissionStage>('prompt');

    // ── Location + Qibla ──
    const [qiblaDeg, setQiblaDeg] = useState(295);
    const [distance, setDistance] = useState(0);
    const [cityName, setCityName] = useState('');
    const [accuracy, setAccuracy] = useState<'high' | 'medium' | 'low'>('medium');
    const [locationError, setLocationError] = useState('');
    const cityFetchedRef = useRef(false);

    // ── Compass ──
    const [needleRot, setNeedleRot] = useState(295);
    const [hasCompass, setHasCompass] = useState(false);
    const [compassIsAbsolute, setCompassIsAbsolute] = useState(false);
    const [needsCalibration, setNeedsCalibration] = useState(false);
    const [compassError, setCompassError] = useState('');

    // Internal refs (no re-render on sensor tick)
    const qiblaRef = useRef(295);
    const rafRef = useRef<number | null>(null);
    const orientationCleanupRef = useRef<(() => void) | null>(null);
    const watchIdRef = useRef<number | null>(null);
    const hasCompassRef = useRef(false); // avoid stale closure in handler

    // ── Audio Implementation ──
    const [isMuted, setIsMuted] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const lastSoundHeadingRef = useRef(0);
    const SOUND_URL = 'https://ufxjvugkmiorxlogvcmx.supabase.co/storage/v1/object/sign/FILE%20WEB/SOUND%20KIBLAT.mp3?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xZTU4ZTM4Yi1jZjFhLTRhZTktOWIyNC00YzBhMmE4ZjYxNmEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJGSUxFIFdFQi9TT1VORCBLSUJMQVQubXAzIiwiaWF0IjoxNzcxOTEyNjE3LCJleHAiOjE5Mjk1OTI2MTd9.d84biRrljV2IboMj7_AG5teas4vDsmc7iJeZK3R0B1U';

    // Pre-loading audio
    useEffect(() => {
        const audio = new Audio(SOUND_URL);
        audio.preload = 'auto';
        audio.volume = 0.4; // 40% volume for elegant feel
        audioRef.current = audio;
    }, []);

    // ── Interpolation & Smoothing Refs ──
    const rawHeadingRef = useRef(0);
    const currentVisualHeadingRef = useRef(0);

    // ── rAF loop with Interpolation (Lerp) ──
    const startRaf = useCallback(() => {
        if (rafRef.current) return;
        const tick = () => {
            // Lerp interpolation for ultra-smooth 60fps movement
            const lerpFactor = 0.12; // Damping/Interpolation strength
            let target = rawHeadingRef.current;
            let current = currentVisualHeadingRef.current;

            // Handle 360-0 wrap-around for Lerp
            let diff = target - current;
            if (diff > 180) diff -= 360;
            if (diff < -180) diff += 360;

            currentVisualHeadingRef.current = (current + diff * lerpFactor + 360) % 360;

            // Update state for needle rotation
            const rot = (qiblaRef.current - currentVisualHeadingRef.current + 360) % 360;
            setNeedleRot(rot);

            // Audio Feedback Logic: Shift trigger (2-3 degrees)
            const headingDiff = Math.abs(currentVisualHeadingRef.current - lastSoundHeadingRef.current);
            const wrappedDiff = headingDiff > 180 ? 360 - headingDiff : headingDiff;

            if (wrappedDiff >= 2.5 && !isMuted && audioRef.current) {
                // Play shorter snippet or reset to simulate tick
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(() => { });
                lastSoundHeadingRef.current = currentVisualHeadingRef.current;
            }

            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
    }, [isMuted]);

    const stopRaf = useCallback(() => {
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    }, []);

    const makeOrientationHandler = useCallback((isAbsolute: boolean) => {
        return (e: DeviceOrientationEvent) => {
            let rawHeading: number;
            if ((e as any).webkitCompassHeading != null) {
                rawHeading = (e as any).webkitCompassHeading;
                const acc = (e as any).webkitCompassAccuracy;
                setNeedsCalibration(typeof acc === 'number' && acc > 20);
            } else if (e.alpha != null) {
                rawHeading = (360 - e.alpha) % 360;
            } else {
                return;
            }

            rawHeadingRef.current = rawHeading;

            if (!hasCompassRef.current) {
                hasCompassRef.current = true;
                setHasCompass(true);
                setCompassIsAbsolute(isAbsolute);
                currentVisualHeadingRef.current = rawHeading;
                lastSoundHeadingRef.current = rawHeading;
                startRaf();
            }
        };
    }, [startRaf]);

    // ── Attach orientation listeners ──
    const attachListeners = useCallback(() => {
        orientationCleanupRef.current?.();
        const absoluteHandler = makeOrientationHandler(true);
        const standardHandler = makeOrientationHandler(false);

        const win = window as any;
        if ('ondeviceorientationabsolute' in win) {
            win.addEventListener('deviceorientationabsolute', absoluteHandler as EventListener, true);
            orientationCleanupRef.current = () =>
                win.removeEventListener('deviceorientationabsolute', absoluteHandler as EventListener, true);
        } else {
            win.addEventListener('deviceorientation', standardHandler as EventListener, true);
            orientationCleanupRef.current = () =>
                win.removeEventListener('deviceorientation', standardHandler as EventListener, true);
        }
    }, [makeOrientationHandler]);

    // ── Start watchPosition (called after permission granted) ──
    const startWatchPosition = useCallback(() => {
        if (!navigator.geolocation) {
            setPermStage('unavailable');
            return;
        }
        if (watchIdRef.current != null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
        }
        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude, accuracy: acc } = pos.coords;
                const q = calculateQibla(latitude, longitude);
                const d = calculateDistance(latitude, longitude);
                qiblaRef.current = q;
                setQiblaDeg(Math.round(q));
                setDistance(d);
                setAccuracy(acc < 50 ? 'high' : acc < 200 ? 'medium' : 'low');
                setPermStage('granted');
                setLocationError('');

                // Reverse geocoding — only once
                if (!cityFetchedRef.current) {
                    cityFetchedRef.current = true;
                    fetch(`/api/nominatim/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=10`, {
                        headers: { 'Accept-Language': 'id' },
                    })
                        .then(r => r.json())
                        .then(data => {
                            const city = data.address?.city || data.address?.town ||
                                data.address?.regency || data.address?.county ||
                                data.address?.state || 'Lokasi Anda';
                            setCityName(city);
                        })
                        .catch(() => setCityName('Lokasi Anda'));
                }
            },
            (err) => {
                if (err.code === err.PERMISSION_DENIED) {
                    setPermStage('denied');
                    setLocationError('Akses lokasi ditolak, silakan aktifkan lokasi di pengaturan perangkat Anda.');
                } else if (err.code === err.POSITION_UNAVAILABLE) {
                    setLocationError('Lokasi tidak tersedia. Pastikan GPS aktif.');
                } else {
                    setLocationError('Waktu habis saat mencari lokasi. Coba lagi.');
                }
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
        );
    }, []);

    // ── Handle "Izinkan" tap ──
    const handleAllow = useCallback(async () => {
        setPermStage('requesting');

        // iOS: request compass permission first (requires user gesture)
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            try {
                const perm = await (DeviceOrientationEvent as any).requestPermission();
                if (perm === 'granted') {
                    attachListeners();
                    startRaf();
                } else {
                    setCompassError('Izin kompas ditolak. Kompas tidak akan berfungsi.');
                }
            } catch {
                setCompassError('Gagal meminta izin kompas.');
            }
        } else {
            // Non-iOS: attach immediately
            attachListeners();
            startRaf();
        }

        // Start location watch
        startWatchPosition();
    }, [attachListeners, startRaf, startWatchPosition]);

    // ── Handle "Nanti" tap ──
    const handleDeny = useCallback(() => {
        setPermStage('denied');
        setLocationError('Akses lokasi tidak diberikan. Arah kiblat tidak dapat ditampilkan secara akurat tanpa lokasi Anda.');
    }, []);

    // ── Retry permission ──
    const handleRetry = useCallback(() => {
        cityFetchedRef.current = false;
        hasCompassRef.current = false;
        setHasCompass(false);
        setLocationError('');
        setCompassError('');
        setPermStage('prompt');
    }, []);

    // ── Request compass button (header) ──
    const requestCompass = useCallback(async () => {
        setCompassError('');
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            try {
                const perm = await (DeviceOrientationEvent as any).requestPermission();
                if (perm === 'granted') {
                    hasCompassRef.current = false;
                    attachListeners();
                    if (!rafRef.current) startRaf();
                } else {
                    setCompassError('Izin kompas ditolak. Arah kiblat ditampilkan tanpa rotasi live.');
                }
            } catch {
                setCompassError('Gagal meminta izin kompas. Coba sekali lagi.');
            }
        } else {
            hasCompassRef.current = false;
            setHasCompass(false);
            orientationCleanupRef.current?.();
            attachListeners();
            if (!rafRef.current) startRaf();
        }
    }, [attachListeners, startRaf]);

    // ── Cleanup on unmount ──
    useEffect(() => {
        return () => {
            stopRaf();
            orientationCleanupRef.current?.();
            if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
        };
    }, [stopRaf]);

    const accuracyLabel = accuracy === 'high' ? 'Akurasi Sangat Tinggi' : accuracy === 'medium' ? 'Akurasi Sedang' : 'Akurasi Rendah';
    const accuracyColor = accuracy === 'high' ? '#4caf6e' : accuracy === 'medium' ? '#D4AF37' : '#f87171';
    const tickMarks = Array.from({ length: 24 }, (_, i) => i * 15);
    const ringRotation = hasCompass ? -currentVisualHeadingRef.current : 0;

    // ══════════════════════════════════════════════
    // ── PERMISSION PROMPT SCREEN ──
    // ══════════════════════════════════════════════
    if (permStage === 'prompt') {
        return (
            <div className="bg-cream dark:bg-dark flex-1 flex flex-col" style={{ minHeight: '100dvh' }}>
                {/* Header */}
                <header className="flex items-center justify-between" style={{ padding: '16px var(--app-padding-x)', paddingTop: 48 }}>
                    <button onClick={() => onNavigate(Tab.HOME)} className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center shadow-sm border border-white/50 active:scale-95 transition-transform">
                        <span className="material-symbols-outlined text-slate-600" style={{ fontSize: 20 }}>arrow_back_ios_new</span>
                    </button>
                    <div style={{ textAlign: 'center' }}>
                        <h1 className="text-lg font-bold text-[#1a4d2e]" style={{ letterSpacing: '-0.02em' }}>Kiblat</h1>
                        <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.3em', color: '#c5a059', textTransform: 'uppercase', marginTop: 2 }}>Qibla Finder</p>
                    </div>
                    <div className="w-10 h-10" />
                </header>

                {/* Permission card */}
                <div className="flex-1 flex flex-col items-center justify-center" style={{ padding: '0 var(--app-padding-x)', gap: 0 }}>
                    {/* Compass illustration */}
                    <div style={{
                        width: 120, height: 120, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #1a4d2e, #2e7d52)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 20px 50px rgba(26,77,46,0.25)',
                        marginBottom: 32,
                        border: '4px solid rgba(197,160,89,0.3)',
                    }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 56, color: '#c5a059', fontVariationSettings: "'FILL' 1" }}>explore</span>
                    </div>

                    <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a4d2e', textAlign: 'center', marginBottom: 12, lineHeight: 1.3 }}>
                        Izinkan Akses Lokasi
                    </h2>
                    <p style={{ fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 1.7, marginBottom: 36, maxWidth: 300 }}>
                        Izinkan akses lokasi untuk mendapatkan <strong>arah kiblat yang akurat</strong> berdasarkan posisi Anda saat ini.
                    </p>

                    {/* Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 280 }}>
                        <button
                            onClick={handleAllow}
                            style={{
                                width: '100%', padding: '16px', borderRadius: 14,
                                background: 'linear-gradient(135deg, #1a4d2e, #2e7d52)',
                                color: '#fff', fontSize: 16, fontWeight: 800,
                                border: 'none', cursor: 'pointer',
                                boxShadow: '0 8px 24px rgba(26,77,46,0.3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                letterSpacing: '-0.01em',
                            }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>location_on</span>
                            Izinkan
                        </button>
                        <button
                            onClick={handleDeny}
                            style={{
                                width: '100%', padding: '14px', borderRadius: 14,
                                background: 'transparent', color: '#999', fontSize: 15, fontWeight: 600,
                                border: '1.5px solid #e5e5e5', cursor: 'pointer',
                            }}
                        >
                            Nanti
                        </button>
                    </div>

                    <p style={{ fontSize: 11, color: '#bbb', textAlign: 'center', marginTop: 24, lineHeight: 1.6, maxWidth: 260 }}>
                        Lokasi hanya digunakan untuk menghitung arah kiblat dan tidak disimpan.
                    </p>
                </div>
            </div>
        );
    }

    // ══════════════════════════════════════════════
    // ── REQUESTING SCREEN ──
    // ══════════════════════════════════════════════
    if (permStage === 'requesting') {
        return (
            <div className="bg-cream dark:bg-dark flex-1 flex flex-col items-center justify-center" style={{ minHeight: '100dvh', gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', border: '4px solid #e0e0e0', borderTopColor: '#4caf6e', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ fontSize: 15, color: '#666', fontWeight: 600 }}>Mendapatkan lokasi Anda...</p>
                <p style={{ fontSize: 12, color: '#aaa' }}>Izinkan akses lokasi di popup browser</p>
            </div>
        );
    }

    // ══════════════════════════════════════════════
    // ── DENIED / UNAVAILABLE SCREEN ──
    // ══════════════════════════════════════════════
    if (permStage === 'denied' || permStage === 'unavailable') {
        return (
            <div className="bg-cream dark:bg-dark flex-1 flex flex-col" style={{ minHeight: '100dvh' }}>
                <header className="flex items-center justify-between" style={{ padding: '16px var(--app-padding-x)', paddingTop: 48 }}>
                    <button onClick={() => onNavigate(Tab.HOME)} className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center shadow-sm border border-white/50 active:scale-95 transition-transform">
                        <span className="material-symbols-outlined text-slate-600" style={{ fontSize: 20 }}>arrow_back_ios_new</span>
                    </button>
                    <div style={{ textAlign: 'center' }}>
                        <h1 className="text-lg font-bold text-[#1a4d2e]">Kiblat</h1>
                        <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.3em', color: '#c5a059', textTransform: 'uppercase', marginTop: 2 }}>Qibla Finder</p>
                    </div>
                    <div className="w-10 h-10" />
                </header>

                <div className="flex-1 flex flex-col items-center justify-center" style={{ padding: '0 var(--app-padding-x)', textAlign: 'center' }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#d97706' }}>location_off</span>
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1a4d2e', marginBottom: 12 }}>Akses Lokasi Ditolak</h2>
                    <p style={{ fontSize: 14, color: '#666', lineHeight: 1.7, marginBottom: 10, maxWidth: 300 }}>
                        {locationError || 'Akses lokasi ditolak, silakan aktifkan lokasi di pengaturan perangkat Anda.'}
                    </p>
                    <p style={{ fontSize: 12, color: '#aaa', lineHeight: 1.6, marginBottom: 32, maxWidth: 280 }}>
                        Buka <strong>Pengaturan → Privasi → Layanan Lokasi</strong>, lalu aktifkan untuk browser Anda.
                    </p>
                    <button
                        onClick={handleRetry}
                        style={{
                            padding: '14px 32px', borderRadius: 12,
                            background: 'linear-gradient(135deg, #1a4d2e, #2e7d52)',
                            color: '#fff', fontSize: 15, fontWeight: 700,
                            border: 'none', cursor: 'pointer',
                            boxShadow: '0 8px 20px rgba(26,77,46,0.25)',
                        }}
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        );
    }

    // ══════════════════════════════════════════════
    // ── MAIN COMPASS SCREEN (granted) ──
    // ══════════════════════════════════════════════
    return (
        <div className="bg-cream dark:bg-dark flex-1 flex flex-col" style={{ minHeight: '100dvh' }}>
            {/* Header */}
            <header className="flex items-center justify-between" style={{ padding: '16px var(--app-padding-x)', paddingTop: 48 }}>
                <button onClick={() => onNavigate(Tab.HOME)} className="w-10 h-10 rounded-full bg-white/50 dark:bg-slate-800 flex items-center justify-center shadow-sm border border-white/50 dark:border-slate-700 active:scale-95 transition-transform">
                    <span className="material-symbols-outlined text-slate-600 dark:text-slate-300" style={{ fontSize: 20 }}>arrow_back_ios_new</span>
                </button>
                <div style={{ textAlign: 'center' }}>
                    <h1 className="text-lg font-bold text-[#1a4d2e] dark:text-white" style={{ letterSpacing: '-0.02em' }}>Kiblat</h1>
                    <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.3em', color: '#c5a059', textTransform: 'uppercase', marginTop: 2 }}>Qibla Finder</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="w-10 h-10 rounded-full bg-white/50 dark:bg-slate-800 flex items-center justify-center shadow-sm border border-white/50 dark:border-slate-700 active:scale-95 transition-transform"
                    >
                        <span className="material-symbols-outlined text-[#1a4d2e] dark:text-slate-300" style={{ fontSize: 22 }}>
                            {isMuted ? 'volume_off' : 'volume_up'}
                        </span>
                    </button>
                    <button onClick={requestCompass} className="w-10 h-10 rounded-full bg-white/50 dark:bg-slate-800 flex items-center justify-center shadow-sm border border-white/50 dark:border-slate-700 active:scale-95 transition-transform" title="Kalibrasi kompas">
                        <span className="material-symbols-outlined text-[#1a4d2e] dark:text-slate-300" style={{ fontSize: 22 }}>my_location</span>
                    </button>
                </div>
            </header>

            {/* Info banners */}
            {locationError && (
                <div style={{ margin: '0 var(--app-padding-x) 8px', padding: '12px 16px', background: '#fef9ec', borderRadius: 12, border: '1px solid #fde68a', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#d97706', flexShrink: 0, marginTop: 1 }}>warning</span>
                    <p style={{ fontSize: 12, color: '#92400e', fontWeight: 600, lineHeight: 1.4 }}>{locationError}</p>
                </div>
            )}
            {compassError && (
                <div style={{ margin: '0 var(--app-padding-x) 8px', padding: '10px 16px', background: '#f0f9ff', borderRadius: 12, border: '1px solid #bae6fd' }}>
                    <p style={{ fontSize: 12, color: '#0369a1', fontWeight: 600 }}>{compassError}</p>
                </div>
            )}
            {needsCalibration && hasCompass && (
                <div style={{ margin: '0 var(--app-padding-x) 8px', padding: '10px 16px', background: '#fffbeb', borderRadius: 12, border: '1px solid #fcd34d', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#f59e0b' }}>rotate_90_degrees_ccw</span>
                    <p style={{ fontSize: 11, color: '#92400e', fontWeight: 600 }}>Gerakkan perangkat membentuk angka 8 untuk kalibrasi kompas</p>
                </div>
            )}
            {hasCompass && !compassIsAbsolute && (
                <div style={{ margin: '0 var(--app-padding-x) 4px', padding: '8px 14px', background: 'rgba(0,0,0,0.04)', borderRadius: 10 }}>
                    <p style={{ fontSize: 10, color: '#999', fontWeight: 600, textAlign: 'center' }}>
                        Kompas relatif aktif — akurasi mungkin berkurang
                    </p>
                </div>
            )}

            {/* Main compass area */}
            <main className="flex-1 flex flex-col items-center justify-center" style={{ padding: '0 var(--app-padding-x)', marginTop: -20 }}>
                {/* Compass */}
                <div style={{ position: 'relative', width: 310, height: 310, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

                    {/* Outer ring + ticks */}
                    <div style={{
                        position: 'absolute', inset: 0, borderRadius: '50%',
                        border: '1px solid rgba(197,160,89,0.2)',
                        transform: `rotate(${ringRotation}deg)`,
                        transition: hasCompass ? 'transform 0.1s linear' : 'none',
                    }}>
                        {tickMarks.map((deg) => (
                            <div key={deg} style={{
                                position: 'absolute', top: '50%', left: '50%',
                                width: 1, height: deg % 90 === 0 ? 12 : 6,
                                background: deg % 90 === 0 ? 'rgba(197,160,89,0.6)' : 'rgba(197,160,89,0.3)',
                                transformOrigin: '0 155px',
                                transform: `rotate(${deg}deg) translate(-50%, -155px)`,
                            }} />
                        ))}
                    </div>

                    {/* Second ring */}
                    <div style={{ position: 'absolute', inset: 8, borderRadius: '50%', border: '3px solid rgba(139,168,136,0.1)', boxShadow: '0 0 60px rgba(139,168,136,0.08)' }} />

                    {/* Cardinal N/S */}
                    <div style={{
                        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                        justifyContent: 'space-between', alignItems: 'center', padding: '32px 0',
                        transform: `rotate(${ringRotation}deg)`,
                        transition: hasCompass ? 'transform 0.1s linear' : 'none',
                    }}>
                        <span style={{ fontSize: 17, fontWeight: 700, color: '#1a4d2e', fontFamily: "'Playfair Display', serif" }}>U</span>
                        <span style={{ fontSize: 17, fontWeight: 700, color: '#ccc', fontFamily: "'Playfair Display', serif" }}>S</span>
                    </div>
                    {/* Cardinal B/T */}
                    <div style={{
                        position: 'absolute', inset: 0, display: 'flex',
                        justifyContent: 'space-between', alignItems: 'center', padding: '0 32px',
                        transform: `rotate(${ringRotation}deg)`,
                        transition: hasCompass ? 'transform 0.1s linear' : 'none',
                    }}>
                        <span style={{ fontSize: 17, fontWeight: 700, color: '#ccc', fontFamily: "'Playfair Display', serif" }}>B</span>
                        <span style={{ fontSize: 17, fontWeight: 700, color: '#ccc', fontFamily: "'Playfair Display', serif" }}>T</span>
                    </div>

                    {/* Inner white circle */}
                    <div style={{
                        position: 'relative', width: 220, height: 220, borderRadius: '50%', background: '#fff',
                        boxShadow: '0 15px 35px -10px rgba(26,77,46,0.06)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1px solid #fff', overflow: 'hidden',
                    }}>
                        {/* Arabesque */}
                        <div style={{
                            position: 'absolute', inset: 0, opacity: 0.03, backgroundSize: '40px 40px',
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0c2.5 5 5 7.5 10 10 5 2.5 7.5 5 10 10 2.5 5 5 7.5 10 10-5 2.5-7.5 5-10 10-2.5 5-5 7.5-10 10-5 2.5-7.5 5-10 10-2.5-5-5-7.5-10-10-5-2.5-7.5-5-10-10-2.5-5-5-7.5-10-10 5-2.5 7.5-5 10-10 2.5-5 5-7.5 10-10z' fill='%23c5a059' fill-opacity='0.3' fill-rule='evenodd'/%3E%3C/svg%3E")`,
                        }} />

                        {/* Needle */}
                        <div style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transform: `rotate(${needleRot}deg)`,
                            transition: 'transform 0.1s linear',
                        }}>
                            <div style={{ position: 'relative', height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ position: 'absolute', width: 1, height: 180, background: 'linear-gradient(to bottom, #c5a059, rgba(197,160,89,0.2), transparent)', top: 10 }} />
                                <div style={{ position: 'absolute', top: 8 }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#c5a059', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}>location_on</span>
                                </div>
                                <div style={{
                                    position: 'absolute', top: 36, width: 40, height: 40, borderRadius: 10,
                                    background: '#1a4d2e', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 12px rgba(26,77,46,0.3)', border: '2px solid #c5a059',
                                }}>
                                    <span className="material-symbols-outlined" style={{ color: '#c5a059', fontSize: 20 }}>mosque</span>
                                </div>
                            </div>
                        </div>

                        {/* Center degree */}
                        <div style={{
                            position: 'relative', zIndex: 10,
                            background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
                            padding: '10px 24px', borderRadius: 999,
                            border: '1px solid rgba(197,160,89,0.2)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                        }}>
                            <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.04em', color: '#1a4d2e' }}>{Math.round(qiblaDeg)}°</span>
                            <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', color: '#c5a059', textTransform: 'uppercase' }}>
                                {getDirectionLabel(qiblaDeg)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Accuracy pill */}
                <div style={{
                    marginTop: 24, display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 16px', background: 'rgba(255,255,255,0.5)',
                    borderRadius: 999, border: '1px solid rgba(197,160,89,0.1)',
                }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: accuracyColor, animation: 'pulse 2s infinite' }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#1a4d2e', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                        {hasCompass
                            ? `Kompas ${compassIsAbsolute ? 'Absolut' : 'Relatif'} · ${accuracyLabel}`
                            : `${accuracyLabel} · Ketuk 📍 untuk kompas`}
                    </span>
                </div>
            </main>

            {/* Location card */}
            <section style={{ padding: '0 var(--app-padding-x)', paddingBottom: 100, marginTop: 24 }}>
                <div style={{
                    background: '#fff', borderRadius: 24, padding: 20,
                    boxShadow: '0 15px 35px -10px rgba(26,77,46,0.06)',
                    border: '1px solid rgba(0,0,0,0.04)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    position: 'relative', overflow: 'hidden',
                }}>
                    <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, opacity: 0.02, transform: 'rotate(45deg)', backgroundSize: '40px 40px', backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0c2.5 5 5 7.5 10 10 5 2.5 7.5 5 10 10 2.5 5 5 7.5 10 10-5 2.5-7.5 5-10 10-2.5 5-5 7.5-10 10-5 2.5-7.5 5-10 10-2.5-5-5-7.5-10-10-5-2.5-7.5-5-10-10-2.5-5-5-7.5-10-10 5-2.5 7.5-5 10-10 2.5-5 5-7.5 10-10z' fill='%23c5a059' fill-opacity='0.5' fill-rule='evenodd'/%3E%3C/svg%3E")` }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#c5a059' }}>location_on</span>
                            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', color: '#c5a059', textTransform: 'uppercase' }}>Lokasi Anda</p>
                        </div>
                        <p style={{ fontSize: 19, fontWeight: 800, color: '#1a4d2e', marginLeft: 20 }}>
                            {cityName || '...'}
                        </p>
                    </div>
                    <div style={{ height: 40, width: 1, background: '#f0f0f0', margin: '0 16px' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', color: '#999', textTransform: 'uppercase' }}>Jarak ke Ka'bah</p>
                        <p style={{ fontSize: 18, fontWeight: 800, color: '#1a4d2e', letterSpacing: '-0.02em' }}>
                            {distance > 0 ? `${distance.toLocaleString('id-ID')} km` : '...'}
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
};
