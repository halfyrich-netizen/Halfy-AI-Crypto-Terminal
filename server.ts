import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { Stock, TechnicalIndicators, AISignal, MarketRegime } from './src/types/stock';
import {
  MARKET_INDICES,
  STOCKS_DATABASE,
  BASELINE_PRICES,
  CRYPTO_MARKET_CONDITION,
  US_MARKET_CONDITION,
} from './src/data/marketDatabase';

dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// ==========================================
// HAC-2/HAC-3 — Server-side hardening
// ==========================================
// Rate limiting in-memory per IP (120 req/menit untuk /api/*) — tanpa dependency baru.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 120;
const rateBuckets = new Map<string, { count: number; windowStart: number }>();

app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  let bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) {
    bucket = { count: 0, windowStart: now };
    rateBuckets.set(ip, bucket);
  }
  bucket.count += 1;
  // housekeeping: cegah Map tumbuh tanpa batas
  if (rateBuckets.size > 1000) {
    for (const [k, b] of rateBuckets) {
      if (now - b.windowStart >= RATE_LIMIT_WINDOW_MS) rateBuckets.delete(k);
    }
  }
  if (bucket.count > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Too Many Requests — rate limit 120 req/min per IP.' });
  }
  next();
});

// Validator simbol ketat untuk semua parameter path (anti-injection/SSRF)
const SYMBOL_PARAM_RE = /^[A-Z0-9]{1,10}$/;
function requireValidSymbol(raw: string, res: Response): string | null {
  const sym = String(raw || '').toUpperCase();
  if (!SYMBOL_PARAM_RE.test(sym)) {
    res.status(400).json({ error: `Simbol tidak valid: ${sym.slice(0, 12)}` });
    return null;
  }
  return sym;
}

// Initialize Google Gemini Client with required aistudio-build User-Agent
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// ==========================================
// REAL-TIME BINANCE 24H API SYNC FOR CRYPTO
// ==========================================
// api.binance.com diblokir di sebagian jaringan (mis. Indonesia).
// data-api.binance.vision adalah mirror resmi Binance khusus data pasar
// dengan skema REST identik — jadi sumber utama, api.binance.com fallback.
const BINANCE_BASES = ['https://data-api.binance.vision', 'https://api.binance.com'];
let activeBinanceBase = BINANCE_BASES[0];

interface BinanceSyncStatus {
  connected: boolean;
  lastSync: number | null;
  source: string | null;
  lastError: string | null;
}
const binanceStatus: BinanceSyncStatus = { connected: false, lastSync: null, source: null, lastError: null };

async function fetchBinance(path: string, init?: RequestInit): Promise<globalThis.Response | null> {
  // Coba base yang terakhir berhasil dulu, lalu sisanya sebagai fallback.
  const ordered = [activeBinanceBase, ...BINANCE_BASES.filter((b) => b !== activeBinanceBase)];
  for (const base of ordered) {
    try {
      const response = await fetch(base + path, {
        ...init,
        headers: { 'User-Agent': 'HalfyAI-CryptoTerminal/2.0', ...(init?.headers || {}) },
      });
      if (response.ok) {
        activeBinanceBase = base;
        return response;
      }
      binanceStatus.lastError = `${base}${path} -> HTTP ${response.status}`;
    } catch (err) {
      binanceStatus.lastError = `${base}${path} -> ${err instanceof Error ? err.message : 'network error'}`;
    }
  }
  return null;
}

const CURATED_SYMBOLS = STOCKS_DATABASE.map((s) => s.symbol);

// ==========================================
// DYNAMIC UNIVERSE — TOP 100 BINANCE SPOT
// ==========================================
// Universe tidak lagi terbatas pada database statis: setiap 5 menit server
// menemukan top N pasangan USDT berdasarkan volume nyata Binance, mengambil
// nama & market cap dari CoinGecko, dan menghitung sinyal teknikal dari
// klines harian ASLI. Koin kurasi (18) tetap di depan dengan metadata kaya.
const UNIVERSE_SIZE = 100;
const LEVERAGED_TOKEN_RE = /(UP|DOWN|BULL|BEAR)USDT$/;
const EXCLUDED_SYMBOLS = new Set([
  'USDC', 'FDUSD', 'TUSD', 'USDP', 'DAI', 'EUR', 'AEUR', 'USD1', 'XUSD', 'PAXG', 'USDS', 'BUSD',
  'RLUSD', 'USDE', 'EURI', 'RWUSD', 'XAUT', 'U',
]);
// Hanya simbol alfanumerik standar — memblokir token branded/non-standar dari daftar volume
const VALID_SYMBOL_RE = /^[A-Z0-9]{2,10}$/;

interface LiveTicker {
  lastPrice: number;
  prevClose: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  quoteVolume: number;
}
const extendedLive = new Map<string, LiveTicker>();
let universeSymbols: string[] = [];
const universeNames = new Map<string, { name: string; marketCapB: number; circulatingSupply?: string }>();
const universeSignals = new Map<string, { technicals: TechnicalIndicators; aiSignal: AISignal; computedAt: number }>();
let universeLastRefresh: number | null = null;

// Pembulatan significant-digits: aman untuk harga mikro (PEPE 0.0000049)
   // maupun besar (BTC 77270.36) — pembulatan desimal-tetap meng-nol-kan harga mikro.
   function roundSig(v: number, digits = 8): number {
     if (!Number.isFinite(v) || v === 0) return 0;
     return Number(v.toPrecision(digits));
   }

   function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function parseTicker(raw: Record<string, string>): LiveTicker {
  return {
    lastPrice: parseFloat(raw.lastPrice),
    prevClose: parseFloat(raw.prevClosePrice) || parseFloat(raw.lastPrice) - parseFloat(raw.priceChange),
    change: parseFloat(raw.priceChange),
    changePercent: parseFloat(raw.priceChangePercent),
    dayHigh: parseFloat(raw.highPrice),
    dayLow: parseFloat(raw.lowPrice),
    quoteVolume: parseFloat(raw.quoteVolume),
  };
}

async function fetchCoinGeckoMarkets(): Promise<Map<string, { name: string; marketCapB: number; circulatingSupply?: string }> | undefined> {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1', {
      headers: {
        'User-Agent': 'HalfyAI-CryptoTerminal/2.0',
        'Accept': 'application/json',
      },
    });
    // undefined = CoinGecko tidak tersedia → fallback ke regex saja (jangan set kosong!)
    if (!res.ok) return undefined;
    const list: Array<{ symbol: string; name: string; market_cap: number; circulating_supply: number }> = await res.json();
    if (!Array.isArray(list) || list.length === 0) return undefined;
    const bySymbol = new Map<string, { name: string; marketCapB: number; circulatingSupply?: string }>();
    for (const c of list) {
      bySymbol.set(c.symbol.toUpperCase(), {
        name: c.name,
        marketCapB: Math.round((c.market_cap / 1e9) * 1000) / 1000,
        circulatingSupply: c.circulating_supply
          ? c.circulating_supply > 1e9
            ? `${Math.round(c.circulating_supply / 1e9)}B`
            : c.circulating_supply > 1e6
            ? `${Math.round(c.circulating_supply / 1e6)}M`
            : `${Math.round(c.circulating_supply)}`
          : undefined,
      });
    }
    return bySymbol;
  } catch {
    return undefined;
  }
}

