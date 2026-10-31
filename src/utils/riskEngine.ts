// ============================================================
// DETERMINISTIC RISK ENGINE — HALFY AI (P0.1–P0.3, P0.6)
// Framework-free & deterministic: AI tidak pernah menghitung
// harga/sizing/R:R eksekusi. Semua keputusan validasi di sini.
// Dipakai bersama oleh client (paper engine) dan siap dipindah
// ke server tanpa rewrite.
// ============================================================

export type Side = 'LONG' | 'SHORT';
export type RiskHealth = 'HEALTHY' | 'DEGRADED' | 'HALTED';
export type KillSwitchMode = 'NONE' | 'PAUSE_ENTRIES';

export type RejectionCode =
  | 'REJECTED_INVALID_STOP_SIDE'
  | 'REJECTED_INVALID_TARGET_SIDE'
  | 'REJECTED_ZERO_OR_NEGATIVE_RISK'
  | 'REJECTED_BAD_PRECISION'
  | 'REJECTED_STALE_MARK'
  | 'REJECTED_UNSUPPORTED_SYMBOL'
  | 'REJECTED_MIN_NOTIONAL'
  | 'REJECTED_INSUFFICIENT_CASH'
  | 'REJECTED_RISK_BUDGET_EXCEEDED'
  | 'REJECTED_PORTFOLIO_HEAT'
  | 'REJECTED_DAILY_LOSS_LIMIT'
  | 'REJECTED_CONSECUTIVE_LOSSES'
  | 'REJECTED_COOLDOWN'
  | 'REJECTED_PAUSED'
  | 'REJECTED_HALTED';

export interface GeometryInput {
  side: Side;
  entry: number;
  initialStop: number;
  targets: number[];
  /** Harga eksekusi terkini — wajib untuk validasi trailing stop */
  markPrice?: number;
  /** Trailing stop aktif (bukan initial stop) */
  activeStop?: number;
  /** Trailing stop sebelumnya — trailing tidak boleh bergerak mundur */
  previousActiveStop?: number;
  tickSize?: number;
  stepSize?: number;
  minNotional?: number;
}

export interface GeometryResult {
  valid: boolean;
  reasonCode?: RejectionCode;
  detail?: string;
}

const isFinitePositive = (v: number) => Number.isFinite(v) && v > 0;

function alignToTick(price: number, tickSize?: number): number {
  if (!tickSize || tickSize <= 0) return price;
  return Math.round(price / tickSize) * tickSize;
}

/**
 * P0.2 — Validasi geometri initial stop/target.
 *   LONG : initialStop < entry < setiap target
 *   SHORT: setiap target < entry < initialStop
 * TIDAK mengoreksi stop invalid secara otomatis — hanya REJECTED_* dengan alasan.
 */
export function validateInitialGeometry(input: GeometryInput): GeometryResult {
  const { side, entry, initialStop, targets } = input;
  if (!isFinitePositive(entry)) {
    return { valid: false, reasonCode: 'REJECTED_BAD_PRECISION', detail: `entry tidak valid: ${entry}` };
  }
  if (!Number.isFinite(initialStop) || initialStop <= 0) {
    return { valid: false, reasonCode: 'REJECTED_INVALID_STOP_SIDE', detail: `initialStop tidak valid: ${initialStop}` };
  }
  if (side === 'LONG' && !(initialStop < entry)) {
    return {
      valid: false,
      reasonCode: 'REJECTED_INVALID_STOP_SIDE',
      detail: `LONG: initialStop ${initialStop} harus < entry ${entry}`,
    };
  }
  if (side === 'SHORT' && !(initialStop > entry)) {
    return {
      valid: false,
      reasonCode: 'REJECTED_INVALID_STOP_SIDE',
      detail: `SHORT: initialStop ${initialStop} harus > entry ${entry}`,
    };
  }
  if (!targets || targets.length === 0 || targets.some((t) => !Number.isFinite(t) || t <= 0)) {
    return { valid: false, reasonCode: 'REJECTED_INVALID_TARGET_SIDE', detail: 'target tidak valid' };
  }
  for (const t of targets) {
    if (side === 'LONG' && !(t > entry)) {
      return {
        valid: false,
        reasonCode: 'REJECTED_INVALID_TARGET_SIDE',
        detail: `LONG: target ${t} harus > entry ${entry}`,
      };
    }
    if (side === 'SHORT' && !(t < entry)) {
      return {
        valid: false,
        reasonCode: 'REJECTED_INVALID_TARGET_SIDE',
        detail: `SHORT: target ${t} harus < entry ${entry}`,
      };
    }
  }
  return { valid: true };
}

