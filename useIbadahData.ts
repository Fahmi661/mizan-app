import { useState, useEffect } from 'react';
import { upsertIbadahScore } from '../services/supabaseService';

// Tipe Data untuk Ibadah
export interface Task {
    id: string;
    title: string;
    type: 'Sholat Wajib' | 'Ibadah Sunnah' | 'Amalan Khusus';
    icon: string;
    subtitle?: string;
    checked: boolean;
    color: string;
}

const DEFAULT_TASKS: Task[] = [
    { id: 'subuh', title: 'Subuh', type: 'Sholat Wajib', icon: 'wb_twilight', subtitle: 'Tepat waktu • Berjamaah', checked: true, color: 'text-primary bg-primary/10' },
    { id: 'dzuhur', title: 'Dzuhur', type: 'Sholat Wajib', icon: 'sunny', checked: false, color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' },
    { id: 'ashar', title: 'Ashar', type: 'Sholat Wajib', icon: 'wb_sunny', checked: true, color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30' },
    { id: 'maghrib', title: 'Maghrib', type: 'Sholat Wajib', icon: 'wb_twilight', checked: true, color: 'text-red-600 bg-red-100 dark:bg-red-900/30' },
    { id: 'isya', title: 'Isya', type: 'Sholat Wajib', icon: 'bedtime', checked: false, color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30' },

    { id: 'tahajjud', title: 'Tahajjud', type: 'Ibadah Sunnah', icon: 'bedtime', subtitle: "8 Raka'at + Witr", checked: false, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' },
    { id: 'dhuha', title: 'Dhuha', type: 'Ibadah Sunnah', icon: 'self_improvement', checked: true, color: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30' },

    { id: 'tilawah', title: 'Tilawah Al-Quran', type: 'Amalan Khusus', icon: 'menu_book', subtitle: 'Target: 1 Juz • Juz 15', checked: true, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' },
    { id: 'sedekah', title: 'Sedekah Harian', type: 'Amalan Khusus', icon: 'volunteer_activism', checked: false, color: 'text-pink-600 bg-pink-100 dark:bg-pink-900/30' }
];

export const useIbadahData = () => {
    // State Utama untuk menyimpan checklist tugas ibadah (Muat dari LocalStorage jika ada)
    const [tasks, setTasks] = useState<Task[]>(() => {
        const saved = localStorage.getItem('ramadan_ibadah_tasks');
        return saved ? JSON.parse(saved) : DEFAULT_TASKS;
    });

    // Auto-Reset & Sync on newly loaded day
    useEffect(() => {
        const checkAndResetDaily = async () => {
            const todayStr = new Date().toISOString().split('T')[0];
            const lastUpdatedDate = localStorage.getItem('ramadan_ibadah_last_updated_date');

            if (lastUpdatedDate !== todayStr) {
                // Different day detected: reset all statuses
                const resetTasks = tasks.map(t => ({ ...t, checked: false }));
                setTasks(resetTasks);
                localStorage.setItem('ramadan_ibadah_tasks', JSON.stringify(resetTasks));
                localStorage.setItem('ramadan_ibadah_last_updated_date', todayStr);

                try {
                    // Segera perbarui ke Supabase dengan status tanggal hari ini (reset status kosong)
                    await upsertIbadahScore({
                        user_id: 'default_user',
                        tanggal: todayStr,
                        score: 0,
                        subuh: false,
                        dzuhur: false,
                        ashar: false,
                        maghrib: false,
                        isya: false,
                        sunnah_done: 0,
                        amalan_done: 0,
                        tilawah_pages: 0,
                        last_updated: new Date().toISOString()
                    });
                    console.log('Sukses: Tracker direset untuk hari baru dan disinkronkan ke Supabase');
                } catch (error) {
                    console.error('Gagal saat sinkronisasi reset ke Supabase:', error);
                }
            }
        };

        checkAndResetDaily();
    }, []);

    // Simpan ke LocalStorage tiap kali array 'tasks' berubah isinya
    useEffect(() => {
        localStorage.setItem('ramadan_ibadah_tasks', JSON.stringify(tasks));
    }, [tasks]);

    // Fungsi Toggle: Dipanggil di IbadahTracker.tsx saat User ngeklik Centang/Uncheck
    const toggleTask = (taskId: string) => {
        setTasks(currentTasks =>
            currentTasks.map(task =>
                task.id === taskId ? { ...task, checked: !task.checked } : task
            )
        );
    };

    // Fungsi Statistik Dasar (Selesai, Belum, Streak)
    const stats = {
        done: tasks.filter(t => t.checked).length,
        pending: tasks.filter(t => !t.checked).length,
        total: tasks.length,
        streak: 8, // Dummy data, but can be scaled
        percentageComplete: Math.round((tasks.filter(t => t.checked).length / tasks.length) * 100) || 0,
    };

    // Analytics Generator: Membedah Array tugas untuk jadi Chart Analytics (Real-time!)
    const generateAnalytics = () => {
        // 1. Hitung Skor Ibadah (Gauge Hitung Dinamis)
        // Sholat Wajib Poin Besar (60%), Sunnah (20%), Khusus (20%)
        const wajibTasks = tasks.filter(t => t.type === 'Sholat Wajib');
        const sunnahTasks = tasks.filter(t => t.type === 'Ibadah Sunnah');
        const khususTasks = tasks.filter(t => t.type === 'Amalan Khusus');

        const wajibScore = wajibTasks.filter(t => t.checked).length / wajibTasks.length * 60;
        const sunnahScore = sunnahTasks.filter(t => t.checked).length / sunnahTasks.length * 20;
        const khususScore = khususTasks.filter(t => t.checked).length / khususTasks.length * 20;

        const totalScore = Math.round(wajibScore + sunnahScore + khususScore);

        // 2. Data Komposisi Sholat (Apakah Subuh Dicentang dsb)
        const sholatComposition = {
            Subuh: tasks.find(t => t.id === 'subuh')?.checked ? 100 : 0,
            Dzuhur: tasks.find(t => t.id === 'dzuhur')?.checked ? 100 : 0,
            Ashar: tasks.find(t => t.id === 'ashar')?.checked ? 100 : 0,
            Maghrib: tasks.find(t => t.id === 'maghrib')?.checked ? 100 : 0,
            Isya: tasks.find(t => t.id === 'isya')?.checked ? 100 : 0,
        };

        return {
            totalScore,
            sholatComposition,
        };
    };

    const analyticsData = generateAnalytics();

    return {
        tasks,
        toggleTask,
        stats,
        analyticsData
    };
};