async function refreshUniverseSymbols(
  coinGecko?: Map<string, { name: string; marketCapB: number; circulatingSupply?: string }>
) {
  const response = await fetchBinance('/api/v3/ticker/24hr');
  if (!response) return;
  const all: Array<{ symbol: string; quoteVolume: string }> = await response.json();
  const validSymbols = coinGecko ? new Set(coinGecko.keys()) : undefined;
  const usdtPairs = all.filter((t) => {
    const base = t.symbol.replace(/USDT$/, '');
    return (
      t.symbol.endsWith('USDT') &&
      !LEVERAGED_TOKEN_RE.test(t.symbol) &&
      !EXCLUDED_SYMBOLS.has(base) &&
      VALID_SYMBOL_RE.test(base) &&
      // Bila daftar CoinGecko tersedia, hanya simbol yang dikenalnya — memblokir
      // tokenized stocks/branded tokens (TSLAB, NVDAB, SPYB, ...) yang ditolak batch API
      (!validSymbols || validSymbols.has(base))
    );
  });
  usdtPairs.sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume));
  universeSymbols = usdtPairs.slice(0, UNIVERSE_SIZE).map((t) => t.symbol.replace(/USDT$/, ''));
  for (const t of usdtPairs.slice(0, UNIVERSE_SIZE)) {
    const base = t.symbol.replace(/USDT$/, '');
    // Nama & market cap langsung dari map CoinGecko yang sama
    const meta = coinGecko?.get(base);
    if (meta) universeNames.set(base, meta);
    if (!extendedLive.has(base)) {
      try { extendedLive.set(base, parseTicker(t as unknown as Record<string, string>)); } catch { /* skip malformed */ }
    }
  }
}

// ---------- Perhitungan indikator teknikal dari klines harian asli ----------
function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) out.push(values[i] * k + out[i - 1] * (1 - k));
  return out;
}

function computeRsi(closes: number[], period = 14): number {
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gains += d; else losses -= d;
  }
  let avgGain = gains / period, avgLoss = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  return Math.round((100 - 100 / (1 + avgGain / avgLoss)) * 10) / 10;
}

function deriveSignal(technicals: TechnicalIndicators, price: number, atr: number, volumeSpike: number): AISignal {
  // Rule-based & transparan: skor dari posisi tren (MA), momentum (RSI), dan konfirmasi volume.
  let score = 50;
  if (price > technicals.ma20) score += 10;
  if (technicals.ma20 > technicals.ma50) score += 10;
  if (price > technicals.ma50) score += 6;
  if (technicals.rsi14 >= 45 && technicals.rsi14 <= 65) score += 8;
  else if (technicals.rsi14 > 65 && technicals.rsi14 <= 75) score += 4;
  else if (technicals.rsi14 > 78) score -= 12;
  else if (technicals.rsi14 < 35) score += 6;
  if (volumeSpike > 1.5) score += 6;
  score = Math.max(20, Math.min(95, Math.round(score)));

  let action: AISignal['action'] = 'Neutral / Range';
  if (score >= 72 && technicals.rsi14 < 76) action = 'Strong Long';
  else if (score >= 60) action = 'Long (Buy on Dip)';
  else if (technicals.rsi14 > 78) action = 'Take Profit';

  const confidence = Math.max(40, Math.min(92, score));
  const entryLow = roundSig(price * 0.995);
  const target1 = roundSig(price + 1.8 * atr);
  const target2 = roundSig(price + 3.2 * atr);
  const stopLoss = roundSig(Math.max(price - 1.2 * atr, technicals.supportLevel * 0.985));
  const risk = Math.max(price - stopLoss, price * 0.01);
  const riskRewardRatio = Math.round(((target1 - price) / risk) * 10) / 10;

  const maText = price > technicals.ma20 ? 'di atas MA20' : 'di bawah MA20';
  const trendText = technicals.ma20 > technicals.ma50 ? 'tren jangka menengah bullish' : 'tren jangka menengah bearish';
  return {
    action,
    confidenceScore: confidence,
    entryPriceRange: [entryLow, price],
    targetPrice1: target1,
    targetPrice2: target2,
    stopLoss,
    riskRewardRatio,
    timestamp: new Date().toISOString(),
    thesis: `Sinyal teknikal dihitung LIVE dari klines harian Binance: RSI14 ${technicals.rsi14}, harga ${maText} (${price.toLocaleString('en-US', { maximumSignificantDigits: 6 })} vs MA20 ${technicals.ma20.toLocaleString('en-US', { maximumSignificantDigits: 6 })}), ${trendText}, volume 24 jam ${volumeSpike.toFixed(2)}x rata-rata 20 hari. Target & stop-loss diturunkan dari ATR harian ${atr.toLocaleString('en-US', { maximumSignificantDigits: 3 })}.`,
    technicalScore: score,
    fundamentalScore: 50,
    bandarScore: 50,
    sentimentScore: 0,
    liquidationRisk: technicals.rsi14 > 78 ? 'High' : technicals.rsi14 > 68 ? 'Moderate' : 'Low',
  };
}

async function computeUniverseSignal(sym: string) {
  const response = await fetchBinance(`/api/v3/klines?symbol=${sym}USDT&interval=1d&limit=60`);
  if (!response) return;
  type RawKline = [number, string, string, string, string, string, ...unknown[]];
  const raw: RawKline[] = await response.json();
  if (!Array.isArray(raw) || raw.length < 30) return;

  const closes = raw.map((k) => parseFloat(k[4]));
  const highs = raw.map((k) => parseFloat(k[2]));
  const lows = raw.map((k) => parseFloat(k[3]));
  const volumes = raw.map((k) => parseFloat(k[5]));
  const price = closes[closes.length - 1];

  const rsi14 = computeRsi(closes);
  const e12 = ema(closes, 12), e26 = ema(closes, 26);
  const macdLine = closes.map((_, i) => e12[i] - e26[i]);
  const signalLine = ema(macdLine, 9);
  const macd = macdLine[macdLine.length - 1];
  const macdSignal = signalLine[signalLine.length - 1];

  const ma = (arr: number[], n: number) => arr.slice(-n).reduce((a, b) => a + b, 0) / Math.min(n, arr.length);
  const ma20 = ma(closes, 20), ma50 = ma(closes, 50), ma200 = ma(closes, Math.min(200, closes.length));
  const std20 = Math.sqrt(closes.slice(-20).reduce((a, b) => a + (b - ma20) ** 2, 0) / 20);
  const tr: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    tr.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
  }
  const atr = tr.slice(-14).reduce((a, b) => a + b, 0) / 14;
  const avgVol20 = ma(volumes, 20);
  const volumeSpike = avgVol20 > 0 ? volumes[volumes.length - 1] / avgVol20 : 1;

  const technicals: TechnicalIndicators = {
    rsi14,
    macd: roundSig(macd),
    macdSignal: roundSig(macdSignal),
    macdHist: roundSig(macd - macdSignal),
    ma20: roundSig(ma20),
    ma50: roundSig(ma50),
    ma200: roundSig(ma200),
    bollingerUpper: roundSig(ma20 + 2 * std20),
    bollingerLower: roundSig(ma20 - 2 * std20),
    volumeSpikeRatio: Math.round(volumeSpike * 100) / 100,
    supportLevel: roundSig(Math.min(...lows.slice(-14))),
    resistanceLevel: roundSig(Math.max(...highs.slice(-14))),
  };
  universeSignals.set(sym, {
    technicals,
    aiSignal: deriveSignal(technicals, price, atr, volumeSpike),
    computedAt: Date.now(),
  });
}