/**
 * P0.2 nuance — Validasi trailing stop AKTIF.
 *   LONG : activeStop < markPrice (boleh DI ATAS averageEntry setelah pergerakan menguntungkan),
 *          dan tidak boleh bergerak turun vs previousActiveStop.
 *   SHORT: activeStop > markPrice, tidak boleh bergerak naik vs previousActiveStop.
 */
export function validateActiveTrailingStop(input: GeometryInput): GeometryResult {
  const { side, markPrice, activeStop, previousActiveStop } = input;
  if (activeStop == null) return { valid: true };
  if (!Number.isFinite(markPrice!) || markPrice! <= 0) {
    return { valid: false, reasonCode: 'REJECTED_STALE_MARK', detail: 'markPrice tidak tersedia untuk validasi trailing' };
  }
  if (side === 'LONG' && !(activeStop < markPrice!)) {
    return {
      valid: false,
      reasonCode: 'REJECTED_INVALID_STOP_SIDE',
      detail: `LONG trailing: activeStop ${activeStop} harus < mark ${markPrice}`,
    };
  }
  if (side === 'SHORT' && !(activeStop > markPrice!)) {
    return {
      valid: false,
      reasonCode: 'REJECTED_INVALID_STOP_SIDE',
      detail: `SHORT trailing: activeStop ${activeStop} harus > mark ${markPrice}`,
    };
  }
  if (previousActiveStop != null) {
    if (side === 'LONG' && activeStop < previousActiveStop) {
      return { valid: false, reasonCode: 'REJECTED_INVALID_STOP_SIDE', detail: `LONG trailing tidak boleh turun: ${activeStop} < ${previousActiveStop}` };
    }
    if (side === 'SHORT' && activeStop > previousActiveStop) {
      return { valid: false, reasonCode: 'REJECTED_INVALID_STOP_SIDE', detail: `SHORT trailing tidak boleh naik: ${activeStop} > ${previousActiveStop}` };
    }
  }
  return { valid: true };
}

/**
 * Trigger logic protective stop (bukan aturan exchange-native):
 *   LONG  : executableStopReference <= activeStop
 *   SHORT : executableStopReference >= activeStop
 */
export function isStopTriggered(side: Side, executableStopReference: number, activeStop: number): boolean {
  return side === 'LONG'
    ? executableStopReference <= activeStop
    : executableStopReference >= activeStop;
}

// ------------------------------------------------------------
// P0.3 — Sizing & R:R dari harga eksekusi aktual
// ------------------------------------------------------------

export interface SizingInput {
  side: Side;
  entry: number;
  initialStop: number;
  target: number;
  equity: number;
  /** Fraksi ekuitas yang direncanakan berisiko per trade (0.005 = 0.5%) */
  riskFraction: number;
  availableCash: number;
  feeRatePerSide?: number; // default 0.001 (0.1% taker per sisi)
  tickSize?: number;
  stepSize?: number;
  minNotional?: number;
  maxNotional?: number;
}

