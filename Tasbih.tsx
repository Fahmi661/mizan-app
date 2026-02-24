import React, { useState, useEffect, useRef } from 'react';
import { audioService } from '../services/audioService';
import { DHIKR_OPTIONS } from '../constants';
import { DhikrOption } from '../types';

// Press state for physical feedback
// (no ripple interface needed)

export const Tasbih: React.FC = () => {
    // State
    const [totalCount, setTotalCount] = useState(0);
    const [sessionCount, setSessionCount] = useState(0);
    const [selectedDhikr, setSelectedDhikr] = useState<DhikrOption>(DHIKR_OPTIONS[0]);
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);
    const [isPressed, setIsPressed] = useState(false);
    const [counterKey, setCounterKey] = useState(0); // for digit animation

    // Custom Dhikr State
    const [isCustomMode, setIsCustomMode] = useState(false);
    const [customLatin, setCustomLatin] = useState("");
    const [customTarget, setCustomTarget] = useState(33);

    // Animation State
    const [renderBase, setRenderBase] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Reset Confirmation State
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    // Core tap action (shared between click and keyboard)
    const fireTap = () => {
        if (isAnimating) return;

        // Resume AudioContext on first user interaction (browser autoplay policy)
        audioService.resumeContext();

        // Dismiss reset confirm if active
        if (showResetConfirm) setShowResetConfirm(false);

        // Haptic feedback — 8ms, very short and subtle
        if (navigator.vibrate) navigator.vibrate(8);

        // Audio
        audioService.playClickSound();

        // Update count logic
        setTotalCount(prev => prev + 1);
        setCounterKey(prev => prev + 1); // trigger digit animation
        setSessionCount(prev => {
            const target = selectedDhikr.target;
            if (target > 0 && prev + 1 >= target) {
                // Stronger vibration for completing a full cycle
                if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                return 0;
            }
            return prev + 1;
        });

        // Trigger bead animation
        setIsAnimating(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            setRenderBase(prev => prev + 1);
            setIsAnimating(false);
        }, 200);
    };

    const handleTap = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        fireTap();
    };

    const handlePressStart = () => setIsPressed(true);
    const handlePressEnd = () => setIsPressed(false);

    // Cleanup animation timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    // ─── Keyboard Shortcut: Space & Enter trigger tap ─────────────
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only trigger when focus is not inside an input/textarea
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

            if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault(); // prevent page scroll on Space
                fireTap();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAnimating, showResetConfirm, selectedDhikr, totalCount, sessionCount]);

    const handleResetClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (showResetConfirm) {
            setTotalCount(0);
            setSessionCount(0);
            setRenderBase(0);
            setIsAnimating(false);
            setShowResetConfirm(false);
            if (navigator.vibrate) navigator.vibrate(50);
        } else {
            setShowResetConfirm(true);
            // Auto hide after 3 seconds if not confirmed
            setTimeout(() => setShowResetConfirm(false), 3000);
        }
    };

    const handleDhikrSelect = (dhikr: DhikrOption) => {
        setSelectedDhikr(dhikr);
        setSessionCount(0);
        setTotalCount(0);
        setRenderBase(0);
        setIsSelectorOpen(false);
        setIsCustomMode(false);
        setShowResetConfirm(false);
    };

    const handleCustomSubmit = () => {
        if (!customLatin) return;
        const custom: DhikrOption = {
            id: 'custom',
            latin: customLatin,
            arabic: 'Custom',
            meaning: 'Dzikir Khusus',
            target: customTarget
        };
        setSelectedDhikr(custom);
        setSessionCount(0);
        setTotalCount(0);
        setRenderBase(0);
        setIsSelectorOpen(false);
        setIsCustomMode(false);
    };

    // Bead Configuration
    const BEAD_SPACING = 50;
    const BEADS_TO_RENDER = [];
    const BUFFER = 3;
    for (let i = renderBase - BUFFER; i <= renderBase + BUFFER + 1; i++) {
        BEADS_TO_RENDER.push(i);
    }

    return (
        <div className="font-display bg-cream dark:bg-dark text-slate-900 dark:text-slate-100 flex flex-col flex-1 relative overflow-x-hidden">

            {/* Background Effects */}
            <div className="absolute inset-0 z-0 night-sky opacity-0 dark:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

            {/* Main Content Area — fills all available space */}
            <div className="relative z-10 flex flex-col flex-1 safe-top animate-page-enter" style={{ padding: '0 var(--app-padding-x)' }}>

                {/* Header */}
                <header className="py-4 flex items-center justify-between pointer-events-none flex-shrink-0">
                    <div className="w-10"></div>
                    <h1 className="text-lg font-bold tracking-tight dark:text-white">Tasbih Digital</h1>
                    <div className="w-10"></div>
                </header>

                {/* Info Card — flex-shrink-0 so it stays fixed size */}
                <div className="mt-2 relative z-20 flex-shrink-0">
                    <div className="bg-white/80 dark:bg-slate-800/60 backdrop-blur-md p-5 rounded-[var(--card-radius-lg)] border border-lime/20 shadow-sm relative overflow-hidden transition-all" style={{ boxShadow: 'var(--card-shadow)' }}>
                        <div className="flex justify-between items-start mb-3 relative z-10">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-lime animate-pulse"></span>
                                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-lime">Target: {selectedDhikr.target}</span>
                            </div>
                            <button
                                onClick={() => setIsSelectorOpen(true)}
                                className="text-xs font-bold text-white bg-sage px-4 py-1.5 rounded-full shadow-lg shadow-sage/30 active:scale-95 transition-transform pointer-events-auto hover:scale-105"
                            >
                                Ubah
                            </button>
                        </div>

                        <div className="text-center relative z-10 min-h-[56px] flex flex-col justify-center">
                            <h2 className="font-arabic text-2xl mb-1 text-slate-800 dark:text-slate-100 leading-relaxed line-clamp-1 animate-[fadeInUp_0.5s_ease-out]">
                                {selectedDhikr.arabic}
                            </h2>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{selectedDhikr.latin}</p>
                        </div>
                    </div>
                </div>

                {/* MAIN INTERACTION AREA — flex-1 to fill remaining space */}
                <div className="flex-1 flex flex-col items-center justify-center py-4 relative" style={{ minHeight: '200px' }}>

                    {/* The Touch Pad — physical press-down effect */}
                    <div
                        onClick={handleTap}
                        onMouseDown={handlePressStart}
                        onMouseUp={handlePressEnd}
                        onMouseLeave={handlePressEnd}
                        onTouchStart={handlePressStart}
                        onTouchEnd={handlePressEnd}
                        onTouchCancel={handlePressEnd}
                        className="w-full flex flex-col items-center justify-center relative cursor-pointer select-none overflow-hidden"
                        style={{
                            WebkitTapHighlightColor: 'transparent',
                            aspectRatio: '1/1',
                            maxWidth: 'min(340px, 80vw)',
                            borderRadius: '3rem',
                            transform: isPressed ? 'scale(0.97)' : 'scale(1)',
                            transition: isPressed
                                ? 'transform 60ms ease-in'
                                : 'transform 200ms cubic-bezier(0.34,1.56,0.64,1)',
                        }}
                    >

                        {/* Bead Animation - Horizontal String */}
                        <div className="w-full h-28 flex items-center justify-center relative overflow-hidden pointer-events-none mb-4 mask-linear-fade">

                            {/* String Line */}
                            <div className="absolute w-full h-[2px] bg-slate-200 dark:bg-slate-700/50"></div>
                            <div className="absolute w-0.5 h-6 bg-gold/80 rounded-full z-20 top-1/2 -translate-y-1/2 shadow-[0_0_10px_rgba(255,179,71,0.5)]"></div> {/* Center Marker */}

                            {/* Beads Container - Moves Left on Click */}
                            <div
                                className="absolute inset-0 flex items-center justify-center will-change-transform"
                                style={{
                                    transform: `translateX(${isAnimating ? -BEAD_SPACING : 0}px)`,
                                    transition: isAnimating ? 'transform 200ms cubic-bezier(0.2, 0.0, 0.2, 1)' : 'none'
                                }}
                            >
                                {BEADS_TO_RENDER.map((beadIndex) => {
                                    const offsetFromCenter = beadIndex - renderBase;
                                    let scale = 0.7;
                                    let opacity = 0.4;
                                    let isActive = false;

                                    if (isAnimating) {
                                        if (offsetFromCenter === 0) {
                                            scale = 0.7;
                                            opacity = 0.4;
                                        } else if (offsetFromCenter === 1) {
                                            scale = 1.3;
                                            opacity = 1;
                                            isActive = true;
                                        }
                                    } else {
                                        if (offsetFromCenter === 0) {
                                            scale = 1.3;
                                            opacity = 1;
                                            isActive = true;
                                        }
                                    }

                                    return (
                                        <div
                                            key={beadIndex}
                                            className={`
                                        absolute rounded-full transition-all duration-200 ease-in-out shadow-sm
                                        ${isActive ? 'z-10' : 'z-0'}
                                    `}
                                            style={{
                                                left: `calc(50% + ${offsetFromCenter * BEAD_SPACING}px)`,
                                                width: '24px',
                                                height: '24px',
                                                transform: `translate(-50%, -50%) scale(${scale})`,
                                                opacity: opacity,
                                                background: isActive
                                                    ? 'linear-gradient(135deg, #B9D96E 0%, #8BA888 100%)'
                                                    : (window.matchMedia('(prefers-color-scheme: dark)').matches ? '#475569' : '#CBD5E1'),
                                                boxShadow: isActive ? '0 4px 12px rgba(185, 217, 110, 0.4)' : 'none'
                                            }}
                                        ></div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* The Big Number - slide-up on change */}
                        <div className="relative z-10 text-center" style={{ overflow: 'hidden' }}>
                            <h3
                                key={counterKey}
                                className="font-black text-slate-800 dark:text-white tabular-nums leading-none tracking-tighter drop-shadow-sm select-none"
                                style={{
                                    fontSize: 'clamp(56px, 15vw, 80px)',
                                    animation: counterKey > 0 ? 'counterSlideIn 150ms ease-out forwards' : 'none',
                                }}
                            >
                                {totalCount}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-3 opacity-60 select-none">Ketuk untuk Menghitung</p>
                        </div>

                        {/* Session Progress - Floating Below */}
                        <div className="w-48 mt-6 opacity-80 pointer-events-none">
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                                <span>Sesi</span>
                                <span>{sessionCount} / {selectedDhikr.target}</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-lime rounded-full shadow-[0_0_10px_rgba(185,217,110,0.6)] transition-all duration-300"
                                    style={{ width: `${Math.min(100, (sessionCount / (selectedDhikr.target || 33)) * 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Bottom Controls - RESET Button Area */}
                <div className="pb-28 flex justify-center z-20 flex-shrink-0">
                    <button
                        onClick={handleResetClick}
                        className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all active:scale-95 shadow-sm border pointer-events-auto hover:scale-105 ${showResetConfirm
                            ? 'bg-red-500 text-white border-red-600 shadow-red-200'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border-slate-200 dark:border-slate-700'
                            }`}
                    >
                        <span className="material-icons-outlined text-lg">{showResetConfirm ? 'warning' : 'replay'}</span>
                        <span>{showResetConfirm ? 'Yakin Reset?' : 'Reset Hitungan'}</span>
                    </button>
                </div>
            </div>

            {/* Dhikr Selector Modal (BottomSheet) */}
            {isSelectorOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSelectorOpen(false)}></div>
                    <div className="bg-cream dark:bg-slate-900 w-full h-[80vh] rounded-t-[2.5rem] p-6 relative flex flex-col shadow-2xl animate-[slideIn_0.3s_ease-out]" style={{ maxWidth: 'var(--app-max-width, 430px)' }}>
                        <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-6"></div>

                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold dark:text-white">Pilih Dzikir</h2>
                            <button
                                onClick={() => setIsCustomMode(!isCustomMode)}
                                className="text-xs font-bold text-sage-dark bg-sage/20 px-3 py-1 rounded-full active:scale-95 transition-transform"
                            >
                                {isCustomMode ? 'Daftar' : '+ Kustom'}
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-8">
                            {isCustomMode ? (
                                <div className="space-y-4 pt-4 stagger-appear">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase">Latin / Judul</label>
                                        <input
                                            type="text"
                                            value={customLatin}
                                            onChange={(e) => setCustomLatin(e.target.value)}
                                            placeholder="e.g. Shalawat Nariyah"
                                            className="w-full bg-slate-100 dark:bg-slate-800 p-4 rounded-xl mt-1 outline-none font-bold dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase">Target Hitungan</label>
                                        <input
                                            type="number"
                                            value={customTarget}
                                            onChange={(e) => setCustomTarget(Number(e.target.value))}
                                            className="w-full bg-slate-100 dark:bg-slate-800 p-4 rounded-xl mt-1 outline-none font-bold dark:text-white"
                                        />
                                    </div>
                                    <button
                                        onClick={handleCustomSubmit}
                                        disabled={!customLatin}
                                        className="w-full bg-sage text-white font-bold py-4 rounded-xl shadow-lg mt-4 disabled:opacity-50 active:scale-95 transition-transform"
                                    >
                                        Mulai Sesi Kustom
                                    </button>
                                </div>
                            ) : (
                                DHIKR_OPTIONS.map((opt) => (
                                    <div
                                        key={opt.id}
                                        onClick={() => handleDhikrSelect(opt)}
                                        className={`p-4 rounded-2xl border cursor-pointer active:scale-[0.98] transition-all hover:scale-[1.01] ${selectedDhikr.id === opt.id
                                            ? 'bg-sage/10 border-sage dark:bg-sage/20'
                                            : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{opt.latin}</h4>
                                                <p className="text-[10px] text-slate-500 mt-0.5">{opt.meaning}</p>
                                            </div>
                                            <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-500">
                                                {opt.target}x
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};