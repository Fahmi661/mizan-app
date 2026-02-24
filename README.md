<div align="center">

<br/>

<img src="https://ufxjvugkmiorxlogvcmx.supabase.co/storage/v1/object/sign/FILE%20WEB/LOGO%20APP%20MIZAN.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xZTU4ZTM4Yi1jZjFhLTRhZTktOWIyNC00YzBhMmE4ZjYxNmEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJGSUxFIFdFQi9MT0dPIEFQUCBNSVpBTi5wbmciLCJpYXQiOjE3NzE5MTM5MjAsImV4cCI6MTgzNDk4NTkyMH0.n5KKnhgRuz6ADJ4j5Ub5vMjgFJs2FMQXnkVniCvnViM" alt="Mizan Logo" width="160" />

<br/><br/>

### **مِيزَان** — *The Scale of Balance*

**A Premium Islamic Companion App · Built for Ramadan & Beyond**

<br/>

[![PWA Ready](https://img.shields.io/badge/PWA-Ready-4caf6e?style=for-the-badge&logo=googlechrome&logoColor=white)](https://web.dev/progressive-web-apps/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Netlify](https://img.shields.io/badge/Netlify-Deployed-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)](https://netlify.com/)
[![License](https://img.shields.io/badge/License-MIT-D4AF37?style=for-the-badge)](LICENSE)

<br/>

> *"Sesungguhnya amal itu tergantung niatnya."*
> — HR. Bukhari & Muslim

<br/>

---

</div>

<br/>

## 🌙 Overview

**Mizan** (مِيزَان — *Timbangan*) adalah Progressive Web App premium yang dirancang sebagai pendamping spiritual Ramadhan yang lengkap dan elegan. Lebih dari sekadar pengingat sholat, Mizan menghadirkan ekosistem ibadah digital yang terintegrasi — dari arah kiblat yang akurat hingga pelacak ibadah harian yang cerdas.

Dibangun dengan filosofi *"form follows function"* namun tanpa mengorbankan estetika. Setiap piksel dirancang dengan tujuan, setiap interaksi terasa alami dan bermakna.

<br/>

---

<br/>

## ✨ Fitur Utama

<br/>

### 🕌 Jadwal Sholat Real-time
Jadwal sholat yang akurat berdasarkan lokasi GPS pengguna, didukung oleh **Al-Adhan API** dengan 12+ metode kalkulasi. Dilengkapi countdown ke waktu sholat berikutnya dan notifikasi push yang dapat dikustomisasi.

```
Fajr · Sunrise · Dhuhr · Asr · Maghrib · Isha
```

<br/>

### 🧭 Qibla Finder — Smooth Motion Sensor
Kompas kiblat berbasis **Device Orientation API** dengan motion smoothing yang halus. Jarum kompas bergerak responsif mengikuti orientasi perangkat, dilengkapi efek suara satisfying saat diputar untuk pengalaman yang lebih imersif.

<br/>

### 📿 Tasbih Digital — Audio Feedback
Penghitung tasbih digital dengan 30+ dzikir pilihan, lengkap dengan teks Arab, latin, dan terjemahan. Dilengkapi audio feedback yang menenangkan dan target counter yang dapat dikustomisasi.

<br/>

### 💰 Kalkulator Zakat
Kalkulator komprehensif untuk dua jenis zakat:

| Jenis | Keterangan |
|-------|------------|
| **Zakat Fitrah** | Berdasarkan harga beras lokal & jumlah jiwa |
| **Zakat Maal** | Perhitungan nisab emas & perak dengan harga terkini |

<br/>

### 📊 Ibadah Tracker — Auto-Reset Harian
Sistem pelacakan ibadah harian dengan mekanisme reset otomatis tengah malam. Track sholat wajib, sholat sunnah, tilawah, dan ibadah Ramadhan lainnya. Visualisasi progress yang motivatif dan historis.

<br/>

### 📖 Al-Qur'an Digital
Baca Al-Qur'an langsung dalam aplikasi, lengkap dengan teks Arab berkualitas tinggi menggunakan font **Amiri**. Fitur *Last Read* menyimpan posisi terakhir membaca secara otomatis.

<br/>

### 🗓️ Kalender Islam
Tampilan kalender Hijriyah terintegrasi dengan penanda hari-hari penting Islam dan konversi tanggal Masehi-Hijriyah yang akurat.

<br/>

---

<br/>

## 🏗️ Arsitektur & Teknologi

<br/>

```
┌─────────────────────────────────────────────────────────┐
│                    MIZAN ARCHITECTURE                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   ┌─────────────┐    ┌──────────────┐    ┌──────────┐  │
│   │   React 19  │───▶│  TypeScript  │───▶│   Vite   │  │
│   │  (Frontend) │    │    5.8       │    │  (Build) │  │
│   └─────────────┘    └──────────────┘    └──────────┘  │
│          │                                              │
│          ▼                                              │
│   ┌─────────────────────────────────────────────────┐  │
│   │              External APIs                      │  │
│   │  Al-Adhan API · Al-Qur'an Cloud · Nominatim    │  │
│   └─────────────────────────────────────────────────┘  │
│          │                                              │
│          ▼                                              │
│   ┌─────────────┐    ┌──────────────┐                  │
│   │  Supabase   │    │   Netlify    │                  │
│   │ (DB+Storage)│    │  (CDN+Edge) │                  │
│   └─────────────┘    └──────────────┘                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

<br/>

### Tech Stack

| Layer | Teknologi | Keterangan |
|-------|-----------|------------|
| **Frontend** | React 19 + TypeScript | UI library terbaru dengan type safety penuh |
| **Styling** | Tailwind CSS v4 | Utility-first CSS dengan design system kustom |
| **Build Tool** | Vite 6 | Ultra-fast HMR dan optimized production build |
| **Database** | Supabase (PostgreSQL) | Realtime database & file storage |
| **Deployment** | Netlify | Global CDN dengan edge functions |
| **APIs** | Al-Adhan, Al-Qur'an Cloud, Nominatim | Sumber data Islamic terpercaya |
| **PWA** | Web App Manifest + Service Worker | Pengalaman native di mobile |
| **Icons** | Lucide React + Material Symbols | Konsistensi ikon di seluruh aplikasi |
| **Typography** | Amiri (Arab) · Plus Jakarta Sans | Estetika Islamic yang modern |

<br/>

---

<br/>

## 🔐 Keamanan

Mizan dirancang dengan pendekatan **security-by-default**:

```
✅  Content Security Policy (CSP) — Mencegah XSS & injection attacks
✅  Anti-Clickjacking Protection — Frame-buster implementation
✅  Secure Environment Variables — API keys tidak ter-expose ke client
✅  CORS Configuration — Akses API dikontrol ketat via proxy
✅  SQL Injection Prevention — Supabase Row Level Security (RLS)
✅  Standard Security Headers — X-Frame-Options, X-XSS-Protection
✅  HTTPS Enforcement — All connections encrypted
```

<br/>

---

<br/>

## 🚀 Memulai Pengembangan Lokal

<br/>

### Prasyarat

```bash
Node.js >= 18.0.0
npm >= 9.0.0
```

<br/>

### Instalasi

```bash
# 1. Clone repository
git clone https://github.com/username/mizan.git
cd mizan

# 2. Install dependencies
npm install

# 3. Konfigurasi environment variables
cp .env.example .env.local
```

<br/>

### Environment Variables

Buat file `.env.local` di root project:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# API URLs (opsional — sudah ada default)
VITE_ALADHAN_API_URL=https://api.aladhan.com
VITE_QURAN_API_URL=https://api.alquran.cloud
VITE_NOMINATIM_API_URL=https://nominatim.openstreetmap.org
```

<br/>

### Menjalankan Development Server

```bash
npm run dev
# App berjalan di http://localhost:3000
```

<br/>

### Build untuk Production

```bash
npm run build     # Build optimized production bundle
npm run preview   # Preview production build secara lokal
```

<br/>

---

<br/>

## 📁 Struktur Proyek

```
mizan/
├── 📂 src/
│   ├── 📂 components/       # Reusable UI components
│   │   └── BottomNav.tsx    # Bottom navigation bar
│   ├── 📂 screens/          # Halaman utama aplikasi
│   │   ├── Home.tsx         # Dashboard utama
│   │   ├── Jadwal.tsx       # Jadwal sholat
│   │   ├── Kiblat.tsx       # Kompas kiblat
│   │   ├── Tasbih.tsx       # Tasbih digital
│   │   ├── Zakat.tsx        # Kalkulator zakat
│   │   ├── Quran.tsx        # Al-Qur'an reader
│   │   ├── IbadahTracker.tsx # Tracker ibadah
│   │   └── KalenderIslam.tsx # Kalender Hijriyah
│   ├── 📂 context/          # React Context providers
│   ├── App.tsx              # Root component & routing
│   ├── constants.ts         # Konstanta & konfigurasi
│   └── types.ts             # TypeScript type definitions
├── 📄 index.html            # Entry point HTML
├── 📄 vite.config.ts        # Vite configuration
├── 📄 netlify.toml          # Netlify deployment config
├── 📄 vercel.json           # Vercel deployment config
└── 📄 tsconfig.json         # TypeScript configuration
```

<br/>

---

<br/>

## 🌐 Deployment

<br/>

Mizan dikonfigurasi untuk deployment di **Netlify** dengan API proxy built-in untuk menghindari CORS issues:

```toml
# netlify.toml — API Proxy Routes
/api/aladhan/*  →  https://api.aladhan.com/*
/api/quran/*    →  https://api.alquran.cloud/*
/api/nominatim/* →  https://nominatim.openstreetmap.org/*
```

Deploy otomatis setiap push ke branch `main`. Preview deploy tersedia untuk setiap Pull Request.

<br/>

---

<br/>

## 👤 Tentang Pengembang ( AHMAD FAHMI FADILLAH)

<br/>

<div align="center">

### **Lead Technical Architect & Product Designer**

</div>

Saya merancang dan membangun Mizan dari nol — mulai dari ideasi hingga produk jadi yang siap digunakan jutaan Muslim. Peran saya mencakup seluruh spektrum pengembangan produk:

**🎨 Product Design**
Merancang seluruh *user journey* dan *information architecture* dari nol. Setiap screen, setiap flow, setiap micro-interaction dipikirkan dengan cermat untuk menciptakan pengalaman yang intuitif, elegan, dan bermakna secara spiritual.

**🏛️ System Architecture**
Merancang arsitektur database Supabase dengan skema yang efisien, memilih stack teknologi yang tepat, dan membangun sistem API proxy untuk keamanan dan performa optimal.

**🔒 Security Engineering**
Mengimplementasikan lapisan keamanan berlapis mulai dari Content Security Policy, anti-clickjacking, secure environment variables, hingga database-level Row Level Security di Supabase.

**🎭 Visual Identity & Branding**
Menciptakan identitas visual Mizan — dari pemilihan palet warna yang terinspirasi dari estetika Islamic (*forest green, gold, cream*), tipografi Arab yang elegan menggunakan font Amiri, hingga motion design yang smooth dan satisfying.

<br/>

---

<br/>

## 📊 Roadmap

```
✅  v1.0 — Core Features (Jadwal, Kiblat, Tasbih, Zakat, Quran)
✅  v1.1 — PWA Support & Offline Mode
✅  v1.2 — Kalender Islam & Ibadah Tracker
🔄  v1.3 — Notifikasi Adzan Push (In Progress)
📋  v1.4 — Widget Homescreen (Android)
📋  v2.0 — Komunitas & Tantangan Ramadhan Bersama
```

<br/>

---

<br/>

## 🤝 Kontribusi

Kontribusi selalu disambut dengan hangat. Silakan baca [CONTRIBUTING.md](CONTRIBUTING.md) untuk panduan lengkap.

```bash
# Fork → Clone → Branch → Commit → Push → Pull Request
git checkout -b feature/nama-fitur-baru
git commit -m "feat: tambahkan fitur xyz"
git push origin feature/nama-fitur-baru
```

<br/>

---

<br/>

## 📜 Lisensi

Didistribusikan di bawah Lisensi MIT. Lihat [LICENSE](LICENSE) untuk informasi lengkap.

<br/>

---

<br/>

<div align="center">

**Dibuat dengan ❤️ dan نِيَّة yang baik**

*Semoga aplikasi ini menjadi amal jariyah yang terus mengalir.*

<br/>

[![Made with React](https://img.shields.io/badge/Made%20with-React-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![Powered by Supabase](https://img.shields.io/badge/Powered%20by-Supabase-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![Deployed on Netlify](https://img.shields.io/badge/Deployed%20on-Netlify-00C7B7?style=flat-square&logo=netlify)](https://netlify.com)

<br/>

**بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ**

</div>
