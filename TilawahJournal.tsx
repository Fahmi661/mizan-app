/**
 * TilawahJournal.tsx — Tilawah Journal with Al-Quran Reader
 * ──────────────────────────────────────────────────────────────
 * Features:
 *  - Real-time progress ring, estimasi khatam, motivasi
 *  - Custom surah dropdown with search
 *  - Scrollable Juz 1-30 selector with auto-scroll
 *  - Save progress to localStorage with history
 *  - Quran reader via api.alquran.cloud (Arabic + IDN)
 *  - Back button returns to previous screen
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Bookmark } from 'lucide-react';
import { useLastRead } from '../context/LastReadContext';

interface TilawahJournalProps {
    onBack: () => void;
}

interface Ayah {
    number: number;
    numberInSurah: number;
    text: string;
    translation?: string;
}

interface SurahMeta {
    number: number;
    name: string;
    englishName: string;
    englishNameTranslation: string;
    numberOfAyahs: number;
    revelationType: string;
}

interface HistoryEntry {
    id: number;
    tanggal: string;
    hari_ramadan: string;
    surah: string;
    juz: number;
    halaman: number;
    tambahan_hari_ini: number;
    waktu_simpan: string;
}

const TOTAL_SURAHS = 114;
const TOTAL_PAGES = 604;
const RAMADAN_DAYS = 30;

// Surah names list
const SURAH_NAMES = [
    'Al-Fatihah', 'Al-Baqarah', 'Ali Imran', 'An-Nisa', 'Al-Maidah', 'Al-Anam', 'Al-Araf', 'Al-Anfal', 'At-Tawbah', 'Yunus',
    'Hud', 'Yusuf', 'Ar-Ra\'d', 'Ibrahim', 'Al-Hijr', 'An-Nahl', 'Al-Isra', 'Al-Kahf', 'Maryam', 'Taha',
    'Al-Anbiya', 'Al-Hajj', 'Al-Mu\'minun', 'An-Nur', 'Al-Furqan', 'Ash-Shu\'ara', 'An-Naml', 'Al-Qasas', 'Al-Ankabut', 'Ar-Rum',
    'Luqman', 'As-Sajdah', 'Al-Ahzab', 'Saba', 'Fatir', 'Ya-Sin', 'As-Saffat', 'Sad', 'Az-Zumar', 'Ghafir',
    'Fussilat', 'Ash-Shura', 'Az-Zukhruf', 'Ad-Dukhan', 'Al-Jathiyah', 'Al-Ahqaf', 'Muhammad', 'Al-Fath', 'Al-Hujurat', 'Qaf',
    'Adh-Dhariyat', 'At-Tur', 'An-Najm', 'Al-Qamar', 'Ar-Rahman', 'Al-Waqiah', 'Al-Hadid', 'Al-Mujadila', 'Al-Hashr', 'Al-Mumtahanah',
    'As-Saff', 'Al-Jumuah', 'Al-Munafiqun', 'At-Taghabun', 'At-Talaq', 'At-Tahrim', 'Al-Mulk', 'Al-Qalam', 'Al-Haqqah', 'Al-Ma\'arij',
    'Nuh', 'Al-Jinn', 'Al-Muzzammil', 'Al-Muddaththir', 'Al-Qiyamah', 'Al-Insan', 'Al-Mursalat', 'An-Naba', 'An-Nazi\'at', 'Abasa',
    'At-Takwir', 'Al-Infitar', 'Al-Mutaffifin', 'Al-Inshiqaq', 'Al-Buruj', 'At-Tariq', 'Al-A\'la', 'Al-Ghashiyah', 'Al-Fajr', 'Al-Balad',
    'Ash-Shams', 'Al-Lail', 'Ad-Duha', 'Ash-Sharh', 'At-Tin', 'Al-Alaq', 'Al-Qadr', 'Al-Bayyinah', 'Az-Zalzalah', 'Al-Adiyat',
    'Al-Qariah', 'At-Takathur', 'Al-Asr', 'Al-Humazah', 'Al-Fil', 'Quraish', 'Al-Ma\'un', 'Al-Kawthar', 'Al-Kafirun', 'An-Nasr',
    'Al-Masad', 'Al-Ikhlas', 'Al-Falaq', 'An-Nas'
];

// Surah Arabic names
const SURAH_ARABIC = [
    'الفاتحة', 'البقرة', 'آل عمران', 'النساء', 'المائدة', 'الأنعام', 'الأعراف', 'الأنفال', 'التوبة', 'يونس',
    'هود', 'يوسف', 'الرعد', 'إبراهيم', 'الحجر', 'النحل', 'الإسراء', 'الكهف', 'مريم', 'طه',
    'الأنبياء', 'الحج', 'المؤمنون', 'النور', 'الفرقان', 'الشعراء', 'النمل', 'القصص', 'العنكبوت', 'الروم',
    'لقمان', 'السجدة', 'الأحزاب', 'سبأ', 'فاطر', 'يس', 'الصافات', 'ص', 'الزمر', 'غافر',
    'فصلت', 'الشورى', 'الزخرف', 'الدخان', 'الجاثية', 'الأحقاف', 'محمد', 'الفتح', 'الحجرات', 'ق',
    'الذاريات', 'الطور', 'النجم', 'القمر', 'الرحمن', 'الواقعة', 'الحديد', 'المجادلة', 'الحشر', 'الممتحنة',
    'الصف', 'الجمعة', 'المنافقون', 'التغابن', 'الطلاق', 'التحريم', 'الملك', 'القلم', 'الحاقة', 'المعارج',
    'نوح', 'الجن', 'المزمل', 'المدثر', 'القيامة', 'الإنسان', 'المرسلات', 'النبأ', 'النازعات', 'عبس',
    'التكوير', 'الانفطار', 'المطففين', 'الانشقاق', 'البروج', 'الطارق', 'الأعلى', 'الغاشية', 'الفجر', 'البلد',
    'الشمس', 'الليل', 'الضحى', 'الشرح', 'التين', 'العلق', 'القدر', 'البينة', 'الزلزلة', 'العاديات',
    'القارعة', 'التكاثر', 'العصر', 'الهمزة', 'الفيل', 'قريش', 'الماعون', 'الكوثر', 'الكافرون', 'النصر',
    'المسد', 'الإخلاص', 'الفلق', 'الناس'
];

const JUZ_MAPPING = [
    { page: 1, surah: 1 }, { page: 22, surah: 2 }, { page: 42, surah: 2 }, { page: 62, surah: 3 }, { page: 82, surah: 4 },
    { page: 102, surah: 4 }, { page: 122, surah: 5 }, { page: 142, surah: 6 }, { page: 162, surah: 7 }, { page: 182, surah: 8 },
    { page: 202, surah: 9 }, { page: 222, surah: 11 }, { page: 242, surah: 12 }, { page: 262, surah: 15 }, { page: 282, surah: 17 },
    { page: 302, surah: 18 }, { page: 322, surah: 21 }, { page: 342, surah: 23 }, { page: 362, surah: 25 }, { page: 382, surah: 27 },
    { page: 402, surah: 29 }, { page: 422, surah: 33 }, { page: 442, surah: 36 }, { page: 462, surah: 39 }, { page: 482, surah: 41 },
    { page: 502, surah: 46 }, { page: 522, surah: 51 }, { page: 542, surah: 58 }, { page: 562, surah: 67 }, { page: 582, surah: 78 }
];

function getJuzFromPage(page: number): number {
    for (let i = JUZ_MAPPING.length - 1; i >= 0; i--) {
        if (page >= JUZ_MAPPING[i].page) return i + 1;
    }
    return 1;
}

function formatDate(): string {
    return new Date().toLocaleDateString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'short', year: 'numeric'
    });
}

function formatTime(): string {
    return new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
    });
}

export const TilawahJournal: React.FC<TilawahJournalProps> = ({ onBack }) => {
    // ── State ────────────────────────────────────────────────────
    const { updateLastRead } = useLastRead();
    const [currentSurah, setCurrentSurah] = useState<number>(() => {
        const saved = localStorage.getItem('posisi_surah_terakhir');
        return saved ? parseInt(saved, 10) : 1;
    });
    const [currentPage, setCurrentPage] = useState<number>(() => {
        try {
            const pos = localStorage.getItem('tilawah_posisi');
            if (pos) return JSON.parse(pos).halaman || 284;
        } catch { /* */ }
        return 284;
    });
    const [selectedJuz, setSelectedJuz] = useState<number>(() => getJuzFromPage(284));
    const [todayAdded, setTodayAdded] = useState<number>(() => {
        try {
            const t = localStorage.getItem('tilawah_today');
            if (t) {
                const data = JSON.parse(t);
                if (data.date === new Date().toDateString()) return data.added || 0;
            }
        } catch { /* */ }
        return 0;
    });

    // Dropdown
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [surahSearch, setSurahSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Juz scroller
    const juzScrollRef = useRef<HTMLDivElement>(null);

    // History
    const [history, setHistory] = useState<HistoryEntry[]>(() => {
        try {
            const h = localStorage.getItem('tilawah_history');
            return h ? JSON.parse(h) : [];
        } catch { return []; }
    });

    // Save state
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Delete confirm
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

    // Copy state
    const [copiedAyah, setCopiedAyah] = useState<number | null>(null);

    // Reader
    const [readerOpen, setReaderOpen] = useState(false);
    const [ayahs, setAyahs] = useState<Ayah[]>([]);
    const [surahMeta, setSurahMeta] = useState<SurahMeta | null>(null);

    // Sync Logic
    const [pagePulse, setPagePulse] = useState(false);
    const triggerPagePulse = () => {
        setPagePulse(true);
        setTimeout(() => setPagePulse(false), 600);
    };

    const handleJuzChange = (juz: number) => {
        const mapping = JUZ_MAPPING[juz - 1];
        if (mapping) {
            setSelectedJuz(juz);
            setCurrentPage(mapping.page);
            setCurrentSurah(mapping.surah);
            triggerPagePulse();

            // Save temporary position to localStorage
            localStorage.setItem('tilawah_posisi', JSON.stringify({
                surah: SURAH_NAMES[mapping.surah - 1],
                juz: juz,
                halaman: mapping.page
            }));
            localStorage.setItem('posisi_surah_terakhir', String(mapping.surah));
        }
    };
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ── Derived real-time values ──────────────────────────────────
    const progressPercent = Math.round((currentPage / TOTAL_PAGES) * 100);
    const progressRingCircumference = 2 * Math.PI * 35;
    const progressRingOffset = progressRingCircumference - (progressPercent / 100) * progressRingCircumference;
    const computedJuz = getJuzFromPage(currentPage);

    // Ramadan day estimate (use current day in Ramadan, fallback guess)
    const ramadanDay = useMemo(() => {
        // Try to get from stored hijri data
        try {
            const keys = Object.keys(localStorage).filter(k => k.startsWith('prayer_'));
            if (keys.length > 0) {
                const latest = localStorage.getItem(keys[keys.length - 1]);
                if (latest) {
                    const data = JSON.parse(latest);
                    const d = parseInt(data?.date?.hijri?.day || '0', 10);
                    if (d > 0) return d;
                }
            }
        } catch { /* */ }
        return 4; // fallback
    }, []);

    const remainingPages = TOTAL_PAGES - currentPage;
    const remainingDays = Math.max(1, RAMADAN_DAYS - ramadanDay);
    const pagesPerDay = Math.ceil(remainingPages / remainingDays);
    const targetPerDay = Math.ceil(TOTAL_PAGES / RAMADAN_DAYS); // ~20

    // Average logic
    const averagePerDay = ramadanDay > 0 ? Math.round(currentPage / ramadanDay) : 0;
    const estimasiHari = averagePerDay > 0 ? Math.ceil(remainingPages / averagePerDay) : remainingDays;
    const estimasiKeRamadan = Math.min(RAMADAN_DAYS, ramadanDay + estimasiHari);

    // Motivation status
    let motivationText = '';
    let motivationColor = '';
    if (averagePerDay >= targetPerDay) {
        motivationText = 'On track! ✓';
        motivationColor = '#4cae6e';
    } else if (averagePerDay >= targetPerDay * 0.6) {
        motivationText = `Butuh +${pagesPerDay} hal/hari`;
        motivationColor = '#D4AF37';
    } else {
        motivationText = 'Perlu usaha lebih';
        motivationColor = '#e57373';
    }

    // ── Auto-update juz when page changes ────────────────────────
    useEffect(() => {
        setSelectedJuz(computedJuz);
    }, [computedJuz]);

    // Auto-scroll juz pill into view
    useEffect(() => {
        if (juzScrollRef.current) {
            const pill = juzScrollRef.current.querySelector(`[data-juz="${selectedJuz}"]`);
            if (pill) {
                (pill as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        }
    }, [selectedJuz]);

    // ── Close dropdown on click outside ──────────────────────────
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
                setSurahSearch('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── Filtered surah list ──────────────────────────────────────
    const filteredSurahs = useMemo(() => {
        if (!surahSearch.trim()) return SURAH_NAMES.map((n, i) => ({ index: i, name: n }));
        const q = surahSearch.toLowerCase();
        return SURAH_NAMES.map((n, i) => ({ index: i, name: n }))
            .filter(s => s.name.toLowerCase().includes(q) || SURAH_ARABIC[s.index].includes(surahSearch) || `${s.index + 1}`.includes(q));
    }, [surahSearch]);

    // ── Page controls ────────────────────────────────────────────
    const setPageWithTracking = (newPage: number) => {
        const clamped = Math.min(TOTAL_PAGES, Math.max(1, newPage));
        const diff = clamped - currentPage;
        if (diff !== 0) {
            triggerPagePulse();
            if (diff > 0) {
                setTodayAdded(prev => {
                    const next = prev + diff;
                    localStorage.setItem('tilawah_today', JSON.stringify({ date: new Date().toDateString(), added: next }));
                    return next;
                });
            }
            setCurrentPage(clamped);
            // Save position
            localStorage.setItem('tilawah_posisi', JSON.stringify({
                surah: SURAH_NAMES[currentSurah - 1],
                juz: getJuzFromPage(clamped),
                halaman: clamped
            }));
        }
    };

    const incrementPage = (amount: number) => {
        setPageWithTracking(currentPage + amount);
    };

    // ── Save & History ───────────────────────────────────────────
    const handleSave = () => {
        setSaving(true);
        setTimeout(() => {
            const entry: HistoryEntry = {
                id: Date.now(),
                tanggal: formatDate(),
                hari_ramadan: `${ramadanDay} Ramadan 1447 H`,
                surah: SURAH_NAMES[currentSurah - 1],
                juz: computedJuz,
                halaman: currentPage,
                tambahan_hari_ini: todayAdded,
                waktu_simpan: formatTime(),
            };
            const newHistory = [entry, ...history].slice(0, 7);
            setHistory(newHistory);
            localStorage.setItem('tilawah_history', JSON.stringify(newHistory));
            localStorage.setItem('tilawah_posisi', JSON.stringify({
                surah: SURAH_NAMES[currentSurah - 1],
                juz: computedJuz,
                halaman: currentPage
            }));
            localStorage.setItem('posisi_surah_terakhir', String(currentSurah));

            // Sync with Supabase via Context
            updateLastRead(currentSurah, 1, SURAH_NAMES[currentSurah - 1]);

            setSaving(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 1500);
        }, 800);
    };

    const deleteHistory = (id: number) => {
        const newHistory = history.filter(h => h.id !== id);
        setHistory(newHistory);
        localStorage.setItem('tilawah_history', JSON.stringify(newHistory));
        setDeleteConfirmId(null);
    };

    const copyAyah = async (arab: string, translation: string, surahName: string, ayahNum: number) => {
        const text = `${arab}\n\n${translation}\n\n— ${surahName} : ${ayahNum}`;
        try {
            await navigator.clipboard.writeText(text);
            setCopiedAyah(ayahNum);
            setTimeout(() => setCopiedAyah(null), 1500);
        } catch { /* */ }
    };

    // ── Fetch surah for reader ───────────────────────────────────
    const fetchSurah = useCallback(async (surahNum: number) => {
        setLoading(true);
        setError(null);
        const cacheKey = `quran_surah_${surahNum}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try {
                const data = JSON.parse(cached);
                setSurahMeta(data.meta);
                setAyahs(data.ayahs);
                setLoading(false);
                return;
            } catch { /* re-fetch */ }
        }
        try {
            const [arabicRes, translationRes] = await Promise.all([
                fetch(`/api/quran/v1/surah/${surahNum}`),
                fetch(`/api/quran/v1/surah/${surahNum}/id.indonesian`)
            ]);
            if (!arabicRes.ok || !translationRes.ok) throw new Error('Gagal memuat data surah');
            const [arabicJson, translationJson] = await Promise.all([arabicRes.json(), translationRes.json()]);
            const arabicData = arabicJson.data;
            const translationData = translationJson.data;
            const meta: SurahMeta = {
                number: arabicData.number, name: arabicData.name,
                englishName: arabicData.englishName, englishNameTranslation: arabicData.englishNameTranslation,
                numberOfAyahs: arabicData.numberOfAyahs, revelationType: arabicData.revelationType,
            };
            const mergedAyahs: Ayah[] = arabicData.ayahs.map((a: any, i: number) => ({
                number: a.number, numberInSurah: a.numberInSurah, text: a.text,
                translation: translationData.ayahs[i]?.text || '',
            }));
            setSurahMeta(meta);
            setAyahs(mergedAyahs);
            localStorage.setItem(cacheKey, JSON.stringify({ meta, ayahs: mergedAyahs }));
            localStorage.setItem('posisi_surah_terakhir', String(surahNum));
        } catch (e: any) {
            setError(e.message || 'Gagal memuat. Coba lagi');
        } finally {
            setLoading(false);
        }
    }, []);

    const openReader = (surahNum?: number) => {
        const s = surahNum || currentSurah;
        setCurrentSurah(s);
        setReaderOpen(true);
        fetchSurah(s);
    };

    const goToSurah = (num: number) => {
        if (num < 1 || num > TOTAL_SURAHS) return;
        setCurrentSurah(num);
        fetchSurah(num);
        const el = document.getElementById('tilawah-reader-content');
        if (el) el.scrollTop = 0;
    };

    // ══════════════════════════════════════════════════════════════
    // QURAN READER VIEW
    // ══════════════════════════════════════════════════════════════
    if (readerOpen) {
        return (
            <div className="bg-[#f9f7f2] dark:bg-[#151d18] min-h-screen flex flex-col">
                <header className="flex items-center bg-[#f9f7f2]/80 dark:bg-[#151d18]/80 backdrop-blur-md px-4 py-3 sticky top-0 z-50 justify-between border-b border-slate-100 dark:border-slate-800">
                    <button onClick={() => setReaderOpen(false)} className="flex w-10 h-10 items-center justify-center bg-white dark:bg-slate-800 rounded-full shadow-sm active:scale-95 transition-transform">
                        <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">chevron_left</span>
                    </button>
                    <div className="text-center flex-1 min-w-0 mx-3">
                        <h1 className="text-sm font-bold tracking-tight text-slate-800 dark:text-white truncate">
                            {surahMeta ? surahMeta.englishName : 'Memuat...'}
                        </h1>
                        {surahMeta && (
                            <p className="text-[10px] text-slate-500 font-medium">{surahMeta.englishNameTranslation} • {surahMeta.numberOfAyahs} Ayat</p>
                        )}
                    </div>
                    <div className="flex w-10 h-10 items-center justify-center bg-[#D4AF37]/10 text-[#D4AF37] rounded-full">
                        <span className="material-symbols-outlined">auto_stories</span>
                    </div>
                </header>

                <main id="tilawah-reader-content" className="flex-1 overflow-y-auto pb-[200px]">
                    {loading && (
                        <div className="p-6 space-y-6">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="animate-pulse space-y-3">
                                    <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-lg w-3/4 mx-auto" />
                                    <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full" />
                                    <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-5/6" />
                                </div>
                            ))}
                        </div>
                    )}
                    {error && (
                        <div className="flex flex-col items-center justify-center py-20 px-6">
                            <span className="material-symbols-outlined text-5xl text-red-400 mb-4">error_outline</span>
                            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-4">{error}</p>
                            <button onClick={() => fetchSurah(currentSurah)} className="flex items-center gap-2 bg-[#4cae6e] text-white px-5 py-2.5 rounded-full text-sm font-bold active:scale-95 transition-transform">
                                <span className="material-symbols-outlined text-lg">refresh</span>
                                Coba Lagi
                            </button>
                        </div>
                    )}
                    {!loading && !error && ayahs.length > 0 && (
                        <div className="p-4 space-y-3">
                            <div className="text-center py-4 mb-2">
                                <p className="font-arabic text-3xl text-[#0B2D18] dark:text-[#D4AF37] mb-1">{surahMeta?.name}</p>
                                <p className="text-xs text-slate-500 font-medium">{surahMeta?.revelationType === 'Meccan' ? 'Makkiyyah' : 'Madaniyyah'}</p>
                            </div>
                            {currentSurah !== 9 && currentSurah !== 1 && (
                                <div className="text-center py-4">
                                    <p className="font-arabic text-xl text-[#0B2D18] dark:text-white/90 leading-loose">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
                                </div>
                            )}
                            {ayahs.map((ayah) => (
                                <div key={ayah.numberInSurah} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center justify-between mb-2">
                                        <div style={{
                                            position: 'relative', width: 30, height: 30,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <svg width="30" height="30" viewBox="0 0 32 32" style={{ position: 'absolute', top: 0, left: 0 }}>
                                                <path
                                                    d="M16,0 L21,5 L27,5 L27,11 L32,16 L27,21 L27,27 L21,27 L16,32 L11,27 L5,27 L5,21 L0,16 L5,11 L5,5 L11,5 Z"
                                                    fill="rgba(212,175,55,0.05)"
                                                    stroke="#D4AF37"
                                                    strokeWidth="1.8"
                                                    strokeLinejoin="round"
                                                />
                                            </svg>
                                            <span style={{
                                                position: 'relative', zIndex: 1,
                                                fontSize: ayah.numberInSurah > 99 ? 8 : 9,
                                                fontWeight: 800,
                                                color: '#B8860B',
                                                fontFamily: "'Outfit', sans-serif"
                                            }}>
                                                {ayah.numberInSurah}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="font-arabic text-[22px] text-[#0B2D18] dark:text-white leading-[2.2] mb-4 text-center" dir="rtl" style={{ wordSpacing: '2px' }}>
                                        {ayah.text}
                                    </p>
                                    <div className="border-t border-slate-100 dark:border-slate-700 pt-3 mt-3">
                                        <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">{ayah.translation}</p>
                                    </div>
                                    <div className="flex items-center mt-4 pt-3 border-t border-slate-50 dark:border-slate-700/50">
                                        <button
                                            onClick={() => copyAyah(ayah.text, ayah.translation || '', SURAH_NAMES[currentSurah - 1], ayah.numberInSurah)}
                                            className="flex-1 flex items-center justify-center py-2 active:bg-slate-50 dark:active:bg-slate-700 rounded-lg transition-colors group"
                                        >
                                            <span className={`material-icons-outlined text-lg transition-colors ${copiedAyah === ayah.numberInSurah ? 'text-[#4cae6e]' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                                {copiedAyah === ayah.numberInSurah ? 'check' : 'content_copy'}
                                            </span>
                                        </button>
                                        <button className="flex-1 flex items-center justify-center py-2 active:bg-slate-50 dark:active:bg-slate-700 rounded-lg transition-colors group">
                                            <Bookmark size={18} className="text-slate-400 group-hover:text-[#4cae6e]" />
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-3 text-right font-bold">— ({currentSurah}:{ayah.numberInSurah})</p>
                                </div>
                            ))}
                        </div>
                    )}
                </main>

                {/* Surah Navigation */}
                <div
                    className="fixed inset-x-0 bg-[#FDFBF4] dark:bg-[#151d18] border-t border-slate-200 dark:border-slate-800 p-4 z-40 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
                    style={{ bottom: 'calc(80px + env(safe-area-inset-bottom))' }}
                >
                    <div className="flex gap-3 max-w-md mx-auto">
                        <button onClick={() => goToSurah(currentSurah - 1)} disabled={currentSurah <= 1}
                            className={`flex-1 py-3.5 rounded-full text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${currentSurah <= 1 ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 border border-slate-200 dark:border-slate-700'}`}>
                            <span className="material-symbols-outlined text-lg">arrow_back</span>Prev
                        </button>
                        <button onClick={() => goToSurah(currentSurah + 1)} disabled={currentSurah >= TOTAL_SURAHS}
                            className={`flex-1 py-3.5 rounded-full text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${currentSurah >= TOTAL_SURAHS ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-gradient-to-r from-[#4cae6e] to-[#1a4a2a] text-white shadow-lg shadow-[#4cae6e]/20'}`}>
                            Next Surah<span className="material-symbols-outlined text-lg">arrow_forward</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ══════════════════════════════════════════════════════════════
    // MAIN TILAWAH JOURNAL VIEW
    // ══════════════════════════════════════════════════════════════
    return (
        <div className="bg-[#f9f7f2] dark:bg-[#151d18] min-h-screen flex flex-col">
            {/* Header */}
            <header className="flex items-center bg-[#f9f7f2]/80 dark:bg-[#151d18]/80 backdrop-blur-md px-4 py-3 sticky top-0 z-50 justify-between">
                <button onClick={onBack} className="flex w-10 h-10 items-center justify-center bg-white dark:bg-slate-800 rounded-full shadow-sm active:scale-95 transition-transform">
                    <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">chevron_left</span>
                </button>
                <h1 className="text-base font-bold tracking-tight text-slate-800 dark:text-white">Tilawah Journal</h1>
                <div className="flex w-10 h-10 items-center justify-center bg-[#D4AF37]/10 text-[#D4AF37] rounded-full">
                    <span className="material-symbols-outlined">stars</span>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto pb-12">
                <div className="p-4 space-y-6">

                    {/* ── Progress Banner (REAL-TIME — Fix C) ──── */}
                    <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#0B2D18] to-[#1a4a2a] p-6 text-white shadow-xl">
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-[#D4AF37] text-[10px] font-bold uppercase tracking-widest">Ramadan Journey</span>
                                <h3 className="text-3xl font-extrabold tracking-tighter">{progressPercent}% Finished</h3>
                                <p className="text-white/70 text-sm font-medium">{currentPage} of {TOTAL_PAGES} pages completed</p>
                            </div>
                            <div className="relative flex items-center justify-center w-20 h-20">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                                    <circle className="text-white/10" cx="40" cy="40" fill="transparent" r="35" stroke="currentColor" strokeWidth="6" />
                                    <circle
                                        className="text-[#D4AF37] transition-all duration-500 ease-out"
                                        cx="40" cy="40" fill="transparent" r="35"
                                        stroke="currentColor"
                                        strokeDasharray={progressRingCircumference}
                                        strokeDashoffset={progressRingOffset}
                                        strokeLinecap="round" strokeWidth="6"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-xs font-bold text-[#D4AF37]">Juz {computedJuz}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Continue Reading Card ──── */}
                    <div onClick={() => openReader()} className="bg-gradient-to-r from-[#1a4a2a] to-[#0B2D18] rounded-[20px] p-5 flex items-center justify-between shadow-lg shadow-[#0B2D18]/20 cursor-pointer active:scale-[0.98] transition-transform">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37]">
                                <span className="material-symbols-outlined text-3xl">menu_book</span>
                            </div>
                            <div>
                                <h4 className="text-white font-bold text-base leading-tight">Lanjut Membaca</h4>
                                <p className="text-white/60 text-xs">Surah {SURAH_NAMES[currentSurah - 1]} • Hal {currentPage}</p>
                            </div>
                        </div>
                        <button className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#0B2D18] px-4 py-2 rounded-full text-xs font-extrabold flex items-center gap-2 transition-transform active:scale-95" onClick={(e) => { e.stopPropagation(); openReader(); }}>
                            Buka Al-Quran
                        </button>
                    </div>

                    {/* ── Update Position Section ──── */}
                    <section className="bg-white dark:bg-slate-800 rounded-[20px] p-5 shadow-sm space-y-5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">Update Posisi Baca</h2>
                            <span className="text-[10px] font-bold text-slate-400">POSISI TERAKHIR: HAL {currentPage}</span>
                        </div>
                        <div className="space-y-4">

                            {/* ── Custom Surah Dropdown (Fix B) ──── */}
                            <div className="relative" ref={dropdownRef}>
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Surah</label>
                                <div
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded-xl px-4 py-3 cursor-pointer transition-all"
                                    style={{ border: dropdownOpen ? '1.5px solid #4cae6e' : '1.5px solid #e5e7eb' }}
                                >
                                    <span className="material-symbols-outlined text-[#4cae6e] text-xl">search</span>
                                    <span className="flex-1 text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                                        {currentSurah}. {SURAH_NAMES[currentSurah - 1]}
                                    </span>
                                    <span className="text-xs text-slate-400 font-arabic mr-1">{SURAH_ARABIC[currentSurah - 1]}</span>
                                    <span className="material-symbols-outlined text-slate-400 text-lg" style={{ transition: 'transform 200ms', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0)' }}>
                                        expand_more
                                    </span>
                                </div>

                                {/* Dropdown Panel */}
                                {dropdownOpen && (
                                    <div
                                        className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] z-[999] overflow-hidden"
                                        style={{ animation: 'dropdownSlide 200ms ease-out', maxHeight: '320px' }}
                                    >
                                        {/* Search input sticky */}
                                        <div className="sticky top-0 bg-white dark:bg-slate-900 p-2 z-10 border-b border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2.5">
                                                <span className="material-symbols-outlined text-slate-400 text-lg">search</span>
                                                <input
                                                    type="text"
                                                    value={surahSearch}
                                                    onChange={(e) => setSurahSearch(e.target.value)}
                                                    placeholder="Cari nama surah..."
                                                    className="bg-transparent border-none outline-none text-sm font-medium w-full text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                        {/* List */}
                                        <div className="overflow-y-auto" style={{ maxHeight: '260px' }}>
                                            {filteredSurahs.map(({ index, name }) => {
                                                const isSelected = index + 1 === currentSurah;
                                                return (
                                                    <div
                                                        key={index}
                                                        onClick={() => {
                                                            setCurrentSurah(index + 1);
                                                            setDropdownOpen(false);
                                                            setSurahSearch('');
                                                            localStorage.setItem('posisi_surah_terakhir', String(index + 1));
                                                        }}
                                                        className="flex items-center justify-between px-4 py-3 cursor-pointer transition-colors border-b border-slate-50 dark:border-slate-800/50 last:border-0"
                                                        style={{
                                                            background: isSelected ? 'rgba(76,175,110,0.1)' : undefined,
                                                        }}
                                                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#f9f7f2'; }}
                                                        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = ''; }}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span className={`text-sm font-extrabold min-w-[28px] ${isSelected ? 'text-[#4cae6e]' : 'text-[#4cae6e]/60'}`}>
                                                                {index + 1}
                                                            </span>
                                                            <span className={`text-sm font-bold ${isSelected ? 'text-[#4cae6e]' : 'text-slate-700 dark:text-slate-200'}`}>
                                                                {name}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-slate-400 font-arabic">{SURAH_ARABIC[index]}</span>
                                                            {isSelected && (
                                                                <span className="material-symbols-outlined text-[#4cae6e] text-lg">check_circle</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {filteredSurahs.length === 0 && (
                                                <p className="text-center text-sm text-slate-400 py-6">Tidak ditemukan</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ── Juz selector (Fix A) — ALL 30, scrollable ──── */}
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Juz (1-30)</label>
                                <div
                                    ref={juzScrollRef}
                                    className="flex gap-2 py-1 overflow-x-auto"
                                    style={{
                                        scrollSnapType: 'x mandatory',
                                        WebkitOverflowScrolling: 'touch',
                                        scrollbarWidth: 'none',
                                        msOverflowStyle: 'none',
                                    }}
                                >
                                    <style>{`
                                        .juz-scroll::-webkit-scrollbar { display: none; }
                                    `}</style>
                                    {Array.from({ length: 30 }, (_, i) => i + 1).map(j => (
                                        <button
                                            key={j}
                                            data-juz={j}
                                            onClick={() => handleJuzChange(j)}
                                            className={`flex-shrink-0 flex items-center justify-center rounded-full text-sm font-bold transition-all ${selectedJuz === j
                                                ? 'bg-[#4cae6e] text-white shadow-lg shadow-[#4cae6e]/20'
                                                : 'bg-slate-50 dark:bg-slate-700 text-slate-400 border border-slate-100 dark:border-slate-600 hover:bg-slate-100'
                                                }`}
                                            style={{ width: '44px', height: '44px', scrollSnapAlign: 'center' }}
                                        >
                                            {j}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* ── Page counter ──── */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 block">Halaman (1-604)</label>
                                <div className="flex items-center justify-between gap-4">
                                    <button onClick={() => incrementPage(-1)} className="w-12 h-12 rounded-xl border-2 border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 active:bg-slate-100 transition-colors">
                                        <span className="material-symbols-outlined">remove</span>
                                    </button>
                                    <div className="flex-1 text-center">
                                        <span className={`text-4xl font-black tracking-tight transition-all duration-300 inline-block ${pagePulse ? 'scale-125 text-[#4cae6e]' : 'text-slate-900 dark:text-white'}`}>
                                            {currentPage}
                                        </span>
                                        <span className="text-slate-300 font-bold ml-1">/ {TOTAL_PAGES}</span>
                                    </div>
                                    <button onClick={() => incrementPage(1)} className="w-12 h-12 rounded-xl border-2 border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 active:bg-slate-100 transition-colors">
                                        <span className="material-symbols-outlined">add</span>
                                    </button>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    {[5, 10, 15, 20].map(n => (
                                        <button key={n} onClick={() => incrementPage(n)} className="py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-[#4cae6e] text-xs font-extrabold border border-[#4cae6e]/10 active:scale-95 transition-transform">
                                            +{n}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ── Save Button (Static Position) ──── */}
                    <div className="w-full">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className={`w-full h-14 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-3 active:scale-[0.98] transition-all ${saved
                                ? 'bg-green-600 text-white'
                                : saving
                                    ? 'bg-slate-300 text-slate-500 cursor-wait'
                                    : 'bg-gradient-to-r from-[#4cae6e] to-[#1a4a2a] text-white'
                                }`}
                        >
                            {saving ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin text-xl">autorenew</span>
                                    Menyimpan...
                                </>
                            ) : saved ? (
                                <>
                                    <span className="material-symbols-outlined text-xl">check_circle</span>
                                    Tersimpan! ✓
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-xl">cloud_upload</span>
                                    Simpan Progres
                                </>
                            )}
                        </button>
                    </div>

                    {/* ── Stats Grid (Real-Time — Fix C) ──── */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* 7-Day Progress */}
                        <div className="bg-white dark:bg-slate-800 rounded-[20px] p-5 shadow-sm">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">Progress 7 Hari</h4>
                            <div className="flex items-end justify-between h-24 gap-1">
                                {[
                                    { h: 8, day: 'M' }, { h: 12, day: 'S' }, { h: 10, day: 'S' },
                                    { h: 16, day: 'R' }, { h: 14, day: 'K' }, { h: 6, day: 'J' },
                                    { h: Math.min(24, todayAdded || 20), day: 'S', gold: true },
                                ].map((bar, i) => (
                                    <div key={i} className="w-full space-y-2">
                                        <div className="bg-slate-100 dark:bg-slate-700 w-full rounded-t-sm relative" style={{ height: `${(bar.h / 24) * 96}px` }}>
                                            <div className={`absolute bottom-0 inset-x-0 rounded-t-sm ${bar.gold ? 'bg-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.3)]' : 'bg-[#4cae6e]'}`} style={{ height: `${(bar.h / 24) * 80}px` }} />
                                        </div>
                                        <p className={`text-[8px] font-bold text-center ${bar.gold ? 'text-[#D4AF37]' : 'text-slate-400'}`}>{bar.day}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── Estimasi Khatam (Real-time — Fix C) ──── */}
                        <div className="bg-[#FFFDF7] dark:bg-slate-800/80 rounded-[20px] p-5 border border-[#D4AF37]/20 shadow-sm flex flex-col justify-between">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-[#D4AF37] text-xl">auto_awesome</span>
                                <h4 className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider">Estimasi Khatam</h4>
                            </div>
                            <div>
                                <p className="text-2xl font-black text-slate-900 dark:text-white">{estimasiKeRamadan} Ramadan</p>
                                <p className="text-xs font-medium mt-1" style={{ color: motivationColor }}>
                                    {motivationText}
                                </p>
                            </div>
                            <div className="mt-4 pt-4 border-t border-[#D4AF37]/10">
                                <p className="text-[9px] text-slate-400 uppercase font-bold">Target Harian</p>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    <span style={{ color: '#4cae6e' }}>{pagesPerDay} hal/hari</span> • Sisa {remainingPages} hal
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ── History Section (Fix D) ──── */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#4cae6e] text-lg">history</span>
                            Riwayat Simpan
                        </h3>
                        {history.length === 0 ? (
                            <div className="bg-white dark:bg-slate-800 rounded-[20px] p-8 shadow-sm text-center">
                                <span className="material-symbols-outlined text-4xl text-slate-300 mb-3 block">auto_stories</span>
                                <p className="text-sm font-bold text-slate-500">Belum ada riwayat simpan</p>
                                <p className="text-xs text-slate-400 mt-1">Tekan Simpan Progres untuk mulai</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {history.map((entry) => (
                                    <div key={entry.id} className="bg-white dark:bg-slate-800 rounded-[14px] p-4 shadow-sm relative" style={{ borderLeft: '4px solid #4cae6e' }}>
                                        {/* Delete button */}
                                        {deleteConfirmId === entry.id ? (
                                            <div className="absolute top-3 right-3 flex items-center gap-1 bg-red-50 dark:bg-red-950/30 rounded-full px-2 py-1">
                                                <button onClick={() => deleteHistory(entry.id)} className="text-red-500 text-[10px] font-bold">Hapus</button>
                                                <span className="text-slate-300">|</span>
                                                <button onClick={() => setDeleteConfirmId(null)} className="text-slate-400 text-[10px] font-bold">Batal</button>
                                            </div>
                                        ) : (
                                            <button onClick={() => setDeleteConfirmId(entry.id)} className="absolute top-3 right-3">
                                                <span className="material-symbols-outlined text-lg" style={{ color: '#ddd' }}>delete_outline</span>
                                            </button>
                                        )}

                                        <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-0.5">
                                            <span>🕐</span> {entry.tanggal} • {entry.waktu_simpan}
                                        </div>
                                        <p className="text-[10px] font-bold text-[#D4AF37] mb-1">{entry.hari_ramadan}</p>
                                        <p className="text-[13px] font-bold text-[#0B2D18] dark:text-white">
                                            📖 {entry.surah} • Juz {entry.juz}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[13px] text-slate-600 dark:text-slate-400">Halaman {entry.halaman}</span>
                                            {entry.tambahan_hari_ini > 0 && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#4cae6e]/10 text-[#4cae6e] text-[10px] font-extrabold">
                                                    +{entry.tambahan_hari_ini} hari ini
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </main>



            {/* Dropdown Animation CSS */}
            <style>{`
                @keyframes dropdownSlide {
                    from { opacity: 0; transform: translateY(-12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};
