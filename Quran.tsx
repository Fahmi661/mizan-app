import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Tab } from '../types';
import { useLastRead } from '../context/LastReadContext';
import { Bookmark } from 'lucide-react';

interface QuranProps {
    onNavigate: (tab: Tab) => void;
}

interface SurahMeta {
    number: number;
    name: string;
    englishName: string;
    englishNameTranslation: string;
    numberOfAyahs: number;
    revelationType: string;
}

interface Ayah {
    number: number;
    numberInSurah: number;
    text: string;
    juz: number;
    page: number;
    hizbQuarter: number;
    surah?: { number: number; name: string; englishName: string };
}

interface LastRead {
    surah: number;
    ayah: number;
    surahName: string;
}

type SubPage = 'index' | 'reader';
type IndexTab = 'surah' | 'juz';
type ReaderMode = 'surah' | 'juz' | 'hizb';

// ── Cache helpers ──
const getCached = <T,>(key: string): T | null => {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw) as T;
    } catch { return null; }
};
const setCache = (key: string, data: unknown) => {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* quota */ }
};

const formatSurahName = (name: string) => {
    const map: Record<string, string> = {
        'Al-Fatiha': 'Al-Fatihah',
        'Al-Baqara': 'Al-Baqarah',
        'Aal-e-Imran': "Ali 'Imran",
        'Al-Maaida': "Al-Ma'idah",
        'Al-Anaam': "Al-An'am",
        'Al-Aaraaf': "Al-A'raf",
        'Al-Anfaal': 'Al-Anfal',
        'Al-Tawba': 'At-Tawbah',
    };
    return map[name] || name;
};


// ── Juz metadata (surah ranges + page ranges) ──
const JUZ_META: { startSurah: string; endSurah: string; startPage: number; endPage: number; ayahCount: number }[] = [
    { startSurah: 'Al-Fatihah', endSurah: 'Al-Baqarah', startPage: 1, endPage: 21, ayahCount: 148 },
    { startSurah: 'Al-Baqarah', endSurah: 'Al-Baqarah', startPage: 22, endPage: 41, ayahCount: 111 },
    { startSurah: 'Al-Baqarah', endSurah: 'Aal-i-Imraan', startPage: 42, endPage: 61, ayahCount: 126 },
    { startSurah: 'Aal-i-Imraan', endSurah: 'An-Nisaa', startPage: 62, endPage: 81, ayahCount: 131 },
    { startSurah: 'An-Nisaa', endSurah: 'An-Nisaa', startPage: 82, endPage: 101, ayahCount: 124 },
    { startSurah: 'An-Nisaa', endSurah: 'Al-Ma\'idah', startPage: 102, endPage: 121, ayahCount: 110 },
    { startSurah: 'Al-Ma\'idah', endSurah: 'Al-An\'aam', startPage: 122, endPage: 141, ayahCount: 149 },
    { startSurah: 'Al-An\'aam', endSurah: 'Al-A\'raaf', startPage: 142, endPage: 161, ayahCount: 142 },
    { startSurah: 'Al-A\'raaf', endSurah: 'Al-Anfaal', startPage: 162, endPage: 181, ayahCount: 159 },
    { startSurah: 'Al-Anfaal', endSurah: 'At-Tawbah', startPage: 182, endPage: 201, ayahCount: 127 },
    { startSurah: 'At-Tawbah', endSurah: 'Hud', startPage: 202, endPage: 221, ayahCount: 151 },
    { startSurah: 'Hud', endSurah: 'Yusuf', startPage: 222, endPage: 241, ayahCount: 170 },
    { startSurah: 'Ar-Ra\'d', endSurah: 'Al-Hijr', startPage: 242, endPage: 261, ayahCount: 154 },
    { startSurah: 'An-Nahl', endSurah: 'Al-Isra', startPage: 262, endPage: 281, ayahCount: 227 },
    { startSurah: 'Al-Isra', endSurah: 'Al-Kahf', startPage: 282, endPage: 301, ayahCount: 185 },
    { startSurah: 'Maryam', endSurah: 'Taa-Haa', startPage: 302, endPage: 321, ayahCount: 269 },
    { startSurah: 'Al-Anbiyaa', endSurah: 'Al-Hajj', startPage: 322, endPage: 341, ayahCount: 190 },
    { startSurah: 'Al-Mu\'minuun', endSurah: 'Al-Furqaan', startPage: 342, endPage: 361, ayahCount: 202 },
    { startSurah: 'Ash-Shu\'araa', endSurah: 'An-Naml', startPage: 362, endPage: 381, ayahCount: 339 },
    { startSurah: 'Al-Qasas', endSurah: 'Al-Ankabut', startPage: 382, endPage: 401, ayahCount: 171 },
    { startSurah: 'Ar-Room', endSurah: 'Al-Ahzaab', startPage: 402, endPage: 421, ayahCount: 178 },
    { startSurah: 'Al-Ahzaab', endSurah: 'Yaseen', startPage: 422, endPage: 441, ayahCount: 169 },
    { startSurah: 'As-Saaffaat', endSurah: 'Az-Zumar', startPage: 442, endPage: 461, ayahCount: 357 },
    { startSurah: 'Ghafir', endSurah: 'Fussilat', startPage: 462, endPage: 481, ayahCount: 175 },
    { startSurah: 'Fussilat', endSurah: 'Al-Jaathiyah', startPage: 482, endPage: 501, ayahCount: 246 },
    { startSurah: 'Al-Ahqaaf', endSurah: 'Al-Hujuraat', startPage: 502, endPage: 521, ayahCount: 195 },
    { startSurah: 'Qaaf', endSurah: 'Al-Hadid', startPage: 522, endPage: 541, ayahCount: 399 },
    { startSurah: 'Al-Mujadila', endSurah: 'At-Tahrim', startPage: 542, endPage: 561, ayahCount: 137 },
    { startSurah: 'Al-Mulk', endSurah: 'Al-Mursalaat', startPage: 562, endPage: 581, ayahCount: 431 },
    { startSurah: 'An-Naba', endSurah: 'An-Naas', startPage: 582, endPage: 604, ayahCount: 564 },
];



