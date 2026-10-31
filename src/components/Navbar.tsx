import React from 'react';
import { MarketType } from '../types/stock';
import { Language, translations } from '../utils/translations';
import { Bell, Volume2, VolumeX, ShieldCheck, Zap, RefreshCw, Globe2 } from 'lucide-react';

interface NavbarProps {
  currentMarket: MarketType;
  onMarketChange: (market: MarketType) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  pushEnabled: boolean;
  onRequestPush: () => void;
  unreadAlertCount: number;
  refreshInterval: number;
  onSetRefreshInterval: (interval: number) => void;
  lastUpdated: Date | null;
  isRefreshing: boolean;
  onManualRefresh: () => void;
  binanceConnected?: boolean | null;
  lang?: Language;
  onToggleLanguage?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentMarket,
  onMarketChange,
  activeTab,
  onTabChange,
  soundEnabled,
  onToggleSound,
  pushEnabled,
  onRequestPush,
  unreadAlertCount,
  refreshInterval,
  onSetRefreshInterval,
  lastUpdated,
  isRefreshing,
  onManualRefresh,
  binanceConnected = null,
  lang = 'ID',
  onToggleLanguage,
}) => {
  const isCryptoActive = currentMarket === 'CRYPTO';
  const isEn = lang === 'EN';
  const t = translations[lang];

  const navItems = [
    { id: 'dashboard', label: t.navDashboard },
    { id: 'stockpicks', label: t.navPicks },
    { id: 'chart', label: t.navChart },
    { id: 'bandarmology', label: t.navWhale },
    { id: 'portfolio', label: t.navPortfolio },
    { id: 'alerts', label: t.navAlerts, badgeCount: unreadAlertCount },
    { id: 'docs', label: t.navDocs },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#090e1a]/95 backdrop-blur-md border-b border-slate-800 px-4 lg:px-6 py-3">
      <div className="flex items-center justify-between gap-6 max-w-[1600px] mx-auto">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-sky-500 to-emerald-400 flex items-center justify-center font-bold text-white shadow-md text-base font-mono">
            ⚡
          </div>
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-black tracking-tight text-white font-mono flex items-center gap-1.5">
              HALFY<span className="text-amber-400">AI</span>
            </span>
            <span className="text-[11px] text-slate-400 font-semibold tracking-wide uppercase">
              24/7 Crypto Intelligence Terminal
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1.5 xl:gap-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-slate-800 text-amber-400 border border-slate-700 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>{item.label}</span>
                {item.badgeCount && item.badgeCount > 0 ? (
                  <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-mono font-bold">
                    {item.badgeCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Clean Live Status & Controls */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Subtle Live Feed Status Indicator (Not a Button) */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 text-xs font-mono text-slate-300">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                binanceConnected === false ? 'bg-rose-400' : 'bg-emerald-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                binanceConnected === false ? 'bg-rose-500' : 'bg-emerald-500'
              }`} />
            </span>
            <span className="text-slate-300 font-medium">
              {binanceConnected === false ? (isEn ? 'Offline' : 'Offline') : 'Binance 24/7'}
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-amber-400 font-bold">Paper</span>
          </div>

          {/* Single Clean Manual Refresh Button */}
          <button
            onClick={onManualRefresh}
            disabled={isRefreshing}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-amber-400 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title={isEn ? 'Sync live Binance quotes now' : 'Sinkronkan data live Binance sekarang'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          {/* Audio Chime Notification Toggle */}
          <button
            onClick={onToggleSound}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              soundEnabled
                ? 'bg-slate-800/80 border-slate-700 text-amber-400'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
            }`}
            title={soundEnabled ? (isEn ? 'Mute signal chime' : 'Matikan audio sinyal') : (isEn ? 'Enable signal chime' : 'Nyalakan audio sinyal')}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Single Authoritative Language Switcher at Far Right */}
          {onToggleLanguage && (
            <div className="flex items-center bg-slate-900/95 border border-slate-700 hover:border-amber-500/60 rounded-xl p-0.5 shrink-0 shadow-sm">
              <Globe2 className="w-3.5 h-3.5 text-amber-400 ml-1.5 mr-1 shrink-0" />
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => lang !== 'ID' && onToggleLanguage()}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    lang === 'ID'
                      ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="Ganti ke Bahasa Indonesia"
                >
                  <span>🇮🇩 ID</span>
                </button>
                <button
                  type="button"
                  onClick={() => lang !== 'EN' && onToggleLanguage()}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    lang === 'EN'
                      ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="Switch to English"
                >
                  <span>🇬🇧 EN</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Horizontal Navigation Strip + Mobile Language Switcher */}
      <div className="flex lg:hidden items-center justify-between gap-2 overflow-x-auto pt-2 pb-1 border-t border-slate-800/80 mt-2 scrollbar-none text-xs">
        <div className="flex items-center gap-1.5 shrink-0">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-slate-800 text-sky-400 border border-slate-700'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>{item.label}</span>
                {item.badgeCount && item.badgeCount > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-mono font-bold">
                    {item.badgeCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Mobile quick language toggle */}
        {onToggleLanguage && (
          <button
            onClick={onToggleLanguage}
            className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 border border-amber-400 text-amber-300 font-mono font-black text-xs rounded-lg hover:bg-amber-500/30 transition-colors cursor-pointer"
            title="Ganti Bahasa / Switch Language"
          >
            <span>{lang === 'ID' ? '🇮🇩 ID' : '🇬🇧 EN'}</span>
            <span className="text-[10px] text-amber-200/70 font-sans">⇄</span>
          </button>
        )}
      </div>
    </header>
  );
};