export interface SizingResult {
  valid: boolean;
  reasonCode?: RejectionCode;
  detail?: string;
  /** Kuantitas final setelah pembulatan step/precision */
  quantity: number;
  notional: number;
  riskPerUnit: number;
  /** Risiko dolar FINAL dari kuantitas terbulatkan — bukan angka rencana */
  finalRiskUsd: number;
  finalRiskPct: number;
  /** R:R final dihitung ulang dari harga & qty terbulatkan (pra-fee) */
  rewardRiskRatio: number;
  estimatedFees: number;
  /** R rencana vs R final dipisah agar tidak tertukar */
  plannedRiskUsd: number;
}

export function computeOrderSizing(input: SizingInput): SizingResult {
  const { side, entry, initialStop, target, equity, riskFraction, availableCash } = input;
  const feeRate = input.feeRatePerSide ?? 0.001;
  const minNotional = input.minNotional ?? 10;

  // Geometry wajib valid sebelum sizing
  const geo = validateInitialGeometry({ side, entry, initialStop, targets: [target] });
  if (!geo.valid) {
    return { valid: false, reasonCode: geo.reasonCode, detail: geo.detail, quantity: 0, notional: 0, riskPerUnit: 0, finalRiskUsd: 0, finalRiskPct: 0, rewardRiskRatio: 0, estimatedFees: 0, plannedRiskUsd: 0 };
  }

  const riskPerUnit = Math.abs(entry - initialStop);
  if (!(riskPerUnit > 0)) {
    return { valid: false, reasonCode: 'REJECTED_ZERO_OR_NEGATIVE_RISK', detail: 'riskPerUnit <= 0', quantity: 0, notional: 0, riskPerUnit: 0, finalRiskUsd: 0, finalRiskPct: 0, rewardRiskRatio: 0, estimatedFees: 0, plannedRiskUsd: 0 };
  }
  const rewardPerUnit = Math.abs(target - entry);
  const plannedRiskUsd = equity * riskFraction;

  let quantity = plannedRiskUsd / riskPerUnit;

  // Pembulatan step/precision — lalu risk & R:R DIHITUNG ULANG dari qty final
  const step = input.stepSize;
  if (step && step > 0) {
    quantity = Math.floor(quantity / step) * step;
  } else if (entry >= 1000) {
    quantity = Math.floor(quantity * 10000) / 10000;
  } else if (entry < 1) {
    quantity = Math.floor(quantity);
  } else {
    quantity = Math.floor(quantity * 100) / 100;
  }

  let notional = quantity * entry;
  // Cap notional oleh kas tersedia & maxNotional
  const cap = Math.min(availableCash, input.maxNotional ?? availableCash);
  if (notional > cap && cap > 0) {
    quantity = cap / entry;
    if (step && step > 0) quantity = Math.floor(quantity / step) * step;
    else if (entry >= 1000) quantity = Math.floor(quantity * 10000) / 10000;
    else if (entry < 1) quantity = Math.floor(quantity);
    else quantity = Math.floor(quantity * 100) / 100;
    notional = quantity * entry;
  }

  const finalRiskUsd = Math.round(quantity * riskPerUnit * 100) / 100;
  const finalRiskPct = equity > 0 ? Math.round((finalRiskUsd / equity) * 10000) / 100 : 0;
  const finalRewardPerUnit = Math.abs(target - entry);
  const rewardRiskRatio = Math.round((finalRewardPerUnit / riskPerUnit) * 100) / 100;
  const estimatedFees = Math.round(((notional + quantity * target) * feeRate) * 100) / 100;

  if (quantity <= 0) {
    return { valid: false, reasonCode: 'REJECTED_BAD_PRECISION', detail: 'kuantitas 0 setelah pembulatan filter exchange', quantity: 0, notional: 0, riskPerUnit, finalRiskUsd: 0, finalRiskPct: 0, rewardRiskRatio, estimatedFees: 0, plannedRiskUsd };
  }
  if (notional < minNotional) {
    return { valid: false, reasonCode: 'REJECTED_MIN_NOTIONAL', detail: `notional ${notional.toFixed(2)} < minNotional ${minNotional}`, quantity, notional, riskPerUnit, finalRiskUsd, finalRiskPct, rewardRiskRatio, estimatedFees, plannedRiskUsd };
  }
  if (notional > availableCash) {
    return { valid: false, reasonCode: 'REJECTED_INSUFFICIENT_CASH', detail: `notional ${notional.toFixed(2)} > kas ${availableCash.toFixed(2)}`, quantity, notional, riskPerUnit, finalRiskUsd, finalRiskPct, rewardRiskRatio, estimatedFees, plannedRiskUsd };
  }
  // Risiko final (post-rounding) tidak boleh melebihi budget rencana secara material
  if (finalRiskUsd > plannedRiskUsd * 1.001) {
    return { valid: false, reasonCode: 'REJECTED_RISK_BUDGET_EXCEEDED', detail: `risiko final ${finalRiskUsd} > budget ${plannedRiskUsd.toFixed(2)} setelah pembulatan`, quantity, notional, riskPerUnit, finalRiskUsd, finalRiskPct, rewardRiskRatio, estimatedFees, plannedRiskUsd };
  }

  return {
    valid: true,
    quantity,
    notional: Math.round(notional * 100) / 100,
    riskPerUnit: Math.round(riskPerUnit * 100) / 100,
    finalRiskUsd,
    finalRiskPct,
    rewardRiskRatio,
    estimatedFees,
    plannedRiskUsd: Math.round(plannedRiskUsd * 100) / 100,
  };
}

