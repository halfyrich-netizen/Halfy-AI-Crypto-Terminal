import { Stock, PortfolioPosition, ClosedTradePosition, BotConfig, BotExecutionLog } from '../types/stock';

export const INITIAL_BOT_CONFIG: BotConfig = {
  isActive: true,
  initialCapital: 50000,
  liquidityBalance: 32450.0,
  // P0.6 — default PAPER konservatif sesuai brief: 0.5% risiko ekuitas per trade
  // (2% of notional ≠ 2% risk of equity; sizing dihitung dari jarak stop).
  riskPerTradePercent: 0.5,
  maxConcurrentPositions: 4,
  minRiskReward: 2.0, // Min 1:2.0 Risk to Reward
  minAiConfidence: 75, // Min 75 Signal Quality (0-100) — BUKAN probabilitas win
  takeProfitMode: 'FULL_TP1',
  autoReinvest: true,
  archetype: 'AI_AUTONOMOUS',
  strategyFocus: 'ALL_SIGNALS',
  sizingModel: 'KELLY_CRITERION',
  hybridRiskMultiplier: 1.0,
  hybridRequireConfirmation: false,
  trailingStopPercent: 2.5,
  autoScanIntervalSec: 60,
  entriesPaused: false,
};

// Buku Hybrid: engine sama, tapi archetype HYBRID + risk multiplier kalibrasi user.
// Modal & kas awal disamakan dengan buku Pure AI agar Battle Arena adil.
export const INITIAL_HYBRID_CONFIG: BotConfig = {
  ...INITIAL_BOT_CONFIG,
  archetype: 'HYBRID',
  hybridRiskMultiplier: 1.25,
};

export const INITIAL_BOT_POSITIONS: PortfolioPosition[] = [
  {
    id: 'bot-pos-1',
    symbol: 'ETH',
    name: 'Ethereum (ETH / USDT)',
    market: 'CRYPTO',
    quantity: 3.5,
    sharesTotal: 3.5,
    averageBuyPrice: 2280.0,
    currentPrice: 2323.2,
    totalCost: 7980.0,
    currentValue: 8131.2,
    unrealizedPnL: 151.2,
    unrealizedPnLPercent: 1.89,
    targetPrice: 2580.0,
    stopLoss: 2210.0,
    dateAdded: '2026-10-25',
  },
  {
    id: 'bot-pos-2',
    symbol: 'SUI',
    name: 'Sui Network (SUI / USDT)',
    market: 'CRYPTO',
    quantity: 4500,
    sharesTotal: 4500,
    averageBuyPrice: 1.95,
    currentPrice: 2.12,
    totalCost: 8775.0,
    currentValue: 9540.0,
    unrealizedPnL: 765.0,
    unrealizedPnLPercent: 8.72,
    targetPrice: 2.65,
    stopLoss: 1.82,
    dateAdded: '2026-10-26',
  },
  {
    id: 'bot-pos-3',
    symbol: 'AAVE',
    name: 'Aave Protocol (AAVE / USDT)',
    market: 'CRYPTO',
    quantity: 5.2,
    sharesTotal: 5.2,
    averageBuyPrice: 148.5,
    currentPrice: 154.6,
    totalCost: 772.2,
    currentValue: 803.92,
    unrealizedPnL: 31.72,
    unrealizedPnLPercent: 4.11,
    targetPrice: 185.0,
    stopLoss: 142.0,
    dateAdded: '2026-10-27',
  },
];

export const INITIAL_BOT_CLOSED_TRADES: ClosedTradePosition[] = [
  {
    id: 'bot-closed-1',
    symbol: 'TAO',
    name: 'Bittensor (TAO / USDT)',
    market: 'CRYPTO',
    quantity: 12,
    averageBuyPrice: 485.0,
    closePrice: 545.0,
    totalCost: 5820.0,
    closeValue: 6540.0,
    realizedPnL: 720.0,
    realizedPnLPercent: 12.37,
    dateAdded: '2026-10-18',
    dateClosed: '2026-10-24',
    closeReason: 'TAKE_PROFIT',
    notes: 'Auto TP1 terpicu di $545.00 (+12.37%)',
    executedBy: 'AI_BOT',
  },
  {
    id: 'bot-closed-2',
    symbol: 'LINK',
    name: 'Chainlink (LINK / USDT)',
    market: 'CRYPTO',
    quantity: 420,
    averageBuyPrice: 10.40,
    closePrice: 11.85,
    totalCost: 4368.0,
    closeValue: 4977.0,
    realizedPnL: 609.0,
    realizedPnLPercent: 13.94,
    dateAdded: '2026-10-20',
    dateClosed: '2026-10-26',
    closeReason: 'TAKE_PROFIT',
    notes: 'Auto TP1 terpicu di $11.85 (+13.94%)',
    executedBy: 'AI_BOT',
  },
  {
    id: 'bot-closed-3',
    symbol: 'SOL',
    name: 'Solana (SOL / USDT)',
    market: 'CRYPTO',
    quantity: 35,
    averageBuyPrice: 91.50,
    closePrice: 102.80,
    totalCost: 3202.5,
    closeValue: 3598.0,
    realizedPnL: 395.5,
    realizedPnLPercent: 12.35,
    dateAdded: '2026-10-15',
    dateClosed: '2026-10-22',
    closeReason: 'TAKE_PROFIT',
    notes: 'Auto TP1 terpicu di $102.80 (+12.35%)',
    executedBy: 'AI_BOT',
  },
];

