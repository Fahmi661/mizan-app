import React from 'react';
import { UserSettings } from '../types';
import { User, MapPin, Globe, Bell, Trash2 } from 'lucide-react';

interface ProfileProps {
    settings: UserSettings;
    updateSettings: (s: UserSettings) => void;
}

export const Profile: React.FC<ProfileProps> = ({ settings, updateSettings }) => {

    const handleInputChange = (field: keyof UserSettings, value: any) => {
        updateSettings({ ...settings, [field]: value });
    };

    const resetData = () => {
        if (confirm("Apakah Anda yakin ingin menghapus semua data aplikasi? Ini tidak dapat dibatalkan.")) {
            localStorage.clear();
            window.location.reload();
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-cream pb-4 pt-6" style={{ padding: '24px var(--app-padding-x) 16px' }}>
            <h1 className="font-heading text-2xl font-bold mb-6">Profil & Pengaturan</h1>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
                <h2 className="text-sm font-bold text-text-mid uppercase mb-4 tracking-wider">Info Pribadi</h2>

                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                            <User size={20} />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-text-mid mb-1">Nama Lengkap</label>
                            <input
                                type="text"
                                value={settings.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                className="w-full font-semibold text-text-dark border-b border-gray-200 focus:border-gold outline-none pb-1 bg-transparent"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                            <MapPin size={20} />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-text-mid mb-1">Kota</label>
                            <input
                                type="text"
                                value={settings.city}
                                onChange={(e) => handleInputChange('city', e.target.value)}
                                className="w-full font-semibold text-text-dark border-b border-gray-200 focus:border-gold outline-none pb-1 bg-transparent"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                            <Globe size={20} />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-text-mid mb-1">Negara</label>
                            <input
                                type="text"
                                value={settings.country}
                                onChange={(e) => handleInputChange('country', e.target.value)}
                                className="w-full font-semibold text-text-dark border-b border-gray-200 focus:border-gold outline-none pb-1 bg-transparent"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
                <h2 className="text-sm font-bold text-text-mid uppercase mb-4 tracking-wider">Pengaturan Aplikasi</h2>

                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                        <Bell size={18} className="text-gray-400" />
                        <span className="font-medium text-text-dark">Notifikasi</span>
                    </div>
                    <div
                        className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${settings.notificationsEnabled ? 'bg-green-mid' : 'bg-gray-300'}`}
                        onClick={() => handleInputChange('notificationsEnabled', !settings.notificationsEnabled)}
                    >
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${settings.notificationsEnabled ? 'translate-x-6' : ''}`}></div>
                    </div>
                </div>

                <div className="pt-4">
                    <label className="block text-xs font-bold text-text-mid mb-2">Metode Perhitungan</label>
                    <select
                        value={settings.calculationMethod}
                        onChange={(e) => handleInputChange('calculationMethod', Number(e.target.value))}
                        className="w-full p-3 bg-gray-50 rounded-xl text-sm font-medium outline-none"
                    >
                        <option value={11}>MUIS (Singapura/Indonesia)</option>
                        <option value={2}>ISNA (Amerika Utara)</option>
                        <option value={3}>Muslim World League</option>
                        <option value={4}>Umm Al-Qura (Makkah)</option>
                        <option value={5}>Egyptian General Authority</option>
                    </select>
                </div>
            </div>

            <button
                onClick={resetData}
                className="w-full py-4 text-red-500 font-bold bg-red-50 rounded-xl flex items-center justify-center gap-2 hover:bg-red-100 transition"
            >
                <Trash2 size={18} />
                Hapus Semua Data
            </button>

            <p className="text-center text-xs text-gray-400 mt-8">Ramadan Mubarak App v1.0.0</p>
        </div>
    );
};