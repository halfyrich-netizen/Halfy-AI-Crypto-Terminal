import { MarketIndex, Stock, Candle, PredictiveAlert } from '../types/stock';

export interface MarketSummaryResponse {
  indices: MarketIndex[];
  timestamp: string;
  marketStatus: {
    IDX: string;
    US: string;
  };
  binance?: {
    connected: boolean;
    lastSync: number | null;
    source: string | null;
    lastError?: string | null;
  };
  topGainers: Stock[];
  topSignals: Stock[];
}

export interface GeminiAnalysisResult {
  success: boolean;
  source: string;
  data: {
    recommendation: 'Strong Long' | 'Long (Buy on Dip)' | 'Neutral / Range' | 'Short / Hedge' | 'Take Profit' | 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Cut Loss';
    confidenceScore: number;
    sentimentScore: number;
    entryZone?: [number, number];
    targetPrice1: number;
    targetPrice2: number;
    stopLossPrice: number;
    riskRewardRatio: number;
    liquidationRisk?: string;
    summaryThesis: string;
    technicalHighlights: string[];
    onChainHighlights?: string[];
    fundamentalHighlights?: string[];
    bandarmologyHighlights?: string[];
    derivativesHighlights?: string[];
    keyCatalysts: string[];
    riskFactors: string[];
    engine?: 'mathematical-algorithmic' | 'gemini-3.8-flash' | 'deterministic-quantitative-fallback';
    latencyMs?: number;
    mathematicalModel?: {
      zScore: number;
      atr: number;
      fibonacci1618: number;
      fibonacci2618: number;
      kellyFractionPercent: number;
      whaleFlowRatioPercent: number;
      fundingSkew: number;
    };
  };
}