export const INITIAL_BOT_LOGS: BotExecutionLog[] = [
  {
    id: 'log-1',
    timestamp: 'Baru saja',
    action: 'BUY_ENTRY',
    symbol: 'SUI',
    price: 1.95,
    quantity: 4500,
    details: 'Auto-Buy 4,500 SUI @ $1.95. Risk: 2% ($1,000). SL: $1.82 (Risk: $0.13/unit). R:R: 1:5.38. Whale Accumulation terkonfirmasi.',
  },
  {
    id: 'log-2',
    timestamp: '2 jam lalu',
    action: 'TAKE_PROFIT',
    symbol: 'LINK',
    price: 11.85,
    pnl: 609.0,
    details: 'Auto-Take Profit LINK tercapai di target $11.85. Realized PnL: +$609.00 (+13.94%). Likuiditas kas bertambah +$4,977 USDT.',
  },
  {
    id: 'log-3',
    timestamp: '5 jam lalu',
    action: 'BUY_ENTRY',
    symbol: 'ETH',
    price: 2280.0,
    quantity: 3.5,
    details: 'Auto-Buy 3.5 ETH @ $2,280.00. Sinyal Strong Long terverifikasi dengan confidence score 88%. SL proteksi di $2,210.00.',
  },
];

/**
 * Auto Money Management Calculator (Fractional Risk & Kelly Model)
 */
export function calculateBotPositionSize(
  stock: Stock,
  totalBotEquity: number,
  availableLiquidity: number,
  riskPerTradePercent: number,
  riskMultiplier: number = 1.0,
  sizingModel: 'KELLY_CRITERION' | 'FIXED_FRACTIONAL' | 'EQUAL_WEIGHT' = 'KELLY_CRITERION'
): { quantity: number; totalCost: number; riskAmount: number; isValid: boolean; reason?: string } {
  const currentPrice = stock.currentPrice;
  const stopLoss = stock.aiSignal.stopLoss;
  const riskDistance = Math.max(currentPrice - stopLoss, currentPrice * 0.02);

  // Adjusted effective risk percent
  const effectiveRiskPercent = Math.max(0.5, Math.min(10, riskPerTradePercent * (riskMultiplier || 1.0)));

  // Maximum allowed dollar loss if SL hits
  let maxRiskDollar = (totalBotEquity * effectiveRiskPercent) / 100;

  // Sizing model adjustments
  if (sizingModel === 'KELLY_CRITERION') {
    // Half-Kelly fraction for prudent risk distribution
    const p = (stock.aiSignal.confidenceScore || 75) / 100;
    const b = stock.aiSignal.riskRewardRatio || 2.0;
    const kellyFraction = Math.max(0.01, Math.min(0.25, (p * (b + 1) - 1) / b));
    maxRiskDollar = Math.max(maxRiskDollar * 0.8, totalBotEquity * (kellyFraction * 0.25));
  } else if (sizingModel === 'EQUAL_WEIGHT') {
    maxRiskDollar = Math.max(50, (availableLiquidity * 0.15) * (riskDistance / currentPrice));
  }

  // Ideal units based on risk distance
  let idealQuantity = maxRiskDollar / riskDistance;

  // Round quantity based on price tier
  if (currentPrice > 1000) {
    idealQuantity = Math.round(idealQuantity * 10000) / 10000;
  } else if (currentPrice < 1) {
    idealQuantity = Math.round(idealQuantity);
  } else {
    idealQuantity = Math.round(idealQuantity * 100) / 100;
  }

  let totalCost = Math.round(idealQuantity * currentPrice * 100) / 100;

  // Cap position size to maximum 35% of available liquidity to preserve diversification
  const maxCapFromLiquidity = availableLiquidity * 0.35;
  if (totalCost > maxCapFromLiquidity) {
    totalCost = Math.round(maxCapFromLiquidity * 100) / 100;
    idealQuantity = totalCost / currentPrice;
    if (currentPrice > 1000) idealQuantity = Math.round(idealQuantity * 10000) / 10000;
    else if (currentPrice < 1) idealQuantity = Math.round(idealQuantity);
    else idealQuantity = Math.round(idealQuantity * 100) / 100;
  }

  if (totalCost > availableLiquidity || totalCost < 25 || idealQuantity <= 0) {
    return {
      quantity: 0,
      totalCost: 0,
      riskAmount: 0,
      isValid: false,
      reason: 'Saldo likuiditas kas bot tidak mencukupi untuk membuka posisi.',
    };
  }

  return {
    quantity: idealQuantity,
    totalCost,
    riskAmount: Math.round(idealQuantity * riskDistance * 100) / 100,
    isValid: true,
  };
}