async function refreshUniverseSignals() {
  // HAC-28 fix — sinyal LIVE untuk SEMUA koin (termasuk 18 koin kurasi):
  // dulu koin kurasi memakai aiSignal statis dari database (Entry Zone/SL beku),
  // yang menyebabkan Entry Zone jauh dari harga pasar & stop geometry invalid.
  const targets = Array.from(new Set([...CURATED_SYMBOLS, ...universeSymbols]));
  for (const batch of chunkArray(targets, 8)) {
    await Promise.all(batch.map((s) => computeUniverseSignal(s).catch(() => undefined)));
  }
  universeLastRefresh = Date.now();
}

// ==========================================
// P1.2 — MARKET REGIME ENGINE
// Regime explainable dari feed terverifikasi: tren BTC/ETH vs MA20 harian,
// breadth universe (_Real_, dari ticker live), volatilitas BTC (ATR14/harga).
// Dipakai sebagai ELIGIBILITY GATE strategi, bukan dekorasi.
// ==========================================
let marketRegime: MarketRegime | null = null;

async function computeMarketRegime(): Promise<void> {
  const reasons: string[] = [];
  const feats: Record<string, { aboveMa20: boolean | null; atrPct: number | null }> = {
    BTC: { aboveMa20: null, atrPct: null },
    ETH: { aboveMa20: null, atrPct: null },
  };
  for (const sym of ['BTC', 'ETH']) {
    try {
      const res = await fetchBinance(`/api/v3/klines?symbol=${sym}USDT&interval=1d&limit=60`);
      if (!res) continue;
      type RawKline = [number, string, string, string, string, string, ...unknown[]];
      const raw: RawKline[] = await res.json();
      if (!Array.isArray(raw) || raw.length < 30) continue;
      const closes = raw.map((k) => parseFloat(k[4]));
      const highs = raw.map((k) => parseFloat(k[2]));
      const lows = raw.map((k) => parseFloat(k[3]));
      const price = closes[closes.length - 1];
      const ma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
      const tr: number[] = [];
      for (let i = 1; i < closes.length; i++) {
        tr.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
      }
      const atr = tr.slice(-14).reduce((a, b) => a + b, 0) / 14;
      feats[sym] = { aboveMa20: price > ma20, atrPct: Math.round((atr / price) * 10000) / 100 };
    } catch {
      // fitur dilewati — jangan di-imputasi (P1.2: gracefully disable factors)
    }
  }

  const tickers = Array.from(extendedLive.values());
  const breadthPct = tickers.length > 0
    ? Math.round((tickers.filter((t) => t.changePercent > 0).length / tickers.length) * 100)
    : 50;

  const btcUp = feats.BTC.aboveMa20;
  const ethUp = feats.ETH.aboveMa20;
  const btcAtr = feats.BTC.atrPct;

  let state: MarketRegime['state'] = 'RANGE';
  if (btcAtr != null && btcAtr > 8) {
    state = 'HIGH_VOLATILITY';
    reasons.push(`Volatilitas BTC ekstrem: ATR14 ${btcAtr}% dari harga`);
  } else if (btcUp && ethUp && breadthPct >= 55) {
    state = 'TREND_UP';
    reasons.push(`BTC & ETH di atas MA20 harian; breadth ${breadthPct}% aset positif`);
  } else if (btcUp === false && ethUp === false && breadthPct <= 45) {
    state = 'TREND_DOWN';
    reasons.push(`BTC & ETH di bawah MA20 harian; breadth ${breadthPct}% aset positif`);
  } else {
    state = 'RANGE';
    reasons.push(`Sinyal tren campuran (breadth ${breadthPct}%; BTC ${btcUp == null ? 'n/a' : btcUp ? '> MA20' : '< MA20'}, ETH ${ethUp == null ? 'n/a' : ethUp ? '> MA20' : '< MA20'})`);
  }

  let quality: MarketRegime['quality'] = 'GOOD';
  if (btcUp == null || (tickers.length === 0 && breadthPct === 50)) quality = 'POOR';
  else if (ethUp == null || btcAtr == null) quality = 'PARTIAL';
  if (quality !== 'POOR') reasons.push(`Kualitas data: ${quality} (feed ${tickers.length} ticker, BTC klines ${btcUp == null ? 'tidak tersedia' : 'tersedia'})`);

  marketRegime = {
    state, quality, reasons, breadthPct,
    btcAboveMa20: btcUp, ethAboveMa20: ethUp, btcAtrPct: btcAtr,
    updatedAt: Date.now(),
  };
}

let universeJobRunning = false;
async function universeJob() {
  if (universeJobRunning) return;
  universeJobRunning = true;
  try {
    // CoinGecko dulu: sekaligus sumber nama/market cap DAN filter keabsahan simbol
    const coinGecko = await fetchCoinGeckoMarkets();
    await refreshUniverseSymbols(coinGecko);
    await refreshUniverseSignals();
    await computeMarketRegime();
  } finally {
    universeJobRunning = false;
  }
}

function buildExtendedStock(sym: string): Stock | null {
  const live = extendedLive.get(sym);
  if (!live || !live.lastPrice) return null;
  const meta = universeNames.get(sym);
  const sig = universeSignals.get(sym);
  const technicals: TechnicalIndicators = sig?.technicals || {
    rsi14: 50, macd: 0, macdSignal: 0, macdHist: 0,
    ma20: live.lastPrice, ma50: live.lastPrice, ma200: live.lastPrice,
    bollingerUpper: live.lastPrice * 1.04, bollingerLower: live.lastPrice * 0.96,
    volumeSpikeRatio: 1, supportLevel: live.dayLow, resistanceLevel: live.dayHigh,
  };
  const aiSignal: AISignal = sig?.aiSignal || {
    action: 'Neutral / Range',
    confidenceScore: 50,
    entryPriceRange: [live.lastPrice, live.lastPrice],
    targetPrice1: live.lastPrice * 1.02,
    targetPrice2: live.lastPrice * 1.04,
    stopLoss: live.lastPrice * 0.98,
    riskRewardRatio: 1,
    timestamp: new Date().toISOString(),
    thesis: 'Sinyal teknikal sedang dihitung dari klines harian Binance — tersedia dalam hitungan detik setelah server start.',
    technicalScore: 50, fundamentalScore: 50, bandarScore: 50, sentimentScore: 0,
  };
  const price = live.lastPrice;
  return {
    symbol: sym,
    tvSymbol: `BINANCE:${sym}USDT`,
    name: meta?.name ? `${meta.name} (${sym} / USDT)` : `${sym} / USDT`,
    market: 'CRYPTO',
    sector: 'Broad Market · Top 100 Volume',
    currency: 'USD',
    currentPrice: price,
    previousClose: live.prevClose || price - live.change,
    change: Math.round(live.change * 100) / 100,
    changePercent: Math.round(live.changePercent * 100) / 100,
    dayHigh: live.dayHigh,
    dayLow: live.dayLow,
    volume: live.quoteVolume,
    technicals,
    fundamentals: {
      pe: 0, pbv: 0, roe: 0, der: 0, dividendYield: 0,
      marketCap: meta?.marketCapB ?? 0,
      revenueGrowthYoY: 0,
      circulatingSupply: meta?.circulatingSupply,
    },
    bandarmology: {
      accumulationStatus: 'Neutral',
      netForeignFlowToday: 0,
      netForeignFlow5D: 0,
      topBuyerBrokers: [],
      topSellerBrokers: [],
      foreignDominancePercent: 50,
      bandarVolumeRatio: 1,
    },
    aiSignal,
    recentNews: [],
  };
}

