/**
 * usePrayerData.ts — shared hook for prayer times, hijri, Asma Al-Husna
 * ──────────────────────────────────────────────────────────────────────
 * Single source of truth used by Home, Jadwal, and IbadahTracker.
 *  - Fetches AlAdhan /timings (prayer + hijri)
 *  - Fetches Nominatim reverse geocoding
 *  - Fetches /asmaAlHusna (all 99)
 *  - Real-time clock, active prayer, countdown (every 1 s)
 *  - Midnight auto-refresh for new day
 *  - localStorage cache with per-day key
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// ── Fallback coordinates: Jakarta ─────────────────────────────
const DEFAULT_LAT = -6.2088;
const DEFAULT_LON = 106.8456;

// ── Types ─────────────────────────────────────────────────────
export interface PrayerEntry {
    id: string;
    name: string;
    time: string;       // "HH:MM"
    icon: string;
    minutes: number;
}

export interface HijriInfo {
    day: string;
    month: string;
    monthAr: string;
    year: string;
    weekday: string;
    designation: string;
}

export interface AsmaItem {
    name: string;
    transliteration: string;
    number: number;
    en: { meaning: string };
}

// ── Helpers ───────────────────────────────────────────────────
function timeToMinutes(t: string): number {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

function pad(n: number) { return String(n).padStart(2, '0'); }

function todayKey(lat: number, lon: number) {
    const d = new Date();
    return `prayer_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${lat.toFixed(2)}_${lon.toFixed(2)}`;
}

function ddmmyyyy() {
    const d = new Date();
    return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

// ── Indonesian translations for Asma Al-Husna ─────────────────
export const ASMA_ID: Record<string, string> = {
    'The All Merciful': 'Yang Maha Pemurah',
    'The Most Merciful': 'Yang Maha Penyayang',
    'The King': 'Yang Maha Merajai',
    'The Most Holy': 'Yang Maha Suci',
    'The Source of Peace': 'Yang Maha Memberi Keselamatan',
    'The Guardian of Faith': 'Yang Maha Memberi Keamanan',
    'The Preserver of Safety': 'Yang Maha Memelihara',
    'The Mighty': 'Yang Maha Perkasa',
    'The Compeller': 'Yang Memiliki Mutlak Kegagahan',
    'The Greatest': 'Yang Maha Megah',
    'The Creator': 'Yang Maha Pencipta',
    'The Evolver': 'Yang Maha Mengadakan',
    'The Fashioner of Forms': 'Yang Maha Membentuk Rupa',
    'The Ever Forgiving': 'Yang Maha Pengampun',
    'The All Subduer': 'Yang Maha Menundukkan',
    'The Bestower': 'Yang Maha Pemberi',
    'The Provider': 'Yang Maha Pemberi Rezeki',
    'The Opener': 'Yang Maha Pembuka',
    'The All Knowing': 'Yang Maha Mengetahui',
    'The Restrainer': 'Yang Maha Menyempitkan',
    'The Extender': 'Yang Maha Melapangkan',
    'The Abaser': 'Yang Maha Merendahkan',
    'The Exalter': 'Yang Maha Meninggikan',
    'The Giver of Honour': 'Yang Maha Memuliakan',
    'The Giver of Dishonour': 'Yang Maha Menghinakan',
    'The All Hearing': 'Yang Maha Mendengar',
    'The All Seeing': 'Yang Maha Melihat',
    'The Judge': 'Yang Maha Menetapkan Hukum',
    'The Utterly Just': 'Yang Maha Adil',
    'The Subtly Kind': 'Yang Maha Lembut',
    'The All Aware': 'Yang Maha Mengetahui',
    'The Forbearing': 'Yang Maha Penyantun',
    'The Magnificent': 'Yang Maha Agung',
    'The Much-Forgiving': 'Yang Maha Pengampun',
    'The Grateful': 'Yang Maha Pembalas Budi',
    'The Most High': 'Yang Maha Tinggi',
    'The Most Great': 'Yang Maha Besar',
    'The Preserver': 'Yang Maha Memelihara',
    'The Nourisher': 'Yang Maha Pemberi Kecukupan',
    'The Bringer of Judgment': 'Yang Maha Membuat Perhitungan',
    'The Majestic': 'Yang Mempunyai Kebesaran dan Kemuliaan',
    'The Generous': 'Yang Maha Pemurah',
    'The Watchful': 'Yang Maha Mengawasi',
    'The Responsive': 'Yang Maha Mengabulkan',
    'The Vast': 'Yang Maha Luas',
    'The Wise': 'Yang Maha Bijaksana',
    'The Loving': 'Yang Maha Mengasihi',
    'The Glorious': 'Yang Maha Mulia',
    'The Resurrector': 'Yang Maha Membangkitkan',
    'The Witness': 'Yang Maha Menyaksikan',
    'The Truth': 'Yang Maha Benar',
    'The Trustee': 'Yang Maha Memelihara',
    'The Strong': 'Yang Maha Kuat',
    'The Firm': 'Yang Maha Kokoh',
    'The Protecting Friend': 'Yang Maha Melindungi',
    'The Praiseworthy': 'Yang Maha Terpuji',
    'The Counting': 'Yang Maha Menghitung',
    'The Originator': 'Yang Maha Memulai',
    'The Restorer': 'Yang Maha Mengembalikan',
    'The Giver of Life': 'Yang Maha Menghidupkan',
    'The Bringer of Death': 'Yang Maha Mematikan',
    'The Living': 'Yang Maha Hidup',
    'The Subsisting': 'Yang Maha Berdiri Sendiri',
    'The Finder': 'Yang Maha Menemukan',
    'The Noble': 'Yang Maha Mulia',
    'The Unique': 'Yang Maha Esa',
    'The One': 'Yang Maha Esa',
    'The Eternal': 'Yang Maha Dibutuhkan',
    'The Able': 'Yang Maha Kuasa',
    'The Powerful': 'Yang Maha Menentukan',
    'The Expediter': 'Yang Maha Mendahulukan',
    'The Delayer': 'Yang Maha Mengakhirkan',
    'The First': 'Yang Maha Awal',
    'The Last': 'Yang Maha Akhir',
    'The Manifest': 'Yang Maha Nyata',
    'The Hidden': 'Yang Maha Tersembunyi',
    'The Governor': 'Yang Maha Memerintah',
    'The Most Exalted': 'Yang Maha Tinggi',
    'The Source of Goodness': 'Yang Maha Penderma',
    'The Acceptor of Repentance': 'Yang Maha Penerima Taubat',
    'The Avenger': 'Yang Maha Pembalas',
    'The Pardoner': 'Yang Maha Pemaaf',
    'The Kind': 'Yang Maha Belas Kasih',
    'Owner of Sovereignty': 'Pemilik Kerajaan',
    'The Lord of Majesty and Generosity': 'Pemilik Keagungan dan Kemuliaan',
    'The Just': 'Yang Maha Adil',
    'The Gatherer': 'Yang Maha Mengumpulkan',
    'The Self Sufficient': 'Yang Maha Kaya',
    'The Enricher': 'Yang Maha Pemberi Kekayaan',
    'The Defender': 'Yang Maha Mencegah',
    'The Distresser': 'Yang Maha Pemberi Mudarat',
    'The Propitious': 'Yang Maha Pemberi Manfaat',
    'The Light': 'Yang Maha Bercahaya (Nur)',
    'The Guide': 'Yang Maha Pemberi Petunjuk',
    'The Incomparable': 'Yang Maha Pencipta',
    'The Everlasting': 'Yang Maha Kekal',
    'The Inheritor': 'Yang Maha Mewarisi',
    'The Guide to the Right Path': 'Yang Maha Pandai',
    'The Timeless': 'Yang Maha Sabar',
};

// ── Hook ──────────────────────────────────────────────────────
export function usePrayerData(cityFallback = 'Jakarta', countryFallback = 'Indonesia') {
    const [clock, setClock] = useState('');
    const [seconds, setSeconds] = useState('');
    const [prayers, setPrayers] = useState<PrayerEntry[]>([]);
    const [hijri, setHijri] = useState<HijriInfo | null>(null);
    const [cityName, setCityName] = useState(cityFallback);
    const [countryName, setCountryName] = useState(countryFallback);
    const [allAsma, setAllAsma] = useState<AsmaItem[]>([]);
    const [todayAsma, setTodayAsma] = useState<AsmaItem | null>(null);
    const [todayAsmaIndex, setTodayAsmaIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activePrayerIdx, setActivePrayerIdx] = useState(-1);
    const [nextPrayerIdx, setNextPrayerIdx] = useState(-1);
    const [countdown, setCountdown] = useState('');
    const [nextPrayerName, setNextPrayerName] = useState('');
    const [dateLabel, setDateLabel] = useState('');
    const [colonVisible, setColonVisible] = useState(true);

    const coordsRef = useRef({ lat: DEFAULT_LAT, lon: DEFAULT_LON });
    const prayersRef = useRef<PrayerEntry[]>([]);

    // ── Fetch all API data ──────────────────────────────────────
    const fetchData = useCallback(async (lat: number, lon: number) => {
        setLoading(true);
        setError(null);

        try {
            const cacheKey = todayKey(lat, lon);
            const cached = localStorage.getItem(cacheKey);
            let timingsData: any = null;

            if (cached) {
                timingsData = JSON.parse(cached);
            } else {
                const res = await fetch(
                    `https://api.aladhan.com/v1/timings/${ddmmyyyy()}?latitude=${lat}&longitude=${lon}&method=11`
                );
                if (!res.ok) throw new Error(`AlAdhan API error: ${res.status}`);
                const json = await res.json();
                timingsData = json.data;
                localStorage.setItem(cacheKey, JSON.stringify(timingsData));
            }

            // Parse prayer times
            const t = timingsData.timings;
            const pList: PrayerEntry[] = [
                { id: 'subuh', name: 'Subuh', time: t.Fajr?.split(' ')[0], icon: 'wb_twilight', minutes: 0 },
                { id: 'dzuhur', name: 'Dzuhur', time: t.Dhuhr?.split(' ')[0], icon: 'sunny', minutes: 0 },
                { id: 'ashar', name: 'Ashar', time: t.Asr?.split(' ')[0], icon: 'wb_sunny', minutes: 0 },
                { id: 'maghrib', name: 'Maghrib', time: t.Maghrib?.split(' ')[0], icon: 'partly_cloudy_night', minutes: 0 },
                { id: 'isya', name: 'Isya', time: t.Isha?.split(' ')[0], icon: 'nightlight', minutes: 0 },
            ];
            pList.forEach(p => { p.minutes = timeToMinutes(p.time); });
            setPrayers(pList);
            prayersRef.current = pList;

            // Parse hijri
            const h = timingsData.date?.hijri;
            if (h) {
                setHijri({
                    day: h.day,
                    month: h.month?.en ?? '',
                    monthAr: h.month?.ar ?? '',
                    year: h.year,
                    weekday: h.weekday?.en ?? '',
                    designation: h.designation?.abbreviated ?? 'H',
                });
            }

            // Reverse geocoding
            try {
                const geoRes = await fetch(
                    `/api/nominatim/reverse?lat=${lat}&lon=${lon}&format=json`,
                    { headers: { 'Accept-Language': 'id' } }
                );
                if (geoRes.ok) {
                    const geo = await geoRes.json();
                    const addr = geo.address;
                    setCityName(addr?.city || addr?.town || addr?.county || addr?.state || cityFallback);
                    setCountryName(addr?.country || countryFallback);
                }
            } catch { /* silent */ }

            // Asma Al-Husna (all 99)
            try {
                const asmaRes = await fetch('https://api.aladhan.com/v1/asmaAlHusna');
                if (asmaRes.ok) {
                    const asmaJson = await asmaRes.json();
                    const list: AsmaItem[] = asmaJson.data ?? [];
                    setAllAsma(list);
                    if (list.length > 0) {
                        const dayOfYear = Math.floor(
                            (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
                        );
                        const idx = dayOfYear % list.length;
                        setTodayAsmaIndex(idx);
                        setTodayAsma(list[idx]);
                    }
                }
            } catch { /* non-critical */ }

        } catch (e: any) {
            setError(e.message ?? 'Gagal memuat data');
        } finally {
            setLoading(false);
        }
    }, [cityFallback, countryFallback]);

    // ── Geolocation + initial fetch ─────────────────────────────
    useEffect(() => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    coordsRef.current = { lat: pos.coords.latitude, lon: pos.coords.longitude };
                    fetchData(pos.coords.latitude, pos.coords.longitude);
                },
                () => fetchData(DEFAULT_LAT, DEFAULT_LON),
                { timeout: 8000, maximumAge: 300000 }
            );
        } else {
            fetchData(DEFAULT_LAT, DEFAULT_LON);
        }
    }, [fetchData]);

    // ── Real-time clock + active prayer + countdown (every 1 s) ─
    useEffect(() => {
        let toggle = true;
        const tick = () => {
            const now = new Date();
            setClock(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
            setSeconds(`:${pad(now.getSeconds())}`);
            toggle = !toggle;
            setColonVisible(toggle);

            // Date label
            setDateLabel(now.toLocaleDateString('id-ID', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            }));

            const pl = prayersRef.current;
            if (pl.length === 0) return;

            const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

            let activeIdx = -1;
            let nextIdx = -1;

            for (let i = 0; i < pl.length; i++) {
                const nextI = i + 1 < pl.length ? i + 1 : -1;
                const start = pl[i].minutes;
                const end = nextI >= 0 ? pl[nextI].minutes : 1440;
                if (nowMin >= start && nowMin < end) {
                    activeIdx = i;
                    nextIdx = nextI >= 0 ? nextI : 0;
                    break;
                }
            }

            if (activeIdx === -1 && nowMin < pl[0].minutes) {
                activeIdx = -1;
                nextIdx = 0;
            }
            if (activeIdx === -1 && nowMin >= pl[pl.length - 1].minutes) {
                activeIdx = pl.length - 1;
                nextIdx = 0;
            }

            setActivePrayerIdx(activeIdx);
            setNextPrayerIdx(nextIdx);

            if (nextIdx >= 0 && nextIdx < pl.length) {
                let targetMin = pl[nextIdx].minutes;
                if (targetMin <= nowMin) targetMin += 1440;
                const diff = (targetMin - nowMin) * 60;
                const dh = Math.floor(diff / 3600);
                const dm = Math.floor((diff % 3600) / 60);
                const ds = Math.floor(diff % 60);
                setCountdown(`${pad(dh)}:${pad(dm)}:${pad(ds)}`);
                setNextPrayerName(pl[nextIdx].name);
            }
        };

        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, []);

    // ── Auto-refresh at midnight ────────────────────────────────
    useEffect(() => {
        const checkMidnight = setInterval(() => {
            const n = new Date();
            if (n.getHours() === 0 && n.getMinutes() === 0 && n.getSeconds() < 2) {
                fetchData(coordsRef.current.lat, coordsRef.current.lon);
            }
        }, 1000);
        return () => clearInterval(checkMidnight);
    }, [fetchData]);

    return {
        clock, seconds, colonVisible, dateLabel,
        prayers, hijri,
        cityName, countryName,
        allAsma, todayAsma, todayAsmaIndex,
        loading, error,
        activePrayerIdx, nextPrayerIdx,
        countdown, nextPrayerName,
        refetch: () => fetchData(coordsRef.current.lat, coordsRef.current.lon),
    };
}
