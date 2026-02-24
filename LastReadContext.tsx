import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { LastRead } from '../types';
import { fetchLastRead as fetchLastReadFromDB, upsertLastRead } from '../services/supabaseService';

interface LastReadContextType {
    lastRead: LastRead | null;
    updateLastRead: (surah: number, ayah: number, name: string) => Promise<void>;
    refreshLastRead: () => Promise<void>;
}

const LastReadContext = createContext<LastReadContextType | undefined>(undefined);

export const LastReadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [lastRead, setLastRead] = useState<LastRead | null>(() => {
        try {
            const raw = localStorage.getItem('quran_last_surah');
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    });

    const userId = useMemo(() => {
        let id = localStorage.getItem('mizan_user_id');
        if (!id) {
            id = 'user_' + Math.random().toString(36).substring(2, 11);
            localStorage.setItem('mizan_user_id', id);
        }
        return id;
    }, []);

    const refreshLastRead = useCallback(async () => {
        try {
            const dbLastRead = await fetchLastReadFromDB(userId);
            if (dbLastRead) {
                const mapped: LastRead = {
                    surah: dbLastRead.surah_number,
                    ayah: dbLastRead.ayah_number,
                    surahName: dbLastRead.surah_name
                };
                setLastRead(mapped);
                localStorage.setItem('quran_last_surah', JSON.stringify(mapped));
            }
        } catch (err) {
            console.warn("LastReadContext: Sync failed", err);
        }
    }, [userId]);

    const updateLastRead = useCallback(async (surah: number, ayah: number, name: string) => {
        const lr: LastRead = { surah, ayah, surahName: name };
        setLastRead(lr);
        localStorage.setItem('quran_last_surah', JSON.stringify(lr));

        try {
            await upsertLastRead({
                user_id: userId,
                surah_number: surah,
                ayah_number: ayah,
                surah_name: name
            });
        } catch (err) {
            console.error("LastReadContext: Failed to save to DB:", err);
        }
    }, [userId]);

    useEffect(() => {
        refreshLastRead();
    }, [refreshLastRead]);

    return (
        <LastReadContext.Provider value={{ lastRead, updateLastRead, refreshLastRead }}>
            {children}
        </LastReadContext.Provider>
    );
};

export const useLastRead = () => {
    const context = useContext(LastReadContext);
    if (!context) {
        throw new Error('useLastRead must be used within a LastReadProvider');
    }
    return context;
};
