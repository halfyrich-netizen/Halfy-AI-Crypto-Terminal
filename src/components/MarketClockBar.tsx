import React, { useState, useEffect } from 'react';
import { MarketType } from '../types/stock';
import { getCryptoMarketTime, MarketTimeInfo } from '../utils/marketHours';
import { Language, translations } from '../utils/translations';
import { Clock, Calendar, X, Zap, Globe2, Activity } from 'lucide-react';

interface MarketClockBarProps {
  currentMarket?: MarketType;
  onMarketChange?: (market: MarketType) => void;
  lang?: Language;
}

export const MarketClockBar: React.FC<MarketClockBarProps> = ({ lang = 'ID' }) => {
  const t = translations[lang] || translations.ID;
  const [cryptoTime, setCryptoTime] = useState<MarketTimeInfo>(getCryptoMarketTime(new Date(), lang));
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  useEffect(() => {
    setCryptoTime(getCryptoMarketTime(new Date(), lang));
    const timer = setInterval(() => {
      const now = new Date();
      setCryptoTime(getCryptoMarketTime(now, lang));
    }, 1000);

    return () => clearInterval(timer);
  }, [lang]);

  const getStatusBadge = (info: MarketTimeInfo) => {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <span>{info.sessionStatus}</span>
      </span>
    );
  };

  return (
    <>
      <div className="bg-[#080d19] border-b border-slate-800/80 px-3 lg:px-6 py-2 select-none">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Left: 24/7 Global Crypto Clock Strip */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs">
            {/* Live Crypto 24/7 Clock */}
            <div className="flex items-center gap-2.5 py-1 text-slate-200">
              <span className="font-bold text-amber-400 font-mono tracking-tight text-xs sm:text-sm">
                CRYPTO 24/7
              </span>
              <span className="text-slate-600">·</span>

              {/* Digital Clock */}
              <div className="flex items-center gap-1.5 font-mono">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-white font-bold text-xs sm:text-sm tracking-wider tabular-nums">
                  {cryptoTime.timeStr}
                </span>
                <span className="text-[10px] text-slate-400">{cryptoTime.timeZoneAbbr}</span>
              </div>

              {/* Status Badge */}
              <div className="hidden md:flex items-center gap-2">
                <span className="text-slate-600">·</span>
                {getStatusBadge(cryptoTime)}
              </div>
            </div>

            {/* Next Funding Rate Countdown */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg font-mono text-xs text-slate-300">
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-slate-400 text-[11px]">{t.nextSettlement}</span>
              <strong className="text-amber-400 font-bold">{cryptoTime.nextEvent}</strong>
            </div>

            {/* Daily Candle Close */}
            <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-400 font-mono">
              <Globe2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t.dailyClose}</span>
            </div>
          </div>

          {/* Right: Liquidity Cycles Modal Trigger */}
          <div className="flex items-center gap-3 justify-end shrink-0">
            <button
              onClick={() => setShowScheduleModal(true)}
              className="text-[11px] font-semibold text-slate-300 hover:text-amber-400 flex items-center gap-1.5 py-1 px-3 rounded-md hover:bg-slate-900 border border-slate-800 transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.sessionCycles}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Comprehensive Trading Hours & Sessions */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-[#0b1322] border border-slate-700 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-5 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono">
                    Siklus Pasar Kripto Global 24/7 & Funding Rate
                  </h3>
                  <span className="text-xs text-slate-400">Panduan Likuiditas dan Volatilitas Sesi Dunia</span>
                </div>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content: Sessions Guide */}
            <div className="space-y-4 text-xs font-mono">
              <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-bold text-white">4 Sesi Likuiditas Kripto Global (WIB & UTC)</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                    Non-Stop 365 Hari
                  </span>
                </div>
                <ul className="space-y-2.5 text-slate-300">
                  <li className="flex justify-between items-center">
                    <div>
                      <strong className="text-white block">1. Sesi Asia (Tokyo, Singapore, HK)</strong>
                      <span className="text-[11px] text-slate-400">Fokus: Likuiditas ritel dan exchange Asia</span>
                    </div>
                    <strong className="text-amber-400 font-bold">07:00 - 15:00 WIB</strong>
                  </li>
                  <li className="flex justify-between items-center">
                    <div>
                      <strong className="text-white block">2. Sesi Eropa (London & Frankfurt)</strong>
                      <span className="text-[11px] text-slate-400">Fokus: Pembukaan meja trading institusi Eropa</span>
                    </div>
                    <strong className="text-amber-400 font-bold">15:00 - 20:30 WIB</strong>
                  </li>
                  <li className="flex justify-between items-center bg-amber-500/10 p-2 rounded border border-amber-500/30">
                    <div>
                      <strong className="text-amber-300 block">3. Overlap London & New York (Peak Volatilitas)</strong>
                      <span className="text-[11px] text-amber-200/80">Likuiditas tertinggi & pergerakan tren terbesar harian</span>
                    </div>
                    <strong className="text-amber-300 font-bold">20:30 - 23:30 WIB</strong>
                  </li>
                  <li className="flex justify-between items-center">
                    <div>
                      <strong className="text-white block">4. Sesi Amerika Serikat (New York)</strong>
                      <span className="text-[11px] text-slate-400">Fokus: Arus dana Spot ETF (BlackRock/Fidelity) & CME Futures</span>
                    </div>
                    <strong className="text-amber-400 font-bold">20:30 - 04:00 WIB</strong>
                  </li>
                </ul>
              </div>

              {/* Funding Settlement Info */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2 text-slate-300">
                <span className="font-bold text-sky-400 block pb-1 border-b border-slate-800">
                  ⚡ Jadwal Settlement Funding Rate Perpetual
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                  Binance Futures melakukan pemukiman (settlement) funding rate setiap <strong>8 jam sekali</strong> pada pukul <strong>07:00 WIB (00:00 UTC)</strong>, <strong>15:00 WIB (08:00 UTC)</strong>, dan <strong>23:00 WIB (16:00 UTC)</strong>.
                </p>
                <div className="flex justify-between text-[11px] pt-1 text-slate-400">
                  <span>Candle Harian Baru (Daily Close):</span>
                  <strong className="text-white font-mono">07:00 WIB</strong>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Mengerti & Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