// ------------------------------------------------------------
// P0.6 — Circuit breakers & kill switch
// ------------------------------------------------------------

export interface OpenRiskPosition {
  symbol: string;
  side: Side;
  /** Risiko awal posisi = qty * |entry - initialStop| */
  initialRiskUsd: number;
  notional: number;
}

export interface RiskEngineInput {
  equity: number;
  openPositions: OpenRiskPosition[];
  /** Realized PnL hari ini (semua buku scope), USD */
  dailyRealizedPnl: number;
  consecutiveStoppedTrades: number;
  /** symbol → cooldown until (epoch ms) */
  cooldowns: Record<string, number>;
  now: number;
  /** Usia quote referensi terakhir (ms) */
  lastQuoteAgeMs: number | null;
  mode: 'PAPER' | 'LIVE';
  killSwitch: KillSwitchMode;
  config: {
    perTradeRiskPct: number;      // default PAPER 0.5
    maxPortfolioHeatPct: number;  // default PAPER 4
    dailyLossGuardrailPct: number;// default PAPER 2
    maxConsecutiveStopped: number;// default 3
    maxQuoteAgeMs: number;        // default 30000
  };
}

export interface RiskEngineState {
  health: RiskHealth;
  canEnter: boolean;
  reasons: string[];
  portfolioHeatPct: number;
  exposurePct: number;
  dailyLossPct: number;
}

