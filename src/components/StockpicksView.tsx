import React, { useState, useMemo } from 'react';
import { Stock, MarketType, SignalAction } from '../types/stock';
import { analyzeWithGemini, computeQuantitativeMathAnalysis, GeminiAnalysisResult } from '../services/api';
import { Language, translations } from '../utils/translations';
import { 
  ArrowUpRight, 
  SlidersHorizontal, 
  LayoutGrid, 
  Table as TableIcon, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  ExternalLink, 
  PlusCircle, 
  BarChart2, 
  Zap,
  Sparkles,
  Bot,
  Activity,
  Layers,
  X,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calculator
} from 'lucide-react';

interface StockpicksViewProps {
  stocks: Stock[];
  currentMarket?: MarketType;
  onSelectStock: (symbol: string) => void;
  onAddToPortfolio: (stock: Stock) => void;
  lang?: Language;
}

type SortField = 'score' | 'upside' | 'rr' | 'inflow' | 'change';
type ViewMode = 'cards' | 'table';

export const StockpicksView: React.FC<StockpicksViewProps> = ({
  stocks,
  onSelectStock,
  onAddToPortfolio,
  lang = 'ID',
}) => {
  const isEn = lang === 'EN';
  const t = translations[lang] || translations.ID;
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortAsc, setSortAsc] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  // Quantitative & AI Deep Dive Analysis Modal State
  const [activeAnalysisStock, setActiveAnalysisStock] = useState<Stock | null>(null);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<GeminiAnalysisResult | null>(null);
  const [analyzingAI, setAnalyzingAI] = useState(false);
  const [copiedThesis, setCopiedThesis] = useState(false);
  const [analysisEngine, setAnalysisEngine] = useState<'math' | 'gemini'>('math');

  // Extract unique sectors
  const availableSectors = useMemo(() => {
    const set = new Set<string>();
    stocks.forEach((s) => {
      if (s.sector) set.add(s.sector);
    });
    return Array.from(set).sort();
  }, [stocks]);

  // Format price helper with crypto decimal support
  const formatPrice = (p: number) => {
    if (p < 0.0001) return `$${p.toFixed(8)}`;
    if (p < 1) return `$${p.toFixed(4)}`;
    return `$${p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Filter and sort stocks
  const processedStocks = useMemo(() => {
    return stocks
      .filter((stock) => {
        if (filterAction !== 'ALL') {
          if (filterAction === 'LONG' && !(stock.aiSignal.action === 'Strong Long' || stock.aiSignal.action === 'Long (Buy on Dip)' || stock.aiSignal.action === 'Strong Buy' || stock.aiSignal.action === 'Buy')) return false;
          if (filterAction === 'RANGE' && !(stock.aiSignal.action === 'Neutral / Range' || stock.aiSignal.action === 'Hold')) return false;
          if (filterAction === 'SHORT' && !(stock.aiSignal.action === 'Short / Hedge' || stock.aiSignal.action === 'Sell' || stock.aiSignal.action === 'Cut Loss')) return false;
        }
        if (selectedSector !== 'ALL' && stock.sector !== selectedSector) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          return (
            stock.symbol.toLowerCase().includes(q) ||
            stock.name.toLowerCase().includes(q) ||
            (stock.sector && stock.sector.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .sort((a, b) => {
        let valA = 0;
        let valB = 0;

        switch (sortField) {
          case 'score':
            valA = a.aiSignal.confidenceScore;
            valB = b.aiSignal.confidenceScore;
            break;
          case 'upside': {
            const upA = ((a.aiSignal.targetPrice1 - a.currentPrice) / a.currentPrice) * 100;
            const upB = ((b.aiSignal.targetPrice1 - b.currentPrice) / b.currentPrice) * 100;
            valA = upA;
            valB = upB;
            break;
          }
          case 'rr':
            valA = a.aiSignal.riskRewardRatio;
            valB = b.aiSignal.riskRewardRatio;
            break;
          case 'inflow':
            valA = a.bandarmology.netForeignFlowToday;
            valB = b.bandarmology.netForeignFlowToday;
            break;
          case 'change':
            valA = a.changePercent;
            valB = b.changePercent;
            break;
          default:
            valA = a.aiSignal.confidenceScore;
            valB = b.aiSignal.confidenceScore;
        }

        return sortAsc ? valA - valB : valB - valA;
      });
  }, [stocks, filterAction, selectedSector, searchQuery, sortField, sortAsc]);

  const getActionBadge = (action: SignalAction) => {
    switch (action) {
      case 'Strong Long':
      case 'Strong Buy':
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold';
      case 'Long (Buy on Dip)':
      case 'Buy':
      case 'Buy on Weakness':
        return 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold';
      case 'Neutral / Range':
      case 'Hold':
        return 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold';
      case 'Short / Hedge':
      case 'Sell':
      case 'Cut Loss':
        return 'bg-rose-500/20 text-rose-400 border border-rose-500/40 font-bold';
      default:
        return 'bg-slate-800 text-slate-300 border border-slate-700';
    }
  };

  // Instant Mathematical Quantitative Execution (<2ms)
  const handleOpenAiDeepDive = (stock: Stock) => {
    setActiveAnalysisStock(stock);
    setAnalysisEngine('math');
    setCopiedThesis(false);

    // Compute mathematical quantitative model instantly (0 ms delay, no loading spinner)
    const instantResult = computeQuantitativeMathAnalysis(stock);
    setAiAnalysisResult(instantResult);
    setAnalyzingAI(false);
  };

  const handleSwitchEngine = async (stock: Stock, engine: 'math' | 'gemini') => {
    setAnalysisEngine(engine);
    if (engine === 'math') {
      const instantResult = computeQuantitativeMathAnalysis(stock);
      setAiAnalysisResult(instantResult);
      setAnalyzingAI(false);
    } else {
      setAnalyzingAI(true);
      try {
        const res = await analyzeWithGemini(stock.symbol, undefined, 'gemini');
        setAiAnalysisResult(res);
      } catch (err) {
        console.error('Failed to run Gemini engine, keeping math model:', err);
      } finally {
        setAnalyzingAI(false);
      }
    }
  };

  const handleCopyThesis = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedThesis(true);
    setTimeout(() => setCopiedThesis(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quantitative Alpha Radar Headline */}
      <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Bot className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
                {isEn ? 'Crypto AI Alpha Picks & Signal Radar' : 'Crypto AI Alpha Picks & Signal Radar'}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-3xl leading-relaxed">
              {isEn
                ? '4-Factor Quantitative Model uniting Technical Structure (RSI, MA Ribbon, Support/Resistance), On-Chain Whale Flow (CEX Reserves Outflow), Derivative Metrics (Perpetual Funding Rate 8H & Open Interest), plus Tokenomics & AI Narrative Catalysts.'
                : 'Model kuantitatif 4-faktor yang menyatukan Struktur Teknikal (RSI, MA Ribbon, Support/Resisten), Flow Akumulasi Paus On-Chain (CEX Reserves Outflow), Metrik Derivatif (Perpetual Funding Rate 8H & Open Interest), serta Tokenomics & Katalis Narasi AI.'}
            </p>
          </div>

          {/* Quick Metrics Counter */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-right">
              <span className="text-[10px] text-slate-400 font-mono block">
                {isEn ? 'Actively Scanned' : 'Aktif Dipindai'}
              </span>
              <span className="text-lg font-black text-white font-mono tabular-nums">
                {stocks.length} {isEn ? 'Coins' : 'Koin'}
              </span>
            </div>
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl px-4 py-2 text-right">
              <span className="text-[10px] text-emerald-300 font-mono block">
                {isEn ? 'Active Long Signals' : 'Sinyal Long Aktif'}
              </span>
              <span className="text-lg font-black text-emerald-400 font-mono tabular-nums">
                {stocks.filter((s) => s.aiSignal.action === 'Strong Long' || s.aiSignal.action === 'Long (Buy on Dip)').length} {isEn ? 'Setups' : 'Setup'}
              </span>
            </div>
          </div>
        </div>

        {/* Narrative Category Filter Strip */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono font-semibold shrink-0 flex items-center gap-1.5 pr-1">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>{isEn ? 'Narrative:' : 'Sektor / Narasi:'}</span>
            </span>
            <button
              onClick={() => setSelectedSector('ALL')}
              className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-lg transition-colors cursor-pointer ${
                selectedSector === 'ALL'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {isEn ? `All Narratives (${stocks.length})` : `Semua Narasi (${stocks.length})`}
            </button>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-mono py-1.5 px-3 rounded-lg focus:outline-hidden focus:border-amber-500/50 cursor-pointer"
            >
              <option value="ALL">{isEn ? '-- Select Specific Sector --' : '-- Pilih Spesifik Sektor --'}</option>
              {availableSectors.map((sector) => {
                const count = stocks.filter((s) => s.sector === sector).length;
                return (
                  <option key={sector} value={sector}>
                    {sector} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Filter, Search & View Controls */}
      <div className="bg-[#090f1d] border border-slate-800/90 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Signal Action Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
          <span className="text-slate-400 font-semibold pr-1 hidden sm:inline">
            {isEn ? 'AI Signal:' : 'Sinyal AI:'}
          </span>
          {[
            { id: 'ALL', label: isEn ? 'All Signals' : 'Semua Sinyal' },
            { id: 'LONG', label: isEn ? '🟢 Long / Buy on Dip' : '🟢 Long / Buy on Dip' },
            { id: 'RANGE', label: isEn ? '🟡 Range / Neutral' : '🟡 Range / Neutral' },
            { id: 'SHORT', label: isEn ? '🔴 Short / Hedge' : '🔴 Short / Hedge' },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilterAction(btn.id)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                filterAction === btn.id
                  ? 'bg-slate-800 text-amber-400 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Right: Search, Sort & Toggle View */}
        <div className="flex items-center gap-3 justify-between md:justify-end">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={isEn ? "Search coin (BTC, SUI, RENDER)..." : "Cari koin (BTC, SUI, RENDER)..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 w-48 sm:w-56 font-mono"
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs font-mono">
            <SlidersHorizontal className="w-3 h-3 text-slate-400" />
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="bg-transparent text-slate-300 text-xs outline-none cursor-pointer"
            >
              <option value="score" className="bg-slate-900 text-white">
                {isEn ? 'Alpha Score' : 'Skor Alpha'}
              </option>
              <option value="upside" className="bg-slate-900 text-white">
                {isEn ? 'Upside Potential (%)' : 'Potensi Upside (%)'}
              </option>
              <option value="rr" className="bg-slate-900 text-white">
                {isEn ? 'Risk/Reward' : 'Risk/Reward'}
              </option>
              <option value="inflow" className="bg-slate-900 text-white">
                {isEn ? 'Whale Flow ($M)' : 'Arus Paus ($M)'}
              </option>
              <option value="change" className="bg-slate-900 text-white">
                {isEn ? '24h Change (%)' : 'Perubahan 24h (%)'}
              </option>
            </select>
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="text-slate-400 hover:text-white pl-1 cursor-pointer font-bold"
              title={isEn ? "Reverse sort direction" : "Balik arah urutan"}
            >
              {sortAsc ? '▲' : '▼'}
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded-lg">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded transition-all cursor-pointer ${
                viewMode === 'cards' ? 'bg-slate-800 text-amber-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Tampilan Kartu Analisis"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-slate-800 text-amber-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Tampilan Tabel Komparasi"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Render Main Content: Cards or Table */}
      {processedStocks.length === 0 ? (
        <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-white">Tidak ada koin yang sesuai kriteria filter.</p>
          <p className="text-xs text-slate-400 mt-1">Coba sesuaikan pencarian atau pilih kategori narasi yang lain.</p>
        </div>
      ) : viewMode === 'cards' ? (
        /* ================= CARD GRID VIEW ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {processedStocks.map((stock) => {
            const sig = stock.aiSignal;
            const isPos = stock.changePercent >= 0;
            const upsidePct = ((sig.targetPrice1 - stock.currentPrice) / stock.currentPrice) * 100;

            return (
              <div
                key={stock.symbol}
                className="bg-[#0b1322] border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-sm transition-all flex flex-col justify-between group hover:shadow-lg relative overflow-hidden"
              >
                {/* Subtle Glow Accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onSelectStock(stock.symbol)}
                          className="font-mono font-bold text-white text-lg hover:text-amber-400 transition-colors text-left cursor-pointer"
                        >
                          {stock.symbol}
                        </button>
                        <span className="text-[11px] font-mono text-slate-400">
                          {stock.tvSymbol.replace('BINANCE:', '')}
                        </span>
                        <span className={`text-[11px] font-mono font-bold ${
                          sig.action.includes('Long') || sig.action.includes('Buy')
                            ? 'text-emerald-400'
                            : sig.action.includes('Short') || sig.action.includes('Sell')
                            ? 'text-rose-400'
                            : 'text-amber-400'
                        }`}>
                          ● {sig.action}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[210px] font-sans">
                        {stock.name} · <span className="text-slate-300 font-medium">{stock.sector}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-base font-bold font-mono text-white tabular-nums">
                        {formatPrice(stock.currentPrice)}
                      </div>
                      <div
                        className={`text-xs font-mono font-bold flex items-center justify-end gap-0.5 ${
                          isPos ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {isPos ? '+' : ''}{stock.changePercent.toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  {/* Quantitative Target Matrix (Clean Tabular Layout) */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/80 font-mono text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Entry</span>
                      <strong className="text-slate-200 text-xs truncate block mt-0.5">
                        {formatPrice(sig.entryPriceRange[0])}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Target 1</span>
                      <strong className="text-emerald-400 text-xs truncate block mt-0.5">
                        {formatPrice(sig.targetPrice1)} <span className="text-[10px] text-emerald-500 font-normal">(+{upsidePct.toFixed(0)}%)</span>
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Stop Loss</span>
                      <strong className="text-rose-400 text-xs truncate block mt-0.5">
                        {formatPrice(sig.stopLoss)}
                      </strong>
                    </div>
                  </div>

                  {/* 4-Pillar Score Bar (Clean Tabular Row) */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800/60 grid grid-cols-4 gap-2 text-center font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 block">{isEn ? 'Technical' : 'Teknikal'}</span>
                      <strong className="text-xs text-sky-400 tabular-nums">{sig.technicalScore}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">On-Chain</span>
                      <strong className="text-xs text-emerald-400 tabular-nums">{sig.bandarScore}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Funding 8H</span>
                      <strong className="text-xs text-amber-400 tabular-nums">
                        {stock.bandarmology.fundingRate ? `${(stock.bandarmology.fundingRate * 100).toFixed(2)}%` : '0.01%'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Risk/Reward</span>
                      <strong className="text-xs text-slate-200 tabular-nums">1:{sig.riskRewardRatio}</strong>
                    </div>
                  </div>

                  {/* Thesis Narrative Box */}
                  <div className="mt-3 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-300 leading-relaxed font-sans">
                    {sig.thesis}
                  </div>
                </div>

                {/* Card Action Strip */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2.5">
                  {/* Deep AI Analysis Button */}
                  <button
                    onClick={() => handleOpenAiDeepDive(stock)}
                    className="flex-1 py-2 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isEn ? 'Deep AI Breakdown' : 'Deep AI Breakdown'}</span>
                  </button>

                  {/* Add to Portfolio Button */}
                  <button
                    onClick={() => onAddToPortfolio(stock)}
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                    title={isEn ? "+ Open & Record Position in Portfolio" : "+ Ambil & Catat Posisi di Portofolio"}
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>+ {isEn ? 'Position' : 'Posisi'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= TABLE COMPARISON VIEW ================= */
        <div className="bg-[#0b1322] border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono text-left">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="py-3 px-4">{isEn ? 'Coin / Symbol' : 'Koin / Simbol'}</th>
                  <th className="py-3 px-4">{isEn ? 'Live Price' : 'Harga Live'}</th>
                  <th className="py-3 px-4">{isEn ? 'AI Signal' : 'Sinyal AI'}</th>
                  <th className="py-3 px-4">{isEn ? 'Alpha Score' : 'Skor Alpha'}</th>
                  <th className="py-3 px-4">Entry Zone</th>
                  <th className="py-3 px-4">{isEn ? 'Target 1 & Upside' : 'Target 1 & Upside'}</th>
                  <th className="py-3 px-4">Stop Loss</th>
                  <th className="py-3 px-4">{isEn ? 'Whale Flow' : 'Arus Paus'}</th>
                  <th className="py-3 px-4">Funding 8H</th>
                  <th className="py-3 px-4 text-right">{isEn ? 'Action' : 'Aksi'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {processedStocks.map((stock) => {
                  const sig = stock.aiSignal;
                  const isPos = stock.changePercent >= 0;
                  const upsidePct = ((sig.targetPrice1 - stock.currentPrice) / stock.currentPrice) * 100;

                  return (
                    <tr key={stock.symbol} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => onSelectStock(stock.symbol)}
                          className="font-bold text-white hover:text-amber-400 text-left font-mono text-sm block"
                        >
                          {stock.symbol}
                        </button>
                        <span className="text-[11px] text-slate-400 truncate max-w-[150px] font-sans block">
                          {stock.name}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 tabular-nums">
                        <span className="font-bold text-white block">{formatPrice(stock.currentPrice)}</span>
                        <span className={`text-[11px] font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isPos ? '+' : ''}{stock.changePercent.toFixed(2)}%
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] ${getActionBadge(sig.action)}`}>
                          {sig.action}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 tabular-nums">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-amber-400 text-sm">{sig.confidenceScore}</span>
                          <span className="text-[10px] text-slate-500">/100</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 tabular-nums text-slate-300">
                        {formatPrice(sig.entryPriceRange[0])}
                      </td>

                      <td className="py-3.5 px-4 tabular-nums">
                        <span className="font-bold text-emerald-400 block">{formatPrice(sig.targetPrice1)}</span>
                        <span className="text-[10px] text-emerald-500 font-bold">+{upsidePct.toFixed(1)}%</span>
                      </td>

                      <td className="py-3.5 px-4 tabular-nums text-rose-400 font-semibold">
                        {formatPrice(sig.stopLoss)}
                      </td>

                      <td className="py-3.5 px-4 tabular-nums">
                        <span className="text-emerald-400 font-bold block">
                          +${stock.bandarmology.netForeignFlowToday}M
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {stock.bandarmology.exchangeNetInflow && stock.bandarmology.exchangeNetInflow < 0
                            ? `${stock.bandarmology.exchangeNetInflow}M Outflow`
                            : 'Accumulation'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 tabular-nums text-slate-300">
                        {stock.bandarmology.fundingRate ? `${(stock.bandarmology.fundingRate * 100).toFixed(3)}%` : '0.010%'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenAiDeepDive(stock)}
                            className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-xs font-semibold cursor-pointer"
                          >
                            AI
                          </button>
                          <button
                            onClick={() => onAddToPortfolio(stock)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded text-xs font-semibold flex items-center gap-1 border border-slate-700 cursor-pointer"
                            title="+ Ambil & Catat Posisi di Portofolio"
                          >
                            <PlusCircle className="w-3 h-3 text-amber-400" />
                            <span>+ Posisi</span>
                          </button>
                          <button
                            onClick={() => onSelectStock(stock.symbol)}
                            className="p-1 text-slate-400 hover:text-sky-400 cursor-pointer"
                            title="Chart TradingView"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= AI DEEP DIVE MODAL (GEMINI 3.8 FLASH) ================= */}
      {activeAnalysisStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#0b1322] border border-slate-700 rounded-2xl w-full max-w-3xl p-6 shadow-2xl space-y-5 animate-in fade-in duration-200 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg sm:text-xl font-black text-white font-mono">
                      {activeAnalysisStock.symbol} — Deep AI Intelligence Breakdown
                    </h3>
                    <span className="text-[11px] font-mono text-amber-400 bg-amber-950/70 border border-amber-800/60 px-2 py-0.5 rounded">
                      {activeAnalysisStock.tvSymbol}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-sans">
                    {activeAnalysisStock.name} · Sektor {activeAnalysisStock.sector} · Harga Spot Live: <strong>{formatPrice(activeAnalysisStock.currentPrice)}</strong>
                  </span>
                </div>
              </div>
              <button
                onClick={() => setActiveAnalysisStock(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Engine Selector Segmented Control */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-2 rounded-xl">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-mono text-slate-400 font-semibold pl-1 hidden sm:inline">
                  Mode Engine:
                </span>
                <button
                  type="button"
                  onClick={() => handleSwitchEngine(activeAnalysisStock, 'math')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    analysisEngine === 'math'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Algoritma Matematika Kuantitatif (Instan &lt;2ms)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchEngine(activeAnalysisStock, 'gemini')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    analysisEngine === 'gemini'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Gemini 3.8 Flash AI Model (LLM Narasi)</span>
                </button>
              </div>

              <div className="text-[10px] font-mono text-slate-400 pr-1 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-emerald-400" />
                <span>
                  {analysisEngine === 'math'
                    ? 'Latensi: ~2ms (Formula Z-Score / ATR / Kelly)'
                    : 'Memanggil Gemini Flash Server API (~5-8s)'}
                </span>
              </div>
            </div>

            {analyzingAI ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <div className="text-sm font-semibold text-white font-mono">
                  Menjalankan Analisis Model Gemini 3.8 Flash...
                </div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Mengevaluasi likuiditas order book Binance, pergerakan dompet paus, rasio long/short, funding rate perpetual, dan sentimen narasi on-chain.
                </p>
                <button
                  type="button"
                  onClick={() => handleSwitchEngine(activeAnalysisStock, 'math')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Gunakan Algoritma Matematika Instan (&lt;2ms)
                </button>
              </div>
            ) : aiAnalysisResult ? (
              <div className="space-y-5 text-xs font-mono">
                {/* Mathematical Model Metrics Grid (Shown in Math Mode) */}
                {aiAnalysisResult.data.mathematicalModel && (
                  <div className="bg-gradient-to-r from-amber-500/10 via-sky-500/10 to-emerald-500/10 border border-amber-500/30 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-amber-400" />
                        <h4 className="text-xs font-bold text-white uppercase tracking-wide">
                          Metrik Kuantitatif & Formula Matematika Teruji
                        </h4>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40">
                        ⚡ Eksekusi Instan: {aiAnalysisResult.data.latencyMs || 2}ms
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-lg">
                        <span className="text-[10px] text-slate-400 block">Z-Score Deviasi (MA20)</span>
                        <strong className="text-sm text-sky-400 font-extrabold block mt-0.5 tabular-nums">
                          {aiAnalysisResult.data.mathematicalModel.zScore > 0 ? '+' : ''}
                          {aiAnalysisResult.data.mathematicalModel.zScore}σ
                        </strong>
                        <span className="text-[9px] text-slate-500 block">Mean Reversion Vector</span>
                      </div>

                      <div className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-lg">
                        <span className="text-[10px] text-slate-400 block">ATR Volatilitas Harian</span>
                        <strong className="text-sm text-amber-400 font-extrabold block mt-0.5 tabular-nums">
                          {formatPrice(aiAnalysisResult.data.mathematicalModel.atr)}
                        </strong>
                        <span className="text-[9px] text-slate-500 block">Average True Range</span>
                      </div>

                      <div className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-lg">
                        <span className="text-[10px] text-slate-400 block">Alokasi Kelly Criterion</span>
                        <strong className="text-sm text-emerald-400 font-extrabold block mt-0.5 tabular-nums">
                          {aiAnalysisResult.data.mathematicalModel.kellyFractionPercent}%
                        </strong>
                        <span className="text-[9px] text-slate-500 block">Optimal Sizing Portofolio</span>
                      </div>

                      <div className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-lg">
                        <span className="text-[10px] text-slate-400 block">Rasio Risk/Reward</span>
                        <strong className="text-sm text-white font-extrabold block mt-0.5 tabular-nums">
                          1 : {aiAnalysisResult.data.riskRewardRatio}x
                        </strong>
                        <span className="text-[9px] text-slate-500 block">Fibonacci Projection</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Executive Verdict Strip */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Rekomendasi Model</span>
                    <span className={`inline-block mt-1 px-2.5 py-0.5 rounded text-xs ${getActionBadge(aiAnalysisResult.data.recommendation as SignalAction)}`}>
                      {aiAnalysisResult.data.recommendation}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Kualitas Sinyal (0–100)</span>
                    <strong className="text-base text-amber-400 font-black mt-1 block">
                      {aiAnalysisResult.data.confidenceScore}%
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Skor Sentimen Paus</span>
                    <strong className="text-base text-emerald-400 font-black mt-1 block">
                      {aiAnalysisResult.data.sentimentScore > 0 ? `+${aiAnalysisResult.data.sentimentScore}` : aiAnalysisResult.data.sentimentScore}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Risiko Likuidasi</span>
                    <strong className="text-base text-sky-400 font-black mt-1 block">
                      {aiAnalysisResult.data.liquidationRisk || 'Moderate'}
                    </strong>
                  </div>
                </div>

                {/* Target Strategy Matrix */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 grid grid-cols-3 gap-3 text-center">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Target Ambil Untung 1</span>
                    <strong className="text-sm text-emerald-400 font-bold mt-0.5 block">
                      {formatPrice(aiAnalysisResult.data.targetPrice1)}
                    </strong>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Target Ambil Untung 2</span>
                    <strong className="text-sm text-emerald-300 font-bold mt-0.5 block">
                      {formatPrice(aiAnalysisResult.data.targetPrice2)}
                    </strong>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Invalidasi / Stop Loss</span>
                    <strong className="text-sm text-rose-400 font-bold mt-0.5 block">
                      {formatPrice(aiAnalysisResult.data.stopLossPrice)}
                    </strong>
                  </div>
                </div>

                {/* Executive Summary Thesis */}
                <div className="bg-slate-900/80 border border-amber-500/20 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Tesis Kuantitatif & Narasi Fundamental</span>
                    </span>
                    <button
                      onClick={() => handleCopyThesis(aiAnalysisResult.data.summaryThesis)}
                      className="text-slate-400 hover:text-white flex items-center gap-1 text-[10px] cursor-pointer"
                    >
                      {copiedThesis ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedThesis ? 'Tersalin' : 'Salin Tesis'}</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed font-sans pt-1">
                    {aiAnalysisResult.data.summaryThesis}
                  </p>
                </div>

                {/* 2-Column Deep Factor Highlights */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Technical & Market Structure */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
                    <span className="font-bold text-sky-400 block pb-1 border-b border-slate-800">
                      📊 Struktur Teknikal & Level Kunci
                    </span>
                    <ul className="space-y-1.5 text-[11px] text-slate-300 list-disc list-inside">
                      {aiAnalysisResult.data.technicalHighlights?.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>

                  {/* On-Chain & Whale Accumulation */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
                    <span className="font-bold text-emerald-400 block pb-1 border-b border-slate-800">
                      🐋 Arus Paus & Cadangan CEX
                    </span>
                    <ul className="space-y-1.5 text-[11px] text-slate-300 list-disc list-inside">
                      {aiAnalysisResult.data.onChainHighlights?.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Catalysts */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
                    <span className="font-bold text-amber-300 block pb-1 border-b border-slate-800">
                      ⚡ Katalis Penggerak Utama
                    </span>
                    <ul className="space-y-1.5 text-[11px] text-slate-300 list-disc list-inside">
                      {aiAnalysisResult.data.keyCatalysts?.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Risk Factors */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
                    <span className="font-bold text-rose-400 block pb-1 border-b border-slate-800">
                      ⚠️ Faktor Risiko & Invalidasi
                    </span>
                    <ul className="space-y-1.5 text-[11px] text-slate-300 list-disc list-inside">
                      {aiAnalysisResult.data.riskFactors?.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                  <span className="text-[10px] text-slate-500">
                    Engine: Gemini 3.8 Flash · Feed: Binance Live Public WebSocket/API
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        onSelectStock(activeAnalysisStock.symbol);
                        setActiveAnalysisStock(null);
                      }}
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Lihat Chart TradingView</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        onAddToPortfolio(activeAnalysisStock);
                        setActiveAnalysisStock(null);
                      }}
                      className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      + Tambah ke Portofolio
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
