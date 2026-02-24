/**
 * supabaseService.ts
 * ─────────────────────────────────────────────────────────────────
 * Supabase REST API client tanpa library @supabase/supabase-js.
 * Semua call menggunakan fetch() dengan async/await.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface IbadahScore {
    id?: number;
    user_id?: string;
    tanggal: string;         // 'YYYY-MM-DD'
    score: number;
    subuh: boolean;
    dzuhur: boolean;
    ashar: boolean;
    maghrib: boolean;
    isya: boolean;
    sunnah_done: number;
    amalan_done: number;
    tilawah_pages: number;
    created_at?: string;
    last_updated?: string;
}

/** Common headers for every Supabase REST request */
const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    Prefer: 'return=representation',
};

/**
 * Upsert (insert or update) today's ibadah score.
 * Uses ON CONFLICT (user_id, tanggal) DO UPDATE via Prefer header.
 */
export async function upsertIbadahScore(
    data: Omit<IbadahScore, 'id' | 'created_at'>,
): Promise<IbadahScore> {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/ibadah_scores?on_conflict=user_id,tanggal`, {
        method: 'POST',
        headers: {
            ...headers,
            // Tell Supabase to upsert on the unique (user_id, tanggal) constraint
            Prefer: 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Supabase upsert error ${res.status}: ${errText}`);
    }

    const json = await res.json();
    return Array.isArray(json) ? json[0] : json;
}

/**
 * Fetch history for a given user sorted by tanggal descending.
 * @param days — how many recent days to return (7 or 30)
 */
export async function fetchIbadahHistory(
    days: number,
    userId = 'default_user',
): Promise<IbadahScore[]> {
    // Calculate the ISO date 'days' ago
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0]; // 'YYYY-MM-DD'

    const params = new URLSearchParams({
        user_id: `eq.${userId}`,
        tanggal: `gte.${sinceStr}`,
        order: 'tanggal.desc',
        limit: String(days),
    });

    const res = await fetch(
        `${SUPABASE_URL}/rest/v1/ibadah_scores?${params}`,
        {
            method: 'GET',
            headers: {
                ...headers,
                Accept: 'application/json',
            },
        },
    );

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Supabase fetch error ${res.status}: ${errText}`);
    }

    return res.json();
}

// ── Quran Bookmarks & Last Read ──

export interface QuranBookmark {
    id?: number;
    user_id: string;
    surah_number: number;
    ayah_number: number;
    surah_name: string;
    updated_at?: string;
}

/**
 * Upsert the last read position for the user.
 */
export async function upsertLastRead(
    data: Omit<QuranBookmark, 'id' | 'updated_at'>,
): Promise<QuranBookmark> {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/last_reads?on_conflict=user_id`, {
        method: 'POST',
        headers: {
            ...headers,
            Prefer: 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Supabase last_reads upsert error ${res.status}: ${errText}`);
    }

    const json = await res.json();
    return Array.isArray(json) ? json[0] : json;
}

/**
 * Fetch the last read position for a user.
 */
export async function fetchLastRead(userId = 'default_user'): Promise<QuranBookmark | null> {
    const params = new URLSearchParams({
        user_id: `eq.${userId}`,
        limit: '1',
    });

    const res = await fetch(
        `${SUPABASE_URL}/rest/v1/last_reads?${params}`,
        {
            method: 'GET',
            headers: {
                ...headers,
                Accept: 'application/json',
            },
        },
    );

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Supabase fetch last read error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return data.length > 0 ? data[0] : null;
}