export function evaluateRiskEngine(input: RiskEngineInput): RiskEngineState {
  const { equity, openPositions, dailyRealizedPnl, consecutiveStoppedTrades, cooldowns, now, lastQuoteAgeMs, mode, killSwitch, config } = input;
  const reasons: string[] = [];

  const totalInitialRisk = openPositions.reduce((acc, p) => acc + Math.max(0, p.initialRiskUsd), 0);
  const totalNotional = openPositions.reduce((acc, p) => acc + Math.max(0, p.notional), 0);
  const portfolioHeatPct = equity > 0 ? Math.round((totalInitialRisk / equity) * 10000) / 100 : 0;
  const exposurePct = equity > 0 ? Math.round((totalNotional / equity) * 10000) / 100 : 0;
  const dailyLossPct = equity > 0 ? Math.round((Math.min(0, dailyRealizedPnl) / equity) * -10000) / 100 : 0;

  let canEnter = true;

  if (killSwitch === 'PAUSE_ENTRIES') {
    canEnter = false;
    reasons.push('PAUSED: entry baru dinonaktifkan oleh kill switch (manajemen posisi tetap berjalan)');
  }
  if (dailyRealizedPnl < 0 && dailyLossPct >= config.dailyLossGuardrailPct) {
    canEnter = false;
    reasons.push(`HALTED: guardrail kerugian harian tercapai (${dailyLossPct}% >= ${config.dailyLossGuardrailPct}% ekuitas)`);
  }
  if (portfolioHeatPct >= config.maxPortfolioHeatPct) {
    canEnter = false;
    reasons.push(`HALTED: portfolio heat ${portfolioHeatPct}% >= ${config.maxPortfolioHeatPct}% (risiko stop-loss agregat)`);
  }
  if (consecutiveStoppedTrades >= config.maxConsecutiveStopped) {
    canEnter = false;
    reasons.push(`PAUSED: ${consecutiveStoppedTrades} trade stop-loss beruntun (>= ${config.maxConsecutiveStopped}) — strategi dijeda untuk ditinjau`);
  }
  if (lastQuoteAgeMs != null && lastQuoteAgeMs > config.maxQuoteAgeMs) {
    canEnter = false;
    reasons.push(`HALTED: quote market basi (usia ${(lastQuoteAgeMs / 1000).toFixed(0)}s > ${config.maxQuoteAgeMs / 1000}s) — entry baru ditolak (fail-closed)`);
  }

  const health: RiskHealth =
    reasons.some((r) => r.startsWith('HALTED')) ? 'HALTED'
    : reasons.length > 0 ? 'DEGRADED'
    : 'HEALTHY';

  void mode; // mode hanya untuk pelabelan; tidak ada jalur live di engine ini
  void cooldowns;
  void now;

  return { health, canEnter, reasons, portfolioHeatPct, exposurePct, dailyLossPct };
}

/** Cek cooldown per simbol (P0.4 gate #3) */
export function isSymbolInCooldown(symbol: string, cooldowns: Record<string, number>, now: number): boolean {
  const until = cooldowns[symbol];
  return typeof until === 'number' && until > now;
}

// ------------------------------------------------------------
// P0.4 — Setup lifecycle state machine
// ------------------------------------------------------------

export type SetupLifecycle =
  | 'DISCOVERED' | 'QUALIFIED' | 'ARMED' | 'ORDER_PENDING' | 'OPEN'
  | 'EXIT_PENDING' | 'CLOSED' | 'COOLDOWN' | 'ELIGIBLE'
  | 'REJECTED' | 'EXPIRED' | 'CANCELLED' | 'ERROR';

export const ALLOWED_TRANSITIONS: Record<SetupLifecycle, SetupLifecycle[]> = {
  DISCOVERED: ['QUALIFIED', 'REJECTED', 'EXPIRED'],
  QUALIFIED: ['ARMED', 'REJECTED', 'EXPIRED'],
  ARMED: ['ORDER_PENDING', 'REJECTED', 'EXPIRED', 'CANCELLED'],
  ORDER_PENDING: ['OPEN', 'CANCELLED', 'ERROR', 'REJECTED'],
  OPEN: ['EXIT_PENDING', 'CLOSED', 'ERROR'],
  EXIT_PENDING: ['CLOSED', 'ERROR'],
  CLOSED: ['COOLDOWN'],
  COOLDOWN: ['ELIGIBLE'],
  ELIGIBLE: ['DISCOVERED', 'QUALIFIED'],
  REJECTED: [],
  EXPIRED: [],
  CANCELLED: [],
  ERROR: [],
};

export function canTransition(from: SetupLifecycle, to: SetupLifecycle): boolean {
  return (ALLOWED_TRANSITIONS[from] || []).includes(to);
}

/** setupId immutable & stabil per setup baru (P0.1) */
export function makeSetupId(symbol: string, strategyId: string, now: number): string {
  const rand = Math.random().toString(36).substring(2, 8);
  return `setup-${symbol}-${strategyId}-${now}-${rand}`;
}
