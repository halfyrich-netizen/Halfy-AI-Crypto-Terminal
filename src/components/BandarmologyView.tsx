import React, { useState } from 'react';
import { Stock, MarketType } from '../types/stock';
import { Language, translations } from '../utils/translations';
import { Eye, TrendingUp, TrendingDown, Layers, Zap, ArrowUpRight, BarChart3, Database } from 'lucide-react';

interface BandarmologyViewProps {
  stocks: Stock[];
  currentMarket: MarketType;
  onSelectStock: (symbol: string) => void;
  lang?: Language;
}

export const BandarmologyView: React.FC<BandarmologyViewProps> = ({
  stocks,
  onSelectStock,
  lang = 'ID',
}) => {
  const isEn = lang === 'EN';
  const t = translations[lang] || translations.ID;
  const isCrypto = true;
  const filtered = stocks;

  const [selectedStockSymbol, setSelectedStockSymbol] = useState(
    filtered.length > 0 ? filtered[0].symbol : ''
  );

  const activeStock = filtered.find((s) => s.symbol === selectedStockSymbol) || filtered[0];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Big Accumulation':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'Normal Accumulation':
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-600/30';
      case 'Neutral':
        return 'bg-slate-800 text-slate-400 border-slate-700';
      case 'Normal Distribution':
        return 'bg-rose-500/15 text-rose-300 border-rose-600/30';
      case 'Big Distribution':
        return 'bg-rose-500/25 text-rose-400 border-rose-500/50';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Info Header */}
      <div className="bg-[#0e1626] border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2.5">
              <Eye className="w-5 h-5 text-amber-400" />
              <h1 className="text-xl font-bold text-white tracking-tight font-mono">
                Whale Tracker & On-Chain Flow Radar (Crypto 24/7)
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
              {isEn
                ? 'Real-time tracking of whale wallet maneuvers, exchange reserves flow (CEX Inflow/Outflow), futures liquidation heatmaps, and institutional Spot ETF accumulation activity (BlackRock, Fidelity).'
                : 'Pelacakan real-time gerak-gerik dompet paus (Whale Wallets), perpindahan cadangan bursa (CEX Inflow/Outflow), rasio likuidasi pasar futures, dan aktivitas akumulasi institusi spot ETF (BlackRock, Fidelity).'}
            </p>
          </div>

          {/* Asset Selector Pills */}
          <div className="flex flex-wrap items-center gap-1.5 max-w-xl">
            {filtered.map((stock) => (
              <button
                key={stock.symbol}
                onClick={() => setSelectedStockSymbol(stock.symbol)}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded-md transition-all cursor-pointer ${
                  activeStock?.symbol === stock.symbol
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {stock.symbol}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeStock && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Accumulation Status & Flow Summary */}
          <div className="bg-[#0e1626] border border-slate-800 rounded-xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white font-mono">{activeStock.symbol}</h3>
                  <span className="text-[11px] font-mono text-amber-400 bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-800/60">
                    {activeStock.tvSymbol}
                  </span>
                </div>
                <span className="text-xs text-slate-400">{activeStock.name}</span>
              </div>
              <span
                className={`px-3 py-1 rounded-md text-xs font-mono font-bold border ${getStatusBadge(
                  activeStock.bandarmology.accumulationStatus
                )}`}
              >
                {activeStock.bandarmology.accumulationStatus}
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="space-y-3 font-sans">
              <div className="bg-slate-900/90 p-3.5 rounded-lg border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-300">
                  {isCrypto ? 'Net Whale & ETF Inflow (24j)' : 'Net Institutional Flow Hari Ini'}
                </span>
                <span
                  className={`font-mono text-sm font-bold tabular-nums ${
                    activeStock.bandarmology.netForeignFlowToday >= 0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {activeStock.bandarmology.netForeignFlowToday >= 0 ? '+' : ''}$
                  {activeStock.bandarmology.netForeignFlowToday.toLocaleString()} Juta USD
                </span>
              </div>

              <div className="bg-slate-900/90 p-3.5 rounded-lg border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-300">Arus Kumulatif 5 Hari</span>
                <span
                  className={`font-mono text-sm font-bold tabular-nums ${
                    activeStock.bandarmology.netForeignFlow5D >= 0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {activeStock.bandarmology.netForeignFlow5D >= 0 ? '+' : ''}$
                  {activeStock.bandarmology.netForeignFlow5D.toLocaleString()} Juta USD
                </span>
              </div>

              <div className="bg-slate-900/90 p-3.5 rounded-lg border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-300">
                  {isCrypto ? 'Dominasi Paus & Smart Money' : 'Dominasi Investor Institusi'}
                </span>
                <span className="font-mono text-sm font-bold text-amber-400 tabular-nums">
                  {activeStock.bandarmology.foreignDominancePercent}%
                </span>
              </div>

              {activeStock.bandarmology.exchangeNetInflow !== undefined && (
                <div className="bg-slate-900/90 p-3.5 rounded-lg border border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-300">Cadangan Bursa (CEX Net Flow)</span>
                  <span
                    className={`font-mono text-sm font-bold tabular-nums ${
                      activeStock.bandarmology.exchangeNetInflow < 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {activeStock.bandarmology.exchangeNetInflow} Juta USD (
                    {activeStock.bandarmology.exchangeNetInflow < 0 ? 'Outflow Bullish' : 'Inflow Tekanan'}
                    )
                  </span>
                </div>
              )}

              {activeStock.bandarmology.fundingRate !== undefined && (
                <div className="bg-slate-900/90 p-3.5 rounded-lg border border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-300">Perpetual Funding Rate (8j)</span>
                  <span className="font-mono text-sm font-bold text-sky-400 tabular-nums">
                    +{ (activeStock.bandarmology.fundingRate * 100).toFixed(4) }%
                  </span>
                </div>
              )}

              <div className="bg-slate-900/90 p-3.5 rounded-lg border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-300">Konsentrasi Top 5 Wallet / Broker</span>
                <span className="font-mono text-sm font-bold text-sky-400 tabular-nums">
                  {(activeStock.bandarmology.bandarVolumeRatio * 100).toFixed(0)}% dari Total Volume
                </span>
              </div>
            </div>

            <button
              onClick={() => onSelectStock(activeStock.symbol)}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span>Lihat Chart TradingView {activeStock.symbol}</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          {/* Right 2 Columns: Top Buyer & Seller Wallets / Brokers */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Buyer Side */}
              <div className="bg-[#0e1626] border border-slate-800 rounded-xl p-5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wide">
                      {isCrypto ? 'Top Pembeli Terbesar (Whale Inflow)' : 'Top Buyer Brokers (Akumulasi)'}
                    </h4>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">AKUMULASI</span>
                </div>

                <div className="space-y-2.5">
                  {activeStock.bandarmology.topBuyerBrokers.map((buyer, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900/80 p-3 rounded-lg border border-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded text-[10px]">
                            {buyer.code}
                          </span>
                          <span className="text-white font-medium truncate max-w-[150px]">{buyer.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Harga Rata-Rata: ${buyer.avgPrice.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-white font-bold block tabular-nums">
                          ${buyer.valueBillion.toFixed(1)}M
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {buyer.volumeLot.toLocaleString()} unit
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Seller Side */}
              <div className="bg-[#0e1626] border border-slate-800 rounded-xl p-5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-rose-400" />
                    <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wide">
                      {isCrypto ? 'Top Penjual Terbesar (Whale Outflow)' : 'Top Seller Brokers (Distribusi)'}
                    </h4>
                  </div>
                  <span className="text-[11px] font-mono text-rose-400 font-bold">DISTRIBUSI</span>
                </div>

                <div className="space-y-2.5">
                  {activeStock.bandarmology.topSellerBrokers.map((seller, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900/80 p-3 rounded-lg border border-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded text-[10px]">
                            {seller.code}
                          </span>
                          <span className="text-white font-medium truncate max-w-[150px]">{seller.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Harga Rata-Rata: ${seller.avgPrice.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-white font-bold block tabular-nums">
                          ${seller.valueBillion.toFixed(1)}M
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {seller.volumeLot.toLocaleString()} unit
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Whale Flow Interpretation Banner */}
            <div className="bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 border border-amber-800/50 rounded-xl p-4 flex items-start gap-3.5 shadow-sm">
              <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <h4 className="font-bold text-white font-mono">
                  Sintesis Deteksi Paus & Smart Money ({activeStock.symbol})
                </h4>
                <p className="text-slate-300 leading-relaxed font-sans">
                  {activeStock.aiSignal.thesis}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
