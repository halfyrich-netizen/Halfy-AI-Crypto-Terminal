import React, { useState } from 'react';
import { MarketIndex, Stock } from '../types/stock';
import { Language } from '../utils/translations';
import { TrendingUp, TrendingDown, Pause, Play, Gauge } from 'lucide-react';

interface TickerTapeProps {
  indices: MarketIndex[];
  stocks: Stock[];
  onSelectStock: (symbol: string) => void;
  lang?: Language;
}

export const TickerTape: React.FC<TickerTapeProps> = ({ indices, stocks, onSelectStock, lang = 'ID' }) => {
  const isEn = lang === 'EN';
  const [isPaused, setIsPaused] = useState(false);
  const [tickerSpeed, setTickerSpeed] = useState<number>(120); // 120s is very calm and readable

  const speedOptions = [
    { label: isEn ? '0.75x Slow' : '0.75x Lambat', duration: 160 },
    { label: isEn ? '1x Normal' : '1x Normal', duration: 120 },
    { label: isEn ? '1.5x Fast' : '1.5x Cepat', duration: 75 },
  ];

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'USD') {
      if (price < 0.001) return `$${price.toFixed(7)}`;
      if (price < 1) return `$${price.toFixed(4)}`;
      if (price < 100) return `$${price.toFixed(2)}`;
      return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `Rp ${price.toLocaleString('id-ID')}`;
  };

  // Render a single strip of items
  const renderItems = (prefix: string) => (
    <div className="inline-flex items-center gap-6 shrink-0">
      {/* Indices Group */}
      <div className="inline-flex items-center gap-5 pr-5 border-r border-slate-800/90">
        {indices.map((idx) => {
          const isPos = idx.change >= 0;
          return (
            <div key={`${prefix}-idx-${idx.symbol}`} className="inline-flex items-center gap-2 text-xs sm:text-sm">
              <span className="font-extrabold text-slate-200 font-mono tracking-tight">{idx.symbol}</span>
              <span className="font-mono text-white tabular-nums font-semibold">
                {!Number.isFinite(idx.price)
                  ? '—' /* T11: data hilang/NaN tidak boleh tampil sebagai $0 */
                  : idx.symbol.includes('%') || idx.symbol.includes('.D')
                  ? `${idx.price.toFixed(2)}%`
                  : idx.symbol.includes('TOTAL')
                  ? `$${idx.price.toFixed(2)}T` /* nilai indeks sudah dalam satuan triliun */
                  : idx.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span
                className={`inline-flex items-center gap-0.5 font-mono text-xs tabular-nums font-bold ${
                  isPos ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isPos ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {isPos ? '+' : ''}
                {idx.changePercent.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Stocks Group */}
      <div className="inline-flex items-center gap-4">
        {stocks.map((stock) => {
          const isPos = stock.changePercent >= 0;
          return (
            <button
              key={`${prefix}-stock-${stock.symbol}`}
              onClick={() => onSelectStock(stock.symbol)}
              title={`Buka chart & analisis ${stock.symbol} (${stock.name})`}
              className="inline-flex items-center gap-2 text-xs sm:text-sm hover:bg-slate-800/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer group"
            >
              <span className="font-bold text-sky-400 font-mono group-hover:text-sky-300 underline-offset-2 group-hover:underline">
                {stock.symbol}
              </span>
              <span className="font-mono text-slate-200 tabular-nums font-medium">
                {formatPrice(stock.currentPrice, stock.currency)}
              </span>
              <span
                className={`font-mono text-xs tabular-nums font-bold inline-flex items-center ${
                  isPos ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isPos ? '+' : ''}
                {stock.changePercent.toFixed(2)}%
              </span>
              {stock.aiSignal.action === 'Strong Buy' && (
                <span className="text-[10px] text-emerald-400 font-mono font-bold">
                  BUY
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="relative bg-[#090e1b] border-b border-slate-800/90 py-2.5 px-3 select-none flex items-center shadow-xs overflow-hidden">
      {/* Static Terminal Live Label & Controls */}
      <div className="z-20 shrink-0 flex items-center gap-2 pl-1 pr-3 bg-[#090e1b] border-r border-slate-800">
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="text-[11px] font-bold font-mono tracking-wider text-slate-300 hidden sm:inline">
          LIVE TICKER
        </span>

        {/* Pause/Play Button */}
        <button
          onClick={() => setIsPaused(!isPaused)}
          title={isPaused ? (isEn ? 'Resume ticker' : 'Lanjutkan running ticker') : (isEn ? 'Pause ticker' : 'Jeda running ticker')}
          className="p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          {isPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3 text-slate-400" />}
        </button>
      </div>

      {/* Left and Right Edge Vignette Shadows */}
      <div className="pointer-events-none absolute left-28 sm:left-44 top-0 bottom-0 w-8 bg-gradient-to-r from-[#090e1b] to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-[#090e1b] to-transparent z-10" />

      {/* Continuous Marquee Rail with dynamic duration */}
      <div
        className="overflow-hidden whitespace-nowrap w-full flex pl-3"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div
          className={`animate-ticker inline-flex items-center gap-6 ${
            isPaused ? 'animate-ticker-paused' : ''
          }`}
          style={{ animationDuration: `${tickerSpeed}s` }}
        >
          {renderItems('set1')}
          {renderItems('set2')}
          {renderItems('set3')}
        </div>
      </div>
    </div>
  );
};
