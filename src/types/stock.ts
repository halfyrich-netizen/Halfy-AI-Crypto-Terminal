export type MarketType = 'CRYPTO' | 'US';

export type SignalAction = 
  | 'Strong Long'
  | 'Long (Buy on Dip)'
  | 'Neutral / Range'
  | 'Short / Hedge'
  | 'Take Profit'
  | 'Strong Buy'
  | 'Buy'
  | 'Buy on Weakness'
  | 'Hold'
  | 'Sell'
  | 'Cut Loss';

export interface BrokerTransaction {
  code: string; // e.g. "Binance Institutional", "Coinbase Prime", "Wintermute", "Jump Crypto", "FalconX"
  name: string;
  type: 'BUY' | 'SELL';
  volumeLot: number;
  avgPrice: number;
  valueBillion: number; // Value in Million USD
}

export interface BandarmologyData {
  accumulationStatus: 'Big Accumulation' | 'Normal Accumulation' | 'Neutral' | 'Normal Distribution' | 'Big Distribution';
  netForeignFlowToday: number; // Net Whale Inflow today in Millions USD
  netForeignFlow5D: number;
  topBuyerBrokers: BrokerTransaction[];
  topSellerBrokers: BrokerTransaction[];
  foreignDominancePercent: number; // Whale / Smart Money Dominance %
  bandarVolumeRatio: number; // Whale Volume Ratio
  exchangeNetInflow?: number; // CEX Net Inflow (+) / Outflow (-) in Million USD
  fundingRate?: number; // Perp Funding Rate % (e.g. 0.010%)
  openInterestBillion?: number; // Open Interest in Billion USD
}

export interface TechnicalIndicators {
  rsi14: number;
  macd: number;
  macdSignal: number;
  macdHist: number;
  ma20: number;
  ma50: number;
  ma200: number;
  bollingerUpper: number;
  bollingerLower: number;
  volumeSpikeRatio: number; // e.g. 2.4x 20-day average
  supportLevel: number;
  resistanceLevel: number;
}

export interface FundamentalMetrics {
  pe: number; // N/A (0) for Crypto
  pbv: number; // MCap / TVL for Crypto
  roe: number; // Staking APR % for Crypto
  der: number; // Protocol Leverage / Debt Ratio
  dividendYield: number; // Staking Yield %
  marketCap: number; // In Billion USD
  revenueGrowthYoY: number; // Protocol Fee / Revenue YoY %
  circulatingSupply?: string; // e.g. "19.78M BTC"
  fdvBillion?: number; // Fully Diluted Valuation
}

export interface AISignal {
  action: SignalAction;
  confidenceScore: number; // 0 - 100
  entryPriceRange: [number, number];
  targetPrice1: number;
  targetPrice2: number;
  stopLoss: number;
  riskRewardRatio: number;
  timestamp: string;
  thesis: string;
  technicalScore: number; // 0 - 100
  fundamentalScore: number; // Tokenomics & TVL Score
  bandarScore: number; // Whale Flow Score
  sentimentScore: number;
  fundingRate?: number;
  openInterestChange?: number;
  onChainFlow?: string;
  liquidationRisk?: 'Low' | 'Moderate' | 'High';
  catalyst?: string;
}

export interface Stock {
  symbol: string;
  tvSymbol: string; // e.g. "BINANCE:BTCUSDT", "NASDAQ:NVDA"
  name: string;
  market: MarketType;
  sector: string; // e.g. "Layer 1", "DeFi", "AI & DePIN", "Semiconductors"
  currency: 'USD' | 'USDT' | 'IDR';
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  volume: number; // 24h Trading Volume
  technicals: TechnicalIndicators;
  fundamentals: FundamentalMetrics;
  bandarmology: BandarmologyData; // Whale / Institutional Flow
  aiSignal: AISignal;
  recentNews: {
    headline: string;
    source: string;
    timeAgo: string;
    sentiment: 'positive' | 'neutral' | 'negative';
  }[];
}

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ma20?: number;
  ma50?: number;
}

export interface PortfolioPosition {
  id: string;
  symbol: string;
  name: string;
  market: MarketType;
  quantity: number; // Units for Crypto (e.g. 0.5 BTC) or shares for US stocks
  sharesTotal: number;
  averageBuyPrice: number;
  currentPrice: number;
  totalCost: number;
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  targetPrice?: number;
  stopLoss?: number;
  dateAdded: string;
}

export interface ClosedTradePosition {
  id: string;
  symbol: string;
  name: string;
  market: MarketType;
  quantity: number;
  averageBuyPrice: number;
  closePrice: number;
  totalCost: number;
  closeValue: number;
  realizedPnL: number;
  realizedPnLPercent: number;
  dateAdded: string;
  dateClosed: string;
  closeReason: 'TAKE_PROFIT' | 'STOP_LOSS' | 'MANUAL_EXIT';
  notes?: string;
  executedBy?: 'MANUAL' | 'AI_BOT';
}