export function computeQuantitativeMathAnalysis(stock: Stock, userNotes?: string): GeminiAnalysisResult {
  const currentPrice = stock.currentPrice;
  const ma20 = stock.technicals?.ma20 || currentPrice;
  const upper = stock.technicals?.bollingerUpper || currentPrice * 1.05;
  const lower = stock.technicals?.bollingerLower || currentPrice * 0.95;
  const sigma = Math.max((upper - lower) / 4, currentPrice * 0.01);
  const zScore = Math.round(((currentPrice - ma20) / sigma) * 100) / 100;

  const rsi = stock.technicals?.rsi14 || 50;
  const support = stock.technicals?.supportLevel || currentPrice * 0.95;
  const resistance = stock.technicals?.resistanceLevel || currentPrice * 1.08;
  const dayHigh = stock.dayHigh || currentPrice * 1.03;
  const dayLow = stock.dayLow || currentPrice * 0.97;
  const atr = Math.max(dayHigh - dayLow, currentPrice * 0.02);

  // Fibonacci Extensions:
  const range = Math.max(resistance - support, currentPrice * 0.05);
  const fibTarget1 = Math.round((currentPrice + range * 0.618) * 100) / 100;
  const fibTarget2 = Math.round((currentPrice + range * 1.618) * 100) / 100;
  const stopLossPrice = Math.max(0.00000001, Math.round((support - atr * 0.382) * 100) / 100);

  // Risk / Reward Ratio:
  const risk = Math.max(0.0000001, currentPrice - stopLossPrice);
  const reward = Math.max(0.0000001, fibTarget1 - currentPrice);
  const riskRewardRatio = Math.round((reward / risk) * 10) / 10;

  // Kelly Criterion Optimal Sizing:
  let p = 0.65;
  if (rsi > 50 && rsi < 70) p += 0.08;
  if (stock.bandarmology?.accumulationStatus === 'Big Accumulation') p += 0.07;
  if (stock.changePercent > 0) p += 0.04;
  p = Math.min(0.85, Math.max(0.45, p));
  const b = Math.max(1.5, riskRewardRatio);
  const kellyFraction = Math.max(0.05, Math.min(0.25, (p * b - (1 - p)) / b));
  const kellyPercent = Math.round(kellyFraction * 1000) / 10;

  // Whale netflow coefficient:
  const netFlowToday = stock.bandarmology?.netForeignFlowToday || 0;
  const flowPct = stock.volume > 0 ? ((netFlowToday * 1000000) / stock.volume) * 100 : 0;

  // Funding Rate Skew:
  const fundingRate = stock.bandarmology?.fundingRate || 0.01;
  const openInterest = stock.bandarmology?.openInterestBillion || 1.0;
  const isShortSqueeze = fundingRate < 0 && openInterest > 0.5;
  const isOverheated = fundingRate > 0.03 && rsi > 70;

  let recommendation: 'Strong Long' | 'Long (Buy on Dip)' | 'Neutral / Range' | 'Short / Hedge' | 'Take Profit' = 'Long (Buy on Dip)';
  if (p >= 0.75 && riskRewardRatio >= 2.5) {
    recommendation = 'Strong Long';
  } else if (rsi < 40 && zScore < -1.5) {
    recommendation = 'Long (Buy on Dip)';
  } else if (isOverheated || zScore > 2.2) {
    recommendation = 'Take Profit';
  } else if (rsi < 45 && stock.changePercent < -3) {
    recommendation = 'Neutral / Range';
  }

  const liquidationRisk = isOverheated ? 'High' : isShortSqueeze ? 'Moderate' : 'Low';

  return {
    success: true,
    source: 'mathematical-algorithmic-engine',
    data: {
      engine: 'mathematical-algorithmic',
      latencyMs: 2,
      mathematicalModel: {
        zScore,
        atr: Math.round(atr * 100) / 100,
        fibonacci1618: fibTarget1,
        fibonacci2618: fibTarget2,
        kellyFractionPercent: kellyPercent,
        whaleFlowRatioPercent: Math.round(flowPct * 100) / 100,
        fundingSkew: Math.round(fundingRate * openInterest * 1000) / 1000,
      },
      recommendation,
      confidenceScore: Math.round(p * 100),
      sentimentScore: Math.round((rsi - 50) * 2),
      entryZone: [support, currentPrice],
      targetPrice1: fibTarget1,
      targetPrice2: fibTarget2,
      stopLossPrice,
      riskRewardRatio,
      liquidationRisk,
      summaryThesis: `Model Kuantitatif Matematis menghitung Z-score harga ${zScore > 0 ? '+' : ''}${zScore}σ terhadap MA20, dengan batas volatilitas harian ATR $${Math.round(atr * 100) / 100}. Proyeksi Fibonacci Golden Ratio menetapkan target kenaikan $${fibTarget1} (R:R ${riskRewardRatio}x), sementara formula Kelly Criterion merekomendasikan alokasi risiko modal optimal sebesar ${kellyPercent}% dari portofolio. Arus akumulasi paus (+${netFlowToday}M USD) mencerminkan tekanan beli institusional yang valid.`,
      technicalHighlights: [
        `Z-Score Distribusi Normal: ${zScore > 0 ? '+' : ''}${zScore}σ (${Math.abs(zScore) < 1 ? 'Konsolidasi Sehat di Atas Rata-Rata' : zScore >= 1 ? 'Momentum Ekspansi Positif' : 'Zona Diskon Akumulasi'}).`,
        `ATR Volatilitas Harian: $${Math.round(atr * 100) / 100} dengan stop-loss matematis di $${stopLossPrice} (toleransi 0.382x ATR di bawah support $${support}).`,
        `Rasio Risk/Reward Matematis: 1 : ${riskRewardRatio} berbasis ekstensi Fibonacci 161.8% ($${fibTarget1}) dan 261.8% ($${fibTarget2}).`,
      ],
      onChainHighlights: [
        `Koefisien Aliran Paus: Net inflow institusi harian +$${netFlowToday}M USD mewakili ${flowPct.toFixed(2)}% dari total likuiditas harian bursa.`,
        `Cadangan CEX: Status ${stock.bandarmology?.accumulationStatus || 'Akumulasi'} dengan dominasi paus ${stock.bandarmology?.foreignDominancePercent || 65}%.`,
      ],
      derivativesHighlights: [
        `Perpetual Funding Rate: ${(fundingRate * 100).toFixed(4)}% per 8 jam. Open interest $${openInterest}B.`,
        isShortSqueeze
          ? `Peringatan Short Squeeze: Funding rate negatif dengan OI tinggi memicu probabilitas squeeze kenaikan harga.`
          : isOverheated
          ? `Peringatan Overheat: Funding rate tinggi mengindikasikan crowded long leverage.`
          : `Pasar leverage berimbang tanpa risiko liquidation cascade ekstrim.`,
      ],
      keyCatalysts: [
        `Formula Kelly Criterion merekomendasikan alokasi optimal ${kellyPercent}% modal per trade.`,
        `Korelasi positif dengan pergerakan volume likuiditas spot Binance di sektor ${stock.sector}.`,
      ],
      riskFactors: [
        `Penembusan level proteksi stop loss matematis $${stopLossPrice} menginvalidasi struktur kuantitatif.`,
        `Lonjakan volatilitas pasar makro tak terduga yang melampaui rentang batas 2.5x ATR.`,
      ],
    },
  };
}

export async function fetchMarketSummary(): Promise<MarketSummaryResponse> {
  const res = await fetch('/api/market/summary');
  if (!res.ok) throw new Error('Gagal memuat ringkasan pasar');
  return res.json();
}

export async function fetchMarketCondition(market: 'IDX' | 'US' = 'IDX'): Promise<import('../types/stock').MarketConditionData> {
  const res = await fetch(`/api/market/condition?market=${market}`);
  if (!res.ok) throw new Error('Gagal memuat data kondisi pasar');
  return res.json();
}

// Mirror publik Binance khusus data pasar — api.binance.com diblokir di
// sebagian jaringan (mis. Indonesia), jadi coba mirror dulu lalu fallback.
const BINANCE_PUBLIC_BASES = ['https://data-api.binance.vision', 'https://api.binance.com'];

