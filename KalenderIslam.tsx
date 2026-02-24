/**
 * KalenderIslam.tsx — Kalender Islam / Hijriah
 * ──────────────────────────────────────────────────────────────
 * § Hijri date from Aladhan API /v1/gToH?date=DD-MM-YYYY
 * § Calendar navigation: /v1/gToHCalendar?month=MM&year=YYYY
 * § Moon phase via Julian Date Number
 * § Modern converter UI with native date picker + animated result card
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Tab } from '../types';

interface KalenderIslamProps {
    onNavigate: (tab: Tab) => void;
}

interface HijriDate {
    day: number;
    month: string;
    year: number;
    monthNum: number;
    daysInMonth: number;
    weekdayOf1st: number;
}

interface CalendarMonth {
    hijriMonth: number;
    hijriYear: number;
    hijriMonthName: string;
    daysInMonth: number;
    weekdayOf1st: number;   // 0=Sun 1=Mon ... 6=Sat
    todayDay: number | null; // null if today is not in this month
}

interface ConvResult {
    dayName: string;      // Sabtu, Minggu, dst
    day: number;
    monthName: string;    // nama bulan Hijriah (Indonesia)
    year: number;
    fullGregorian: string; // tanggal Masehi yang dikonversi (tampilan)
}

// ── Bulan Hijriah (Indonesia) ──
const HIJRI_MONTHS_ID = [
    'Muharram', 'Safar', "Rabi'ul Awal", "Rabi'ul Akhir",
    'Jumadil Awal', 'Jumadil Akhir', 'Rajab', "Sya'ban",
    'Ramadan', 'Syawal', "Dzulqa'dah", 'Dzulhijjah',
];

const HIJRI_DAY_NAMES_ID = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu'];
const DAY_LABELS = ['AH', 'SN', 'SL', 'RB', 'KM', 'JM', 'SB'];

// ── Moon phase (Julian Date) ──
function getMoonPhase(date: Date): { label: string; icon: string } {
    const JD = date.getTime() / 86400000 + 2440587.5;
    const phase = ((JD - 2451550.1) / 29.53058867) % 1;
    const p = phase < 0 ? phase + 1 : phase;
    if (p < 0.03 || p >= 0.97) return { label: 'Bulan Baru', icon: 'brightness_1' };
    if (p < 0.22) return { label: 'Sabit Muda', icon: 'bedtime' };
    if (p < 0.28) return { label: 'Seperempat', icon: 'bedtime' };
    if (p < 0.47) return { label: 'Cembung', icon: 'wb_sunny' };
    if (p < 0.53) return { label: 'Purnama', icon: 'circle' };
    if (p < 0.72) return { label: 'Cembung Akhir', icon: 'wb_sunny' };
    if (p < 0.78) return { label: 'Seperempat Akhir', icon: 'bedtime' };
    return { label: 'Sabit Tua', icon: 'bedtime' };
}

// ── API helpers ──
async function fetchHijriDay(dateStr: string) {
    // dateStr = DD-MM-YYYY
    const res = await fetch(`https://api.aladhan.com/v1/gToH/${dateStr}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.code !== 200) throw new Error(json.status);
    return json.data.hijri;
}

async function fetchHijriCalendar(gregMonth: number, gregYear: number): Promise<CalendarMonth> {
    // ✅ Correct path-param URL: /v1/gToHCalendar/{month}/{year}
    const res = await fetch(`https://api.aladhan.com/v1/gToHCalendar/${gregMonth}/${gregYear}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.code !== 200) throw new Error(json.status);

    const entries: any[] = json.data; // array of 28-31 entries, one per Gregorian day

    // Determine the dominant Hijri month (most days in month)
    const monthCount: Record<number, number> = {};
    entries.forEach((e: any) => {
        const hm = parseInt(e.hijri.month.number);
        monthCount[hm] = (monthCount[hm] || 0) + 1;
    });
    const dominantHijriMonth = parseInt(
        Object.entries(monthCount).sort((a, b) => Number(b[1]) - Number(a[1]))[0][0]
    );

    // First Gregorian entry that matches the dominant Hijri month
    const firstEntry = entries.find((e: any) => parseInt(e.hijri.month.number) === dominantHijriMonth);
    if (!firstEntry) throw new Error('No entry found');

    const hijriYear = parseInt(firstEntry.hijri.year);
    const hijriMonthName = HIJRI_MONTHS_ID[dominantHijriMonth - 1] || firstEntry.hijri.month.en;
    const daysInHijriMonth = parseInt(String(firstEntry.hijri.month.days || '30'));

    // ✅ Aladhan gregorian.date format is DD-MM-YYYY
    const firstHijriDay = parseInt(firstEntry.hijri.day);
    const dateParts = firstEntry.gregorian.date.split('-').map(Number); // [DD, MM, YYYY]
    const gd = dateParts[0], gm = dateParts[1], gy = dateParts[2];
    // Go back (firstHijriDay - 1) days to land on Hijri day 1
    const greg1st = new Date(gy, gm - 1, gd - firstHijriDay + 1);
    const weekdayOf1st = greg1st.getDay(); // 0=Sun

    // Check if today falls within this displayed Gregorian month
    const today = new Date();
    let todayDay: number | null = null;
    if (today.getMonth() + 1 === gregMonth && today.getFullYear() === gregYear) {
        const todayIndex = today.getDate() - 1;
        const todayEntry = entries[todayIndex];
        if (todayEntry && parseInt(todayEntry.hijri.month.number) === dominantHijriMonth) {
            todayDay = parseInt(todayEntry.hijri.day);
        }
    }

    return { hijriMonth: dominantHijriMonth, hijriYear, hijriMonthName, daysInMonth: daysInHijriMonth, weekdayOf1st, todayDay };
}

export const KalenderIslam: React.FC<KalenderIslamProps> = ({ onNavigate }) => {
    const now = new Date();

    // ── Today ──
    const [hijriDate, setHijriDate] = useState<HijriDate | null>(null);
    const [masehiStr, setMasehiStr] = useState('');
    const [hijriStr, setHijriStr] = useState('');
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState('');

    // ── Calendar navigation ──
    // viewGreg = which Gregorian month is displayed in the calendar grid
    const [viewGreg, setViewGreg] = useState({ month: now.getMonth() + 1, year: now.getFullYear() });
    const [calendarData, setCalendarData] = useState<CalendarMonth | null>(null);
    const [calLoading, setCalLoading] = useState(false);
    const calFetchRef = useRef(0); // prevents stale fetch race

    // ── Moon phase ──
    const moonPhaseNow = useMemo(() => getMoonPhase(now), []);

    const MOON_PHASES_UI = [
        { icon: 'brightness_1', label: 'Bulan Baru', phaseLabel: 'Bulan Baru' },
        { icon: 'bedtime', label: 'Sabit', phaseLabel: 'Sabit Muda' },
        { icon: 'wb_sunny', label: 'Cembung', phaseLabel: 'Cembung' },
        { icon: 'circle', label: 'Purnama', phaseLabel: 'Purnama' },
        { icon: 'bedtime', label: 'Sabit Akhir', phaseLabel: 'Sabit Tua', flip: true },
    ];

    // ── Converter ──
    const [convResult, setConvResult] = useState<ConvResult | null>(null);
    const [convLoading, setConvLoading] = useState(false);
    const [convError, setConvError] = useState('');
    const [convVisible, setConvVisible] = useState(false);

    // ── Converter calendar picker (bottom sheet) ──
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerMonth, setPickerMonth] = useState(now.getMonth()); // 0-indexed JS month
    const [pickerYear, setPickerYear] = useState(now.getFullYear());
    const [pickerSelectedDay, setPickerSelectedDay] = useState<number | null>(null);
    const pickerAnimRef = useRef(false); // tracks if sheet is animating in

    // Picker grid: days in the picker month
    const pickerDays = useMemo(() => {
        const firstDay = new Date(pickerYear, pickerMonth, 1).getDay(); // 0=Sun
        const totalDays = new Date(pickerYear, pickerMonth + 1, 0).getDate();
        const cells: { day: number; isPlaceholder: boolean; isToday: boolean }[] = [];
        for (let i = 0; i < firstDay; i++) cells.push({ day: 0, isPlaceholder: true, isToday: false });
        for (let d = 1; d <= totalDays; d++) {
            const isToday = d === now.getDate() && pickerMonth === now.getMonth() && pickerYear === now.getFullYear();
            cells.push({ day: d, isPlaceholder: false, isToday });
        }
        return cells;
    }, [pickerMonth, pickerYear]);

    const pickerMonthLabel = new Date(pickerYear, pickerMonth, 1)
        .toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    const openPicker = useCallback(() => {
        setPickerMonth(now.getMonth());
        setPickerYear(now.getFullYear());
        setPickerSelectedDay(null);
        setConvResult(null);
        setConvError('');
        setConvVisible(false);
        setPickerOpen(true);
        // Animate in via rAF
        requestAnimationFrame(() => { pickerAnimRef.current = true; });
    }, []);

    // Closing animation state
    const [pickerClosing, setPickerClosing] = useState(false);

    const closePicker = useCallback(() => {
        if (pickerClosing) return;
        setPickerClosing(true);
        // Wait for slide-down animation to finish before unmounting
        setTimeout(() => {
            pickerAnimRef.current = false;
            setPickerOpen(false);
            setPickerClosing(false);
        }, 250);
    }, [pickerClosing]);

    // Haptic vibration helper
    const haptic = useCallback(() => {
        if (navigator.vibrate) navigator.vibrate(8);
    }, []);

    const pickerPrevMonth = useCallback(() => {
        haptic();
        setPickerMonth(prev => {
            if (prev === 0) { setPickerYear(y => y - 1); return 11; }
            return prev - 1;
        });
        setPickerSelectedDay(null);
    }, [haptic]);

    const pickerNextMonth = useCallback(() => {
        haptic();
        setPickerMonth(prev => {
            if (prev === 11) { setPickerYear(y => y + 1); return 0; }
            return prev + 1;
        });
        setPickerSelectedDay(null);
    }, [haptic]);

    // Auto-convert when a day is selected, then auto-dismiss
    const selectPickerDay = useCallback(async (day: number) => {
        haptic();
        setPickerSelectedDay(day);
        setConvLoading(true);
        setConvError('');
        setConvVisible(false);
        setConvResult(null);
        try {
            const dd = String(day).padStart(2, '0');
            const mm = String(pickerMonth + 1).padStart(2, '0');
            const yyyy = String(pickerYear);
            const dateStr = `${dd}-${mm}-${yyyy}`;
            const h = await fetchHijriDay(dateStr);
            const monthNum = parseInt(h.month.number);
            const monthName = HIJRI_MONTHS_ID[monthNum - 1] || h.month.en;
            const gregDate = new Date(pickerYear, pickerMonth, day);
            const dayName = HIJRI_DAY_NAMES_ID[gregDate.getDay()];
            const fullGregorian = gregDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            setConvResult({ dayName, day: parseInt(h.day), monthName, year: parseInt(h.year), fullGregorian });
            requestAnimationFrame(() => requestAnimationFrame(() => setConvVisible(true)));
            // Auto-dismiss after showing result briefly (snappier delay)
            setTimeout(() => {
                setPickerClosing(true);
                setTimeout(() => {
                    pickerAnimRef.current = false;
                    setPickerOpen(false);
                    setPickerClosing(false);
                }, 250);
            }, 600);
        } catch {
            setConvError('Gagal mengkonversi. Periksa koneksi internet.');
        } finally {
            setConvLoading(false);
        }
    }, [pickerMonth, pickerYear, haptic]);

    // ════════════════════════════════════════
    // Fetch today's Hijri date
    // ════════════════════════════════════════
    const fetchTodayHijri = useCallback(async () => {
        setLoading(true);
        setFetchError('');
        try {
            const dd = String(now.getDate()).padStart(2, '0');
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const yyyy = now.getFullYear();
            setMasehiStr(now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));

            const h = await fetchHijriDay(`${dd}-${mm}-${yyyy}`);
            const monthNum = parseInt(h.month.number);
            const dayNum = parseInt(h.day);
            const yearNum = parseInt(h.year);
            const daysInMonth = parseInt(h.month.days || '30');

            const firstOfMonth = new Date(now);
            firstOfMonth.setDate(now.getDate() - (dayNum - 1));
            const weekdayOf1st = firstOfMonth.getDay();

            const monthNameId = HIJRI_MONTHS_ID[monthNum - 1] || h.month.en;
            setHijriDate({ day: dayNum, month: monthNameId, year: yearNum, monthNum, daysInMonth, weekdayOf1st });
            setHijriStr(`${dayNum} ${monthNameId} ${yearNum} H`);
        } catch (e: any) {
            setFetchError('Gagal memuat tanggal Hijriah. Periksa koneksi internet.');
            setMasehiStr(now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
        } finally {
            setLoading(false);
        }
    }, [now]);

    useEffect(() => {
        fetchTodayHijri();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ════════════════════════════════════════
    // Fetch calendar grid for viewGreg
    // ════════════════════════════════════════
    useEffect(() => {
        const id = ++calFetchRef.current;
        setCalLoading(true);
        fetchHijriCalendar(viewGreg.month, viewGreg.year)
            .then(data => { if (calFetchRef.current === id) setCalendarData(data); })
            .catch(() => { /* keep previous data on error */ })
            .finally(() => { if (calFetchRef.current === id) setCalLoading(false); });
    }, [viewGreg]);

    // ── Navigate calendar months ──
    const goCalPrev = useCallback(() => {
        setViewGreg(prev => {
            if (prev.month === 1) return { month: 12, year: prev.year - 1 };
            return { month: prev.month - 1, year: prev.year };
        });
    }, []);

    const goCalNext = useCallback(() => {
        setViewGreg(prev => {
            if (prev.month === 12) return { month: 1, year: prev.year + 1 };
            return { month: prev.month + 1, year: prev.year };
        });
    }, []);

    // ── Calendar grid cells ──
    const calendarDays = useMemo(() => {
        const data = calendarData;
        const displayedHijriMonth = data?.hijriMonth ?? hijriDate?.monthNum ?? -1;
        const displayedHijriYear = data?.hijriYear ?? hijriDate?.year ?? -1;
        const todaysHijriDay = (hijriDate &&
            hijriDate.monthNum === displayedHijriMonth &&
            hijriDate.year === displayedHijriYear)
            ? hijriDate.day : null;

        const source = data ?? (hijriDate ? {
            weekdayOf1st: hijriDate.weekdayOf1st,
            daysInMonth: hijriDate.daysInMonth,
        } : null);
        if (!source) return [];

        const days: { day: number; isPlaceholder: boolean; isToday: boolean }[] = [];
        for (let i = 0; i < source.weekdayOf1st; i++)
            days.push({ day: 0, isPlaceholder: true, isToday: false });
        for (let d = 1; d <= source.daysInMonth; d++)
            days.push({ day: d, isPlaceholder: false, isToday: d === todaysHijriDay });
        return days;
    }, [calendarData, hijriDate]);

    // ── Displayed month header info ──
    const displayedMonth = calendarData
        ? `${calendarData.hijriMonthName}`
        : (hijriDate ? hijriDate.month : '');
    const displayedYear = calendarData
        ? calendarData.hijriYear
        : (hijriDate ? hijriDate.year : '');
    const gregMonthLabel = new Date(viewGreg.year, viewGreg.month - 1, 1)
        .toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    // ── Ramadan progress ──
    const ramadanProgress = useMemo(() => {
        if (!hijriDate || hijriDate.monthNum !== 9) return null;
        const total = hijriDate.daysInMonth || 30;
        return { pct: Math.round((hijriDate.day / total) * 100), remaining: total - hijriDate.day };
    }, [hijriDate]);

    const specialDays = useMemo(() => {
        const m = calendarData?.hijriMonth ?? hijriDate?.monthNum;
        if (m !== 9) return [];
        return [{ day: 17 }, { day: 21 }, { day: 27 }];
    }, [calendarData, hijriDate]);

    const upcomingEvents = useMemo(() => {
        const events: { hijri: string; title: string; daysLeft: number; color: string }[] = [];
        if (hijriDate && hijriDate.monthNum === 9) {
            const toNuzulul = 17 - hijriDate.day;
            if (toNuzulul > 0) events.push({ hijri: '17 Ramadan H', title: 'Nuzulul Quran', daysLeft: toNuzulul, color: '#4caf6e' });
            const toEid = (hijriDate.daysInMonth - hijriDate.day) + 1;
            events.push({ hijri: '1 Syawal H', title: 'Idul Fitri', daysLeft: toEid, color: '#D4AF37' });
        }
        return events;
    }, [hijriDate]);

    // ════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════
    return (
        <div className="bg-cream dark:bg-dark flex-1 flex flex-col" style={{ minHeight: '100dvh' }}>
            {/* Header */}
            <header className="flex items-center justify-between" style={{ padding: '16px var(--app-padding-x)', paddingTop: 48 }}>
                <button onClick={() => onNavigate(Tab.HOME)} className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95 transition-transform">
                    <span className="material-icons-outlined text-slate-600 dark:text-slate-300" style={{ fontSize: 20 }}>arrow_back</span>
                </button>
                <h1 className="text-lg font-bold text-[#0B2D18] dark:text-white">Kalender Islam</h1>
                <button className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95 transition-transform">
                    <span className="material-icons-outlined text-slate-600 dark:text-slate-300" style={{ fontSize: 20 }}>notifications</span>
                </button>
            </header>

            <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 100 }}>

                {/* Error banner */}
                {fetchError && (
                    <div style={{ margin: '0 var(--app-padding-x) 12px', padding: '14px 18px', background: '#fef2f2', borderRadius: 16, border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyItems: 'flex-start', justifyContent: 'space-between', boxShadow: '0 4px 12px rgba(220,38,38,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                            <span className="material-symbols-outlined" style={{ color: '#ef4444', fontSize: 22, flexShrink: 0 }}>error</span>
                            <p style={{ fontSize: 13, color: '#991b1b', fontWeight: 700, lineHeight: 1.4 }}>{fetchError}</p>
                        </div>
                        <button onClick={fetchTodayHijri} disabled={loading} style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '8px 14px', borderRadius: 999, fontSize: 11, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', opacity: loading ? 0.6 : 1, transform: 'scale(1)', flexShrink: 0 }} onPointerDown={e => (e.currentTarget.style.transform = 'scale(0.95)')} onPointerUp={e => (e.currentTarget.style.transform = 'scale(1)')} onPointerLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
                            {loading ? <span className="material-symbols-outlined" style={{ fontSize: 14, animation: 'spin 1s linear infinite' }}>autorenew</span> : <span className="material-symbols-outlined" style={{ fontSize: 14 }}>refresh</span>}
                            Coba Lagi
                        </button>
                    </div>
                )}

                {/* ── HERO CARD ── */}
                <div style={{ padding: '0 var(--app-padding-x)', marginTop: 8 }}>
                    <div style={{ background: 'linear-gradient(135deg, #0B2D18, #1e5c38)', borderRadius: 16, padding: '24px 24px 20px', position: 'relative', overflow: 'hidden', boxShadow: '0 8px 30px rgba(11,45,24,0.3)' }}>
                        <div style={{ position: 'absolute', right: -24, top: -24, opacity: 0.12, transform: 'rotate(12deg)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 120, color: '#D4AF37', fontVariationSettings: "'FILL' 1" }}>dark_mode</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                            <div>
                                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: '#4caf6e', textTransform: 'uppercase', marginBottom: 4 }}>
                                    {hijriDate?.monthNum === 9 ? 'Ramadan Mubarak' : 'Kalender Hijriah'}
                                </p>
                                <h2 style={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
                                    {loading ? '...' : hijriDate ? `${hijriDate.day} ${hijriDate.month}` : 'Tidak tersedia'}
                                    <br />
                                    <span style={{ fontSize: 22, opacity: 0.9 }}>{hijriDate ? `${hijriDate.year} H` : ''}</span>
                                </h2>
                                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 8 }}>{masehiStr}</p>
                            </div>
                            {ramadanProgress && (
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width={64} height={64} style={{ transform: 'rotate(-90deg)' }}>
                                        <circle cx={32} cy={32} r={28} fill="transparent" stroke="#1e5c38" strokeWidth={4} />
                                        <circle cx={32} cy={32} r={28} fill="transparent" stroke="#4caf6e" strokeWidth={4} strokeDasharray={175.9} strokeDashoffset={175.9 - (175.9 * ramadanProgress.pct / 100)} strokeLinecap="round" />
                                    </svg>
                                    <div style={{ position: 'absolute' }}><span style={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>{ramadanProgress.pct}%</span></div>
                                </div>
                            )}
                        </div>
                        <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {ramadanProgress && (
                                    <span style={{ fontSize: 11, fontWeight: 500, padding: '4px 10px', background: 'rgba(255,255,255,0.1)', borderRadius: 999, color: '#fff' }}>
                                        Sisa {ramadanProgress.remaining} Hari
                                    </span>
                                )}
                                <span style={{ fontSize: 11, fontWeight: 500, padding: '4px 10px', background: 'rgba(212,175,55,0.15)', borderRadius: 999, color: '#D4AF37' }}>
                                    🌙 {moonPhaseNow.label}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── CALENDAR GRID ── */}
                <div style={{ padding: '0 var(--app-padding-x)', marginTop: 24 }}>
                    <div style={{ background: '#fff', borderRadius: 20, padding: '20px 16px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0' }}>
                        {/* Month navigator */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                            <button
                                onClick={goCalPrev}
                                style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #f0faf4, #e6f7ec)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(76,175,110,0.2)', cursor: 'pointer', boxShadow: '0 2px 8px rgba(76,175,110,0.1)', flexShrink: 0 }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#0B2D18' }}>chevron_left</span>
                            </button>
                            <div style={{ textAlign: 'center', flex: 1, padding: '0 8px' }}>
                                {/* Always show text — add a tiny spinner next to it when loading */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                    <h3 style={{ fontSize: 20, fontWeight: 900, color: '#0B2D18', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                                        {displayedMonth || '...'}
                                    </h3>
                                    {calLoading && (
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4caf6e', animation: 'pulse 1s ease-in-out infinite', flexShrink: 0 }} />
                                    )}
                                </div>
                                <p style={{ fontSize: 12, fontWeight: 600, color: '#4caf6e', marginTop: 2 }}>{displayedYear} H</p>
                                <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#bbb', marginTop: 1 }}>{gregMonthLabel}</p>
                            </div>
                            <button
                                onClick={goCalNext}
                                style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #f0faf4, #e6f7ec)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(76,175,110,0.2)', cursor: 'pointer', boxShadow: '0 2px 8px rgba(76,175,110,0.1)', flexShrink: 0 }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#0B2D18' }}>chevron_right</span>
                            </button>
                        </div>

                        {/* Day labels */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2,
                            textAlign: 'center', marginBottom: 4,
                            // Dim grid smoothly during loading, never flash to empty
                            opacity: calLoading ? 0.45 : 1,
                            transition: 'opacity 0.25s ease',
                            pointerEvents: calLoading ? 'none' : 'auto',
                        }}>
                            {DAY_LABELS.map((d, idx) => (
                                <div key={d} style={{ fontSize: 9, fontWeight: 800, paddingBottom: 8, color: idx === 0 ? '#ef4444' : '#bbb' }}>{d}</div>
                            ))}
                            {/* Cells */}
                            {(calLoading && calendarDays.length === 0) ? (
                                Array.from({ length: 35 }).map((_, i) => (
                                    <div key={i} style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div className="skeleton-line" style={{ width: 24, height: 24, borderRadius: 8 }} />
                                    </div>
                                ))
                            ) : (
                                calendarDays.map((cell, idx) => {
                                    const isSpecial = specialDays.some(s => s.day === cell.day && !cell.isPlaceholder);
                                    const col = idx % 7;
                                    const isSunday = col === 0;
                                    return (
                                        <div key={idx} style={{
                                            height: 40,
                                            display: 'flex', flexDirection: 'column',
                                            alignItems: 'center', justifyContent: 'center',
                                            position: 'relative',
                                            opacity: cell.isPlaceholder ? 0 : 1,
                                        }}>
                                            {/* Date circle */}
                                            <div style={{
                                                width: cell.isToday ? 32 : 28,
                                                height: cell.isToday ? 32 : 28,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                borderRadius: '50%',
                                                background: cell.isToday ? '#4caf6e' : 'transparent',
                                                color: cell.isToday ? '#fff' : isSunday ? '#ef4444' : '#333',
                                                fontSize: 13,
                                                fontWeight: cell.isToday ? 800 : 500,
                                                boxShadow: cell.isToday ? '0 3px 10px rgba(76,175,110,0.45)' : 'none',
                                                transition: 'background 0.2s',
                                                flexShrink: 0,
                                            }}>
                                                {!cell.isPlaceholder && cell.day}
                                            </div>
                                            {/* "Hari Ini" micro-label below the circle */}
                                            {cell.isToday && (
                                                <span style={{
                                                    position: 'absolute', bottom: -1,
                                                    fontSize: 6, fontWeight: 800,
                                                    color: '#4caf6e', letterSpacing: '0.03em',
                                                    lineHeight: 1, textTransform: 'uppercase',
                                                    whiteSpace: 'nowrap',
                                                }}>Hari ini</span>
                                            )}
                                            {/* Special event dot */}
                                            {isSpecial && !cell.isToday && (
                                                <span style={{ position: 'absolute', bottom: 2, width: 4, height: 4, borderRadius: '50%', background: '#D4AF37' }} />
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Legend */}
                        <div style={{ display: 'flex', gap: 12, marginTop: 12, justifyContent: 'flex-end' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4caf6e' }} />
                                <span style={{ fontSize: 9, color: '#aaa', fontWeight: 600 }}>Hari ini</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#D4AF37' }} />
                                <span style={{ fontSize: 9, color: '#aaa', fontWeight: 600 }}>Peristiwa</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── SPECIAL EVENT ── */}
                {hijriDate && hijriDate.monthNum === 9 && (
                    <div style={{ padding: '0 var(--app-padding-x)', marginTop: 24 }}>
                        <div style={{ background: '#FDFBF4', border: '2px solid rgba(212,175,55,0.25)', borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden', boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.03)' }}>
                            <div style={{ position: 'absolute', right: -16, bottom: -16, opacity: 0.05 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 80 }}>auto_stories</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#D4AF37', fontVariationSettings: "'FILL' 1" }}>stars</span>
                                <span style={{ fontSize: 9, fontWeight: 800, color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Momen Istimewa</span>
                            </div>
                            <h4 style={{ fontSize: 20, fontWeight: 800, color: '#0B2D18', marginBottom: 4 }}>Nuzulul Quran</h4>
                            <p style={{ fontSize: 13, color: '#666', lineHeight: 1.7 }}>Malam ke-17 Ramadan, peringatan turunnya kitab suci Al-Qur'an.</p>
                        </div>
                    </div>
                )}

                {/* ── UPCOMING EVENTS ── */}
                {upcomingEvents.length > 0 && (
                    <div style={{ padding: '0 var(--app-padding-x)', marginTop: 24 }}>
                        <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0B2D18', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                            Agenda Mendatang <span style={{ flex: 1, height: 1, background: '#e5e5e5' }} />
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {upcomingEvents.map((evt, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#fff', padding: 14, borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.03)', border: '1px solid #f0f0f0' }}>
                                    <div style={{ width: 52, height: 52, borderRadius: 10, background: `${evt.color}15`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: evt.color, flexShrink: 0 }}>
                                        <span style={{ fontSize: 17, fontWeight: 800, lineHeight: 1 }}>{evt.daysLeft}</span>
                                        <span style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase' }}>HARI</span>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: 11, color: '#999' }}>{evt.hijri}</p>
                                        <h5 style={{ fontWeight: 800, color: '#0B2D18', fontSize: 14 }}>{evt.title}</h5>
                                    </div>
                                    <div style={{ background: evt.daysLeft <= 3 ? '#0B2D18' : '#f0f0f0', color: evt.daysLeft <= 3 ? '#fff' : '#666', fontSize: 9, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}>
                                        {evt.daysLeft} HARI LAGI
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── MOON PHASES ── */}
                <div style={{ marginTop: 24 }}>
                    <h3 style={{ padding: '0 var(--app-padding-x)', fontSize: 11, fontWeight: 800, color: '#999', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 14 }}>Fase Bulan Saat Ini</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0 var(--app-padding-x)', paddingBottom: 4 }}>
                        {MOON_PHASES_UI.map((phase, i) => {
                            const isActive = phase.phaseLabel === moonPhaseNow.label ||
                                (moonPhaseNow.label === 'Cembung Akhir' && phase.phaseLabel === 'Cembung') ||
                                (moonPhaseNow.label === 'Seperempat' && phase.phaseLabel === 'Sabit Muda') ||
                                (moonPhaseNow.label === 'Seperempat Akhir' && phase.phaseLabel === 'Sabit Tua');
                            return (
                                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, paddingBottom: 20, position: 'relative' }}>
                                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: isActive ? 'rgba(76,175,110,0.12)' : '#f5f5f5', border: isActive ? '2px solid #4caf6e' : '2px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color 0.3s, background 0.3s', flexShrink: 0 }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: 26, color: isActive ? '#4caf6e' : '#bbb', fontVariationSettings: phase.icon === 'circle' || phase.icon === 'wb_sunny' ? "'FILL' 1" : "'FILL' 0", transform: (phase as any).flip ? 'scaleX(-1)' : 'none', transition: 'color 0.3s' }}>{phase.icon}</span>
                                    </div>
                                    <span style={{ fontSize: 9, fontWeight: isActive ? 700 : 500, color: isActive ? '#4caf6e' : '#aaa', textAlign: 'center', lineHeight: 1.2, maxWidth: 52 }}>{phase.label}</span>
                                    <span style={{ position: 'absolute', bottom: 2, fontSize: 7, fontWeight: 700, color: isActive ? '#4caf6e' : 'transparent', letterSpacing: '0.05em', transition: 'color 0.3s', userSelect: 'none' }}>● Sekarang</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ════════════════════════════════════════════ */}
                {/* ── DATE CONVERTER — Tap Card + Bottom Sheet ── */}
                {/* ════════════════════════════════════════════ */}
                <div style={{ padding: '0 var(--app-padding-x)', marginTop: 16, marginBottom: 24 }}>
                    <div style={{ background: '#0B2D18', borderRadius: 20, padding: '24px 24px 32px 24px', position: 'relative', overflow: 'hidden', minHeight: 'fit-content' }}>
                        {/* Decorative crescent */}
                        <div style={{ position: 'absolute', right: -20, top: -20, opacity: 0.06, transform: 'rotate(15deg)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 100, color: '#D4AF37', fontVariationSettings: "'FILL' 1" }}>dark_mode</span>
                        </div>

                        {/* Title */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, position: 'relative', zIndex: 1 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(212,175,55,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(212,175,55,0.15)' }}>
                                <span className="material-symbols-outlined" style={{ color: '#D4AF37', fontSize: 22 }}>swap_horiz</span>
                            </div>
                            <div>
                                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Konversi Tanggal</h3>
                                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Masehi → Hijriah</p>
                            </div>
                        </div>

                        {/* Tap-to-open card */}
                        <button
                            onClick={openPicker}
                            style={{
                                width: '100%', padding: '18px 20px',
                                background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.1)',
                                borderRadius: 16, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 14,
                                transition: 'border-color 0.2s, background 0.2s',
                                position: 'relative', zIndex: 1,
                            }}
                        >
                            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, rgba(76,175,110,0.2), rgba(76,175,110,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(76,175,110,0.15)' }}>
                                <span className="material-symbols-outlined" style={{ color: '#4caf6e', fontSize: 26 }}>calendar_month</span>
                            </div>
                            <div style={{ flex: 1, textAlign: 'left' }}>
                                <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
                                    {pickerSelectedDay != null
                                        ? new Date(pickerYear, pickerMonth, pickerSelectedDay).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                                        : 'Pilih tanggal Masehi...'}
                                </p>
                                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>Ketuk untuk membuka kalender</p>
                            </div>
                            <span className="material-symbols-outlined" style={{ color: 'rgba(255,255,255,0.25)', fontSize: 20, flexShrink: 0 }}>expand_more</span>
                        </button>

                        {/* Loading indicator */}
                        {convLoading && (
                            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 12 }}>
                                <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', borderTopColor: '#4caf6e', animation: 'spin 0.8s linear infinite' }} />
                                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Mengkonversi...</span>
                            </div>
                        )}

                        {/* Error */}
                        {convError && (
                            <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(220,38,38,0.12)', borderRadius: 10, border: '1px solid rgba(220,38,38,0.2)' }}>
                                <p style={{ fontSize: 12, color: '#fca5a5', fontWeight: 600 }}>{convError}</p>
                            </div>
                        )}

                        {/* Result card — auto-converted, animated */}
                        {convResult && (
                            <div style={{
                                marginTop: 32, // Increased vertical padding
                                opacity: convVisible ? 1 : 0,
                                transform: convVisible ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.97)',
                                transition: 'opacity 0.35s ease, transform 0.35s ease',
                                position: 'relative', // Add position context
                                zIndex: 10,           // Z-Index fix
                                display: 'flex',
                                flexDirection: 'column',
                                height: 'auto',       // Dynamic container
                            }}>
                                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 12, textAlign: 'center', fontWeight: 600 }}>
                                    {convResult.fullGregorian}
                                </p>
                                <div style={{
                                    background: 'rgba(212,175,55,0.08)', border: '1.5px solid rgba(212,175,55,0.2)',
                                    borderRadius: 16, padding: '24px 20px', // Clear visual margin & padding
                                    display: 'flex', alignItems: 'center', gap: 20, // Wider gap
                                }}>
                                    <div style={{ width: 60, height: 60, borderRadius: 16, background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(212,175,55,0.15)' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: 36, color: '#D4AF37', fontVariationSettings: "'FILL' 1" }}>dark_mode</span>
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                            {convResult.dayName}
                                        </p>
                                        <p style={{ fontSize: 26, fontWeight: 900, color: '#D4AF37', lineHeight: 1.2, letterSpacing: '-0.02em', display: 'block', wordWrap: 'break-word', whiteSpace: 'normal' }}>
                                            {convResult.day} {convResult.monthName}
                                        </p>
                                        <p style={{ fontSize: 16, fontWeight: 700, color: 'rgba(212,175,55,0.8)', marginTop: 4 }}>
                                            {convResult.year} Hijriah
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Default hint */}
                        {!convResult && !convLoading && !convError && hijriStr && (
                            <div style={{ marginTop: 14, padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10, border: '1px solid rgba(255,255,255,0.04)' }}>
                                <span className="material-symbols-outlined" style={{ color: '#D4AF37', fontSize: 16, fontVariationSettings: "'FILL' 1" }}>dark_mode</span>
                                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>Hari ini: {hijriStr}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ═══════════════════════════════════════ */}
                {/* ── BOTTOM SHEET CALENDAR PICKER ── */}
                {/* ═══════════════════════════════════════ */}
                {pickerOpen && createPortal(
                    <div
                        onClick={closePicker}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 99999,
                            background: 'rgba(0,0,0,0.6)', // even darker dimming
                            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', // more premium blur
                            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                            animation: pickerClosing ? 'fadeOut 0.25s ease forwards' : 'fadeIn 0.2s ease forwards',
                        }}
                    >
                        <div
                            onClick={e => e.stopPropagation()}
                            style={{
                                width: '100%', maxWidth: 430,
                                background: '#fff',
                                borderRadius: '28px 28px 0 0',
                                boxShadow: '0 -20px 60px rgba(0,0,0,0.25)',
                                animation: pickerClosing
                                    ? 'sheetDown 0.25s ease forwards'
                                    : 'sheetUp 0.3s cubic-bezier(0.32, 0.72, 0, 1) forwards',
                                display: 'flex', flexDirection: 'column',
                                maxHeight: '85vh',
                                overflow: 'hidden',
                            }}
                        >
                            {/* ── Sticky header area — Now truly solid background ── */}
                            <div style={{ flexShrink: 0, padding: '14px 28px 0', background: '#fff', zIndex: 10, position: 'relative' }}>
                                {/* Drag handle - more subtle horizontal line */}
                                <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 16 }}>
                                    <div style={{ width: 36, height: 4, borderRadius: 2, background: '#f0f0f0' }} />
                                </div>

                                {/* Header row */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                    <div>
                                        <h3 style={{ fontSize: 22, fontWeight: 900, color: '#0B2D18', letterSpacing: '-0.02em' }}>Pilih Tanggal</h3>
                                        <p style={{ fontSize: 12, color: '#aaa', marginTop: 3, fontWeight: 500 }}>Ketuk tanggal untuk konversi</p>
                                    </div>
                                    <button
                                        onClick={closePicker}
                                        style={{ width: 40, height: 40, borderRadius: '50%', background: '#fafafa', border: '1px solid #f0f0f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#aaa' }}>close</span>
                                    </button>
                                </div>

                                {/* Month navigator */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                    <button onClick={pickerPrevMonth} style={{ width: 42, height: 42, borderRadius: '50%', background: '#f8f8f8', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#333' }}>chevron_left</span>
                                    </button>
                                    <h4 style={{ fontSize: 18, fontWeight: 800, color: '#0B2D18', letterSpacing: '-0.01em' }}>{pickerMonthLabel}</h4>
                                    <button onClick={pickerNextMonth} style={{ width: 42, height: 42, borderRadius: '50%', background: '#f8f8f8', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#333' }}>chevron_right</span>
                                    </button>
                                </div>

                                {/* Day labels */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0, textAlign: 'center', marginBottom: 8 }}>
                                    {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d, idx) => (
                                        <div key={d} style={{ fontSize: 12, fontWeight: 700, color: idx === 0 ? '#ef4444' : '#ccc', paddingBottom: 10 }}>{d}</div>
                                    ))}
                                </div>

                                {/* Header shadow refinement */}
                                <div style={{ position: 'absolute', bottom: -10, left: 0, right: 0, height: 10, background: 'linear-gradient(to bottom, #fff, transparent)', pointerEvents: 'none' }} />
                            </div>

                            {/* ── Scrollable content area — More generous padding/gap ── */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 28px 40px', paddingBottom: 'calc(40px + env(safe-area-inset-bottom))' }}>
                                {/* Day grid - increased gap for less crowding */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, textAlign: 'center' }}>
                                    {pickerDays.map((cell, idx) => {
                                        const isSelected = cell.day === pickerSelectedDay && !cell.isPlaceholder;
                                        const col = idx % 7;
                                        const isSunday = col === 0;
                                        return (
                                            <button
                                                key={idx}
                                                disabled={cell.isPlaceholder}
                                                onClick={() => !cell.isPlaceholder && selectPickerDay(cell.day)}
                                                style={{
                                                    width: '100%', aspectRatio: '1', borderRadius: 16,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 16, fontWeight: isSelected ? 800 : cell.isToday ? 700 : 500,
                                                    background: isSelected
                                                        ? 'linear-gradient(135deg, #4caf6e, #2e9e54)'
                                                        : cell.isToday ? 'rgba(76,175,110,0.1)' : 'transparent',
                                                    color: isSelected ? '#fff' : cell.isToday ? '#4caf6e' : isSunday ? '#ef4444' : '#333',
                                                    border: cell.isToday && !isSelected ? '2px solid rgba(76,175,110,0.3)' : '2px solid transparent',
                                                    boxShadow: isSelected ? '0 6px 20px rgba(76,175,110,0.45)' : 'none',
                                                    cursor: cell.isPlaceholder ? 'default' : 'pointer',
                                                    opacity: cell.isPlaceholder ? 0 : 1,
                                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                }}
                                            >
                                                {!cell.isPlaceholder ? cell.day : ''}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Inline result info */}
                                {convLoading && (
                                    <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16 }}>
                                        <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid #eee', borderTopColor: '#4caf6e', animation: 'spin 0.8s linear infinite' }} />
                                        <span style={{ fontSize: 14, color: '#888', fontWeight: 600 }}>Menghitung Hijriah...</span>
                                    </div>
                                )}
                                {convResult && !convLoading && (
                                    <div style={{
                                        marginTop: 24, padding: '18px 22px',
                                        background: 'linear-gradient(135deg, rgba(76,175,110,0.06), rgba(212,175,55,0.08))',
                                        borderRadius: 20, border: '1px solid rgba(76,175,110,0.15)',
                                        display: 'flex', alignItems: 'center', gap: 16,
                                        opacity: convVisible ? 1 : 0,
                                        transform: convVisible ? 'translateY(0)' : 'translateY(8px)',
                                        transition: 'all 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
                                    }}>
                                        <div style={{ width: 48, height: 48, borderRadius: 14, background: '#0B2D18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 8px 16px rgba(11,45,24,0.2)' }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#D4AF37', fontVariationSettings: "'FILL' 1" }}>dark_mode</span>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontSize: 11, color: '#666', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>{convResult.dayName}</p>
                                            <p style={{ fontSize: 20, fontWeight: 900, color: '#0B2D18', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                                                {convResult.day} {convResult.monthName} {convResult.year} H
                                            </p>
                                        </div>
                                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#4caf6e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: 20 }}>done</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

            </div>
        </div>
    );
};