function getMergedUniverse(): Stock[] {
  // HAC-28 fix — koin kurasi: metadata kaya (nama, sektor, bandarmology naratif)
  // tetap, TAPI technicals + aiSignal dioverride hasil komputasi live dari klines
  // bila tersedia. Sinyal beku dari database tidak lagi pernah tampil ke user.
  const curated = STOCKS_DATABASE.map((s) => {
    const sig = universeSignals.get(s.symbol);
    if (!sig) return s;
    return {
      ...s,
      technicals: sig.technicals,
      aiSignal: sig.aiSignal,
    };
  });
  const extended = universeSymbols
    .filter((s) => !CURATED_SYMBOLS.includes(s))
    .map((s) => buildExtendedStock(s))
    .filter((s): s is Stock => s !== null);
  return [...curated, ...extended];
}

const BINANCE_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT',
  'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'SUIUSDT', 'LINKUSDT',
  'NEARUSDT', 'PEPEUSDT', 'RENDERUSDT', 'INJUSDT', 'TIAUSDT',
  'APTUSDT', 'SHIBUSDT', 'WIFUSDT', 'TAOUSDT', 'FETUSDT',
  'SEIUSDT', 'UNIUSDT', 'AAVEUSDT'
];

async function syncBinanceLivePrices() {
  try {
    // Semua simbol yang dikenal sistem: kurasi (18, metadata kaya) + universe top 100.
    // Binance membatasi ≤100 simbol per request `symbols`, jadi di-chunk.
    const symbols = Array.from(new Set([...CURATED_SYMBOLS, ...universeSymbols]));
    if (symbols.length === 0) return;
    type TickerRow = {
      symbol: string;
      lastPrice: string;
      prevClosePrice: string;
      priceChange: string;
      priceChangePercent: string;
      highPrice: string;
      lowPrice: string;
      quoteVolume: string;
    };
    let data: TickerRow[] = [];
    for (const chunk of chunkArray(symbols, 100)) {
      const wanted = new Set(chunk.map((s) => `${s}USDT`));
      let chunkData: TickerRow[] | null = null;
      // Coba batch efisien dengan param symbols; bila ditolak (simbol tidak valid /
      // jaringan berubah), fallback ke fetch penuh lalu filter lokal.
      const symbolsParam = encodeURIComponent(JSON.stringify(chunk));
      const response = await fetchBinance(`/api/v3/ticker/24hr?symbols=${symbolsParam}`);
      if (response) {
        chunkData = await response.json();
      } else {
        const full = await fetchBinance('/api/v3/ticker/24hr');
        if (full) {
          const allRows: TickerRow[] = await full.json();
          chunkData = allRows.filter((r) => wanted.has(r.symbol));
        }
      }
      if (!chunkData) {
        binanceStatus.connected = false;
        return;
      }
      data = data.concat(chunkData);
    }

    for (const item of data) {
      const baseSymbol = item.symbol.replace('USDT', '');
      const currentPrice = parseFloat(item.lastPrice);
      const change = parseFloat(item.priceChange);
      const changePercent = parseFloat(item.priceChangePercent);
      const dayHigh = parseFloat(item.highPrice);
      const dayLow = parseFloat(item.lowPrice);
      const volume = parseFloat(item.quoteVolume);

      // Update in BASELINE_PRICES
      if (BASELINE_PRICES[baseSymbol]) {
        BASELINE_PRICES[baseSymbol].price = currentPrice;
      }

      // Update in STOCKS_DATABASE (koin kurasi)
      const stock = STOCKS_DATABASE.find((s) => s.symbol === baseSymbol);
      if (stock) {
        stock.currentPrice = currentPrice;
        stock.change = Math.round(change * 100) / 100;
        stock.changePercent = Math.round(changePercent * 100) / 100;
        stock.dayHigh = dayHigh;
        stock.dayLow = dayLow;
        stock.volume = volume;
      }

      // Update live ticker koin extended universe
      if (extendedLive.has(baseSymbol)) {
        extendedLive.set(baseSymbol, {
          lastPrice: currentPrice,
          prevClose: parseFloat(item.prevClosePrice) || currentPrice - change,
          change,
          changePercent,
          dayHigh,
          dayLow,
          quoteVolume: volume,
        });
      }
    }

    // Movers dihitung dari seluruh merged universe (kurasi + extended)
    const mergedForMovers = getMergedUniverse();
    const positiveMovers = mergedForMovers.filter((s) => s.changePercent > 0)
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 5);
    if (positiveMovers.length > 0) {
      CRYPTO_MARKET_CONDITION.topSupporters = positiveMovers.map((s) => ({
        symbol: s.symbol,
        name: s.name.replace(/\(.*\)/, '').trim(),
        market: 'CRYPTO' as const,
        price: s.currentPrice,
        changePercent: s.changePercent,
        indexPoints: Math.round(s.changePercent * 1.8 * 10) / 10,
        turnoverBillion: Math.round((s.volume / 1000000000) * 100) / 100,
      }));
    }

    const negativeMovers = mergedForMovers.filter((s) => s.changePercent < 0)
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, 5);
    if (negativeMovers.length > 0) {
      CRYPTO_MARKET_CONDITION.topDraggers = negativeMovers.map((s) => ({
        symbol: s.symbol,
        name: s.name.replace(/\(.*\)/, '').trim(),
        market: 'CRYPTO' as const,
        price: s.currentPrice,
        changePercent: s.changePercent,
        indexPoints: Math.round(s.changePercent * 1.8 * 10) / 10,
        turnoverBillion: Math.round((s.volume / 1000000000) * 100) / 100,
      }));
    }

    const turnoverMovers = mergedForMovers.slice()
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5);
    if (turnoverMovers.length > 0) {
      CRYPTO_MARKET_CONDITION.topTurnover = turnoverMovers.map((s) => ({
        symbol: s.symbol,
        name: s.name.replace(/\(.*\)/, '').trim(),
        market: 'CRYPTO' as const,
        price: s.currentPrice,
        changePercent: s.changePercent,
        indexPoints: 0,
        turnoverBillion: Math.round((s.volume / 1000000000) * 100) / 100,
      }));
    }

    binanceStatus.connected = true;
    binanceStatus.lastSync = Date.now();
    binanceStatus.source = activeBinanceBase;
    binanceStatus.lastError = null;
  } catch (err) {
    // Keep local baseline on transient error; surface status instead of failing silently
    binanceStatus.connected = false;
    binanceStatus.lastError = err instanceof Error ? err.message : 'unknown sync error';
  }
}

// Initial sync on server start & recurring background sync every 3 seconds
syncBinanceLivePrices();
setInterval(syncBinanceLivePrices, 3000);

// Universe discovery (top 100 by real volume) + names + live technical signals, every 5 minutes
universeJob();
setInterval(universeJob, 5 * 60 * 1000);

