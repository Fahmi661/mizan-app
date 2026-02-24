import React, { useState } from 'react';

interface ZakatProps {
    onInstall?: () => void;
}

export const Zakat: React.FC<ZakatProps> = ({ onInstall }) => {
    const [activeTab, setActiveTab] = useState<'fitrah' | 'maal'>('fitrah');

    // Fitrah State
    const [fitrahPeople, setFitrahPeople] = useState(1);
    const [ricePrice, setRicePrice] = useState(45000);
    const [isEditingPrice, setIsEditingPrice] = useState(false);

    // Maal State
    const [goldPrice, setGoldPrice] = useState(105412); // Default based on 8,960,000 / 85
    const [isEditingNisab, setIsEditingNisab] = useState(false);
    const [maalValues, setMaalValues] = useState({
        cash: 0,
        investments: 0,
        gold: 0,
        business: 0,
        debts: 0
    });

    const NISAB = goldPrice * 85;

    // Handlers
    const handleMaalChange = (field: keyof typeof maalValues, value: string) => {
        // Remove non-numeric chars
        const numericValue = parseInt(value.replace(/\D/g, '')) || 0;
        setMaalValues(prev => ({ ...prev, [field]: numericValue }));
    };

    const formatRupiah = (num: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
    };

    const formatNumber = (num: number) => {
        return num.toLocaleString('id-ID');
    }

    // Calculations
    const fitrahTotal = fitrahPeople * ricePrice;

    const totalAssets = maalValues.cash + maalValues.investments + maalValues.gold + maalValues.business;
    const netWorth = totalAssets - maalValues.debts;
    const zakatMaalPayable = netWorth >= NISAB ? netWorth * 0.025 : 0;

    return (
        <div className="flex-1 flex flex-col bg-[#fdfbf7] dark:bg-[#151d1a] font-display text-slate-900 dark:text-slate-100 pb-4">

            {/* Header */}
            <header className="sticky top-0 z-40 bg-[#fdfbf7]/80 dark:bg-[#151d1a]/80 backdrop-blur-md pt-12 pb-4" style={{ padding: '48px var(--app-padding-x) 16px' }}>
                <div className="flex items-center justify-between mb-6">
                    {/* Placeholder for back button if needed */}
                    <div className="w-10"></div>
                    <h1 className="text-xl font-bold tracking-tight text-[#1a4231] dark:text-slate-100">Kalkulator Zakat</h1>
                    {onInstall ? (
                        <button
                            onClick={onInstall}
                            className="px-3 py-1.5 rounded-full bg-[#4caf6e] text-white flex items-center gap-1.5 shadow-sm border border-[#4caf6e] active:scale-95 transition-transform hover:scale-105 relative z-50"
                            title="Install Mizan"
                        >
                            <span className="material-icons-outlined text-[16px]">install_mobile</span>
                            <span className="text-xs font-bold leading-none">Install Mizan</span>
                        </button>
                    ) : (
                        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-white/50 dark:bg-slate-800/50 shadow-sm" title="Aplikasi Sudah Terpasang">
                            <span className="material-icons-outlined text-[#4caf6e]">check_circle</span>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex bg-[#1a4231]/5 dark:bg-[#1a4231]/20 p-1 rounded-full">
                    <button
                        onClick={() => setActiveTab('fitrah')}
                        className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-all ${activeTab === 'fitrah' ? 'bg-[#c5a059] text-white shadow-md' : 'text-[#1a4231]/60 dark:text-slate-400 font-semibold'}`}
                    >
                        Zakat Fitrah
                    </button>
                    <button
                        onClick={() => setActiveTab('maal')}
                        className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-all ${activeTab === 'maal' ? 'bg-[#c5a059] text-white shadow-md' : 'text-[#1a4231]/60 dark:text-slate-400 font-semibold'}`}
                    >
                        Zakat Maal
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="space-y-6 animate-page-enter" style={{ padding: '0 var(--app-padding-x)' }}>

                {activeTab === 'fitrah' ? (
                    <>
                        {/* Rate Reference Card */}
                        <div className="bg-[#1a4231] rounded-2xl p-5 relative overflow-hidden text-white shadow-[0_4px_20px_-2px_rgba(26,66,49,0.08)] transition-all">
                            <div className="relative z-10 flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-xs font-medium text-white/70 uppercase tracking-widest">Standar Harga Beras</p>
                                        <button
                                            onClick={() => setIsEditingPrice(!isEditingPrice)}
                                            className="w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors active:scale-95"
                                        >
                                            <span className="material-icons-outlined text-[14px] text-[#c5a059]">{isEditingPrice ? 'check' : 'edit'}</span>
                                        </button>
                                    </div>

                                    <div className="relative h-8 flex items-center">
                                        {isEditingPrice ? (
                                            <div className="flex items-center gap-1 border-b border-white/40 pb-1 animate-[fadeIn_0.3s_ease-out]">
                                                <span className="text-sm font-bold text-white/70">Rp</span>
                                                <input
                                                    type="number"
                                                    value={ricePrice}
                                                    onChange={(e) => setRicePrice(Number(e.target.value))}
                                                    className="bg-transparent border-none text-2xl font-extrabold text-white w-32 focus:ring-0 p-0 outline-none placeholder-white/30"
                                                    autoFocus
                                                />
                                            </div>
                                        ) : (
                                            <p className="text-2xl font-extrabold leading-none animate-[fadeIn_0.3s_ease-out]">
                                                {formatRupiah(ricePrice)}
                                                <span className="text-sm font-normal text-white/60"> /jiwa</span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-white/10 p-3 rounded-full backdrop-blur-sm">
                                    <span className="material-icons-outlined text-[#c5a059] text-3xl">rice_bowl</span>
                                </div>
                            </div>
                            {/* Abstract Pattern Overlay */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#c5a059]/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                        </div>

                        {/* Central Counter Card */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-[0_4px_20px_-2px_rgba(26,66,49,0.08)] text-center">
                            <h3 className="text-slate-500 dark:text-slate-400 font-semibold text-sm uppercase tracking-wider mb-8">Jumlah Anggota Keluarga</h3>
                            <div className="flex items-center justify-between max-w-xs mx-auto">
                                <button
                                    onClick={() => setFitrahPeople(Math.max(1, fitrahPeople - 1))}
                                    className="w-16 h-16 rounded-full border-2 border-[#1a4231]/10 flex items-center justify-center text-[#1a4231] active:scale-95 transition-transform bg-[#1a4231]/5"
                                >
                                    <span className="material-icons-outlined text-3xl font-bold">remove</span>
                                </button>
                                <div className="flex flex-col items-center">
                                    <span className="text-7xl font-extrabold text-[#1a4231] dark:text-slate-100">{fitrahPeople}</span>
                                    <span className="text-slate-400 text-sm font-medium">Orang</span>
                                </div>
                                <button
                                    onClick={() => setFitrahPeople(fitrahPeople + 1)}
                                    className="w-16 h-16 rounded-full bg-[#1a4231] flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
                                >
                                    <span className="material-icons-outlined text-3xl font-bold">add</span>
                                </button>
                            </div>
                        </div>

                        {/* Result Card */}
                        <div className="bg-gradient-to-br from-[#d4af37] to-[#f1d592] rounded-2xl p-6 shadow-xl shadow-[#c5a059]/20 flex flex-col items-center justify-center text-center space-y-2">
                            <p className="text-[#1a4231]/70 font-bold text-sm uppercase tracking-wide">Total Zakat Fitrah</p>
                            <p className="text-4xl font-extrabold text-[#1a4231] tracking-tight">{formatRupiah(fitrahTotal)}</p>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Nisab Info Card */}
                        <div className="bg-gradient-to-br from-[#1a4231] to-[#2d6a4f] p-5 rounded-2xl shadow-xl shadow-[#1a4231]/20 relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 opacity-10">
                                <span className="material-icons-outlined text-9xl text-white">mosque</span>
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-white/70 text-xs font-medium uppercase tracking-widest">Batas Minimum (Nisab)</p>
                                    <button
                                        onClick={() => setIsEditingNisab(!isEditingNisab)}
                                        className="w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors active:scale-95"
                                    >
                                        <span className="material-icons-outlined text-[14px] text-[#f1d592]">{isEditingNisab ? 'check' : 'edit'}</span>
                                    </button>
                                </div>

                                <div className="flex items-center justify-between">
                                    {isEditingNisab ? (
                                        <div className="flex flex-col gap-1 w-full animate-[fadeIn_0.3s_ease-out]">
                                            <div className="flex items-center gap-1 border-b border-white/30 pb-1">
                                                <span className="text-xs font-bold text-white/50">Harga Emas/gr: Rp</span>
                                                <input
                                                    type="number"
                                                    value={goldPrice}
                                                    onChange={(e) => setGoldPrice(Number(e.target.value))}
                                                    className="bg-transparent border-none text-xl font-bold text-white w-full focus:ring-0 p-0 outline-none placeholder-white/30"
                                                    autoFocus
                                                />
                                            </div>
                                            <p className="text-[10px] text-[#f1d592] font-semibold mt-1">Nisab Otomatis: {formatRupiah(goldPrice * 85)}</p>
                                        </div>
                                    ) : (
                                        <>
                                            <h2 className="text-white text-2xl font-bold animate-[fadeIn_0.3s_ease-out]">{formatRupiah(NISAB)}</h2>
                                            <span className="bg-[#c5a059]/30 text-[#f1d592] text-[10px] font-bold px-2 py-1 rounded-full border border-[#c5a059]/40">GOLONGAN EMAS</span>
                                        </>
                                    )}
                                </div>
                                {!isEditingNisab && (
                                    <p className="text-white/60 text-[10px] mt-2 italic animate-[fadeIn_0.3s_ease-out]">*Berdasarkan harga emas Rp {formatNumber(goldPrice)}/gram (x 85 gram)</p>
                                )}
                            </div>
                        </div>

                        {/* Asset Inputs */}
                        <section className="space-y-4">
                            <h3 className="text-sm font-bold text-[#1a4231]/80 dark:text-slate-300 uppercase tracking-wider px-1">Aset & Kekayaan</h3>

                            {[
                                { label: 'Simpanan Tunai', icon: 'account_balance_wallet', field: 'cash' },
                                { label: 'Investasi & Saham', icon: 'show_chart', field: 'investments' },
                                { label: 'Emas & Logam Mulia', icon: 'diamond', field: 'gold' },
                                { label: 'Aset Bisnis / Perdagangan', icon: 'storefront', field: 'business' },
                            ].map((item) => (
                                <div key={item.field} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-[#1a4231]/5 shadow-sm">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-full bg-[#1a4231]/10 flex items-center justify-center text-[#1a4231]">
                                            <span className="material-icons-outlined">{item.icon}</span>
                                        </div>
                                        <span className="font-bold text-[#1a4231] dark:text-slate-200">{item.label}</span>
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1a4231] font-bold">Rp</span>
                                        <input
                                            className="w-full pl-12 pr-4 py-3 rounded-xl border-none bg-[#1a4231]/5 focus:ring-2 focus:ring-[#1a4231]/20 text-lg font-bold text-[#1a4231] dark:text-slate-200 text-right outline-none"
                                            placeholder="0"
                                            type="text"
                                            value={maalValues[item.field as keyof typeof maalValues] ? formatNumber(maalValues[item.field as keyof typeof maalValues]) : ''}
                                            onChange={(e) => handleMaalChange(item.field as keyof typeof maalValues, e.target.value)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </section>

                        {/* Deductions */}
                        <section className="space-y-4">
                            <h3 className="text-sm font-bold text-rose-800/80 dark:text-rose-400 uppercase tracking-wider px-1">Pengurang (Liabilitas)</h3>
                            <div className="bg-rose-50 dark:bg-rose-900/10 p-5 rounded-2xl border border-rose-200 dark:border-rose-800 shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600">
                                        <span className="material-icons-outlined">receipt_long</span>
                                    </div>
                                    <span className="font-bold text-rose-900 dark:text-rose-200">Total Hutang Jatuh Tempo</span>
                                </div>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-800 font-bold">Rp</span>
                                    <input
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border-none bg-white dark:bg-slate-800 focus:ring-2 focus:ring-rose-200 text-lg font-bold text-rose-900 dark:text-rose-200 text-right outline-none"
                                        placeholder="0"
                                        type="text"
                                        value={maalValues.debts ? formatNumber(maalValues.debts) : ''}
                                        onChange={(e) => handleMaalChange('debts', e.target.value)}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Calculate Button */}
                        <div className="pt-4 px-1">
                            <button
                                onClick={() => {
                                    // Logic is already computed, we just show the result card
                                    const resultEl = document.getElementById('maal-result');
                                    if (resultEl) resultEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }}
                                className="w-full py-4 bg-[#c5a059] hover:bg-[#b08d4a] text-white font-bold rounded-2xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-icons-outlined">calculate</span>
                                Hitung Zakat Maal
                            </button>
                        </div>

                        {/* Zakat Maal Result */}
                        <div id="maal-result" className="pt-6 pb-10">
                            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-[#1a4231]/10 overflow-hidden relative">
                                {/* Decorative Mosque background */}
                                <div className="absolute -right-8 -bottom-8 opacity-[0.03] dark:opacity-[0.08] pointer-events-none">
                                    <span className="material-icons-outlined text-[150px] text-[#1a4231]">mosque</span>
                                </div>

                                <div className="relative z-10">
                                    <div className="text-center mb-6">
                                        <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Total Kekayaan Bersih</p>
                                        <p className="text-2xl font-extrabold text-[#1a4231] dark:text-slate-100">{formatRupiah(netWorth)}</p>
                                    </div>

                                    <div className="h-px bg-slate-100 dark:bg-slate-700 w-full mb-6"></div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center px-2">
                                            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Status Nisab</span>
                                            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${netWorth >= NISAB ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                                {netWorth >= NISAB ? 'Mencapai Nisab' : 'Belum Mencapai Nisab'}
                                            </span>
                                        </div>

                                        {netWorth < NISAB && (
                                            <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30">
                                                <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                                                    <span className="font-bold flex items-center gap-1 mb-1">
                                                        <span className="material-icons-outlined text-sm">info</span> Informasi
                                                    </span>
                                                    Kekayaan Anda belum mencapai batas minimum (Nisab) per tahun sebesar <strong>{formatRupiah(NISAB)}</strong>. Anda belum wajib membayar zakat maal, namun sangat dianjurkan untuk tetap berinfak dan bersedekah.
                                                </p>
                                            </div>
                                        )}

                                        {netWorth >= NISAB && (
                                            <div className="animate-[fadeIn_0.5s_ease-out]">
                                                <div className="bg-[#1a4231] dark:bg-slate-900 p-6 rounded-2xl text-center shadow-inner relative overflow-hidden group">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-[#c5a059]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-2">Zakat yang harus dikeluarkan (2.5%)</p>
                                                    <p className="text-[#f1d592] text-4xl font-extrabold tracking-tight">{formatRupiah(zakatMaalPayable)}</p>
                                                </div>
                                                <p className="text-center text-[10px] text-slate-400 mt-4 leading-relaxed px-4">
                                                    "Ambillah zakat dari sebagian harta mereka, dengan zakat itu kamu membersihkan dan mensucikan mereka." (QS. At-Taubah: 103)
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </main>

            {/* Decorative Background Pattern */}
            <div
                className="fixed inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05] z-0"
                style={{
                    backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuBLwzTxJ1hV6Z86uCrKNSq3bGoEHAjhRB2_0Qh_gjhzhE0yB_5SIIjaMN-xBd6lnzV-HGtU0TOYIg1CylNJgxULIB5yQ796SB4AulG-5l3RLMvwor_kebOYbDe1yf2w6nAza44WcVnBkFXSDI6U8GRtny7ZkdHuyQK2gJoibRkNu-j1zceG3-_qCGK8Ff67Tlf-4-9FPCt6dIDHzGw-WA68jBOpjXT4SnRpcF78hJh_1T_40p-8iz0DwdB8RnDT14R-0Ljt-Jd6BmI')`,
                    backgroundSize: 'cover'
                }}
            ></div>
        </div>
    );
};