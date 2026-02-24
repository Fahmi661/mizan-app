export interface PrayerTiming {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  [key: string]: string;
}

export interface PrayerData {
  timings: PrayerTiming;
  date: {
    readable: string;
    hijri: {
      date: string;
      month: {
        en: string;
        ar: string;
      };
      weekday: {
        en: string;
        ar: string;
      }
    };
  };
}

export interface DhikrOption {
  id: string;
  arabic: string;
  latin: string;
  meaning: string;
  target: number;
}

export interface UserSettings {
  name: string;
  city: string;
  country: string;
  calculationMethod: number;
  notificationsEnabled: boolean;
  themeMode: 'auto' | 'light' | 'dark';
}

export enum Tab {
  HOME = 'home',
  JADWAL = 'jadwal',
  TASBIH = 'tasbih',
  ZAKAT = 'zakat',
  IBADAH = 'ibadah',
  QURAN = 'quran',
  KALENDER = 'kalender',
  KIBLAT = 'kiblat',
}

export interface LastRead {
  surah: number;
  ayah: number;
  surahName: string;
}