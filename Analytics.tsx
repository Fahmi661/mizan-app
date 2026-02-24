/**
 * Analytics.tsx
 * ─────────────────────────────────────────────────────────────────
 * Halaman Analisis Ibadah dengan:
 *  - SVG Gauge murni (sweep 140° → 400°, tanpa rotate/conic-gradient)
 *  - Heatmap konsistensi
 *  - Bar chart komposisi sholat (data live dari useIbadahData)
 *  - Simpan skor ke Supabase (upsert)
 *  - Riwayat 7 / 30 hari dari Supabase
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useIbadahData } from '../hooks/useIbadahData';
import {
    upsertIbadahScore,
    fetchIbadahHistory,
    type IbadahScore,
} from '../services/supabaseService';

// ─── SVG Gauge Helper ──────────────────────────────────────────────────────────
const CX = 100;
const CY = 100;
const R = 80;
const START_ANGLE = 140; // degrees
const END_ANGLE = 400;   // degrees  (total sweep = 260°)
const CIRCUMFERENCE = (END_ANGLE - START_ANGLE) / 360 * (2 * Math.PI * R); // arc length

/** Convert polar angle (degrees) to cartesian point on the circle. */
function polarToXY(angleDeg: number, cx = CX, cy = CY, r = R) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
        x: cx + r * Math.cos(rad),
        y: cy + r * Math.sin(rad),
    };
}