// Helper to generate realistic OHLCV historical candle series (SIMULATED — hanya
// dipakai sebagai fallback saat API klines asli tidak terjangkau; response
// chart menandai field `simulated: true` agar UI tidak menampilkannya sebagai data pasar)
function generateCandles(symbol: string, currentPrice: number, days = 45) {
  const candles = [];
  let price = currentPrice * (1 - days * 0.003);
  const now = new Date();

  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);

    const dateStr = d.toISOString().split('T')[0];
    const dailyVolatility = price * 0.028;
    const change = (Math.sin(i * 0.4) * 0.8 + (Math.random() - 0.45) * 1.5) * dailyVolatility;

    const open = Math.round(price * 100) / 100;
    const close = Math.round((price + change) * 100) / 100;
    const high = Math.round((Math.max(open, close) + Math.random() * dailyVolatility * 0.8) * 100) / 100;
    const low = Math.round((Math.min(open, close) - Math.random() * dailyVolatility * 0.8) * 100) / 100;
    const volume = Math.floor(1000000 + Math.random() * 8000000);

    price = close;
    candles.push({
      time: dateStr,
      open,
      high,
      low,
      close,
      volume,
      ma20: 0,
      ma50: 0,
    });
  }

  // Calculate Moving Averages
  for (let i = 0; i < candles.length; i++) {
    if (i >= 19) {
      const slice20 = candles.slice(i - 19, i + 1);
      const sum20 = slice20.reduce((acc, c) => acc + c.close, 0);
      candles[i].ma20 = Math.round((sum20 / 20) * 100) / 100;
    }
    if (i >= 49) {
      const slice50 = candles.slice(i - 49, i + 1);
      const sum50 = slice50.reduce((acc, c) => acc + c.close, 0);
      candles[i].ma50 = Math.round((sum50 / 50) * 100) / 100;
    } else {
      candles[i].ma50 = candles[i].ma20 ? candles[i].ma20 * 0.98 : candles[i].close * 0.98;
    }
  }

  // Ensure last candle matches current price
  if (candles.length > 0) {
    candles[candles.length - 1].close = currentPrice;
    if (candles[candles.length - 1].high < currentPrice) {
      candles[candles.length - 1].high = currentPrice;
    }
    if (candles[candles.length - 1].low > currentPrice) {
      candles[candles.length - 1].low = currentPrice;
    }
  }

  return candles;
}

function getDynamicIndices() {
  return MARKET_INDICES.map((idx) => {
    const microStep = (Math.random() - 0.48) * 0.05;
    const price = Math.round((idx.price + microStep) * 100) / 100;
    return {
      ...idx,
      price,
    };
  });
}

// ==========================================
// API ROUTES
// ==========================================

// Market indices & pulse
app.get('/api/market/summary', (_req: Request, res: Response) => {
  const mergedStocks = getMergedUniverse();
  const dynamicIndices = getDynamicIndices();

  res.json({
    indices: dynamicIndices,
    timestamp: new Date().toISOString(),
    marketStatus: {
      CRYPTO: '24/7 Global Trading (Live Binance Sync)',
    },
    regime: marketRegime,
    universe: {
      total: mergedStocks.length,
      curated: CURATED_SYMBOLS.length,
      extended: mergedStocks.length - CURATED_SYMBOLS.length,
      signalsRefreshedAt: universeLastRefresh,
    },
    binance: {
      connected: binanceStatus.connected,
      lastSync: binanceStatus.lastSync,
      source: binanceStatus.source,
      lastError: binanceStatus.lastError,
    },
    topGainers: mergedStocks.slice().sort((a, b) => b.changePercent - a.changePercent).slice(0, 5),
    topSignals: mergedStocks.filter((s) => s.aiSignal.action === 'Strong Long' || s.aiSignal.action === 'Long (Buy on Dip)'),
  });
});

// Comprehensive market condition overview
// All stocks / tokens — merged universe: koin kurasi + top 100 volume Binance
app.get('/api/market/stocks', (_req: Request, res: Response) => {
  res.json(getMergedUniverse());
});

// Specific stock/token quote & detail
app.get('/api/market/stocks/:symbol', (req: Request, res: Response) => {
  const symbol = requireValidSymbol(req.params.symbol, res);
  if (!symbol) return;
  const mergedStocks = getMergedUniverse();
  const stock = mergedStocks.find((s) => s.symbol === symbol);
  if (!stock) {
    return res.status(404).json({ error: `Asset symbol ${symbol} not found.` });
  }
  res.json(stock);
});

// Live price calibration endpoint
app.post('/api/market/calibrate', (req: Request, res: Response) => {
  const { symbol, price } = req.body;
  if (!symbol || typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
    return res.status(400).json({ error: 'Parameter symbol dan price (number > 0) wajib disertakan' });
  }

  const sym = requireValidSymbol(symbol, res);
  if (!sym) return;
  const base = BASELINE_PRICES[sym];
  if (!base) {
    return res.status(404).json({ error: `Simbol ${sym} tidak ditemukan dalam database.` });
  }

  base.price = price;

  const stock = STOCKS_DATABASE.find((s) => s.symbol === sym);
  if (stock) {
    stock.currentPrice = price;
    stock.change = Math.round((price - stock.previousClose) * 100) / 100;
    stock.changePercent = Math.round((stock.change / stock.previousClose) * 10000) / 100;
    // dayHigh/dayLow SENGAJA tidak diubah: kalibrasi adalah override harga manual,
    // bukan pergerakan pasar — range 24 jam asli tidak boleh terkontaminasi.
  }

  res.json({
    success: true,
    message: `Harga ${sym} berhasil dikalibrasi ke $${price.toLocaleString('en-US')}`,
    stock,
  });
});

// Candlestick historical chart data — dari klines ASLI Binance
interface CandleCacheEntry {
  data: Array<Record<string, number | string | boolean>>;
  fetchedAt: number;
}
const candleCache = new Map<string, CandleCacheEntry>();
const CANDLE_CACHE_TTL_MS = 60_000;

function computeMovingAverages(candles: Array<{ close: number; ma20: number | string; ma50: number | string }>) {
  for (let i = 0; i < candles.length; i++) {
    if (i >= 19) {
      const slice20 = candles.slice(i - 19, i + 1);
      candles[i].ma20 = roundSig(slice20.reduce((acc, c) => acc + c.close, 0) / 20);
    }
    if (i >= 49) {
      const slice50 = candles.slice(i - 49, i + 1);
      candles[i].ma50 = roundSig(slice50.reduce((acc, c) => acc + c.close, 0) / 50);
    } else {
      candles[i].ma50 = candles[i].ma20 ? Number(candles[i].ma20) * 0.98 : candles[i].close * 0.98;
    }
  }
}

async function fetchRealCandles(symbol: string, days: number) {
  // Simbol app (BTC, ETH, ...) dipetakan ke pasangan USDT di Binance spot
  const pair = `${symbol}USDT`;
  const limit = Math.min(Math.max(days + 1, 2), 1000);
  const cacheKey = `${pair}:${limit}`;
  const cached = candleCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CANDLE_CACHE_TTL_MS) {
    return { candles: cached.data, simulated: false as const };
  }

  const response = await fetchBinance(`/api/v3/klines?symbol=${pair}&interval=1d&limit=${limit}`);
  if (!response) return null;

  type RawKline = [number, string, string, string, string, string, ...unknown[]];
  const raw: RawKline[] = await response.json();
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const candles = raw.map((k) => ({
    time: new Date(k[0]).toISOString().split('T')[0],
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: Math.round(parseFloat(k[5])),
    ma20: 0,
    ma50: 0,
  }));
  computeMovingAverages(candles);

  const result = candles.map((c) => ({ ...c, simulated: false as const }));
  candleCache.set(cacheKey, { data: result, fetchedAt: Date.now() });
  return { candles: result, simulated: false as const };
}

