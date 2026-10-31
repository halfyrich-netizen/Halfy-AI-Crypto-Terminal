import React, { useState, useEffect } from 'react';
import { Stock, Candle } from '../types/stock';
import { fetchCandleData, analyzeWithGemini, computeQuantitativeMathAnalysis, GeminiAnalysisResult } from '../services/api';
import { TradingViewChart, TradingViewTechnicalGauge } from './TradingViewChart';
import { Language, translations } from '../utils/translations';
import { BarChart2, Layers, Compass, AlertCircle, RefreshCw, Radio, Cpu, Activity, Calculator, Zap, Sparkles } from 'lucide-react';

interface ChartTerminalProps {
  stock: Stock;
  onSelectAnotherStock?: (symbol: string) => void;
  onAddToPortfolio?: (stock: Stock) => void;
  lang?: Language;
}

export const ChartTerminal: React.FC<ChartTerminalProps> = ({
  stock,
  onAddToPortfolio,
  lang = 'ID',
}) => {
  const isEn = lang === 'EN';
  const t = translations[lang] || translations.ID;
  const [activeEngine, setActiveEngine] = useState<'tradingview' | 'heuristic'>('tradingview');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [timeframe, setTimeframe] = useState<'1M' | '3M' | '1Y'>('3M');
  const [chartType, setChartType] = useState<'candle' | 'line'>('candle');
  const [showMA20, setShowMA20] = useState(true);
  const [showMA50, setShowMA50] = useState(true);
  const [showRSI, setShowRSI] = useState(true);
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const [loading, setLoading] = useState(false);

  // Gemini & Math Deep Dive state
  const [geminiResult, setGeminiResult] = useState<GeminiAnalysisResult | null>(null);
  const [analyzingAI, setAnalyzingAI] = useState(false);
  const [analysisEngineType, setAnalysisEngineType] = useState<'math' | 'gemini'>('math');
  const [aiNotes, setAiNotes] = useState('');

  // Fallback TV symbol if undefined
  const tvSymbol = stock.tvSymbol || `BINANCE:${stock.symbol}USDT`;

  const formatPrice = (p: number) => {
    if (p < 0.0001) return `$${p.toFixed(8)}`;
    if (p < 1) return `$${p.toFixed(4)}`;
    return `$${p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  useEffect(() => {
    let days = 30;
    if (timeframe === '3M') days = 90;
    if (timeframe === '1Y') days = 250;

    setLoading(true);
    fetchCandleData(stock.symbol, days)
      .then((data) => {
        setCandles(data);
        if (data.length > 0) {
          setHoveredCandle(data[data.length - 1]);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [stock.symbol, timeframe]);

  const handleRunAiAnalysis = async (engine: 'math' | 'gemini' = 'math') => {
    setAnalysisEngineType(engine);
    if (engine === 'math') {
      const instant = computeQuantitativeMathAnalysis(stock, aiNotes);
      setGeminiResult(instant);
      return;
    }
    setAnalyzingAI(true);
    try {
      const res = await analyzeWithGemini(stock.symbol, aiNotes, 'gemini');
      setGeminiResult(res);
    } catch (err) {
      console.error('Failed to run Gemini analysis, fallback to math:', err);
      const instant = computeQuantitativeMathAnalysis(stock, aiNotes);
      setGeminiResult(instant);
    } finally {
      setAnalyzingAI(false);
    }
  };

  // Dimensions & bounds for heuristic SVG fallback
  const width = 800;
  const height = 340;
  const padding = { top: 20, right: 60, bottom: 30, left: 10 };

  const prices = candles.flatMap((c) => [c.low, c.high]);
  const minPrice = prices.length ? Math.min(...prices) * 0.985 : 0;
  const maxPrice = prices.length ? Math.max(...prices) * 1.015 : 100;
  const priceRange = maxPrice - minPrice || 1;

  const volumes = candles.map((c) => c.volume);
  const maxVolume = volumes.length ? Math.max(...volumes) * 1.2 : 1;

  const getX = (index: number) => {
    if (candles.length <= 1) return padding.left;
    return padding.left + (index / (candles.length - 1)) * (width - padding.left - padding.right);
  };

  const getY = (val: number) => {
    return height - padding.bottom - ((val - minPrice) / priceRange) * (height - padding.top - padding.bottom);
  };

  const candleWidth = Math.max(2, (width - padding.left - padding.right) / (candles.length * 1.6));

  const ma20Points = candles
    .map((c, i) => (c.ma20 ? `${getX(i)},${getY(c.ma20)}` : null))
    .filter(Boolean)
    .join(' ');

  const ma50Points = candles
    .map((c, i) => (c.ma50 ? `${getX(i)},${getY(c.ma50)}` : null))
    .filter(Boolean)
    .join(' ');

  const areaPoints = candles
    .map((c, i) => `${getX(i)},${getY(c.close)}`)
    .join(' ');

  const areaPolygon = areaPoints
    ? `${getX(0)},${height - padding.bottom} ${areaPoints} ${getX(candles.length - 1)},${height - padding.bottom}`
    : '';

  const activeCandle = hoveredCandle || (candles.length > 0 ? candles[candles.length - 1] : null);

  return (
    <div className="space-y-5">
      {/* Stock Header & Actions Bar */}
      <div className="bg-[#0e1626] border border-slate-800 rounded-xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center font-mono font-bold text-xl text-sky-400 shadow-inner">
            {stock.symbol}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{stock.name}</h2>
              <span className="text-xs text-slate-400 font-mono">
                {tvSymbol}
              </span>
              <span className="text-xs text-slate-500 font-medium">·</span>
              <span className="text-xs text-slate-400 font-medium">
                {stock.market} · {stock.sector}
              </span>
            </div>
            <div className="flex flex-wrap items-baseline gap-3.5 mt-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white tabular-nums tracking-tight">
                {formatPrice(stock.currentPrice)}
              </span>
              <span
                className={`text-sm sm:text-base font-bold font-mono tabular-nums ${
                  stock.change >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {stock.change >= 0 ? '+' : ''}
                {formatPrice(stock.change).replace('$', '')} ({stock.changePercent.toFixed(2)}%)
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {isEn ? '24h Range:' : 'Rentang 24j:'} {formatPrice(stock.dayLow)} - {formatPrice(stock.dayHigh)}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Vol: ${(stock.volume / 1000000).toFixed(1)}M
              </span>
            </div>
          </div>
        </div>

        {/* Engine Switcher & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Chart Engine Segmented Toggle */}
          <div className="flex items-center p-1 bg-slate-900 border border-slate-700/90 rounded-lg">
            <button
              onClick={() => setActiveEngine('tradingview')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeEngine === 'tradingview'
                  ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{isEn ? 'TradingView Live' : 'TradingView Live (Aktual)'}</span>
            </button>
            <button
              onClick={() => setActiveEngine('heuristic')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeEngine === 'heuristic'
                  ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>{isEn ? 'Lightweight Canvas' : 'Canvas Ringan'}</span>
            </button>
          </div>

          {onAddToPortfolio && (
            <button
              onClick={() => onAddToPortfolio(stock)}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer"
            >
              + {isEn ? 'Portfolio' : 'Portofolio'}
            </button>
          )}

          <button
            onClick={() => handleRunAiAnalysis('math')}
            disabled={analyzingAI}
            className="px-4 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {analyzingAI ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Calculator className="w-3.5 h-3.5 text-amber-400" />}
            <span>{isEn ? 'Quantitative Model Breakdown' : 'Analisis Model Kuantitatif'}</span>
          </button>
        </div>
      </div>

      {/* Main Chart Viewport: TradingView Live Mode */}
      {activeEngine === 'tradingview' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Real-time TradingView Chart (2 Cols) */}
            <div className="lg:col-span-2 bg-[#0e1626] border border-slate-800 rounded-xl p-2.5 sm:p-3 shadow-sm">
              <TradingViewChart
                tvSymbol={tvSymbol}
                market={stock.market}
                currentPrice={stock.currentPrice}
                change={stock.change}
                changePercent={stock.changePercent}
                height={560}
                initialInterval="15"
              />
            </div>

            {/* TradingView Live Technical Analysis Gauge (1 Col) */}
            <div className="bg-[#0e1626] border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-sky-400" />
                    <h3 className="text-sm font-bold text-white tracking-wide">
                      Konsensus Indikator TradingView
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/60">
                    1D Timeframe
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">
                  Ringkasan teknikal real-time yang dihitung TradingView dari perpaduan osilator (RSI, Stochastic, CCI, MACD) dan 15 moving averages.
                </p>
                <TradingViewTechnicalGauge tvSymbol={tvSymbol} />
              </div>

              {/* Quick Fundamental / Tokenomics Highlight */}
              <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-3 gap-2 text-center text-xs font-mono">
                <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Market Cap</span>
                  <strong className="text-white tabular-nums">${stock.fundamentals.marketCap}B</strong>
                </div>
                <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Circulating</span>
                  <strong className="text-white tabular-nums text-[10px] truncate block">{stock.fundamentals.circulatingSupply || 'Market'}</strong>
                </div>
                <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Staking APR</span>
                  <strong className="text-emerald-400 tabular-nums">{stock.fundamentals.dividendYield}%</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Alternative Heuristic Canvas Mode */
        <div className="bg-[#0e1626] border border-slate-800 rounded-xl p-5 shadow-sm">
          {/* Controls Ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80 text-xs">
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800">
              {(['1M', '3M', '1Y'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1 rounded font-medium transition-colors ${
                    timeframe === tf ? 'bg-slate-800 text-sky-400 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800">
              <button
                onClick={() => setChartType('candle')}
                className={`px-2.5 py-1 rounded font-medium flex items-center gap-1 ${
                  chartType === 'candle' ? 'bg-slate-800 text-sky-400 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Candle</span>
              </button>
              <button
                onClick={() => setChartType('line')}
                className={`px-2.5 py-1 rounded font-medium flex items-center gap-1 ${
                  chartType === 'line' ? 'bg-slate-800 text-sky-400 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Line</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={showMA20}
                  onChange={(e) => setShowMA20(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0"
                />
                <span className="text-sky-400 font-mono text-xs">MA20</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={showMA50}
                  onChange={(e) => setShowMA50(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0"
                />
                <span className="text-amber-400 font-mono text-xs">MA50</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={showRSI}
                  onChange={(e) => setShowRSI(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-violet-500 focus:ring-0"
                />
                <span className="text-violet-400 font-mono text-xs">RSI(14)</span>
              </label>
            </div>
          </div>

          {activeCandle && (
            <div className="flex flex-wrap items-center gap-4 py-2.5 text-xs font-mono border-b border-slate-800/60 text-slate-400">
              <span>Tgl: <strong className="text-white">{activeCandle.time}</strong></span>
              <span>O: <strong className="text-white tabular-nums">{activeCandle.open}</strong></span>
              <span>H: <strong className="text-emerald-400 tabular-nums">{activeCandle.high}</strong></span>
              <span>L: <strong className="text-rose-400 tabular-nums">{activeCandle.low}</strong></span>
              <span>C: <strong className="text-white tabular-nums">{activeCandle.close}</strong></span>
              <span>Vol: <strong className="text-slate-300 tabular-nums">{(activeCandle.volume / 1000).toLocaleString()}K</strong></span>
            </div>
          )}

          <div className="relative w-full overflow-hidden mt-3">
            {loading ? (
              <div className="h-[340px] flex items-center justify-center text-slate-400 text-xs">
                Memuat data candle pasar...
              </div>
            ) : (
              <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-auto cursor-crosshair select-none"
                onMouseLeave={() => setHoveredCandle(candles[candles.length - 1] || null)}
              >
                {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                  const yVal = padding.top + pct * (height - padding.top - padding.bottom);
                  const pVal = maxPrice - pct * priceRange;
                  return (
                    <g key={i}>
                      <line
                        x1={padding.left}
                        y1={yVal}
                        x2={width - padding.right}
                        y2={yVal}
                        stroke="#1e293b"
                        strokeDasharray="2 3"
                      />
                      <text
                        x={width - padding.right + 6}
                        y={yVal + 3}
                        fill="#64748b"
                        fontSize="10"
                        fontFamily="monospace"
                      >
                        {pVal >= 1000 ? Math.round(pVal) : pVal.toFixed(2)}
                      </text>
                    </g>
                  );
                })}

                {candles.map((c, i) => {
                  const x = getX(i);
                  const volHeight = (c.volume / maxVolume) * 60;
                  const y = height - padding.bottom - volHeight;
                  const isGreen = c.close >= c.open;
                  return (
                    <rect
                      key={`vol-${i}`}
                      x={x - candleWidth / 2}
                      y={y}
                      width={candleWidth}
                      height={volHeight}
                      fill={isGreen ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'}
                    />
                  );
                })}

                {chartType === 'line' && (
                  <>
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <polygon points={areaPolygon} fill="url(#areaGradient)" />
                    <polyline fill="none" stroke="#38bdf8" strokeWidth="2" points={areaPoints} />
                  </>
                )}

                {chartType === 'candle' &&
                  candles.map((c, i) => {
                    const x = getX(i);
                    const isGreen = c.close >= c.open;
                    const color = isGreen ? '#10b981' : '#f43f5e';
                    const yOpen = getY(c.open);
                    const yClose = getY(c.close);
                    const yHigh = getY(c.high);
                    const yLow = getY(c.low);
                    const top = Math.min(yOpen, yClose);
                    const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));

                    return (
                      <g key={`candle-${i}`} onMouseEnter={() => setHoveredCandle(c)}>
                        <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="1.2" />
                        <rect
                          x={x - candleWidth / 2}
                          y={top}
                          width={candleWidth}
                          height={bodyHeight}
                          fill={color}
                          stroke={color}
                          strokeWidth="0.5"
                        />
                      </g>
                    );
                  })}

                {showMA20 && ma20Points && (
                  <polyline fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.85" points={ma20Points} />
                )}

                {showMA50 && ma50Points && (
                  <polyline fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeOpacity="0.85" points={ma50Points} />
                )}
              </svg>
            )}
          </div>
        </div>
      )}

      {/* AI Deep Analysis Output Panel (Gemini 3.8 Flash) */}
      {geminiResult && (
        <div className="bg-[#0e1626] border border-sky-900/60 rounded-xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm sm:text-base font-bold text-white font-mono uppercase tracking-wide">
                Hasil Analisis Model Kuantitatif ({stock.symbol})
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <button
                type="button"
                onClick={() => handleRunAiAnalysis('math')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  analysisEngineType === 'math'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                ⚡ Math Instan (&lt;2ms)
              </button>
              <button
                type="button"
                onClick={() => handleRunAiAnalysis('gemini')}
                disabled={analyzingAI}
                className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  analysisEngineType === 'gemini'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {analyzingAI ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                <span>Gemini Flash</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
              <div className="text-xs text-slate-400">Rekomendasi Sinyal</div>
              <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                {geminiResult.data.recommendation}
              </div>
            </div>
            <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
              <div className="text-xs text-slate-400">Tingkat Keyakinan</div>
              <div className="text-base font-bold font-mono text-sky-400 mt-0.5">
                {geminiResult.data.confidenceScore}%
              </div>
            </div>
            <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
              <div className="text-xs text-slate-400">Target Harga (TP 1 & 2)</div>
              <div className="text-base font-bold font-mono text-white mt-0.5">
                {geminiResult.data.targetPrice1.toLocaleString()} / {geminiResult.data.targetPrice2.toLocaleString()}
              </div>
            </div>
            <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
              <div className="text-xs text-slate-400">Stop Loss / Cut Loss</div>
              <div className="text-base font-bold font-mono text-rose-400 mt-0.5">
                {geminiResult.data.stopLossPrice.toLocaleString()} (R:R {geminiResult.data.riskRewardRatio})
              </div>
            </div>
          </div>

          {/* Summary Thesis */}
          <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800 text-xs sm:text-sm text-slate-200 leading-relaxed">
            <strong className="text-white block mb-1">Tesis Investasi AI:</strong>
            {geminiResult.data.summaryThesis}
          </div>

          {/* 3 Pillars Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm">
            <div className="bg-slate-900/70 p-4 rounded-lg border border-slate-800/80">
              <span className="font-semibold text-sky-400 block mb-2 flex items-center gap-1.5">
                <Compass className="w-4 h-4" /> Sorotan Teknikal & Momentum
              </span>
              <ul className="space-y-1.5 text-slate-300 list-disc list-inside leading-relaxed">
                {(geminiResult.data.technicalHighlights || []).map((h: string, i: number) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-900/70 p-4 rounded-lg border border-slate-800/80">
              <span className="font-semibold text-emerald-400 block mb-2 flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4" /> On-Chain & Fundamental Token
              </span>
              <ul className="space-y-1.5 text-slate-300 list-disc list-inside leading-relaxed">
                {(geminiResult.data.onChainHighlights || geminiResult.data.fundamentalHighlights || []).map((h: string, i: number) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-900/70 p-4 rounded-lg border border-slate-800/80">
              <span className="font-semibold text-amber-400 block mb-2 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Katalis & Risiko Likuidasi
              </span>
              <ul className="space-y-1.5 text-slate-300 list-disc list-inside leading-relaxed">
                {(geminiResult.data.keyCatalysts || []).map((c: string, i: number) => (
                  <li key={i} className="text-emerald-300/90">+ {c}</li>
                ))}
                {(geminiResult.data.riskFactors || []).map((r: string, i: number) => (
                  <li key={i} className="text-rose-300/90">- {r}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