/** Build an SVG arc path string between two angles. */
function arcPath(startAngle: number, endAngle: number, cx = CX, cy = CY, r = R) {
    const start = polarToXY(startAngle, cx, cy, r);
    const end = polarToXY(endAngle, cx, cy, r);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

// Precompute the full background arc path (reused every render)
const BG_ARC = arcPath(START_ANGLE, END_ANGLE);

// ─── Score badge helper ────────────────────────────────────────────────────────
function scoreBadge(score: number) {
    if (score >= 90) return { label: 'Sempurna ✨', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' };
    if (score >= 70) return { label: 'Baik 👍', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' };
    if (score >= 50) return { label: 'Cukup 🙂', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' };
    return { label: 'Perlu Ditingkatkan 💪', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' };
}

// ─── Props ─────────────────────────────────────────────────────────────────────
interface AnalyticsProps {
    onBack?: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export const Analytics: React.FC<AnalyticsProps> = ({ onBack }) => {
    const { tasks, analyticsData } = useIbadahData();

    // Gauge animation — only update dashoffset after mount
    const [displayScore, setDisplayScore] = useState(0);
    useEffect(() => {
        const t = setTimeout(() => setDisplayScore(analyticsData.totalScore), 120);
        return () => clearTimeout(t);
    }, [analyticsData.totalScore]);

    // Progress arc length based on current score (0-100 → 0-CIRCUMFERENCE)
    const progressArcLen = (displayScore / 100) * CIRCUMFERENCE;

    // ── History / Supabase state ──────────────────────────────────────────────
    const [historyDays, setHistoryDays] = useState<14 | 30>(14);
    const [history, setHistory] = useState<IbadahScore[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState<string | null>(null);

    // ── 14-Day Chart Data Generator ──
    const chartData = useMemo(() => {
        const result = [];
        const now = new Date();
        for (let i = 13; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayLabel = d.getDate().toString();

            const histItem = history.find(h => h.tanggal === dateStr);
            result.push({
                dateString: dateStr,
                dayLabel: dayLabel,
                score: histItem ? histItem.score : 0,
            });
        }
        return result;
    }, [history]);

    // ── Save state ────────────────────────────────────────────────────────────
    const [saveStatus, setSaveStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [saveMsg, setSaveMsg] = useState('');

    // ── Load history ──────────────────────────────────────────────────────────
    const loadHistory = useCallback(async (days: 14 | 30) => {
        setHistoryLoading(true);
        setHistoryError(null);
        try {
            const data = await fetchIbadahHistory(days);
            setHistory(data);
        } catch (e: any) {
            setHistoryError(e.message ?? 'Gagal memuat riwayat.');
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    useEffect(() => { loadHistory(historyDays); }, [historyDays, loadHistory]);

    // ── Save today's score ────────────────────────────────────────────────────
    const handleSave = async () => {
        setSaveStatus('loading');
        setSaveMsg('');
        try {
            const today = new Date().toISOString().split('T')[0];
            const sholatTasks = tasks.filter(t => t.type === 'Sholat Wajib');
            const sunnahTasks = tasks.filter(t => t.type === 'Ibadah Sunnah');
            const khususTasks = tasks.filter(t => t.type === 'Amalan Khusus');

            await upsertIbadahScore({
                user_id: 'default_user',
                tanggal: today,
                score: analyticsData.totalScore,
                subuh: !!tasks.find(t => t.id === 'subuh')?.checked,
                dzuhur: !!tasks.find(t => t.id === 'dzuhur')?.checked,
                ashar: !!tasks.find(t => t.id === 'ashar')?.checked,
                maghrib: !!tasks.find(t => t.id === 'maghrib')?.checked,
                isya: !!tasks.find(t => t.id === 'isya')?.checked,
                sunnah_done: sunnahTasks.filter(t => t.checked).length,
                amalan_done: khususTasks.filter(t => t.checked).length,
                tilawah_pages: tasks.find(t => t.id === 'tilawah')?.checked ? 20 : 0,
            });

            setSaveStatus('success');
            setSaveMsg('Skor hari ini berhasil disimpan! ✓');
            loadHistory(historyDays);
        } catch (e: any) {
            setSaveStatus('error');
            setSaveMsg(e.message ?? 'Gagal menyimpan. Coba lagi.');
        }
        setTimeout(() => setSaveStatus('idle'), 4000);
    };

    // ─── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="bg-[#FDFCF8] dark:bg-[#112116] text-[#0B2D18] dark:text-slate-200 flex-1 flex flex-col pb-4">

            {/* ── Sticky Header ── */}
            <header className="sticky top-0 z-50 bg-[#FDFCF8]/90 dark:bg-[#112116]/90 backdrop-blur-md pt-5 pb-3 border-b border-slate-100 dark:border-slate-800" style={{ padding: '20px var(--app-padding-x) 12px' }}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {onBack && (
                            <button
                                id="analytics-back-btn"
                                onClick={onBack}
                                className="p-2 -ml-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                            >
                                <span className="material-symbols-outlined">arrow_back</span>
                            </button>
                        )}
                        <div className="p-2 rounded-full bg-[#0B2D18] dark:bg-[#17cf54] text-white">
                            <span className="material-symbols-outlined text-xl">analytics</span>
                        </div>
                        <h1 className="text-xl font-extrabold tracking-tight dark:text-white">Analisis Ibadah</h1>
                    </div>
                    <button
                        id="analytics-refresh-btn"
                        onClick={() => loadHistory(historyDays)}
                        className="w-9 h-9 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm"
                        title="Refresh riwayat"
                    >
                        <span className="material-symbols-outlined text-sm">refresh</span>
                    </button>
                </div>
            </header>

            <main className="pt-5 space-y-6" style={{ padding: '20px var(--app-padding-x) 0' }}>

                {/* ════════════════════════════════════════════════════
            SECTION 1 — SVG GAUGE (PURE SVG, NO ROTATE HACK)
            ════════════════════════════════════════════════════ */}
                <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-50 dark:border-slate-700">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center mb-4">Skor Ibadah Hari Ini</p>

                    {/* SVG Gauge — viewBox 200×200, no transform on outer SVG */}
                    <div className="flex justify-center">
                        <svg
                            id="ibadah-gauge"
                            viewBox="0 0 200 200"
                            className="w-52 h-52"
                            aria-label={`Skor ibadah: ${analyticsData.totalScore} dari 100`}
                        >
                            {/* ── Background arc (grey) ── */}
                            <path
                                d={BG_ARC}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="14"
                                strokeLinecap="round"
                                className="text-slate-200 dark:text-slate-700"
                            />

                            {/* ── Progress arc (green) — animated via strokeDashoffset ── */}
                            <path
                                d={BG_ARC}
                                fill="none"
                                stroke="#17cf54"
                                strokeWidth="14"
                                strokeLinecap="round"
                                strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                                strokeDashoffset={CIRCUMFERENCE - progressArcLen}
                                style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' }}
                            />

                            {/* ── Score text — upright, centered, NOT rotated ── */}
                            <text
                                x={CX}
                                y={CY - 8}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fontSize="38"
                                fontWeight="800"
                                fill="currentColor"
                                className="text-[#0B2D18] dark:text-white"
                            >
                                {analyticsData.totalScore}
                            </text>

                            {/* ── Subtitle label ── */}
                            <text
                                x={CX}
                                y={CY + 24}
                                textAnchor="middle"
                                fontSize="11"
                                fontWeight="600"
                                fill="#17cf54"
                            >
                                / 100
                            </text>

                            {/* ── Start / End markers ── */}
                            <text
                                x={polarToXY(START_ANGLE, CX, CY, R + 18).x}
                                y={polarToXY(START_ANGLE, CX, CY, R + 18).y}
                                textAnchor="middle"
                                fontSize="9"
                                fill="#94a3b8"
                            >0</text>
                            <text
                                x={polarToXY(END_ANGLE, CX, CY, R + 18).x}
                                y={polarToXY(END_ANGLE, CX, CY, R + 18).y}
                                textAnchor="middle"
                                fontSize="9"
                                fill="#94a3b8"
                            >100</text>
                        </svg>
                    </div>

                    {/* Stats row below gauge */}
                    <div className="flex gap-4 mt-4">
                        <div className="flex-1 text-center bg-slate-50 dark:bg-slate-900 rounded-xl py-3">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">Sholat</p>
                            <p className="text-lg font-black dark:text-white">
                                {Object.values(analyticsData.sholatComposition).filter(v => v === 100).length}/5
                            </p>
                        </div>
                        <div className="flex-1 text-center bg-slate-50 dark:bg-slate-900 rounded-xl py-3">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">Kategori</p>
                            <p className="text-lg font-black dark:text-white">
                                {tasks.filter(t => t.checked).length}/{tasks.length}
                            </p>
                        </div>
                        <div className="flex-1 text-center bg-slate-50 dark:bg-slate-900 rounded-xl py-3">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">Status</p>
                            <p className="text-xs font-black text-[#17cf54] mt-1">
                                {scoreBadge(analyticsData.totalScore).label}
                            </p>
                        </div>
                    </div>
                </section>

                {/* ════════════════════════════════════════════════════
            SECTION 2 — KOMPOSISI SHOLAT (LIVE DATA)
            ════════════════════════════════════════════════════ */}
                <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-50 dark:border-slate-700">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Komposisi Sholat</p>

                    {/* Segmented bar */}
                    <div className="flex h-8 w-full rounded-full overflow-hidden gap-0.5 mb-4">
                        {(
                            [
                                { key: 'Subuh', color: 'bg-sky-400', val: analyticsData.sholatComposition.Subuh },
                                { key: 'Dzuhur', color: 'bg-amber-400', val: analyticsData.sholatComposition.Dzuhur },
                                { key: 'Ashar', color: 'bg-orange-400', val: analyticsData.sholatComposition.Ashar },
                                { key: 'Maghrib', color: 'bg-rose-400', val: analyticsData.sholatComposition.Maghrib },
                                { key: 'Isya', color: 'bg-indigo-400', val: analyticsData.sholatComposition.Isya },
                            ] as const
                        ).map(({ key, color, val }) => (
                            <div
                                key={key}
                                className={`flex-1 flex items-center justify-center text-[10px] font-bold text-white transition-all ${val === 100 ? color : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}
                            >
                                {key.slice(0, 1)}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-5 gap-2 text-center">
                        {(
                            [
                                { label: 'Subuh', val: analyticsData.sholatComposition.Subuh },
                                { label: 'Dzuhur', val: analyticsData.sholatComposition.Dzuhur },
                                { label: 'Ashar', val: analyticsData.sholatComposition.Ashar },
                                { label: 'Maghrib', val: analyticsData.sholatComposition.Maghrib },
                                { label: 'Isya', val: analyticsData.sholatComposition.Isya },
                            ] as const
                        ).map(({ label, val }) => (
                            <div key={label}>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">{label}</p>
                                <p className={`text-sm font-extrabold transition-all ${val === 100 ? 'text-[#17cf54]' : 'text-slate-400'}`}>
                                    {val}%
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ════════════════════════════════════════════════════
            SECTION 3 — KONSISTENSI 14 HARI (BAR CHART)
            ════════════════════════════════════════════════════ */}
                <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-50 dark:border-slate-700">
                    <div className="flex justify-between items-center mb-6">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Konsistensi 14 Hari</p>
                    </div>
                    <div className="relative h-40 mt-4">
                        {/* Reference Lines (Y-Axis) */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none z-0">
                            <div className="w-full border-t border-dashed border-slate-200 dark:border-slate-700 flex justify-end">
                                <span className="text-[10px] text-slate-400 -mt-2 bg-white dark:bg-slate-800 pl-2 leading-none">100%</span>
                            </div>
                            <div className="w-full border-t border-dashed border-slate-200 dark:border-slate-700 flex justify-end">
                                <span className="text-[10px] text-slate-400 -mt-2 bg-white dark:bg-slate-800 pl-2 leading-none">50%</span>
                            </div>
                            <div className="w-full border-t border-slate-200 dark:border-slate-700 flex justify-end">
                                <span className="text-[10px] text-slate-400 -mt-2 bg-white dark:bg-slate-800 pl-2 leading-none">0%</span>
                            </div>
                        </div>

                        <div className="absolute inset-0 flex justify-between items-end gap-1 sm:gap-2 z-10 pt-4 pb-[1px] pr-8">
                            {chartData.map((day, i) => (
                                <div key={i} className="group relative flex-1 flex flex-col justify-end items-center h-full active:bg-slate-50 dark:active:bg-slate-700/50 rounded-lg cursor-pointer transition-colors pt-2">
                                    <div
                                        className={`w-full max-w-[14px] rounded-t-md transition-all duration-300 ${day.score > 0 ? 'bg-[#17cf54]' : 'bg-slate-200 dark:bg-slate-700 min-h-[4px]'
                                            }`}
                                        style={{ height: `${Math.max((day.score / 100) * 100, 4)}%` }}
                                    ></div>
                                    <div className="absolute bottom-full mb-1 px-1.5 py-0.5 bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-[10px] font-bold rounded opacity-0 group-active:opacity-100 transition-opacity pointer-events-none shadow-md z-20 whitespace-nowrap">
                                        {day.score}%
                                    </div>
                                    {/* X-Axis Labels */}
                                    <span className="absolute top-full mt-1.5 text-[10px] text-slate-500">{day.dayLabel}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Spacing for labels */}
                    <div className="h-6 mt-2"></div>
                </section>

                {/* ════════════════════════════════════════════════════
            SECTION 4 — SIMPAN KE SUPABASE
            ════════════════════════════════════════════════════ */}
                <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-50 dark:border-slate-700">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Simpan Progres</p>

                    <button
                        id="save-score-btn"
                        onClick={handleSave}
                        disabled={saveStatus === 'loading'}
                        className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${saveStatus === 'loading'
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-wait'
                            : saveStatus === 'success'
                                ? 'bg-emerald-500 text-white'
                                : saveStatus === 'error'
                                    ? 'bg-red-500 text-white'
                                    : 'bg-[#17cf54] text-white hover:bg-[#15b84c] shadow-lg shadow-[#17cf54]/30'
                            }`}
                    >
                        {saveStatus === 'loading' && (
                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                        )}
                        <span className="material-symbols-outlined text-lg">
                            {saveStatus === 'success' ? 'check_circle' : saveStatus === 'error' ? 'error' : 'cloud_upload'}
                        </span>
                        {saveStatus === 'loading' ? 'Menyimpan…'
                            : saveStatus === 'success' ? 'Tersimpan!'
                                : saveStatus === 'error' ? 'Gagal — Coba Lagi'
                                    : `Simpan Skor Hari Ini (${analyticsData.totalScore})`}
                    </button>

                    {saveMsg && (
                        <p className={`text-xs font-medium text-center mt-2 ${saveStatus === 'error' ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {saveMsg}
                        </p>
                    )}
                </section>

                {/* ════════════════════════════════════════════════════
            SECTION 5 — RIWAYAT DARI SUPABASE
            ════════════════════════════════════════════════════ */}
                <section className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm border border-slate-50 dark:border-slate-700">
                    {/* Tab header */}
                    <div className="flex border-b border-slate-100 dark:border-slate-700">
                        {([14, 30] as const).map(d => (
                            <button
                                key={d}
                                id={`history-tab-${d}`}
                                onClick={() => setHistoryDays(d)}
                                className={`flex-1 py-3 text-sm font-bold transition-colors ${historyDays === d
                                    ? 'text-[#17cf54] border-b-2 border-[#17cf54]'
                                    : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                {d} Hari Terakhir
                            </button>
                        ))}
                    </div>

                    <div className="p-4 min-h-[120px]">
                        {/* Loading */}
                        {historyLoading && (
                            <div className="flex flex-col items-center justify-center py-8 gap-3">
                                <svg className="w-8 h-8 animate-spin text-[#17cf54]" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                                <p className="text-sm text-slate-400">Memuat riwayat…</p>
                            </div>
                        )}

                        {/* Error */}
                        {!historyLoading && historyError && (
                            <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                                <span className="material-symbols-outlined text-3xl text-red-400">wifi_off</span>
                                <p className="text-sm font-bold text-red-500">Gagal memuat riwayat</p>
                                <p className="text-xs text-slate-400 max-w-xs">{historyError}</p>
                                <button
                                    onClick={() => loadHistory(historyDays)}
                                    className="mt-2 text-xs font-bold text-[#17cf54] underline"
                                >
                                    Coba lagi
                                </button>
                            </div>
                        )}

                        {/* Empty state */}
                        {!historyLoading && !historyError && history.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                                <span className="material-symbols-outlined text-3xl text-slate-300">history</span>
                                <p className="text-sm font-bold text-slate-400">Belum ada riwayat</p>
                                <p className="text-xs text-slate-400">Simpan skor hari ini untuk mulai mencatat.</p>
                            </div>
                        )}

                        {/* History rows */}
                        {!historyLoading && !historyError && history.length > 0 && (
                            <div className="space-y-2">
                                {history.map(row => {
                                    const sholatCount = [row.subuh, row.dzuhur, row.ashar, row.maghrib, row.isya].filter(Boolean).length;
                                    const badge = scoreBadge(row.score);
                                    const dateLabel = new Date(row.tanggal + 'T00:00:00').toLocaleDateString('id-ID', {
                                        weekday: 'short', day: 'numeric', month: 'short',
                                    });
                                    return (
                                        <div
                                            key={row.id ?? row.tanggal}
                                            className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl"
                                        >
                                            {/* Score circle */}
                                            <div
                                                className="w-12 h-12 rounded-full flex items-center justify-center font-black text-base shrink-0"
                                                style={{
                                                    background: `conic-gradient(#17cf54 ${row.score * 3.6}deg, #e2e8f0 0deg)`,
                                                }}
                                            >
                                                <div className="w-9 h-9 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center text-xs font-black">
                                                    {row.score}
                                                </div>
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold dark:text-white truncate">{dateLabel}</p>
                                                <p className="text-[11px] text-slate-400">
                                                    Sholat {sholatCount}/5 &nbsp;·&nbsp;
                                                    Sunnah {row.sunnah_done ?? 0} &nbsp;·&nbsp;
                                                    Amalan {row.amalan_done ?? 0}
                                                </p>
                                            </div>

                                            {/* Badge */}
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${badge.color}`}>
                                                {badge.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>

                {/* ════════════════════════════════════════════════════
            SECTION 6 — INSIGHT CARDS
            ════════════════════════════════════════════════════ */}
                <section className="space-y-3 pb-6">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Insight</p>
                    <div className="bg-[#17cf54]/5 dark:bg-[#17cf54]/10 border-l-4 border-[#17cf54] p-4 rounded-r-xl">
                        <div className="flex gap-3 items-start">
                            <span className="material-symbols-outlined text-[#17cf54] text-xl mt-0.5">lightbulb</span>
                            <div>
                                <h4 className="text-sm font-bold mb-0.5 dark:text-white">Tips Meningkatkan Skor</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    {analyticsData.sholatComposition.Dzuhur < 100
                                        ? 'Sholat Dzuhur Anda belum tercatat hari ini. Segera tunaikan untuk menambah skor!'
                                        : 'Semua sholat wajib tercatat! Tingkatkan ibadah sunnah untuk menyempurnakannya.'}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-[#D4AF37]/5 dark:bg-[#D4AF37]/10 border-l-4 border-[#D4AF37] p-4 rounded-r-xl">
                        <div className="flex gap-3 items-start">
                            <span className="material-symbols-outlined text-[#D4AF37] text-xl mt-0.5">star</span>
                            <div>
                                <h4 className="text-sm font-bold mb-0.5 dark:text-white">Target Ramadan</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Skor harian Anda {analyticsData.totalScore}/100.
                                    {analyticsData.totalScore >= 80
                                        ? ' Luar biasa — pertahankan hingga akhir Ramadan! 🌙'
                                        : ' Targetkan minimal 80 untuk lencana "Ramadan Pro". Tetap semangat!'}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

            </main>
        </div>
    );
};