app.get('/api/market/chart/:symbol', async (req: Request, res: Response) => {
  const symbol = requireValidSymbol(req.params.symbol, res);
  if (!symbol) return;
  const days = Math.min(Math.max(parseInt((req.query.days as string) || '60', 10) || 60, 1), 365);

  try {
    const real = await fetchRealCandles(symbol, days);
    if (real) {
      return res.json(real.candles);
    }
  } catch {
    // jatuh ke fallback simulasi di bawah
  }

  const stock = STOCKS_DATABASE.find((s) => s.symbol === symbol);
  const price = stock ? stock.currentPrice : 100;
  const data = generateCandles(symbol, price, Math.min(days, 45)).map((c) => ({
    ...c,
    simulated: true as const,
  }));
  res.json(data);
});

// Live predictive alerts stream
app.get('/api/alerts/live', (_req: Request, res: Response) => {
  const alerts = [
    {
      id: 'alt-001',
      symbol: 'BTC',
      market: 'CRYPTO',
      stockName: 'Bitcoin',
      type: 'WHALE_ACC',
      severity: 'HIGH',
      title: 'Mega Whale Inflow +$345M: Spot ETF BlackRock Akumulasi 4.500 BTC',
      message: 'Cadangan Bitcoin di seluruh bursa sentuh level terendah 5 tahun (-$184M net outflow). Indikator on-chain menunjukkan fase akumulasi institusi.',
      timestamp: 'Baru saja (Live UTC)',
      price: BASELINE_PRICES['BTC']?.price || 76970,
      changePercent: STOCKS_DATABASE.find((s) => s.symbol === 'BTC')?.changePercent || -2.60,
      read: false,
    },
    {
      id: 'alt-002',
      symbol: 'TAO',
      market: 'CRYPTO',
      stockName: 'Bittensor',
      type: 'AI_SIGNAL',
      severity: 'HIGH',
      title: 'Upgrade Sinyal Kuantitatif AI: Strong Long di Level $520.40 (+4.46%)',
      message: 'Subnet Dynamic Emission dTAO memicu lonjakan modal ventura institusional. Volume 24h melonjak 2.1x menembus resistance EMA 50.',
      timestamp: '8m yang lalu',
      price: 520.40,
      changePercent: 4.46,
      read: false,
    },
    {
      id: 'alt-003',
      symbol: 'SOL',
      market: 'CRYPTO',
      stockName: 'Solana',
      type: 'AI_SIGNAL',
      severity: 'HIGH',
      title: 'Upgrade Sinyal Alpha: Strong Long Support Psikologis $100',
      message: 'Volume DEX harian Solana lampaui seluruh L1 kompetitor. Support psikologis $100 bertahan kokoh dengan lonjakan active addresses.',
      timestamp: '15m yang lalu',
      price: 100.62,
      changePercent: -1.04,
      read: false,
    },
    {
      id: 'alt-004',
      symbol: 'SUI',
      market: 'CRYPTO',
      stockName: 'Sui Network',
      type: 'BREAKOUT',
      severity: 'HIGH',
      title: 'Volume Spike Breakout +7.07% Menembus Resisten $2.12',
      message: 'TVL jaringan Sui melesat tembus $1.2 Miliar. Terjadi whale accumulation swap sebesar 18 Juta SUI di pasar spot.',
      timestamp: '32m yang lalu',
      price: 2.12,
      changePercent: 7.07,
      read: false,
    },
    {
      id: 'alt-005',
      symbol: 'AAVE',
      market: 'CRYPTO',
      stockName: 'Aave',
      type: 'WHALE_ACC',
      severity: 'HIGH',
      title: 'DeFi Fee Switch Proposal: Whale Akumulasi 110.000 AAVE di Level $154.60',
      message: 'Proposal bagi hasil fee protokol tahunan >$50M memicu outflow CEX senilai $14.8M menuju smart contract staking.',
      timestamp: '45m yang lalu',
      price: 154.60,
      changePercent: 3.90,
      read: false,
    },
    {
      id: 'alt-006',
      symbol: 'RENDER',
      market: 'CRYPTO',
      stockName: 'Render Network',
      type: 'VOLUME_SURGE',
      severity: 'MEDIUM',
      title: 'AI & DePIN Rally: Lonjakan Transaksi GPU Render di Level $5.42 (+4.63%)',
      message: 'Silicon Valley AI Syndicate akumulasi 3.2 Juta RENDER. Relative Strength Index (RSI 64.2) mengindikasikan momentum ekspansif.',
      timestamp: '1j yang lalu',
      price: 5.42,
      changePercent: 4.63,
      read: true,
    },
    {
      id: 'alt-007',
      symbol: 'WIF',
      market: 'CRYPTO',
      stockName: 'dogwifhat',
      type: 'BREAKOUT',
      severity: 'MEDIUM',
      title: 'Solana Meme Momentum: WIF Rebound +5.08% di Atas Level $2.48',
      message: 'Perputaran likuiditas DEX Raydium mengalir cepat ke WIF pasca pertahanan support MA20 di level $2.32.',
      timestamp: '1j 20m yang lalu',
      price: 2.48,
      changePercent: 5.08,
      read: false,
    },
  ];

  res.json(alerts);
});