export const Quran: React.FC<QuranProps> = ({ onNavigate }) => {
    const { lastRead, updateLastRead } = useLastRead();
    // ── State ──
    const [subPage, setSubPage] = useState<SubPage>('index');
    const [activeIndexTab, setActiveIndexTab] = useState<IndexTab>('surah');
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [surahList, setSurahList] = useState<SurahMeta[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Reader state
    const [readerMode, setReaderMode] = useState<ReaderMode>('surah');
    const [currentSurah, setCurrentSurah] = useState<number>(1);
    const [currentJuz, setCurrentJuz] = useState<number>(1);
    const [currentHizb, setCurrentHizb] = useState<number>(1);
    const [arabAyahs, setArabAyahs] = useState<Ayah[]>([]);
    const [idAyahs, setIdAyahs] = useState<Ayah[]>([]);
    const [readerLoading, setReaderLoading] = useState(false);
    const [readerError, setReaderError] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [copiedAyah, setCopiedAyah] = useState<number | null>(null);
    const [bookmarkedAyahs, setBookmarkedAyahs] = useState<Set<string>>(() => {
        try {
            const saved = localStorage.getItem('quran_bookmarks');
            return saved ? new Set(JSON.parse(saved)) : new Set();
        } catch { return new Set(); }
    });
    const [arabicFontSize, setArabicFontSize] = useState<number>(32);

    const readerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // ── Fetch surah list ──
    useEffect(() => {
        const fetchList = async () => {
            setLoading(true);
            setError('');
            try {
                const cached = getCached<SurahMeta[]>('quran_surah_list');
                if (cached && cached.length === 114) {
                    setSurahList(cached);
                    setLoading(false);
                    return;
                }
                const res = await fetch('/api/quran/v1/surah');
                if (!res.ok) throw new Error('Gagal memuat');
                const json = await res.json();
                setSurahList(json.data);
                setCache('quran_surah_list', json.data);
            } catch (err: any) {
                setError(err.message || 'Gagal memuat daftar surah.');
            } finally {
                setLoading(false);
            }
        };
        fetchList();
    }, []);

    // ── Generic fetch for page/juz ──
    const fetchGeneric = useCallback(async (
        arabUrl: string,
        idUrl: string,
        cacheKeyArab: string,
        cacheKeyId: string
    ) => {
        setReaderLoading(true);
        setReaderError('');
        setArabAyahs([]);
        setIdAyahs([]);
        try {
            const cachedArab = getCached<Ayah[]>(cacheKeyArab);
            const cachedId = getCached<Ayah[]>(cacheKeyId);
            if (cachedArab && cachedId) {
                setArabAyahs(cachedArab);
                setIdAyahs(cachedId);
                setReaderLoading(false);
                return;
            }
            const [arabRes, idRes] = await Promise.all([fetch(arabUrl), fetch(idUrl)]);
            if (!arabRes.ok || !idRes.ok) throw new Error('Gagal memuat');
            const [arabJson, idJson] = await Promise.all([arabRes.json(), idRes.json()]);
            const arabData = arabJson.data.ayahs || arabJson.data;
            const idData = idJson.data.ayahs || idJson.data;
            setArabAyahs(arabData);
            setIdAyahs(idData);
            setCache(cacheKeyArab, arabData);
            setCache(cacheKeyId, idData);
        } catch (err: any) {
            setReaderError(err.message || 'Gagal memuat.');
        } finally {
            setReaderLoading(false);
        }
    }, []);

    // ── Fetch surah content ──
    const fetchSurah = useCallback(async (num: number) => {
        await fetchGeneric(
            `/api/quran/v1/surah/${num}`,
            `/api/quran/v1/surah/${num}/id.indonesian`,
            `quran_arab_${num}`,
            `quran_id_${num}`
        );
    }, [fetchGeneric]);

    // ── Fetch juz content ──
    const fetchJuz = useCallback(async (num: number) => {
        await fetchGeneric(
            `/api/quran/v1/juz/${num}/quran-uthmani`,
            `/api/quran/v1/juz/${num}/id.indonesian`,
            `quran_juz_arab_${num}`,
            `quran_juz_id_${num}`
        );
    }, [fetchGeneric]);

    // ── Fetch hizb (half juz) ──
    const fetchHizb = useCallback(async (hizbNum: number) => {
        const juzNum = Math.ceil(hizbNum / 2);
        const isSecondHalf = hizbNum % 2 === 0;
        // Fetch the full juz and then filter
        const cacheArab = `quran_hizb_arab_${hizbNum}`;
        const cacheId = `quran_hizb_id_${hizbNum}`;

        setReaderLoading(true);
        setReaderError('');
        setArabAyahs([]);
        setIdAyahs([]);

        try {
            const cachedArab = getCached<Ayah[]>(cacheArab);
            const cachedId = getCached<Ayah[]>(cacheId);
            if (cachedArab && cachedId) {
                setArabAyahs(cachedArab);
                setIdAyahs(cachedId);
                setReaderLoading(false);
                return;
            }

            const [arabRes, idRes] = await Promise.all([
                fetch(`/api/quran/v1/juz/${juzNum}/quran-uthmani`),
                fetch(`/api/quran/v1/juz/${juzNum}/id.indonesian`),
            ]);
            if (!arabRes.ok || !idRes.ok) throw new Error('Gagal memuat');
            const [arabJson, idJson] = await Promise.all([arabRes.json(), idRes.json()]);

            let arabData: Ayah[] = arabJson.data.ayahs;
            let idData: Ayah[] = idJson.data.ayahs;

            // Each juz has ~2 hizb. hizbQuarter 1-4 = hizb 1 of juz, 5-8 = hizb 2 of juz
            // Actually hizbQuarter is global (1-240). Each hizb = 4 quarters.
            // Hizb N quarter range: (N-1)*4+1 to N*4
            const startQ = (hizbNum - 1) * 4 + 1;
            const endQ = hizbNum * 4;

            arabData = arabData.filter(a => a.hizbQuarter >= startQ && a.hizbQuarter <= endQ);
            idData = idData.filter(a => a.hizbQuarter >= startQ && a.hizbQuarter <= endQ);

            setArabAyahs(arabData);
            setIdAyahs(idData);
            setCache(cacheArab, arabData);
            setCache(cacheId, idData);
        } catch (err: any) {
            setReaderError(err.message || 'Gagal memuat.');
        } finally {
            setReaderLoading(false);
        }
    }, []);

    const [targetAyah, setTargetAyah] = useState<number | null>(null);

    // ── Open readers ──
    const openSurah = useCallback((num: number, ayah?: number) => {
        setReaderLoading(true);
        setReaderError('');
        setArabAyahs([]);
        setIdAyahs([]);
        setCurrentSurah(num);
        setTargetAyah(ayah || null);
        setReaderMode('surah');
        setSubPage('reader');
        fetchSurah(num);
    }, [fetchSurah]);

    // Scroll to target ayah when ready
    useEffect(() => {
        if (subPage === 'reader' && !readerLoading && !readerError && targetAyah && arabAyahs.length > 0) {
            const timer = setTimeout(() => {
                const el = document.getElementById(`ayah-${currentSurah}:${targetAyah}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [subPage, readerLoading, readerError, targetAyah, arabAyahs, currentSurah]);

    // Handle jump request (e.g. from Dashboard)
    useEffect(() => {
        const jump = localStorage.getItem('quran_jump_to');
        if (jump && subPage === 'index') {
            try {
                const { surah, ayah } = JSON.parse(jump);
                localStorage.removeItem('quran_jump_to');
                openSurah(surah, ayah);
            } catch (e) {
                localStorage.removeItem('quran_jump_to');
            }
        }
    }, [subPage, openSurah]);

    const openJuz = useCallback((num: number) => {
        setReaderLoading(true);
        setReaderError('');
        setArabAyahs([]);
        setIdAyahs([]);
        setCurrentJuz(num);
        setReaderMode('juz');
        setSubPage('reader');
        fetchJuz(num);
    }, [fetchJuz]);

    const openHizb = useCallback((num: number) => {
        setReaderLoading(true);
        setReaderError('');
        setArabAyahs([]);
        setIdAyahs([]);
        setCurrentHizb(num);
        setReaderMode('hizb');
        setSubPage('reader');
        fetchHizb(num);
    }, [fetchHizb]);

    // ── Scroll restore ──
    const scrollKey = useMemo(() => {
        switch (readerMode) {
            case 'surah': return `scroll_surah_${currentSurah}`;
            case 'juz': return `scroll_juz_${currentJuz}`;
            case 'hizb': return `scroll_hizb_${currentHizb}`;
            default: return `scroll_surah_${currentSurah}`;
        }
    }, [readerMode, currentSurah, currentJuz, currentHizb]);

    useEffect(() => {
        if (subPage === 'reader' && !readerLoading && arabAyahs.length > 0 && readerRef.current) {
            const saved = localStorage.getItem(scrollKey);
            if (saved) {
                setTimeout(() => readerRef.current?.scrollTo({ top: parseInt(saved, 10) }), 100);
            }
        }
    }, [subPage, readerLoading, arabAyahs.length, scrollKey]);

    useEffect(() => {
        if (subPage !== 'reader') return;
        const el = readerRef.current;
        if (!el) return;
        let ticking = false;
        const handler = () => {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(() => {
                    localStorage.setItem(scrollKey, String(el.scrollTop));
                    ticking = false;
                });
            }
        };
        el.addEventListener('scroll', handler, { passive: true });
        return () => el.removeEventListener('scroll', handler);
    }, [subPage, scrollKey]);

    // ── Close dropdown ──
    useEffect(() => {
        if (!dropdownOpen) return;
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [dropdownOpen]);

    // ── Memos ──
    const currentMeta = useMemo(() => surahList.find(s => s.number === currentSurah), [surahList, currentSurah]);

    const filteredSurahs = useMemo(() => {
        if (!searchQuery.trim()) return surahList;
        const q = searchQuery.toLowerCase();
        return surahList.filter(s =>
            s.englishName.toLowerCase().includes(q) ||
            s.name.includes(q) ||
            s.englishNameTranslation.toLowerCase().includes(q) ||
            String(s.number).includes(q)
        );
    }, [surahList, searchQuery]);

    const revelationLabel = (type: string) => type === 'Meccan' ? 'Makkiyah' : 'Madaniyah';

    // ── Bookmark ──
    const toggleBookmark = (key: string) => {
        setBookmarkedAyahs(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            localStorage.setItem('quran_bookmarks', JSON.stringify([...next]));
            return next;
        });
    };

    // ── Copy / Share ──
    const copyAyah = async (arab: string, translation: string, surahName: string, ayahNum: number) => {
        const text = `${arab}\n\n${translation}\n\n— ${surahName} : ${ayahNum}`;
        try { await navigator.clipboard.writeText(text); setCopiedAyah(ayahNum); setTimeout(() => setCopiedAyah(null), 1500); } catch { }
    };

    const shareAyah = async (arab: string, translation: string, surahName: string, ayahNum: number) => {
        const text = `${arab}\n\n${translation}\n\n— ${surahName} : ${ayahNum}`;
        if (navigator.share) { try { await navigator.share({ text }); } catch { } }
        else { copyAyah(arab, translation, surahName, ayahNum); }
    };


    // ── Skeleton component ──
    const SkeletonList = () => (
        <div style={{ padding: '0 var(--app-padding-x)' }}>
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-4" style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <div className="skeleton-line" style={{ width: 36, height: 36, borderRadius: 10 }} />
                    <div className="flex-1">
                        <div className="skeleton-line" style={{ width: '60%', height: 14, marginBottom: 6 }} />
                        <div className="skeleton-line" style={{ width: '40%', height: 10 }} />
                    </div>
                </div>
            ))}
        </div>
    );

    const ReaderSkeleton = () => (
        <div style={{ padding: '0 var(--app-padding-x)' }}>
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: 14, padding: 16, marginBottom: 10 }}>
                    <div className="skeleton-line" style={{ width: '100%', height: 20, marginBottom: 8 }} />
                    <div className="skeleton-line" style={{ width: '85%', height: 20, marginBottom: 8 }} />
                    <div className="skeleton-line" style={{ width: '70%', height: 20, marginBottom: 14 }} />
                    <div className="skeleton-line" style={{ width: '90%', height: 14, marginBottom: 6 }} />
                    <div className="skeleton-line" style={{ width: '75%', height: 14 }} />
                </div>
            ))}
        </div>
    );

    const ErrorCard = ({ msg, onRetry }: { msg: string; onRetry: () => void }) => (
        <div style={{ padding: '20px var(--app-padding-x)', textAlign: 'center' }}>
            <div style={{ background: '#fef2f2', borderRadius: 12, padding: 20 }}>
                <p className="text-sm text-red-600 font-medium mb-3">{msg}</p>
                <button onClick={onRetry} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-bold active:scale-95 transition-transform">
                    Coba Lagi ↺
                </button>
            </div>
        </div>
    );

    // ── Ayah card render (reusable) ──
    const renderAyahCard = (ayah: Ayah, idx: number, surahName: string, surahNum: number) => {
        const translation = idAyahs[idx]?.text || '';
        const bmKey = `${surahNum}:${ayah.numberInSurah}`;
        const isCopied = copiedAyah === ayah.numberInSurah;
        const isBookmarked = bookmarkedAyahs.has(bmKey);
        const isLastRead = lastRead?.surah === surahNum && lastRead?.ayah === ayah.numberInSurah;

        return (
            <div
                id={`ayah-${bmKey}`}
                key={`${ayah.number}-${idx}`}
                style={{
                    margin: '0 var(--app-padding-x)', marginBottom: 10,
                    background: isLastRead ? 'rgba(76,175,110,0.03)' : '#fff',
                    borderRadius: 14, overflow: 'hidden',
                    boxShadow: isLastRead ? '0 0 0 2px #4caf6e20' : '0 1px 4px rgba(0,0,0,0.04)',
                    border: isLastRead ? '1px solid rgba(76,175,110,0.2)' : '1px solid transparent',
                    transition: 'all 0.3s ease'
                }}
                className="dark:bg-slate-800"
            >
                <div className="flex items-center justify-between" style={{ padding: '12px 14px 4px' }}>
                    <div className="flex items-center gap-2">
                        <div style={{
                            position: 'relative', width: 32, height: 32,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.3s ease'
                        }}>
                            <svg width="32" height="32" viewBox="0 0 32 32" style={{ position: 'absolute', top: 0, left: 0 }}>
                                <path
                                    d="M16,0 L21,5 L27,5 L27,11 L32,16 L27,21 L27,27 L21,27 L16,32 L11,27 L5,27 L5,21 L0,16 L5,11 L5,5 L11,5 Z"
                                    fill={isLastRead ? 'rgba(76,175,110,0.1)' : 'rgba(212,175,55,0.03)'}
                                    stroke={isLastRead ? '#4caf6e' : '#D4AF37'}
                                    strokeWidth="1.5"
                                    strokeLinejoin="round"
                                />
                            </svg>
                            <span style={{
                                position: 'relative', zIndex: 1,
                                fontSize: ayah.numberInSurah > 99 ? 9 : 10,
                                fontWeight: 800,
                                color: isLastRead ? '#4caf6e' : '#B8860B',
                                fontFamily: "'Outfit', sans-serif"
                            }}>
                                {ayah.numberInSurah}
                            </span>
                        </div>
                        {isLastRead && (
                            <span className="text-[10px] font-bold text-[#4caf6e] uppercase tracking-wider bg-[#4caf6e]/10 px-2 py-0.5 rounded-md">Sedang Dibaca</span>
                        )}
                    </div>
                </div>
                <div className="font-arabic" style={{
                    fontSize: arabicFontSize, lineHeight: 2.2, textAlign: 'right',
                    direction: 'rtl' as const, color: '#0B2D18', padding: '16px 12px',
                }}>
                    {ayah.text}
                </div>
                <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, padding: '0 12px 12px' }} className="dark:text-slate-400 font-sans">
                    {translation}
                </p>
                <div className="flex items-center" style={{ borderTop: '1px solid #f5f5f5', padding: '6px 8px' }}>
                    <button onClick={() => copyAyah(ayah.text, translation, surahName, ayah.numberInSurah)}
                        className="flex-1 flex items-center justify-center py-1.5 active:bg-slate-50 rounded-lg transition-colors" title="Salin">
                        <span className="material-icons-outlined" style={{ fontSize: 18, color: isCopied ? '#4caf6e' : '#999' }}>
                            {isCopied ? 'check' : 'content_copy'}
                        </span>
                    </button>
                    <button onClick={() => { toggleBookmark(bmKey); updateLastRead(surahNum, ayah.numberInSurah, surahName); }}
                        className="flex-1 flex items-center justify-center py-1.5 active:bg-slate-50 rounded-lg transition-colors" title="Bookmark">
                        <Bookmark
                            size={18}
                            className={`transition-all duration-300 ${isBookmarked ? 'text-[#4caf6e] fill-[#4caf6e]' : 'text-slate-400'}`}
                        />
                    </button>
                </div>
            </div>
        );
    };

    // ── Surah divider (for page/juz/hizb readers) ──
    const renderSurahDivider = (name: string, surahNum: number) => {
        if (readerMode === 'surah') return null;

        if (readerMode === 'juz') {
            const meta = surahList.find(s => s.number === surahNum);
            return (
                <div style={{ marginTop: 24, marginBottom: 16 }}>
                    {/* Embedded Surah Header */}
                    {meta && (
                        <div style={{ padding: '0 var(--app-padding-x)', marginBottom: 12 }}>
                            <div style={{ background: '#0B2D18', borderRadius: 16, padding: '16px 20px', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, background: 'rgba(212,175,55,0.08)', borderRadius: '50%', filter: 'blur(30px)' }} />
                                <div style={{ position: 'relative', zIndex: 1 }}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginBottom: 4 }}>Surah: {formatSurahName(meta.englishName)}</p>
                                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Bahasa: {meta.englishNameTranslation}</p>
                                            <div className="flex gap-3 mt-2">
                                                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Ayat: {meta.numberOfAyahs}</span>
                                                <span style={{ color: 'rgba(255,255,255,0.4)' }}>│</span>
                                                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Turun di: {meta.revelationType === 'Meccan' ? 'Makkah' : 'Madinah'}</span>
                                            </div>
                                        </div>
                                        <p className="font-arabic text-white" style={{ fontSize: 24, direction: 'rtl' as const }}>{meta.name}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Basmalah */}
                    {surahNum !== 9 && (
                        <div style={{ textAlign: 'center', padding: '12px var(--app-padding-x) 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 8 }}>
                                <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, #D4AF37, transparent)' }} />
                                <span style={{ color: '#D4AF37', fontSize: 10 }}>✦</span>
                                <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, #D4AF37, transparent)' }} />
                            </div>
                            <p className="font-arabic" style={{ fontSize: 22, color: '#D4AF37', lineHeight: 2 }}>
                                بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginTop: 8 }}>
                                <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, #D4AF37, transparent)' }} />
                                <span style={{ color: '#D4AF37', fontSize: 10 }}>✦</span>
                                <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, #D4AF37, transparent)' }} />
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div style={{
                margin: '8px var(--app-padding-x) 4px',
                padding: '8px 14px',
                background: 'rgba(76,175,110,0.08)',
                borderRadius: 10,
                borderLeft: '3px solid #4caf6e',
            }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#4caf6e' }}>{formatSurahName(name)}</p>
            </div>
        );
    };

    // ── Render ayahs with surah dividers ──
    const renderAyahsWithDividers = () => {
        let lastSurahNum = -1;
        return arabAyahs.map((ayah, idx) => {
            const surahNum = ayah.surah?.number || 0;
            const surahName = ayah.surah?.englishName || '';
            const showDivider = surahNum !== lastSurahNum;
            lastSurahNum = surahNum;
            return (
                <React.Fragment key={`${ayah.number}-${idx}`}>
                    {showDivider && renderSurahDivider(surahName, surahNum)}
                    {renderAyahCard(ayah, idx, surahName, surahNum)}
                </React.Fragment>
            );
        });
    };

    // ── Reader title (must be above early return to preserve hook order) ──
    const readerTitle = useMemo(() => {
        switch (readerMode) {
            case 'surah': return currentMeta?.englishName || `Surah ${currentSurah}`;
            case 'juz': return `Juz ${currentJuz}`;
            case 'hizb': return `Hizb ${currentHizb}`;
            default: return '';
        }
    }, [readerMode, currentMeta, currentSurah, currentJuz, currentHizb]);

    // ════════════════════════════════════════════════════════════
    // SUB-HALAMAN A — INDEX
    // ════════════════════════════════════════════════════════════
    if (subPage === 'index') {
        return (
            <div className="bg-[#F5F5F5] dark:bg-dark flex-1 flex flex-col" style={{ minHeight: '100dvh' }}>
                {/* Header */}
                <header className="flex items-center justify-between" style={{ padding: '16px var(--app-padding-x)', paddingTop: 48 }}>
                    <button onClick={() => onNavigate(Tab.HOME)}
                        className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95 transition-transform">
                        <span className="material-icons-outlined text-slate-600 dark:text-slate-300" style={{ fontSize: 20 }}>arrow_back</span>
                    </button>
                    <h1 className="text-lg font-bold text-[#0B2D18] dark:text-white">Al-Quran</h1>
                    <button onClick={() => { setSearchOpen(!searchOpen); setSearchQuery(''); }}
                        className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95 transition-transform">
                        <span className="material-icons-outlined text-slate-600 dark:text-slate-300" style={{ fontSize: 20 }}>
                            {searchOpen ? 'close' : 'search'}
                        </span>
                    </button>
                </header>

                {/* Search bar */}
                {searchOpen && (
                    <div style={{ padding: '0 var(--app-padding-x)', marginBottom: 8 }}>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" style={{ fontSize: 18 }}>search</span>
                            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Cari nama surah atau nomor..." autoFocus
                                className="w-full bg-white dark:bg-slate-800 pl-10 pr-4 py-3 rounded-xl text-sm font-medium outline-none dark:text-white placeholder:text-slate-400 border border-slate-100 dark:border-slate-700 shadow-sm" />
                        </div>
                    </div>
                )}

                {/* Tab navigation — 3 tabs */}
                <div style={{ padding: '0 var(--app-padding-x)', marginBottom: 12 }}>
                    <div className="flex gap-2 bg-white dark:bg-slate-800 rounded-xl p-1 shadow-sm border border-slate-100 dark:border-slate-700">
                        {(['surah', 'juz'] as IndexTab[]).map(tab => (
                            <button key={tab} onClick={() => setActiveIndexTab(tab)}
                                className="flex-1 py-2.5 rounded-lg font-bold capitalize transition-all duration-200"
                                style={{ fontSize: 14, background: activeIndexTab === tab ? '#4caf6e' : 'transparent', color: activeIndexTab === tab ? '#fff' : '#999' }}>
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 80 }}>
                    {/* ── SURAH TAB ── */}
                    {activeIndexTab === 'surah' && (
                        <>
                            {lastRead && !searchOpen && (
                                <div onClick={() => openSurah(lastRead.surah, lastRead.ayah)}
                                    style={{
                                        margin: '0 var(--app-padding-x)', marginBottom: 16, background: '#fff',
                                        borderRadius: 20, padding: '16px 20px', cursor: 'pointer',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
                                    }}
                                    className="dark:bg-slate-800 active:scale-[0.98] transition-transform relative overflow-hidden">
                                    <div className="absolute -right-8 -top-8 w-32 h-32 bg-[#4caf6e]/10 rounded-full blur-2xl" />
                                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium text-[11px] tracking-wider uppercase mb-3">
                                        <span className="material-icons-outlined" style={{ fontSize: 16, color: '#4caf6e' }}>menu_book</span> Terakhir Dibaca
                                    </div>
                                    <p className="text-[19px] font-bold text-[#0B2D18] dark:text-white">Surah {formatSurahName(lastRead.surahName)} - Ayat {lastRead.ayah}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Lanjutkan membaca...</p>
                                    <div className="absolute bottom-4 right-4 text-[#4caf6e] opacity-80">
                                        <span className="material-icons-outlined" style={{ fontSize: 24 }}>arrow_circle_right</span>
                                    </div>
                                </div>
                            )}
                            {loading && <SkeletonList />}
                            {error && <ErrorCard msg="Gagal memuat daftar surah. Periksa koneksimu." onRetry={() => window.location.reload()} />}
                            {!loading && !error && (
                                <div style={{ padding: '0 var(--app-padding-x)' }}>
                                    {filteredSurahs.map(s => (
                                        <div key={s.number} onClick={() => openSurah(s.number)}
                                            className="flex items-center gap-3 cursor-pointer active:bg-slate-50 dark:active:bg-slate-800 transition-colors"
                                            style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                                            <div className="relative flex items-center justify-center shrink-0" style={{ width: 44, height: 44 }}>
                                                <div className="absolute w-8 h-8 bg-[#4caf6e]/10 border border-[#4caf6e]/20 rotate-45 rounded-[6px]" />
                                                <div className="absolute w-8 h-8 bg-[#4caf6e]/10 border border-[#4caf6e]/20 rounded-[6px]" />
                                                <span className="relative font-bold mt-0.5 text-[#0B2D18] dark:text-[#4caf6e]" style={{ fontSize: 13 }}>{s.number}</span>
                                            </div>
                                            <div className="flex-1 min-w-0" style={{ paddingLeft: 6 }}>
                                                <p className="font-bold text-[15px] text-[#0B2D18] dark:text-white truncate" style={{ marginBottom: 2 }}>{formatSurahName(s.englishName)}</p>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-wide uppercase">{revelationLabel(s.revelationType)} • {s.numberOfAyahs} AYAT</p>
                                            </div>
                                            <p className="font-arabic text-[#0B2D18] dark:text-white shrink-0" style={{ fontSize: 24, direction: 'rtl' as const, paddingRight: 4 }}>
                                                {s.name}
                                            </p>
                                        </div>
                                    ))}
                                    {filteredSurahs.length === 0 && <p className="text-center text-sm text-slate-400 py-10">Tidak ditemukan</p>}
                                </div>
                            )}
                        </>
                    )}


                    {/* ── JUZ TAB ── */}
                    {activeIndexTab === 'juz' && (
                        <div style={{ padding: '0 var(--app-padding-x)' }}>
                            {JUZ_META.map((juz, idx) => {
                                const juzNum = idx + 1;
                                return (
                                    <div key={juzNum} onClick={() => openJuz(juzNum)}
                                        className="cursor-pointer active:bg-slate-50 dark:active:bg-slate-800 transition-colors"
                                        style={{ padding: '14px 0', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{
                                            background: 'linear-gradient(135deg, #0B2D18, #1a4a2a)',
                                            color: '#fff', fontWeight: 700, fontSize: 12,
                                            padding: '4px 10px', borderRadius: 8, whiteSpace: 'nowrap',
                                        }}>
                                            Juz {juzNum}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-[13px] text-[#0B2D18] dark:text-white truncate">
                                                {juz.startSurah} – {juz.endSurah}
                                            </p>
                                            <p className="text-[11px] text-slate-400">
                                                Hal. {juz.startPage}–{juz.endPage} • {juz.ayahCount} Ayat
                                            </p>
                                        </div>
                                        <span className="material-icons-outlined text-slate-300" style={{ fontSize: 16 }}>chevron_right</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                </div>
            </div>
        );
    }

    // ════════════════════════════════════════════════════════════
    // SUB-HALAMAN B — READER (all modes)
    // ════════════════════════════════════════════════════════════

    // Navigation handlers for prev/next
    const canGoPrev = readerMode === 'surah' ? currentSurah > 1
        : readerMode === 'juz' ? currentJuz > 1
            : currentHizb > 1;

    const canGoNext = readerMode === 'surah' ? currentSurah < 114
        : readerMode === 'juz' ? currentJuz < 30
            : currentHizb < 60;

    const goPrev = () => {
        readerRef.current?.scrollTo({ top: 0 });
        if (readerMode === 'surah') { const n = currentSurah - 1; setCurrentSurah(n); fetchSurah(n); }
        else if (readerMode === 'juz') { const n = currentJuz - 1; setCurrentJuz(n); fetchJuz(n); }
        else { const n = currentHizb - 1; setCurrentHizb(n); fetchHizb(n); }
    };

    const goNext = () => {
        readerRef.current?.scrollTo({ top: 0 });
        if (readerMode === 'surah') { const n = currentSurah + 1; setCurrentSurah(n); fetchSurah(n); }
        else if (readerMode === 'juz') { const n = currentJuz + 1; setCurrentJuz(n); fetchJuz(n); }
        else { const n = currentHizb + 1; setCurrentHizb(n); fetchHizb(n); }
    };

    const prevLabel = readerMode === 'surah' ? '← Surah Sebelumnya'
        : readerMode === 'juz' ? '← Juz Sebelumnya'
            : '← Hizb Sebelumnya';

    const nextLabel = readerMode === 'surah' ? 'Surah Berikutnya →'
        : readerMode === 'juz' ? 'Juz Berikutnya →'
            : 'Hizb Berikutnya →';

    const isSurahMode = readerMode === 'surah';

    return (
        <div className="bg-[#F5F5F5] dark:bg-dark flex-1 flex flex-col" style={{ minHeight: '100dvh' }}>
            {/* Header */}
            <header className="flex items-center justify-between relative" style={{ padding: '16px var(--app-padding-x)', paddingTop: 48 }}>
                <button onClick={() => { setSubPage('index'); setDropdownOpen(false); }}
                    className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95 transition-transform">
                    <span className="material-icons-outlined text-slate-600 dark:text-slate-300" style={{ fontSize: 20 }}>arrow_back</span>
                </button>

                {/* Title with optional dropdown (surah mode only) */}
                {isSurahMode ? (
                    <div className="relative" ref={dropdownRef}>
                        <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-1 active:opacity-70 transition-opacity">
                            <span className="text-base font-bold text-[#0B2D18] dark:text-white">{readerTitle}</span>
                            <span className="material-icons-outlined text-slate-400" style={{ fontSize: 18 }}>
                                {dropdownOpen ? 'expand_less' : 'expand_more'}
                            </span>
                        </button>
                        {dropdownOpen && (
                            <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50"
                                style={{ width: 240, maxHeight: 300 }}>
                                <div className="overflow-y-auto" style={{ maxHeight: 300 }}>
                                    {surahList.map(s => (
                                        <button key={s.number}
                                            onClick={() => { setDropdownOpen(false); if (s.number !== currentSurah) { setCurrentSurah(s.number); fetchSurah(s.number); } }}
                                            className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors ${s.number === currentSurah ? 'bg-[#4caf6e]/10 text-[#4caf6e] font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                                            <span className="text-xs font-bold w-6 text-center">{s.number}</span>
                                            <span className="flex-1 truncate">{s.englishName}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <span className="text-base font-bold text-[#0B2D18] dark:text-white">{readerTitle}</span>
                )}

                <div className="flex items-center gap-2">
                    <button onClick={() => setArabicFontSize(s => Math.max(20, s - 2))} className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95 transition-transform" title="Perkecil Font">
                        <span className="font-bold text-slate-600 dark:text-slate-300" style={{ fontSize: 13 }}>A-</span>
                    </button>
                    <button onClick={() => setArabicFontSize(s => Math.min(60, s + 2))} className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95 transition-transform" title="Perbesar Font">
                        <span className="font-bold text-slate-600 dark:text-slate-300" style={{ fontSize: 16 }}>A+</span>
                    </button>
                </div>
            </header>

            {/* Surah info card (only in surah mode) */}
            {isSurahMode && currentMeta && (
                <div style={{ padding: '0 var(--app-padding-x)', marginBottom: 12 }}>
                    <div style={{ background: '#0B2D18', borderRadius: 16, padding: '16px 20px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, background: 'rgba(212,175,55,0.08)', borderRadius: '50%', filter: 'blur(30px)' }} />
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginBottom: 4 }}>Surah: {currentMeta.englishName}</p>
                                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Bahasa: {currentMeta.englishNameTranslation}</p>
                                    <div className="flex gap-3 mt-2">
                                        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Ayat: {currentMeta.numberOfAyahs}</span>
                                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>│</span>
                                        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Turun di: {currentMeta.revelationType === 'Meccan' ? 'Makkah' : 'Madinah'}</span>
                                    </div>
                                </div>
                                <p className="font-arabic text-white" style={{ fontSize: 24, direction: 'rtl' as const }}>{currentMeta.name}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Page/Juz/Hizb info card */}
            {!isSurahMode && readerMode !== 'juz' && (
                <div style={{ padding: '0 var(--app-padding-x)', marginBottom: 12 }}>
                    <div style={{ background: '#0B2D18', borderRadius: 16, padding: '14px 20px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: 'rgba(212,175,55,0.08)', borderRadius: '50%', filter: 'blur(25px)' }} />
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <p style={{ color: '#D4AF37', fontSize: 14, fontWeight: 700 }}>{readerTitle}</p>
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 }}>
                                {arabAyahs.length > 0 ? `${arabAyahs.length} Ayat` : ''}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Reader content */}
            <div ref={readerRef} className="flex-1 overflow-y-auto relative" style={{ paddingBottom: 200 }}>
                {/* Sticky Juz Header for Juz Mode */}
                {readerMode === 'juz' && !readerLoading && !readerError && arabAyahs.length > 0 && (
                    <div style={{
                        position: 'sticky', top: 0, zIndex: 20, pointerEvents: 'none',
                        display: 'flex', justifyContent: 'center', paddingTop: 10, marginBottom: -40
                    }}>
                        <div style={{
                            background: 'rgba(11, 45, 24, 0.85)', backdropFilter: 'blur(8px)',
                            padding: '6px 16px', borderRadius: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: 0.5 }}>
                                {readerTitle.toUpperCase()}
                            </p>
                        </div>
                    </div>
                )}

                {readerLoading && <ReaderSkeleton />}
                {readerError && <ErrorCard msg="Gagal memuat. Periksa koneksimu."
                    onRetry={() => {
                        if (readerMode === 'surah') fetchSurah(currentSurah);
                        else if (readerMode === 'juz') fetchJuz(currentJuz);
                        else fetchHizb(currentHizb);
                    }} />}

                {/* Basmalah (surah mode only, not At-Taubah) */}
                {!readerLoading && !readerError && arabAyahs.length > 0 && isSurahMode && currentSurah !== 9 && (
                    <div style={{ textAlign: 'center', padding: '12px var(--app-padding-x) 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 8 }}>
                            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, #D4AF37, transparent)' }} />
                            <span style={{ color: '#D4AF37', fontSize: 10 }}>✦</span>
                            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, #D4AF37, transparent)' }} />
                        </div>
                        <p className="font-arabic" style={{ fontSize: 22, color: '#D4AF37', lineHeight: 2 }}>
                            بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginTop: 8 }}>
                            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, #D4AF37, transparent)' }} />
                            <span style={{ color: '#D4AF37', fontSize: 10 }}>✦</span>
                            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, #D4AF37, transparent)' }} />
                        </div>
                    </div>
                )}

                {/* Ayah cards */}
                {!readerLoading && !readerError && (
                    isSurahMode
                        ? arabAyahs.map((ayah, idx) => renderAyahCard(ayah, idx, currentMeta?.englishName || '', currentSurah))
                        : renderAyahsWithDividers()
                )}
            </div>

            {/* Bottom navigation */}
            {!readerLoading && !readerError && arabAyahs.length > 0 && (
                <div
                    className="fixed left-0 right-0 w-full z-40 bg-[#FDFBF4] dark:bg-[#112116] shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.3)] border-t border-slate-200/60 dark:border-slate-800/60"
                    style={{ bottom: 'var(--nav-height, 64px)' }}
                >
                    <div className="mx-auto w-full px-5 py-3.5 flex justify-between items-center gap-3" style={{ maxWidth: 430 }}>
                        <button disabled={!canGoPrev} onClick={goPrev}
                            className="flex-1 py-3 rounded-full bg-white dark:bg-slate-800 border-2 border-[#17cf54] text-[#17cf54] text-xs font-bold active:scale-95 transition-all disabled:opacity-40 disabled:border-slate-300 disabled:text-slate-400 disabled:cursor-not-allowed shadow-sm flex justify-center items-center gap-1">
                            <span className="material-icons-outlined text-[16px]">chevron_left</span>
                            {prevLabel}
                        </button>
                        <button disabled={!canGoNext} onClick={goNext}
                            className="flex-1 py-3 rounded-full bg-[#17cf54] text-white text-xs font-bold active:scale-95 transition-all disabled:opacity-40 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed shadow-md shadow-[#17cf54]/25 hover:bg-[#15b84c] flex justify-center items-center gap-1">
                            {nextLabel}
                            <span className="material-icons-outlined text-[16px]">chevron_right</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
