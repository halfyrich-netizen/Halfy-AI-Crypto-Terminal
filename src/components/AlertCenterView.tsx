import React, { useState } from 'react';
import { PredictiveAlert, MarketType } from '../types/stock';
import { playSignalChime } from '../utils/audio';
import { formatLocalizedMarketTimestamp } from '../utils/marketHours';
import { Language, translations } from '../utils/translations';
import { Bell, ShieldAlert, Radio, Activity, CheckCircle2, ArrowRight, Clock } from 'lucide-react';

interface AlertCenterViewProps {
  alerts: PredictiveAlert[];
  currentMarket: MarketType;
  pushEnabled: boolean;
  onRequestPush: () => void;
  soundEnabled: boolean;
  onSelectStock: (symbol: string) => void;
  lang?: Language;
}

export const AlertCenterView: React.FC<AlertCenterViewProps> = ({
  alerts,
  currentMarket,
  pushEnabled,
  onRequestPush,
  soundEnabled,
  onSelectStock,
  lang = 'ID',
}) => {
  const isEn = lang === 'EN';
  const t = translations[lang] || translations.ID;
  const [filterType, setFilterType] = useState<string>('ALL');
  const [liveAlerts, setLiveAlerts] = useState<PredictiveAlert[]>(alerts);

  const filteredAlerts = liveAlerts.filter((a) => {
    if (filterType !== 'ALL' && a.type !== filterType) return false;
    return true;
  });

  const handleSimulateCrucialSignal = () => {
    const newMockAlert: PredictiveAlert = {
      id: `alt-${Date.now()}`,
      symbol: 'BTC',
      market: 'CRYPTO',
      stockName: 'Bitcoin',
      type: 'AI_SIGNAL',
      severity: 'HIGH',
      title: isEn
        ? 'Whale Alert: Mega Accumulation 1,250 BTC on Binance'
        : 'Whale Alert: Akumulasi Besar 1,250 BTC di Binance',
      message: isEn
        ? 'Outflow of $85.6M detected from Binance to cold storage. 4H RSI bullish breakout with stable 0.010% funding rate.'
        : 'Terdeteksi outflow senilai $85.6M dari Binance ke cold storage. RSI 4H breakout bullish dengan funding rate stabil 0.010%.',
      timestamp: `${formatLocalizedMarketTimestamp(new Date(), 'CRYPTO', false)} (${isEn ? 'Just now' : 'Baru saja'})`,
      price: liveAlerts.find((a) => a.symbol === 'BTC')?.price || 76970,
      changePercent: -2.60,
      read: false,
    };

    setLiveAlerts([newMockAlert, ...liveAlerts]);

    if (soundEnabled) {
      playSignalChime('bullish');
    }

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(newMockAlert.title, {
          body: newMockAlert.message,
          badge: '/favicon.ico',
        });
      } catch {
        // Fallback or ignore
      }
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'MEDIUM':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'LOW':
        return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0c1322] border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Bell className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold text-white font-mono tracking-tight">
                {isEn ? 'Notification Center & Real-Time Predictive Signals' : 'Pusat Notifikasi & Sinyal Prediktif Real-Time'}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
              {isEn
                ? '24/7 instant signal monitoring engine evaluating Binance volume anomalies, TradingView technical crossovers, on-chain whale alerts, and Wall Street quantitative crypto models.'
                : 'Engine pemantau sinyal instan 24/7 yang mengevaluasi anomali volume Binance, crossing teknikal TradingView, on-chain whale alerts, dan model kuantitatif saham Wall Street.'}
            </p>
          </div>

          {/* Trigger Actions */}
          <div className="flex items-center gap-3">
            {!pushEnabled && (
              <button
                onClick={onRequestPush}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold rounded-lg border border-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Bell className="w-4 h-4 text-sky-400" />
                <span>{isEn ? 'Enable Browser Push' : 'Izinkan Browser Push'}</span>
              </button>
            )}

            <button
              onClick={handleSimulateCrucialSignal}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-sky-400 hover:text-sky-300 border border-sky-800/60 text-xs sm:text-sm font-semibold rounded-lg flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Radio className="w-4 h-4 animate-pulse" />
              <span>{isEn ? 'Simulate Instant Crucial Signal' : 'Simulasi Sinyal Krusial Instan'}</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-slate-800/80">
          {[
            { id: 'ALL', label: isEn ? 'All Alerts' : 'Semua Alert' },
            { id: 'AI_SIGNAL', label: isEn ? 'Quantitative Signals' : 'Sinyal Kuantitatif' },
            { id: 'BREAKOUT', label: isEn ? 'Volume Breakout' : 'Breakout Volume' },
            { id: 'BANDAR_ACC', label: isEn ? 'Institutional/Whale Accumulation' : 'Akumulasi Institusi/Bandar' },
            { id: 'STOP_LOSS_WARNING', label: isEn ? 'Risk Warning' : 'Peringatan Risiko' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterType === tab.id
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alert Feed Stream */}
      <div className="space-y-3.5">
        {filteredAlerts.map((alert) => (
          <div
            key={alert.id}
            className="bg-[#0c1322] border border-slate-800 hover:border-slate-700 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 transition-colors shadow-sm"
          >
            <div className="flex items-start gap-4">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border shadow-inner ${
                  alert.severity === 'HIGH'
                    ? 'bg-rose-950/40 text-rose-400 border-rose-800/60'
                    : 'bg-sky-950/40 text-sky-400 border-sky-800/60'
                }`}
              >
                {alert.severity === 'HIGH' ? (
                  <ShieldAlert className="w-4 h-4" />
                ) : (
                  <Activity className="w-4 h-4" />
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-extrabold text-white font-mono text-base">{alert.symbol}</span>
                  <span className="text-xs text-slate-400 font-mono">({alert.market})</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getSeverityBadge(
                      alert.severity
                    )}`}
                  >
                    {alert.type}
                  </span>
                  <span className="text-xs text-slate-400 font-mono inline-flex items-center gap-1 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800">
                    <Clock className="w-3 h-3 text-sky-400" />
                    <span>{alert.timestamp}</span>
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-100">{alert.title}</h4>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
                  {alert.message}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0 self-end md:self-center">
              <div className="text-right font-mono">
                <div className="text-sm sm:text-base font-extrabold text-white tabular-nums">
                  ${alert.price < 1 ? alert.price.toFixed(4) : alert.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div
                  className={`text-xs font-bold tabular-nums ${
                    alert.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {alert.changePercent >= 0 ? '+' : ''}
                  {alert.changePercent.toFixed(2)}%
                </div>
              </div>

              <button
                onClick={() => onSelectStock(alert.symbol)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                <span>Chart</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