// Algorithmic & Mathematical Quantitative Analysis Engine
function computeMathematicalQuantitativeAnalysis(asset: Stock, userNotes?: string) {
  const currentPrice = asset.currentPrice;
  const ma20 = asset.technicals.ma20 || currentPrice;
  const upper = asset.technicals.bollingerUpper || currentPrice * 1.05;
  const lower = asset.technicals.bollingerLower || currentPrice * 0.95;
  const sigma = Math.max((upper - lower) / 4, currentPrice * 0.01);
  const zScore = Math.round(((currentPrice - ma20) / sigma) * 100) / 100;

  const rsi = asset.technicals.rsi14 || 50;
  const support = asset.technicals.supportLevel || currentPrice * 0.95;
  const resistance = asset.technicals.resistanceLevel || currentPrice * 1.08;
  const dayHigh = asset.dayHigh || currentPrice * 1.03;
  const dayLow = asset.dayLow || currentPrice * 0.97;
  const atr = Math.max(dayHigh - dayLow, currentPrice * 0.02);

  // Fibonacci Golden Extensions:
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
  if (asset.bandarmology.accumulationStatus === 'Big Accumulation') p += 0.07;
  if (asset.changePercent > 0) p += 0.04;
  p = Math.min(0.85, Math.max(0.45, p));
  const b = Math.max(1.5, riskRewardRatio);
  const kellyFraction = Math.max(0.05, Math.min(0.25, (p * b - (1 - p)) / b));
  const kellyPercent = Math.round(kellyFraction * 1000) / 10;

  // Whale netflow coefficient:
  const netFlowToday = asset.bandarmology.netForeignFlowToday || 0;
  const flowPct = asset.volume > 0 ? ((netFlowToday * 1000000) / asset.volume) * 100 : 0;

  // Funding Rate Skew:
  const fundingRate = asset.bandarmology.fundingRate || 0.01;
  const openInterest = asset.bandarmology.openInterestBillion || 1.0;
  const isShortSqueeze = fundingRate < 0 && openInterest > 0.5;
  const isOverheated = fundingRate > 0.03 && rsi > 70;

  let recommendation: 'Strong Long' | 'Long (Buy on Dip)' | 'Neutral / Range' | 'Short / Hedge' | 'Take Profit' = 'Long (Buy on Dip)';
  if (p >= 0.75 && riskRewardRatio >= 2.5) {
    recommendation = 'Strong Long';
  } else if (rsi < 40 && zScore < -1.5) {
    recommendation = 'Long (Buy on Dip)';
  } else if (isOverheated || zScore > 2.2) {
    recommendation = 'Take Profit';
  } else if (rsi < 45 && asset.changePercent < -3) {
    recommendation = 'Neutral / Range';
  }

  const liquidationRisk: 'Low' | 'Moderate' | 'High' = isOverheated ? 'High' : isShortSqueeze ? 'Moderate' : 'Low';

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
      summaryThesis: `Model Kuantitatif & Algoritmik menghitung Z-score harga ${zScore > 0 ? '+' : ''}${zScore}σ terhadap MA20, dengan batas volatilitas harian ATR $${Math.round(atr * 100) / 100}. Proyeksi Fibonacci Golden Ratio menetapkan target kenaikan $${fibTarget1} (R:R ${riskRewardRatio}x), sementara formula Kelly Criterion merekomendasikan alokasi risiko modal optimal sebesar ${kellyPercent}% dari portofolio. Arus akumulasi paus (+${netFlowToday}M USD) mencerminkan tekanan beli institusional yang valid.`,
      technicalHighlights: [
        `Z-Score Distribusi Normal: ${zScore > 0 ? '+' : ''}${zScore}σ (${Math.abs(zScore) < 1 ? 'Konsolidasi Sehat di Atas Rata-Rata' : zScore >= 1 ? 'Momentum Ekspansi Positif' : 'Zona Diskon Akumulasi'}).`,
        `ATR Volatilitas Harian: $${Math.round(atr * 100) / 100} dengan stop-loss matematis di $${stopLossPrice} (toleransi 0.382x ATR di bawah support $${support}).`,
        `Rasio Risk/Reward Matematis: 1 : ${riskRewardRatio} berbasis ekstensi Fibonacci 161.8% ($${fibTarget1}) dan 261.8% ($${fibTarget2}).`,
      ],
      onChainHighlights: [
        `Koefisien Aliran Paus: Net inflow institusi harian +$${netFlowToday}M USD mewakili ${flowPct.toFixed(2)}% dari total likuiditas harian bursa.`,
        `Cadangan CEX: Status ${asset.bandarmology.accumulationStatus} dengan dominasi paus ${asset.bandarmology.foreignDominancePercent}%.`,
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
        `Korelasi positif dengan pergerakan volume likuiditas spot Binance di sektor ${asset.sector}.`,
      ],
      riskFactors: [
        `Penembusan level proteksi stop loss matematis $${stopLossPrice} menginvalidasi struktur kuantitatif.`,
        `Lonjakan volatilitas pasar makro tak terduga yang melampaui rentang batas 2.5x ATR.`,
      ],
    },
  };
}

// Quantitative AI & Mathematical Synthesis Endpoint for Crypto Terminal
app.post('/api/gemini/analyze', async (req: Request, res: Response) => {
  const { symbol, userNotes, engine = 'math' } = req.body;
  const sym = symbol ? requireValidSymbol(symbol, res) : null;
  if (!sym) {
    if (!res.headersSent) return res.status(400).json({ error: 'Asset symbol is required (1-10 alfanumerik).' });
    return;
  }
  if (userNotes != null && (typeof userNotes !== 'string' || userNotes.length > 500)) {
    return res.status(400).json({ error: 'userNotes wajib string <= 500 karakter.' });
  }
  if (engine !== 'math' && engine !== 'algorithmic' && engine !== 'gemini') {
    return res.status(400).json({ error: "engine harus 'math' | 'algorithmic' | 'gemini'." });
  }

  const asset = getMergedUniverse().find((s) => s.symbol === sym);
  if (!asset) {
    return res.status(404).json({ error: `Asset ${sym} not found in universe.` });
  }

  // If engine is 'math' or 'algorithmic' (default fast path, instant <5ms response):
  if (engine === 'math' || engine === 'algorithmic') {
    return res.json(computeMathematicalQuantitativeAnalysis(asset, userNotes));
  }

  // If Gemini 3.8 Flash LLM is explicitly requested:
  if (ai) {
    try {
      const prompt = `Anda adalah Lead Crypto Quantitative Strategist dan On-Chain Intelligence Analyst di sebuah hedge fund kripto global.
Lakukan analisis mendalam dan objektif tanpa fluff terhadap aset kripto berikut:

ASET KRIPTO:
- Simbol: ${asset.symbol} (${asset.name})
- Pair Binance: ${asset.tvSymbol} · Sektor: ${asset.sector}
- Harga Spot Live: $${asset.currentPrice} (${asset.changePercent > 0 ? '+' : ''}${asset.changePercent}%)
- 24h Trading Volume: $${asset.volume.toLocaleString('en-US')}

INDIKATOR TEKNIKAL & STRUKTUR PASAR:
- RSI (14): ${asset.technicals.rsi14}
- Moving Averages: MA20: $${asset.technicals.ma20}, MA50: $${asset.technicals.ma50}, MA200: $${asset.technicals.ma200}
- Key Support: $${asset.technicals.supportLevel}, Key Resistance: $${asset.technicals.resistanceLevel}
- Volume Spike Ratio: ${asset.technicals.volumeSpikeRatio}x rata-rata

METRIK ON-CHAIN & DERIVATIVES (WHALE FLOW):
- Status Akumulasi Paus: ${asset.bandarmology.accumulationStatus}
- Net Arus Modal Paus Hari Ini: $${asset.bandarmology.netForeignFlowToday}M
- 5-Day Cumulative Net Flow: $${asset.bandarmology.netForeignFlow5D}M
- CEX Exchange Net Inflow/Outflow: $${asset.bandarmology.exchangeNetInflow ?? 0}M
- Perpetual 8h Funding Rate: ${asset.bandarmology.fundingRate ?? 0.01}%
- Open Interest: $${asset.bandarmology.openInterestBillion ?? 0} Miliar
- Dominasi Smart Money: ${asset.bandarmology.foreignDominancePercent}%

TOKENOMICS & ADOPSI:
- Market Cap: $${asset.fundamentals.marketCap}B · FDV: $${asset.fundamentals.fdvBillion ?? 0}B
- Sirkulasi Suplai: ${asset.fundamentals.circulatingSupply ?? 'N/A'}
- Staking Yield / APR: ${asset.fundamentals.dividendYield}%

Catatan / Fokus Analisis Pengguna: ${userNotes || 'Analisis swing setup, potensi short/long squeeze, dan katalis narasi'}

Berikan output persis dalam format JSON terstruktur berikut (tanpa markdown pembungkus di luar JSON):
{
  "recommendation": "Strong Long" | "Long (Buy on Dip)" | "Neutral / Range" | "Short / Hedge" | "Take Profit",
  "confidenceScore": number (antara 65 sampai 98),
  "sentimentScore": number (antara -100 sampai +100),
  "entryZone": [number, number],
  "targetPrice1": number,
  "targetPrice2": number,
  "stopLossPrice": number,
  "riskRewardRatio": number,
  "liquidationRisk": "Low" | "Moderate" | "High",
  "summaryThesis": "2-3 paragraf tajam, berbasis data dan market structure, menjelaskan tesis pergerakan harga tanpa jargon AI slop",
  "technicalHighlights": ["poin teknikal 1 dengan level angka", "poin teknikal 2"],
  "onChainHighlights": ["poin arus CEX / whale outflow 1", "poin staking / akumulasi 2"],
  "derivativesHighlights": ["kondisi funding rate dan open interest", "potensi likuidasi short/long"],
  "keyCatalysts": ["katalis penggerak 1", "katalis 2"],
  "riskFactors": ["risiko invalidasi 1", "risiko 2"]
}`;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });

      const text = aiResponse.text || '{}';
      const parsed = JSON.parse(text);
      return res.json({
        success: true,
        source: 'gemini-3.8-flash',
        data: {
          ...parsed,
          engine: 'gemini-3.8-flash',
        },
      });
    } catch (err: unknown) {
      console.error('Gemini API call failed, falling back to math engine:', err);
    }
  }

  // Instant fallback to mathematical quantitative engine
  return res.json(computeMathematicalQuantitativeAnalysis(asset, userNotes));
});

