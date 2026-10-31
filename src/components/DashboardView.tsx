import React, { useState, useEffect, useMemo } from 'react';
import { MarketIndex, Stock, PredictiveAlert, MarketType, MarketConditionData } from '../types/stock';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  BarChart3, 
  Clock, 
  RefreshCw, 
  Zap, 
  Layers, 
  Compass, 
  DollarSign, 
  ArrowUpRight, 
  ShieldAlert, 
  Flame, 
  Globe2, 
  PieChart, 
  SlidersHorizontal, 
  ChevronRight, 
  X, 
  CheckCircle2,
  Trophy,
  Search,
  ArrowUpDown,
  Sparkles
} from 'lucide-react';
import { getCryptoMarketTime, getUSMarketTime, MarketTimeInfo } from '../utils/marketHours';
import { CRYPTO_MARKET_CONDITION, US_MARKET_CONDITION } from '../data/marketDatabase';
import { calibrateStockPrice } from '../services/api';
import { Language, translations } from '../utils/translations';

interface DashboardViewProps {
  indices: MarketIndex[];
  stocks: Stock[];
  alerts: PredictiveAlert[];
  currentMarket: MarketType;
  onSelectStock: (symbol: string) => void;
  onNavigateTab: (tab: string) => void;
  onAddToPortfolio: (stock: Stock) => void;
  refreshInterval?: number;
  onSetRefreshInterval?: (interval: number) => void;
  lastUpdated?: Date | null;
  isRefreshing?: boolean;
  onManualRefresh?: () => void;
  lang?: Language;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  indices,
  stocks,
  alerts,
  currentMarket,
  onSelectStock,
  onNavigateTab,
  onAddToPortfolio,
  refreshInterval = 3,
  onSetRefreshInterval,
  lastUpdated,
  isRefreshing = false,
  onManualRefresh,
  lang = 'ID',
}) => {
  const isEn = lang === 'EN';
  const t = translations[lang] || translations.ID;
  const isCrypto = true;
  const targetMarket = 'CRYPTO';
  const currentStocks = stocks;
  const marketCondition: MarketConditionData = CRYPTO_MARKET_CONDITION;

  // Market time tracking
  const [marketTime, setMarketTime] = useState<MarketTimeInfo>(getCryptoMarketTime(new Date(), lang));

  // Live countdown to next auto-update
  const [countdown, setCountdown] = useState<number>(refreshInterval || 3);

  const btcLivePrice = currentStocks.find((s) => s.symbol === 'BTC')?.currentPrice || 76970;
  const ethLivePrice = currentStocks.find((s) => s.symbol === 'ETH')?.currentPrice || 2323.2;
  const solLivePrice = currentStocks.find((s) => s.symbol === 'SOL')?.currentPrice || 100.62;

  // Quick Broker / Live Price Calibration Modal state
  const [showCalibrateModal, setShowCalibrateModal] = useState(false);
  const [calibrateSymbol, setCalibrateSymbol] = useState('BTC');
  const [calibratePrice, setCalibratePrice] = useState(btcLivePrice.toString());
  const [calibrating, setCalibrating] = useState(false);
  const [calibrateSuccessMsg, setCalibrateSuccessMsg] = useState('');

  const formatMoney = (val: number) => {
    if (val < 0.0001) return `$${val.toFixed(8)}`;
    if (val < 1) return `$${val.toFixed(4)}`;
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Dynamic movers derived directly from real-time currentStocks feed
  const dynamicSupporters = useMemo(() => {
    const positives = [...currentStocks]
      .filter((s) => s.changePercent > 0)
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 5);
    if (positives.length > 0) {
      return positives.map((s) => ({
        symbol: s.symbol,
        name: s.name.replace(/\(.*\)/, '').trim(),
        price: s.currentPrice,
        changePercent: s.changePercent,
        indexPoints: Math.round(s.changePercent * 1.8 * 10) / 10,
        turnoverBillion: Math.round((s.volume / 1000000000) * 100) / 100,
      }));
    }
    return marketCondition.topSupporters.map((s) => {
      const live = currentStocks.find((cs) => cs.symbol === s.symbol);
      return live ? { ...s, price: live.currentPrice, changePercent: live.changePercent } : s;
    });
  }, [currentStocks, marketCondition.topSupporters]);

  const dynamicDraggers = useMemo(() => {
    const negatives = [...currentStocks]
      .filter((s) => s.changePercent < 0)
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, 5);
    if (negatives.length > 0) {
      return negatives.map((s) => ({
        symbol: s.symbol,
        name: s.name.replace(/\(.*\)/, '').trim(),
        price: s.currentPrice,
        changePercent: s.changePercent,
        indexPoints: Math.round(s.changePercent * 1.8 * 10) / 10,
        turnoverBillion: Math.round((s.volume / 1000000000) * 100) / 100,
      }));
    }
    return marketCondition.topDraggers.map((d) => {
      const live = currentStocks.find((cs) => cs.symbol === d.symbol);
      return live ? { ...d, price: live.currentPrice, changePercent: live.changePercent } : d;
    });
  }, [currentStocks, marketCondition.topDraggers]);

  const dynamicTurnover = useMemo(() => {
    const active = [...currentStocks]
      .slice()
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5);
    if (active.length > 0) {
      return active.map((s) => ({
        symbol: s.symbol,
        name: s.name.replace(/\(.*\)/, '').trim(),
        price: s.currentPrice,
        changePercent: s.changePercent,
        indexPoints: 0,
        turnoverBillion: Math.round((s.volume / 1000000000) * 100) / 100,
      }));
    }
    return marketCondition.topTurnover.map((t) => {
      const live = currentStocks.find((cs) => cs.symbol === t.symbol);
      return live ? { ...t, price: live.currentPrice, changePercent: live.changePercent } : t;
    });
  }, [currentStocks, marketCondition.topTurnover]);

  // Top 10 Market Cap Table State
  const [top10ViewMode, setTop10ViewMode] = useState<'top10' | 'all'>('top10');
  const [top10SearchQuery, setTop10SearchQuery] = useState('');
  const [top10SortKey, setTop10SortKey] = useState<'mcap' | 'change' | 'volume' | 'price'>('mcap');
  const [top10SortOrder, setTop10SortOrder] = useState<'desc' | 'asc'>('desc');

  // Compute Total Market Cap reference for dominance calculation (~$2.84T or dynamic sum)
  const totalCryptoMcap = useMemo(() => {
    return currentStocks.reduce((sum, s) => sum + (s.fundamentals?.marketCap || 0), 0) || 2840;
  }, [currentStocks]);

  const rankedCryptoList = useMemo(() => {
    // Rank all available crypto assets by fundamentals.marketCap descending
    const all = [...currentStocks].sort(
      (a, b) => (b.fundamentals?.marketCap || 0) - (a.fundamentals?.marketCap || 0)
    );

    // Attach true global rank #1, #2, etc.
    const withRank = all.map((asset, index) => ({
      ...asset,
      globalRank: index + 1,
    }));

    // Filter by search query if any
    let filtered = withRank;
    if (top10SearchQuery.trim()) {
      const q = top10SearchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (a) =>
          a.symbol.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q) ||
          a.sector.toLowerCase().includes(q)
      );
    }

    // Sort based on user selected key
    filtered.sort((a, b) => {
      let valA = 0;
      let valB = 0;
      if (top10SortKey === 'mcap') {
        valA = a.fundamentals?.marketCap || 0;
        valB = b.fundamentals?.marketCap || 0;
      } else if (top10SortKey === 'change') {
        valA = a.changePercent;
        valB = b.changePercent;
      } else if (top10SortKey === 'volume') {
        valA = a.volume;
        valB = b.volume;
      } else if (top10SortKey === 'price') {
        valA = a.currentPrice;
        valB = b.currentPrice;
      }
      return top10SortOrder === 'desc' ? valB - valA : valA - valB;
    });

    if (top10ViewMode === 'top10' && !top10SearchQuery.trim()) {
      return filtered.slice(0, 10);
    }
    return filtered;
  }, [currentStocks, top10ViewMode, top10SearchQuery, top10SortKey, top10SortOrder]);

  const toggleSort = (key: 'mcap' | 'change' | 'volume' | 'price') => {
    if (top10SortKey === key) {
      setTop10SortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setTop10SortKey(key);
      setTop10SortOrder('desc');
    }
  };

  const handleCalibrate = async (sym: string, priceNum: number) => {
    setCalibrating(true);
    setCalibrateSuccessMsg('');
    try {
      const res = await calibrateStockPrice(sym, priceNum);
      if (res.success) {
        setCalibrateSuccessMsg(res.message);
        onManualRefresh?.();
        setTimeout(() => {
          setCalibrateSuccessMsg('');
        }, 3500);
      }
    } catch (err) {
      console.error('Calibration error:', err);
    } finally {
      setCalibrating(false);
    }
  };

  useEffect(() => {
    const updateTime = () => {
      setMarketTime(isCrypto ? getCryptoMarketTime(new Date(), lang) : getUSMarketTime());
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [lang]);

  // Countdown timer effect
  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) return;
    setCountdown(refreshInterval);
    const intervalTimer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? refreshInterval : prev - 1));
    }, 1000);
    return () => clearInterval(intervalTimer);
  }, [refreshInterval, lastUpdated]);

  const breadth = marketCondition.breadth;
  const totalStocksBreadth = breadth.advancers + breadth.decliners + breadth.unchanged;
  const advPercent = totalStocksBreadth > 0 ? (breadth.advancers / totalStocksBreadth) * 100 : 0;
  const decPercent = totalStocksBreadth > 0 ? (breadth.decliners / totalStocksBreadth) * 100 : 0;
  const uncPercent = totalStocksBreadth > 0 ? (breadth.unchanged / totalStocksBreadth) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* ============================================================== */}
      {/* 1. MASTER HEADER: KONDISI PASAR LENGKAP & AUTO-UPDATE ENGINE    */}
      {/* ============================================================== */}
      <div className="bg-[#0c1322] border border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Zap className="w-4 h-4" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-mono">
                {isEn
                  ? 'Comprehensive Market Conditions · 24/7 Global Crypto (Binance Streaming)'
                  : 'Kondisi Pasar Lengkap · 24/7 Global Crypto (Binance Streaming)'}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-3xl leading-relaxed">
              {isEn
                ? 'Comprehensive monitoring of all crypto macro indicators: Bitcoin Dominance (BTC.D), total crypto market cap ($2.84T), daily liquidations, on-chain whale flow, and market pillars vs laggards.'
                : 'Monitoring komprehensif seluruh indikator makro kripto: Bitcoin Dominance (BTC.D), total kapitalisasi pasar kripto ($2.84T), likuidasi harian, pergerakan on-chain aliran paus (whale flow), serta aset penopang dan pemberat pasar.'}
            </p>
          </div>

          {/* Real-Time Auto-Update Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Live Session Badge */}
            <div className="bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-xl text-xs font-mono shadow-sm">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                {isEn ? 'Global Crypto Session & Time' : 'Jam & Sesi Crypto Global'}
              </div>
              <div className="text-white font-bold flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span className="tabular-nums">{marketTime.timeStr} {marketTime.timeZoneAbbr}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  {marketTime.sessionStatus}
                </span>
              </div>
            </div>

            {/* Auto Update Streamer Card */}
            <div className="bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-xl text-xs font-mono shadow-sm flex items-center gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">Binance/TV Stream</span>
                </div>
                <div className="text-emerald-400 font-bold flex items-center gap-1.5 mt-0.5">
                  <span>{refreshInterval > 0 ? (isEn ? `Every ${refreshInterval}s` : `Tiap ${refreshInterval}s`) : (isEn ? 'Manual' : 'Manual')}</span>
                  {refreshInterval > 0 && (
                    <span className="text-[10px] text-slate-400 font-normal">
                      (Sync {countdown}s)
                    </span>
                  )}
                </div>
              </div>

              {/* Speed Controller */}
              {onSetRefreshInterval && (
                <div className="border-l border-slate-800 pl-3 flex items-center gap-1">
                  {[1, 3, 5, 10].map((sec) => (
                    <button
                      key={sec}
                      onClick={() => onSetRefreshInterval(sec)}
                      className={`px-1.5 py-0.5 text-[10px] rounded font-bold transition-colors cursor-pointer ${
                        refreshInterval === sec
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                      title={isEn ? `Change auto-update to ${sec}s` : `Ubah auto-update ke ${sec} detik`}
                    >
                      {sec}s
                    </button>
                  ))}
                  <button
                    onClick={() => onSetRefreshInterval(0)}
                    className={`px-1.5 py-0.5 text-[10px] rounded font-bold transition-colors cursor-pointer ${
                      refreshInterval === 0
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                    title={isEn ? 'Pause auto-update' : 'Jeda auto-update otomatis'}
                  >
                    Pause
                  </button>
                </div>
              )}

              {/* Manual Trigger */}
              {onManualRefresh && (
                <button
                  onClick={onManualRefresh}
                  disabled={isRefreshing}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 rounded-lg border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                  title={isEn ? 'Synchronize all market data now' : 'Sinkronkan data seluruh pasar sekarang'}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>

            {/* Quick Calibration Button */}
            <button
              onClick={() => {
                setCalibrateSymbol('BTC');
                setCalibratePrice(btcLivePrice.toString());
                setShowCalibrateModal(true);
              }}
              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              title={isEn ? 'Calibrate price instantly with broker/exchange' : 'Kalibrasi harga seketika dengan broker / exchange'}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{isEn ? 'Calibrate Price' : 'Kalibrasi Harga'}</span>
            </button>
          </div>
        </div>

        {/* Binance Real-Time Spot Stream Status Ribbon */}
        <div className="mt-4 px-3.5 py-2 rounded-xl bg-slate-900/80 border border-emerald-500/30 flex flex-wrap items-center justify-between text-xs font-mono gap-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-400 font-bold uppercase tracking-wider text-[11px]">
              {isEn ? 'Binance 24/7 Spot Stream: Connected' : 'Binance 24/7 Spot Stream: Terkoneksi Aktif'}
            </span>
            <span className="text-slate-400 text-[11px] hidden sm:inline">•</span>
            <span className="text-slate-200 text-[11px]">
              BTC/USDT: <strong className="text-amber-400">{formatMoney(btcLivePrice)}</strong>
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>
              ETH/USDT: <strong className="text-white">{formatMoney(ethLivePrice)}</strong>
            </span>
            <span>
              SOL/USDT: <strong className="text-white">{formatMoney(solLivePrice)}</strong>
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
              LIVE 24H
            </span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. COMPREHENSIVE BENCHMARK INDICES MATRIX                      */}
        {/* ============================================================== */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-3 text-xs font-mono">
            <span className="text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>{isEn ? 'Benchmark Indices & Market Barometer (CRYPTO 24/7)' : 'Indeks Acuan & Barometer Pasar (CRYPTO 24/7)'}</span>
            </span>
            <span className="text-slate-500 text-[11px]">
              {isEn ? 'Updated: ' : 'Diperbarui: '}{lastUpdated ? lastUpdated.toLocaleTimeString(isEn ? 'en-US' : 'id-ID') : 'Real-time'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {marketCondition.indices.map((idx) => {
              const isPos = idx.change >= 0;
              return (
                <div
                  key={idx.symbol}
                  className="bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 p-3.5 rounded-xl transition-all shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-white text-xs tracking-tight">{idx.symbol}</span>
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                        isPos ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                      }`}
                    >
                      {isPos ? '+' : ''}{idx.changePercent.toFixed(2)}%
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">{idx.name}</div>
                  <div className="text-base font-extrabold font-mono text-white mt-2 tabular-nums">
                    {idx.price.toLocaleString('en-US', { minimumFractionDigits: idx.price < 1 ? 4 : 2, maximumFractionDigits: idx.price < 1 ? 4 : 2 })}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-1 flex justify-between">
                    <span>H: {idx.high || '-'}</span>
                    <span>L: {idx.low || '-'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2.5 TOP 10 CRYPTO BY MARKET CAPITALIZATION (PASAR UTAMA)       */}
      {/* ============================================================== */}
      <div className="bg-[#0c1322] border border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm font-mono space-y-4">
        {/* Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-wide">
                  {isEn ? 'Top 10 Crypto by Market Capitalization' : 'Top 10 Market Cap Kripto Global'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Binance Live
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isEn
                  ? 'World\'s largest digital assets ranked by market capitalization, Binance live prices, daily ranges, and market dominance.'
                  : 'Daftar koin berkapitalisasi pasar terbesar di dunia dengan live quote harga Binance, rentang harian, dan dominasi pasar.'}
              </p>
            </div>
          </div>

          {/* Filtering and Search Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setTop10ViewMode('top10')}
                className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                  top10ViewMode === 'top10'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isEn ? 'Top 10 Main' : 'Top 10 Utama'}
              </button>
              <button
                type="button"
                onClick={() => setTop10ViewMode('all')}
                className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                  top10ViewMode === 'all'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isEn ? `All Universe (${currentStocks.length})` : `Semua Universe (${currentStocks.length})`}
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={top10SearchQuery}
                onChange={(e) => setTop10SearchQuery(e.target.value)}
                placeholder={isEn ? "Search coin (BTC, SOL...)" : "Cari koin (BTC, SOL...)"}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
              {top10SearchQuery && (
                <button
                  type="button"
                  onClick={() => setTop10SearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick KPI Barometer for Top 10 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block uppercase">
              {isEn ? 'Top 10 MCap Dominance' : 'Dominasi Top 10 MCap'}
            </span>
            <strong className="text-white text-sm font-extrabold tabular-nums">
              {isEn ? '$2.18 Trillion' : '$2.18 Triliun'}
            </strong>
            <span className="text-[10px] text-amber-400 block mt-0.5">
              {isEn ? '~76.8% of Total Crypto Market' : '~76.8% dari Total Pasar Kripto'}
            </span>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block uppercase">
              {isEn ? 'Top Gainer in Top 10' : 'Top Gainer di Top 10'}
            </span>
            {(() => {
              const top10Only = [...currentStocks]
                .sort((a, b) => (b.fundamentals?.marketCap || 0) - (a.fundamentals?.marketCap || 0))
                .slice(0, 10);
              const best = top10Only.reduce((max, s) => (s.changePercent > max.changePercent ? s : max), top10Only[0]);
              return best ? (
                <>
                  <div className="flex items-center justify-between">
                    <strong className="text-emerald-400 text-sm font-extrabold">{best.symbol}</strong>
                    <span className="text-xs text-emerald-400 font-bold tabular-nums">+{best.changePercent}%</span>
                  </div>
                  <span className="text-[10px] text-slate-400 truncate block mt-0.5">{best.name}</span>
                </>
              ) : null;
            })()}
          </div>

          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block uppercase">Bitcoin Dominance (BTC.D)</span>
            <strong className="text-amber-400 text-sm font-extrabold tabular-nums">
              58.42%
            </strong>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {isEn ? 'Altseason Indicator' : 'Acuan Musim Altcoin'}
            </span>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block uppercase">
              {isEn ? 'Total 24H Turnover' : 'Total Turnover 24 Jam'}
            </span>
            <strong className="text-white text-sm font-extrabold tabular-nums">
              ${(rankedCryptoList.reduce((acc, c) => acc + c.volume, 0) / 1000000000).toFixed(1)} {isEn ? 'Billion USD' : 'Miliar USD'}
            </strong>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {isEn ? 'Binance Spot active liquidity' : 'Likuiditas aktif Binance Spot'}
            </span>
          </div>
        </div>

        {/* Table of Top 10 Crypto Assets */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/90 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-3.5 w-16 text-center">Rank</th>
                <th className="py-3 px-4">{isEn ? 'Crypto Asset & Sector' : 'Aset Kripto & Sektor'}</th>
                <th
                  onClick={() => toggleSort('price')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>{isEn ? 'Live Price' : 'Harga Terakhir'}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('change')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>{isEn ? '24H %' : '24 Jam %'}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-3 px-4 min-w-[180px] hidden md:table-cell text-center">
                  {isEn ? '24H Range (Low - High)' : 'Rentang 24 Jam (Low - High)'}
                </th>
                <th
                  onClick={() => toggleSort('mcap')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Market Cap</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('volume')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors select-none hidden sm:table-cell"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>{isEn ? '24H Volume' : 'Volume 24 Jam'}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">{isEn ? 'Action' : 'Aksi Cepat'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {rankedCryptoList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    {isEn ? `No assets found for "${top10SearchQuery}".` : `Tidak ditemukan aset dengan kata kunci "${top10SearchQuery}".`}
                  </td>
                </tr>
              ) : (
                rankedCryptoList.map((asset) => {
                  const isPos = asset.changePercent >= 0;
                  const rank = asset.globalRank;
                  const mcap = asset.fundamentals?.marketCap || 0;
                  const formattedMcap =
                    mcap >= 1000
                      ? `$${(mcap / 1000).toFixed(2)} ${isEn ? 'Trillion' : 'Triliun'}`
                      : `$${mcap.toFixed(2)} ${isEn ? 'Billion' : 'Miliar'}`;
                  const dominanceShare = ((mcap / totalCryptoMcap) * 100).toFixed(1);

                  const formattedVol =
                    asset.volume >= 1000000000
                      ? `$${(asset.volume / 1000000000).toFixed(2)} B`
                      : `$${(asset.volume / 1000000).toFixed(1)} M`;

                  const rangeLow = asset.dayLow || asset.currentPrice * 0.97;
                  const rangeHigh = asset.dayHigh || asset.currentPrice * 1.03;
                  const rangeSpan = Math.max(0.0000001, rangeHigh - rangeLow);
                  const progressPct = Math.min(
                    100,
                    Math.max(0, ((asset.currentPrice - rangeLow) / rangeSpan) * 100)
                  );

                  return (
                    <tr
                      key={asset.symbol}
                      className="hover:bg-slate-900/70 transition-colors group"
                    >
                      {/* Rank Badge */}
                      <td className="py-3 px-3.5 text-center">
                        {rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-xs shadow-xs">
                            👑 1
                          </span>
                        ) : rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-300/20 border border-slate-300/40 text-slate-200 font-extrabold text-xs">
                            🥈 2
                          </span>
                        ) : rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-700/20 border border-amber-600/40 text-amber-400 font-extrabold text-xs">
                            🥉 3
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-900 border border-slate-800 text-slate-400 font-bold text-xs">
                            #{rank}
                          </span>
                        )}
                      </td>

                      {/* Asset & Sector */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-bold text-amber-400 shrink-0">
                            {asset.symbol.slice(0, 3)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span
                                onClick={() => onSelectStock(asset.symbol)}
                                className="font-extrabold text-white text-xs sm:text-sm hover:text-amber-400 cursor-pointer transition-colors"
                              >
                                {asset.symbol}
                              </span>
                              <span className="text-[10px] text-slate-400 hidden sm:inline">
                                / USDT
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-slate-400 truncate max-w-[130px]">
                                {asset.name.replace(/\(.*\)/, '').trim()}
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800/90 text-slate-300 border border-slate-700/60 hidden md:inline">
                                {asset.sector}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Current Live Price */}
                      <td className="py-3 px-4 text-right tabular-nums">
                        <span className="text-xs sm:text-sm font-extrabold text-white">
                          {formatMoney(asset.currentPrice)}
                        </span>
                        <span className="block text-[10px] text-slate-500">
                          Binance Spot
                        </span>
                      </td>

                      {/* 24h Change % */}
                      <td className="py-3 px-4 text-right tabular-nums">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-extrabold ${
                            isPos
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {isPos ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {isPos ? '+' : ''}
                          {asset.changePercent.toFixed(2)}%
                        </span>
                      </td>

                      {/* 24h Range Bar (Low - High) */}
                      <td className="py-3 px-4 hidden md:table-cell">
                        <div className="w-full max-w-[200px] mx-auto">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                            <span>L: {formatMoney(rangeLow)}</span>
                            <span>H: {formatMoney(rangeHigh)}</span>
                          </div>
                          <div className="relative w-full h-1.5 bg-slate-900 rounded-full border border-slate-800 overflow-hidden">
                            <div
                              style={{ width: `${progressPct}%` }}
                              className={`h-full ${isPos ? 'bg-emerald-400' : 'bg-rose-400'}`}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Market Cap & Dominance */}
                      <td className="py-3 px-4 text-right tabular-nums">
                        <strong className="text-white text-xs sm:text-sm block">
                          {formattedMcap}
                        </strong>
                        <span className="text-[10px] text-slate-400 block">
                          {dominanceShare}% {isEn ? 'share' : 'pangsa'}
                        </span>
                      </td>

                      {/* 24h Volume */}
                      <td className="py-3 px-4 text-right tabular-nums hidden sm:table-cell">
                        <span className="text-slate-200 text-xs block">
                          {formattedVol}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          24h Turnover
                        </span>
                      </td>

                      {/* Quick Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectStock(asset.symbol)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-[11px] font-bold rounded-lg transition-colors cursor-pointer border border-slate-700 hover:border-amber-400"
                            title={isEn ? "Open TradingView Chart" : "Buka Chart TradingView"}
                          >
                            Chart
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onSelectStock(asset.symbol);
                              onNavigateTab('stockpicks');
                            }}
                            className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500 text-amber-300 hover:text-slate-950 text-[11px] font-bold rounded-lg transition-colors cursor-pointer border border-amber-500/30"
                            title={isEn ? "Analyze AI Alpha Radar" : "Analisis AI Alpha Radar"}
                          >
                            <Sparkles className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info strip */}
        <div className="pt-2 flex flex-wrap items-center justify-between text-[11px] text-slate-400">
          <span>
            {isEn ? (
              <>Showing <strong>{rankedCryptoList.length} assets</strong> ranked by actual market capitalization.</>
            ) : (
              <>Menampilkan <strong>{rankedCryptoList.length} aset</strong> berdasarkan peringkat kapitalisasi pasar aktual.</>
            )}
          </span>
          <span className="flex items-center gap-1.5 text-slate-500">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            {isEn ? 'Automatic live updates every second via Binance Spot order book' : 'Update live otomatis setiap detik via order book Binance Spot'}
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. KEDALAMAN PASAR & SENTIMEN MAKRO                            */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kedalaman Pasar (Market Breadth) */}
        <div className="bg-[#0c1322] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 font-mono">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-sky-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wide">
                {isEn ? 'Market Breadth & Momentum' : 'Kedalaman Pasar (Market Breadth)'}
              </h2>
            </div>
            <span className="text-[11px] text-emerald-400 font-bold">
              {isEn ? 'A/D Ratio: ' : 'Rasio A/D: '}{breadth.ratioAdvDec}x
            </span>
          </div>

          {/* Advance / Decline Bar */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
              <span className="text-emerald-400">{isEn ? 'Adv: ' : 'Naik: '}{breadth.advancers} ({advPercent.toFixed(1)}%)</span>
              <span className="text-slate-400">{isEn ? 'Neutral: ' : 'Netral: '}{breadth.unchanged}</span>
              <span className="text-rose-400">{isEn ? 'Dec: ' : 'Turun: '}{breadth.decliners} ({decPercent.toFixed(1)}%)</span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden flex border border-slate-800">
              <div style={{ width: `${advPercent}%` }} className="bg-emerald-500 h-full" title={isEn ? `Advancers: ${breadth.advancers}` : `Naik: ${breadth.advancers}`} />
              <div style={{ width: `${uncPercent}%` }} className="bg-slate-600 h-full" title={isEn ? `Unchanged: ${breadth.unchanged}` : `Stagnan: ${breadth.unchanged}`} />
              <div style={{ width: `${decPercent}%` }} className="bg-rose-500 h-full" title={isEn ? `Decliners: ${breadth.decliners}` : `Turun: ${breadth.decliners}`} />
            </div>
          </div>

          {/* Volume & Turnover Metrics */}
          <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block uppercase">
                {isEn ? 'Total 24H Turnover' : 'Total Turnover 24 Jam'}
              </span>
              <strong className="text-white text-sm tabular-nums">
                ${breadth.totalTurnover.toLocaleString()} {isEn ? 'Billion USD' : 'Miliar USD'}
              </strong>
              <span className="text-[10px] text-slate-500 block mt-0.5">Spot & Derivatives</span>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block uppercase">
                {isEn ? 'Transaction Frequency' : 'Frekuensi Transaksi'}
              </span>
              <strong className="text-white text-sm tabular-nums">
                {(breadth.totalTransactions / 1000000).toFixed(1)} {isEn ? 'M Matches' : 'Juta Match'}
              </strong>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {isEn ? 'On-chain & CEX execution' : 'Eksekusi on-chain & CEX'}
              </span>
            </div>
          </div>
        </div>

        {/* Sentimen Makro & Fear/Greed Barometer */}
        <div className="bg-[#0c1322] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 font-mono">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wide">
                {isEn ? 'Macro Barometer & Risk Sentiment' : 'Barometer Makro & Sentimen Risiko'}
              </h2>
            </div>
            <span className="text-[11px] text-amber-400 font-bold">
              {marketCondition.macro.fearGreedLabel}
            </span>
          </div>

          {/* Fear and Greed Meter */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400">Crypto Fear & Greed Index</span>
              <strong className="text-amber-400 font-extrabold text-sm">
                {marketCondition.macro.fearGreedScore} / 100
              </strong>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
              <div
                style={{ width: `${marketCondition.macro.fearGreedScore}%` }}
                className="bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 h-full"
              />
            </div>
          </div>

          {/* Macro Rates */}
          <div className="space-y-2 pt-1 text-xs">
            <div className="flex items-center justify-between p-2 rounded bg-slate-900/80 border border-slate-800/80">
              <span className="text-slate-400">{isEn ? 'Monetary Cycle:' : 'Siklus & Moneter:'}</span>
              <strong className="text-white">{marketCondition.macro.benchmarkRate}</strong>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-900/80 border border-slate-800/80">
              <span className="text-slate-400">{isEn ? 'Issuance Rate / Inflation:' : 'Laju Penerbitan / Inflasi:'}</span>
              <strong className="text-white">{marketCondition.macro.inflationRate}</strong>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-900/80 border border-slate-800/80">
              <span className="text-slate-400">{isEn ? 'Average Staking APR:' : 'Rata-Rata Staking APR:'}</span>
              <strong className="text-emerald-400">{marketCondition.macro.dividendYield}% {isEn ? 'per year' : 'per tahun'}</strong>
            </div>
          </div>
        </div>

        {/* Currency & Sovereign Bond Yields */}
        <div className="bg-[#0c1322] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 font-mono">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wide">
                {isEn ? 'Liquidity & Derivatives Indicators' : 'Indikator Likuiditas & Derivatif'}
              </h2>
            </div>
            <span className="text-[11px] text-slate-400">Real-time</span>
          </div>

          <div className="space-y-3">
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block">{marketCondition.macro.currencyPair.name}</span>
                <strong className="text-white text-base">{marketCondition.macro.currencyPair.value}</strong>
              </div>
              <span className="text-xs text-rose-400 font-bold">{marketCondition.macro.currencyPair.change}</span>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block">{marketCondition.macro.sovereignYield10Y.name}</span>
                <strong className="text-amber-400 text-base">{marketCondition.macro.sovereignYield10Y.value}</strong>
              </div>
              <span className="text-xs text-slate-300 font-bold">{marketCondition.macro.sovereignYield10Y.change}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. SEKTOR & NARASI PASAR (SECTOR HEATMAP MATRIX)                */}
      {/* ============================================================== */}
      <div className="bg-[#0c1322] border border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wide">
              {isEn ? 'Crypto Sector Performance & Narrative Matrix' : 'Peta Kinerja Sektor & Narasi Kripto (Narrative Matrix)'}
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {isEn ? 'Capital Rotation & Active Narrative Flows' : 'Rotasi Modal & Arus Narasi Teraktif'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {marketCondition.sectors.map((sec) => {
            const isPos = sec.changePercent >= 0;
            const flowPos = sec.netForeignFlow >= 0;
            return (
              <div
                key={sec.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-4 rounded-xl transition-all shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-white font-mono">{sec.name}</h3>
                    <span className="text-[10px] text-slate-400 font-mono">{sec.code}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                      isPos
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {isPos ? '+' : ''}{sec.changePercent.toFixed(2)}%
                  </span>
                </div>

                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden my-2.5">
                  <div
                    style={{ width: `${Math.min(100, Math.abs(sec.changePercent) * 25)}%` }}
                    className={`h-full ${isPos ? 'bg-emerald-500' : 'bg-rose-500'}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300 pt-2 border-t border-slate-800/80">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Top Leader:</span>
                    <span className="text-emerald-400 font-semibold">{sec.leaderSymbol} ({sec.leaderChange >= 0 ? '+' : ''}{sec.leaderChange}%)</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Top Lagger:</span>
                    <span className="text-rose-400 font-semibold">{sec.laggerSymbol} ({sec.laggerChange}%)</span>
                  </div>
                  <div className="col-span-2 flex items-center justify-between pt-1 text-[10px] text-slate-400">
                    <span>{isEn ? 'Smart Money Flow:' : 'Arus Smart Money:'}</span>
                    <span className={`font-bold ${flowPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {flowPos ? '+' : ''}${sec.netForeignFlow} {isEn ? 'Million USD' : 'Juta USD'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. ARUS MODAL PAUS & INSTITUSI (AGGREGATE FLOW SUMMARY)        */}
      {/* ============================================================== */}
      <div className="bg-[#0c1322] border border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wide">
              {isEn ? 'Whale Capital Flow Aggregate & Exchange Reserves' : 'Agregat Arus Modal Paus & Cadangan Bursa (Whale & CEX Reserves)'}
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {isEn ? 'All Major Exchanges (Binance, Coinbase, Kraken, OKX)' : 'Seluruh Bursa Utama (Binance, Coinbase, Kraken, OKX)'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 font-mono">
          <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
            <span className="text-[10px] text-slate-400 block uppercase">
              {isEn ? 'Today Spot Market' : 'Pasar Spot Hari Ini'}
            </span>
            <strong
              className={`text-lg tabular-nums ${
                marketCondition.foreignFlow.regularMarket >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {marketCondition.foreignFlow.regularMarket >= 0 ? '+' : ''}$
              {marketCondition.foreignFlow.regularMarket.toLocaleString()}{' '}
              <span className="text-xs">M</span>
            </strong>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {isEn ? 'CEX spot order matching' : 'Order matching spot CEX'}
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
            <span className="text-[10px] text-slate-400 block uppercase">OTC Desk & ETF Inflow</span>
            <strong
              className={`text-lg tabular-nums ${
                marketCondition.foreignFlow.negotiatedMarket >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {marketCondition.foreignFlow.negotiatedMarket >= 0 ? '+' : ''}$
              {marketCondition.foreignFlow.negotiatedMarket.toLocaleString()}{' '}
              <span className="text-xs">M</span>
            </strong>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {isEn ? 'Institutional absorption' : 'Penyerapan institusi'}
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
            <span className="text-[10px] text-slate-400 block uppercase">Total Net Smart Money</span>
            <strong
              className={`text-lg tabular-nums ${
                marketCondition.foreignFlow.totalToday >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {marketCondition.foreignFlow.totalToday >= 0 ? '+' : ''}$
              {marketCondition.foreignFlow.totalToday.toLocaleString()}{' '}
              <span className="text-xs">M</span>
            </strong>
            <span className="text-[10px] text-slate-500 block mt-0.5">Net Inflow/Outflow</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
            <span className="text-[10px] text-slate-400 block uppercase">
              {isEn ? 'Last 5 Days Cumulative' : 'Kumulatif 5 Hari Terakhir'}
            </span>
            <strong className="text-lg text-emerald-400 tabular-nums">
              +${marketCondition.foreignFlow.cumulative5D.toLocaleString()} M
            </strong>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {isEn ? 'Weekly trend' : 'Tren mingguan'}
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
            <span className="text-[10px] text-slate-400 block uppercase">
              {isEn ? 'YTD Exchange Cumulative' : 'Kumulatif YTD Bursa'}
            </span>
            <strong className="text-lg text-emerald-400 tabular-nums">
              +${marketCondition.foreignFlow.cumulativeYTD.toLocaleString()} M
            </strong>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {isEn ? 'Year to date' : 'Tahun berjalan'}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs font-mono text-slate-300 gap-2">
          <div>
            <span className="text-slate-400">{isEn ? 'Top Inflow Sector:' : 'Top Sektor Inflow:'}</span>{' '}
            <strong className="text-emerald-400">{marketCondition.foreignFlow.topInflowSector}</strong>
          </div>
          <div>
            <span className="text-slate-400">{isEn ? 'Top Outflow Sector:' : 'Top Sektor Outflow:'}</span>{' '}
            <strong className="text-rose-400">{marketCondition.foreignFlow.topOutflowSector}</strong>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 6. PILAR PENGGERAK PASAR & TURNOVER LEADERS                    */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Col 1: Top Movers / Supporters */}
        <div className="bg-[#0c1322] border border-slate-800 rounded-xl p-5 shadow-sm space-y-3 font-mono">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wide">
                {isEn ? 'Top Rally Supporters (+Impact)' : 'Aset Penopang Reli (+Dampak)'}
              </h3>
            </div>
            <span className="text-[11px] text-emerald-400 font-bold">Leading</span>
          </div>

          <div className="divide-y divide-slate-800/60 text-xs">
            {dynamicSupporters.map((s) => (
              <div
                key={s.symbol}
                onClick={() => onSelectStock(s.symbol)}
                className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-900/60 px-2 rounded-lg transition-colors"
              >
                <div>
                  <strong className="text-white hover:text-amber-400">{s.symbol}</strong>
                  <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{s.name}</div>
                </div>
                <div className="text-right">
                  <span className="text-emerald-400 font-bold">+{s.indexPoints} Pts</span>
                  <div className="text-[11px] text-slate-300 tabular-nums">
                    {formatMoney(s.price)} (+{s.changePercent}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Col 2: Top Draggers */}
        <div className="bg-[#0c1322] border border-slate-800 rounded-xl p-5 shadow-sm space-y-3 font-mono">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-rose-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wide">
                {isEn ? 'Top Market Draggers (-Impact)' : 'Aset Pemberat Pasar (-Dampak)'}
              </h3>
            </div>
            <span className="text-[11px] text-rose-400 font-bold">Lagging</span>
          </div>

          <div className="divide-y divide-slate-800/60 text-xs">
            {dynamicDraggers.map((s) => (
              <div
                key={s.symbol}
                onClick={() => onSelectStock(s.symbol)}
                className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-900/60 px-2 rounded-lg transition-colors"
              >
                <div>
                  <strong className="text-white hover:text-amber-400">{s.symbol}</strong>
                  <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{s.name}</div>
                </div>
                <div className="text-right">
                  <span className="text-rose-400 font-bold">{s.indexPoints} Pts</span>
                  <div className="text-[11px] text-slate-300 tabular-nums">
                    {formatMoney(s.price)} ({s.changePercent}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Col 3: Most Active by Turnover */}
        <div className="bg-[#0c1322] border border-slate-800 rounded-xl p-5 shadow-sm space-y-3 font-mono">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wide">
                {isEn ? 'Most Active Turnover (24H)' : 'Paling Aktif Transaksi 24 Jam'}
              </h3>
            </div>
            <span className="text-[11px] text-amber-400 font-bold">Volume</span>
          </div>

          <div className="divide-y divide-slate-800/60 text-xs">
            {dynamicTurnover.map((s) => (
              <div
                key={s.symbol}
                onClick={() => onSelectStock(s.symbol)}
                className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-900/60 px-2 rounded-lg transition-colors"
              >
                <div>
                  <strong className="text-white hover:text-amber-400">{s.symbol}</strong>
                  <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{s.name}</div>
                </div>
                <div className="text-right">
                  <span className="text-amber-400 font-bold tabular-nums">
                    ${s.turnoverBillion} {isEn ? 'Billion' : 'Miliar'}
                  </span>
                  <div
                    className={`text-[11px] tabular-nums font-semibold ${
                      s.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {s.changePercent >= 0 ? '+' : ''}{s.changePercent}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Navigation Footer Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">
              {isEn ? 'Looking to Analyze Specific Signals & On-Chain Screener?' : 'Ingin Menganalisis Sinyal & On-Chain Screener Secara Spesifik?'}
            </h4>
            <p className="text-[11px] text-slate-400">
              {isEn
                ? 'Open Crypto AI Picks for multi-factor evaluation or TradingView Chart for interactive graphs.'
                : 'Buka tab Crypto & Stock Picks untuk evaluasi multi-faktor atau tab TradingView Chart untuk grafik interaktif.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('stockpicks')}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold font-mono rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <span>{isEn ? `Open Screener (${currentStocks.length} Assets)` : `Buka Screener (${currentStocks.length} Aset)`}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 7. MODAL: LIVE PRICE CALIBRATION                                */}
      {/* ============================================================== */}
      {showCalibrateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-[#0b1322] border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono">
                    {isEn ? `Calibrate Live Price (${targetMarket})` : `Kalibrasi Harga Live (${targetMarket})`}
                  </h3>
                  <span className="text-xs text-slate-400">
                    {isEn ? 'Sync quote directly with Binance / Broker' : 'Sinkronkan quote langsung dengan Binance / Broker'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowCalibrateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick 1-click Presets */}
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-2 uppercase tracking-wider">
                {isEn ? 'Quick Presets (Real-Time Quotes):' : 'Preset Cepat (Real-Time Quotes):'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCalibrateSymbol('BTC');
                    setCalibratePrice(btcLivePrice.toString());
                    handleCalibrate('BTC', btcLivePrice);
                  }}
                  className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-amber-500/40 rounded-xl text-left transition-colors cursor-pointer group"
                >
                  <div className="text-xs font-bold text-white group-hover:text-amber-300">BTC → {formatMoney(btcLivePrice)}</div>
                  <div className="text-[10px] text-amber-400/90">Binance Spot Live</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCalibrateSymbol('ETH');
                    setCalibratePrice(ethLivePrice.toString());
                    handleCalibrate('ETH', ethLivePrice);
                  }}
                  className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl text-left transition-colors cursor-pointer group"
                >
                  <div className="text-xs font-bold text-white group-hover:text-sky-300">ETH → {formatMoney(ethLivePrice)}</div>
                  <div className="text-[10px] text-slate-400">Binance Spot Live</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCalibrateSymbol('SOL');
                    setCalibratePrice(solLivePrice.toString());
                    handleCalibrate('SOL', solLivePrice);
                  }}
                  className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl text-left transition-colors cursor-pointer group"
                >
                  <div className="text-xs font-bold text-white group-hover:text-emerald-300">SOL → {formatMoney(solLivePrice)}</div>
                  <div className="text-[10px] text-slate-400">Binance Spot Live</div>
                </button>
              </div>
            </div>

            {/* Custom Form */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1.5">
                  {isEn ? 'Select Asset Symbol:' : 'Pilih Simbol Aset:'}
                </label>
                <select
                  value={calibrateSymbol}
                  onChange={(e) => {
                    const sym = e.target.value;
                    setCalibrateSymbol(sym);
                    const found = currentStocks.find((s) => s.symbol === sym);
                    if (found) setCalibratePrice(found.currentPrice.toString());
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-hidden focus:border-amber-400"
                >
                  {currentStocks.map((s) => (
                    <option key={s.symbol} value={s.symbol}>
                      {s.symbol} - {s.name} (${s.currentPrice})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1.5">
                  {isEn ? 'Actual Exchange / Broker Price (USD):' : 'Harga Aktual di Exchange / Broker (USD):'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={calibratePrice}
                  onChange={(e) => setCalibratePrice(e.target.value)}
                  placeholder={isEn ? `Example: ${btcLivePrice}` : `Contoh: ${btcLivePrice}`}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm font-mono focus:outline-hidden focus:border-amber-400"
                />
              </div>
            </div>

            {/* Success message */}
            {calibrateSuccessMsg && (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl flex items-center gap-2 text-xs text-emerald-300 font-mono">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{calibrateSuccessMsg}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800 font-mono">
              <button
                type="button"
                onClick={() => setShowCalibrateModal(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                {isEn ? 'Close' : 'Tutup'}
              </button>
              <button
                type="button"
                disabled={calibrating || !calibratePrice}
                onClick={() => {
                  const p = parseFloat(calibratePrice);
                  if (!isNaN(p) && p > 0) {
                    handleCalibrate(calibrateSymbol, p);
                  }
                }}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                {calibrating ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                <span>{isEn ? 'Apply Calibration' : 'Terapkan Kalibrasi'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