export type BotExecutionArchetype = 
  | 'AI_AUTONOMOUS' 
  | 'PURE_AI' 
  | 'HYBRID_USER_CALIBRATED' 
  | 'HYBRID' 
  | 'MANUAL_DISCRETIONARY';

export type BotStrategyFocus = 
  | 'ALL_SIGNALS' 
  | 'WHALE_ACCUMULATION' 
  | 'WHALE_INFLOW' 
  | 'BREAKOUT_MOMENTUM' 
  | 'OVERSOLD_REBOUND' 
  | 'OVERSOLD_BOUNCE';

export type BotSizingModel = 'KELLY_CRITERION' | 'FIXED_FRACTIONAL' | 'EQUAL_WEIGHT';

export interface BotConfig {
  isActive: boolean;
  initialCapital: number;
  liquidityBalance: number;
  riskPerTradePercent: number; // e.g. 2% of equity
  maxConcurrentPositions: number; // e.g. 4
  minRiskReward: number; // e.g. 2.0
  minAiConfidence: number; // e.g. 75
  takeProfitMode: 'FULL_TP1' | 'DYNAMIC_TRAIL';
  autoReinvest: boolean;
  archetype?: BotExecutionArchetype;
  strategyFocus?: BotStrategyFocus;
  sizingModel?: BotSizingModel;
  hybridRiskMultiplier?: number;
  hybridRequireConfirmation?: boolean;
  trailingStopPercent?: number;
}

export interface BotExecutionLog {
  id: string;
  timestamp: string;
  action: 'BUY_ENTRY' | 'TAKE_PROFIT' | 'STOP_LOSS' | 'SIGNAL_SKIPPED';
  symbol: string;
  price: number;
  quantity?: number;
  details: string;
  pnl?: number;
}

export interface PredictiveAlert {
  id: string;
  symbol: string;
  market: MarketType;
  stockName: string;
  type: 'BREAKOUT' | 'BANDAR_ACC' | 'AI_SIGNAL' | 'VOLUME_SURGE' | 'STOP_LOSS_WARNING' | 'WHALE_ACC' | 'LIQUIDATION_SPIKE';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  message: string;
  timestamp: string;
  price: number;
  changePercent: number;
  read: boolean;
}

export interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  market: MarketType;
  high?: number;
  low?: number;
  ytdReturn?: number;
}

export interface MarketBreadth {
  advancers: number;
  decliners: number;
  unchanged: number;
  totalTurnover: number; // in Billion USD
  totalVolume: number; // in Billion units / shares
  totalTransactions: number;
  ratioAdvDec: number;
}

export interface SectorPerformance {
  id: string;
  name: string;
  code: string;
  changePercent: number;
  netForeignFlow: number; // Net Whale Inflow in Million USD
  marketCapTrillion: number; // Market Cap in Billion USD
  leaderSymbol: string;
  leaderChange: number;
  laggerSymbol: string;
  laggerChange: number;
}

export interface ForeignFlowSummary {
  regularMarket: number; // Spot Market Net Inflow ($M)
  negotiatedMarket: number; // OTC & Derivatives Net Inflow ($M)
  totalToday: number; // Total Net Whale Inflow ($M)
  cumulative5D: number;
  cumulativeYTD: number;
  topInflowSector: string;
  topOutflowSector: string;
}

export interface MacroBarometer {
  fearGreedScore: number;
  fearGreedLabel: string;
  exchangePE: number; // MCap/TVL or P/E
  exchangePBV: number;
  dividendYield: number; // Staking or Dividend Yield %
  benchmarkRate: string; // e.g. "Fed Funds: 4.75%" or "BTC Halving Cycle"
  inflationRate: string; // "US CPI: 2.4%"
  currencyPair: { name: string; value: string; change: string }; // DXY or USDT.D
  sovereignYield10Y: { name: string; value: string; change: string };
}

export interface IndexMover {
  symbol: string;
  name: string;
  market: MarketType;
  price: number;
  changePercent: number;
  indexPoints: number; // Impact points
  turnoverBillion: number; // Turnover in Million/Billion USD
}

export interface MarketConditionData {
  indices: MarketIndex[];
  breadth: MarketBreadth;
  sectors: SectorPerformance[];
  foreignFlow: ForeignFlowSummary;
  macro: MacroBarometer;
  topSupporters: IndexMover[];
  topDraggers: IndexMover[];
  topTurnover: IndexMover[];
  lastUpdated: string;
}
