import React, { useEffect, useState } from 'react';
import { Moon, Star } from 'lucide-react';

export const SplashScreen: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onFinish, 800);
          return 100;
        }
        return prev + 1.5;
      });
    }, 30);

    return () => clearInterval(timer);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0F172A] text-white overflow-hidden">
      {/* Decorative Stars - Staggered */}
      <div className="absolute top-10 left-10 opacity-0 animate-star-pop" style={{ animationDelay: '0.2s' }}>
        <Star className="w-4 h-4 text-gold" fill="currentColor" />
      </div>
      <div className="absolute top-20 right-20 opacity-0 animate-star-pop" style={{ animationDelay: '0.6s' }}>
        <Star className="w-3 h-3 text-gold" fill="currentColor" />
      </div>
      <div className="absolute bottom-32 left-1/4 opacity-0 animate-star-pop" style={{ animationDelay: '1.0s' }}>
        <Star className="w-2 h-2 text-white" fill="currentColor" />
      </div>

      {/* Moon Rise Animation */}
      <div className="relative mb-8 animate-moon-rise">
        <Moon className="w-24 h-24 text-gold-light" strokeWidth={1} fill="#C9A84C" />
      </div>

      <div className="text-center stagger-appear">
        <h1 className="font-arabic text-4xl mb-2 text-gold">بِسْمِ اللَّهِ</h1>
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">Mizan</h2>
      </div>

      {/* Progress Bar */}
      <div className="w-48 h-1 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gold transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};