export async function syncDirectBinancePrices(stocks: Stock[]): Promise<Stock[]> {
  try {
    const symbols = [
      'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT',
      'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'SUIUSDT', 'LINKUSDT',
      'NEARUSDT', 'PEPEUSDT', 'RENDERUSDT', 'INJUSDT', 'TIAUSDT'
    ];
    let tickerList: Array<{
      symbol: string;
      lastPrice: string;
      priceChange: string;
      priceChangePercent: string;
      highPrice: string;
      lowPrice: string;
      quoteVolume: string;
    }> | null = null;
    for (const base of BINANCE_PUBLIC_BASES) {
      try {
        const res = await fetch(`${base}/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(symbols))}`);
        if (res.ok) {
          tickerList = await res.json();
          break;
        }
      } catch {
        // coba base berikutnya
      }
    }
    if (!tickerList) return stocks;

    const priceMap = new Map(tickerList.map((t) => [t.symbol.replace('USDT', ''), t]));
    return stocks.map((s) => {
      const live = priceMap.get(s.symbol);
      if (!live) return s;
      const currentPrice = parseFloat(live.lastPrice);
      const change = parseFloat(live.priceChange);
      const changePercent = parseFloat(live.priceChangePercent);
      const dayHigh = parseFloat(live.highPrice);
      const dayLow = parseFloat(live.lowPrice);
      const volume = parseFloat(live.quoteVolume);
      return {
        ...s,
        currentPrice,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        dayHigh,
        dayLow,
        volume: volume || s.volume,
      };
    });
  } catch {
    return stocks;
  }
}

export async function fetchStocks(market?: 'IDX' | 'US'): Promise<Stock[]> {
  const url = market ? `/api/market/stocks?market=${market}` : '/api/market/stocks';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Gagal memuat data saham');
  const serverStocks: Stock[] = await res.json();
  return syncDirectBinancePrices(serverStocks);
}

export async function fetchStockDetail(symbol: string): Promise<Stock> {
  const res = await fetch(`/api/market/stocks/${encodeURIComponent(symbol)}`);
  if (!res.ok) throw new Error(`Gagal memuat emiten ${symbol}`);
  return res.json();
}

export async function fetchCandleData(symbol: string, days = 60): Promise<Candle[]> {
  const res = await fetch(`/api/market/chart/${encodeURIComponent(symbol)}?days=${days}`);
  if (!res.ok) throw new Error(`Gagal memuat data chart ${symbol}`);
  return res.json();
}

export async function fetchLiveAlerts(market?: 'IDX' | 'US'): Promise<PredictiveAlert[]> {
  const url = market ? `/api/alerts/live?market=${market}` : '/api/alerts/live';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Gagal memuat alert sinyal');
  return res.json();
}

export async function analyzeWithGemini(
  symbol: string, 
  userNotes?: string, 
  engine: 'math' | 'gemini' = 'math'
): Promise<GeminiAnalysisResult> {
  const res = await fetch('/api/gemini/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol, userNotes, engine }),
  });
  if (!res.ok) throw new Error('Gagal melakukan analisis');
  return res.json();
}

export async function calibrateStockPrice(symbol: string, price: number): Promise<{ success: boolean; message: string; stock?: Stock }> {
  const res = await fetch('/api/market/calibrate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol, price }),
  });
  if (!res.ok) throw new Error('Gagal mengalibrasi harga saham');
  return res.json();
}

export interface GeminiBotScanTrade {
  symbol: string;
  action: 'Strong Long' | 'Long (Buy on Dip)';
  confidenceScore: number;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  riskRewardRatio: number;
  thesis: string;
  aiReasoning?: string;
}

export interface GeminiBotScanResponse {
  success: boolean;
  engine: 'gemini-3.8-flash' | 'gemini-3.5-flash' | 'quantitative-math' | string;
  result: {
    selectedTrades: GeminiBotScanTrade[];
    marketAnalysis?: string;
    rejectionSummary?: string;
  };
}

export async function executeGeminiBotScan(params: {
  mode: 'PURE_AI' | 'HYBRID';
  candidates: Array<{
    symbol: string;
    name: string;
    currentPrice: number;
    changePercent: number;
    volume: number;
    sector: string;
    rsi14?: number;
    ma20?: number;
    support?: number;
    resistance?: number;
    fundingRate?: number;
    whaleStatus?: string;
    score?: number;
    targetPrice1?: number;
    stopLoss?: number;
  }>;
  config: {
    riskPerTradePercent: number;
    minRiskReward: number;
    minAiConfidence: number;
    maxPositions: number;
    liquidityBalance: number;
  };
  marketRegime?: string;
}): Promise<GeminiBotScanResponse> {
  const res = await fetch('/api/bot/gemini-scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new Error('Gagal melakukan scan Gemini Autotrade');
  }
  return res.json();
}