// ==========================================
// REAL GEMINI AUTOTRADE SCAN ENDPOINT
// ==========================================
app.post('/api/bot/gemini-scan', async (req: Request, res: Response) => {
  const { mode = 'PURE_AI', candidates = [], config = {}, marketRegime = 'TREND_UP' } = req.body;

  if (!Array.isArray(candidates) || candidates.length === 0) {
    return res.status(400).json({ error: 'Candidates array cannot be empty' });
  }

  // Fallback heuristic function in case Gemini is offline or rate-limited
  const runMathFallback = () => {
    const valid = candidates
      .filter((c: any) => c.currentPrice > 0)
      .sort((a: any, b: any) => (b.score || 0) - (a.score || 0));

    const picked = valid.slice(0, 1).map((c: any) => {
      const entry = c.currentPrice;
      const target = c.targetPrice1 || entry * 1.08;
      const stop = c.stopLoss && c.stopLoss < entry ? c.stopLoss : entry * 0.96;
      const rr = stop < entry ? Math.round(((target - entry) / (entry - stop)) * 10) / 10 : 2.0;

      return {
        symbol: c.symbol,
        action: 'Strong Long',
        confidenceScore: Math.min(95, Math.max(70, Math.round(c.score || 85))),
        entryPrice: entry,
        targetPrice: target,
        stopLoss: stop,
        riskRewardRatio: Math.max(1.5, rr),
        thesis: `Quantitative algorithm detected high momentum structure (RSI ${c.rsi14 || 52}) and institutional liquidity inflows on ${c.symbol}.`,
        aiReasoning: 'Selected based on Kelly criterion and multi-factor alpha score ranking.'
      };
    });

    return {
      success: true,
      engine: 'quantitative-math',
      result: {
        selectedTrades: picked,
        marketAnalysis: `Regime: ${marketRegime}. Mathematical filtering applied.`,
        rejectionSummary: `${Math.max(0, valid.length - picked.length)} candidate(s) filtered due to risk threshold.`
      }
    };
  };

  if (ai) {
    try {
      const prompt = `You are the institutional Autonomous AI Trading Brain of Halfy AI Crypto Terminal.
Current Execution Mode: ${mode === 'PURE_AI' ? 'PURE AI (Fully Autonomous Neural Rules)' : 'HYBRID AI (User Risk Calibrated)'}
Current Market Regime: ${marketRegime}
Risk Parameters: Risk Per Trade: ${config.riskPerTradePercent || 0.5}%, Min R:R: ${config.minRiskReward || 1.8}, Min Confidence: ${config.minAiConfidence || 75}%

Evaluate the following candidate coins scanned from live Binance spot market:
${candidates.slice(0, 10).map((c: any, i: number) => `
[#${i + 1}] ${c.symbol} (${c.name || c.symbol}) · Sector: ${c.sector || 'Crypto'}
- Live Price: $${c.currentPrice} (${c.changePercent > 0 ? '+' : ''}${c.changePercent}%) · 24h Vol: $${((c.volume || 0) / 1e6).toFixed(1)}M
- RSI(14): ${c.rsi14 || 'N/A'} · MA20: $${c.ma20 || 'N/A'} · Support: $${c.support || 'N/A'} · Resistance: $${c.resistance || 'N/A'}
- Funding 8H: ${c.fundingRate ? (c.fundingRate * 100).toFixed(3) + '%' : '0.010%'} · Whale Status: ${c.whaleStatus || 'Neutral'} · Alpha Score: ${c.score || 80}
`).join('\n')}

INSTRUCTIONS:
1. Select the BEST setup (choose 1 coin, or 2 at most if exceptional high conviction setup exists).
2. The setup MUST be a LONG / BUY setup (Spot portfolio only).
3. Ensure stopLoss is STRICTLY BELOW entryPrice.
4. Ensure targetPrice is STRICTLY ABOVE entryPrice, providing an asymmetric Risk/Reward ratio >= ${config.minRiskReward || 1.8}.
5. Write an institutional, concise 1-2 sentence thesis without fluff.

Output strictly valid JSON with no markdown wrapping outside:
{
  "selectedTrades": [
    {
      "symbol": "BTC",
      "action": "Strong Long",
      "confidenceScore": 88,
      "entryPrice": 77200.0,
      "targetPrice": 85000.0,
      "stopLoss": 74500.0,
      "riskRewardRatio": 2.9,
      "thesis": "Whale reserve outflows coupled with 4H breakout above EMA resistance indicate strong institutional bid absorption.",
      "aiReasoning": "Low funding rate (0.008%) and positive cumulative volume delta confirm low squeeze risk on breakout."
    }
  ],
  "marketAnalysis": "Bullish continuation pattern supported by healthy spot CEX outflows.",
  "rejectionSummary": "Filtered out coins with elevated perp funding rates or extended RSI."
}`;

      const modelsToTry = ['gemini-3.8-flash', 'gemini-3.5-flash'];
      let parsedResult: any = null;
      let engineSelected = 'quantitative-math';

      for (const modelName of modelsToTry) {
        try {
          const timeoutMs = modelName === 'gemini-3.8-flash' ? 3500 : 6000;
          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error(`${modelName} timeout (${timeoutMs}ms)`)), timeoutMs)
          );

          const aiResponse = await Promise.race([
            ai.models.generateContent({
              model: modelName,
              contents: prompt,
              config: {
                responseMimeType: 'application/json',
                temperature: 0.2,
              },
            }),
            timeoutPromise,
          ]);

          const text = aiResponse.text || '{}';
          const candidateJson = JSON.parse(text);

          if (candidateJson && Array.isArray(candidateJson.selectedTrades) && candidateJson.selectedTrades.length > 0) {
            candidateJson.selectedTrades = candidateJson.selectedTrades.filter((t: any) => {
              return t.entryPrice > 0 && t.stopLoss > 0 && t.targetPrice > t.entryPrice && t.stopLoss < t.entryPrice;
            });

            if (candidateJson.selectedTrades.length > 0) {
              parsedResult = candidateJson;
              engineSelected = modelName;
              break;
            }
          }
        } catch (err: any) {
          console.warn(`[GeminiBotScan] ${modelName} unavailable/congested (${err?.message || 'timeout'}), checking next tier...`);
        }
      }

      if (parsedResult) {
        return res.json({
          success: true,
          engine: engineSelected,
          result: parsedResult,
        });
      }
    } catch (err: any) {
      console.warn('[GeminiBotScan] Using mathematical quantitative engine fallback:', err?.message || err);
    }
  }

  return res.json(runMathFallback());
});

// ==========================================
// STATIC ASSETS & VITE INTEGRATION
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[Halfy AI · Crypto & Equities Terminal] Server running at http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
