import { describe, it, expect } from 'vitest';
import {
  validateInitialGeometry,
  validateActiveTrailingStop,
  isStopTriggered,
  computeOrderSizing,
  evaluateRiskEngine,
  isSymbolInCooldown,
  canTransition,
  makeSetupId,
  type OpenRiskPosition,
} from './riskEngine';

// ============================================================
// Test matrix sesuai brief §6 (subset deterministik T01–T12, T09)
// ============================================================

describe('P0.2 — geometri stop/target (T01–T05)', () => {
  // T01: TAO long entry 234.30, SL 460, TP 650 → REJECT
  it('T01: LONG dengan initialStop di atas entry ditolak (kasus TAO)', () => {
    const r = validateInitialGeometry({
      side: 'LONG',
      entry: 234.30,
      initialStop: 460,
      targets: [650],
    });
    expect(r.valid).toBe(false);
    expect(r.reasonCode).toBe('REJECTED_INVALID_STOP_SIDE');
    expect(r.detail).toContain('460');
  });

  // T02: long 100/95/115 → approve, R:R tepat 3.0
  it('T02: LONG valid 100/95/115 disetujui dengan R:R 3.0', () => {
    const r = validateInitialGeometry({ side: 'LONG', entry: 100, initialStop: 95, targets: [115] });
    expect(r.valid).toBe(true);
    const s = computeOrderSizing({
      side: 'LONG', entry: 100, initialStop: 95, target: 115,
      equity: 10000, riskFraction: 0.005, availableCash: 10000,
    });
    expect(s.valid).toBe(true);
    expect(s.rewardRiskRatio).toBe(3.0);
    // riskPerUnit = 5; budget 0.5% dari 10.000 = 50 → qty 10 → final risk 50
    expect(s.finalRiskUsd).toBe(50);
  });

  // T03: short 100/105/85 → approve, R:R 3.0
  it('T03: SHORT valid 100/105/85 disetujui dengan R:R 3.0', () => {
    const r = validateInitialGeometry({ side: 'SHORT', entry: 100, initialStop: 105, targets: [85] });
    expect(r.valid).toBe(true);
    const s = computeOrderSizing({
      side: 'SHORT', entry: 100, initialStop: 105, target: 85,
      equity: 10000, riskFraction: 0.005, availableCash: 10000,
    });
    expect(s.valid).toBe(true);
    expect(s.rewardRiskRatio).toBe(3.0);
  });

  // T04: trailing LONG 105, entry 100, mark 110 → valid (profit-protecting)
  it('T04: trailing LONG di atas entry tapi di bawah mark DITERIMA', () => {
    const r = validateActiveTrailingStop({
      side: 'LONG', entry: 100, initialStop: 95, targets: [115],
      markPrice: 110, activeStop: 105, previousActiveStop: 102,
    });
    expect(r.valid).toBe(true);
  });

  // T05: trailing LONG 112 > mark 110 → reject
  it('T05: trailing LONG di atas mark ditolak', () => {
    const r = validateActiveTrailingStop({
      side: 'LONG', entry: 100, initialStop: 95, targets: [115],
      markPrice: 110, activeStop: 112,
    });
    expect(r.valid).toBe(false);
    expect(r.reasonCode).toBe('REJECTED_INVALID_STOP_SIDE');
  });

  it('T04b: trailing LONG tidak boleh bergerak turun', () => {
    const r = validateActiveTrailingStop({
      side: 'LONG', entry: 100, initialStop: 95, targets: [115],
      markPrice: 110, activeStop: 103, previousActiveStop: 105,
    });
    expect(r.valid).toBe(false);
  });

  it('trigger logic: LONG terpicu saat mark <= stop; SHORT saat mark >= stop', () => {
    expect(isStopTriggered('LONG', 94.99, 95)).toBe(true);
    expect(isStopTriggered('LONG', 95.01, 95)).toBe(false);
    expect(isStopTriggered('SHORT', 105.01, 105)).toBe(true);
    expect(isStopTriggered('SHORT', 104.99, 105)).toBe(false);
  });

  it('SHORT dengan target di atas entry ditolak', () => {
    const r = validateInitialGeometry({ side: 'SHORT', entry: 100, initialStop: 105, targets: [115] });
    expect(r.valid).toBe(false);
    expect(r.reasonCode).toBe('REJECTED_INVALID_TARGET_SIDE');
  });
});

describe('P0.3 — sizing dari harga eksekusi aktual (T09)', () => {
  // T09: pembulatan mengubah risk & R:R → hitung ulang & enforce
  it('T09: risk final dihitung ulang dari qty terbulatkan dan tetap <= budget', () => {
    const s = computeOrderSizing({
      side: 'LONG', entry: 77777.77, initialStop: 75000, target: 83000,
      equity: 10000, riskFraction: 0.005, availableCash: 10000,
    });
    expect(s.valid).toBe(true);
    // riskPerUnit = 2777.77; budget 50 → qty = 0.018 → dibulatkan 4 desimal
    expect(s.quantity).toBeGreaterThan(0);
    expect(s.finalRiskUsd).toBeLessThanOrEqual(50 * 1.001);
    expect(s.finalRiskPct).toBeLessThanOrEqual(0.51);
  });

  it('budget terlalu kecil → qty 0 setelah pembulatan → REJECTED_BAD_PRECISION', () => {
    const s = computeOrderSizing({
      side: 'LONG', entry: 100, initialStop: 1, target: 200,
      equity: 10, riskFraction: 0.005, availableCash: 5, minNotional: 10,
    });
    // plannedRisk 0.05 / riskPerUnit 99 → qty 0.0005 → floor 2 desimal = 0
    expect(s.valid).toBe(false);
    expect(s.reasonCode).toBe('REJECTED_BAD_PRECISION');
  });

  it('notional di-cap ke kas tersedia lalu risk dihitung ulang (cap by buying power)', () => {
    const s = computeOrderSizing({
      side: 'LONG', entry: 100, initialStop: 95, target: 115,
      equity: 10000, riskFraction: 0.005, availableCash: 20,
    });
    // tanpa cap: qty 10 (notional 1000) > kas 20 → di-cap ke qty 0.2 → notional 20
    expect(s.valid).toBe(true);
    expect(s.notional).toBe(20);
    expect(s.finalRiskUsd).toBe(1);
    expect(s.finalRiskUsd).toBeLessThanOrEqual(s.plannedRiskUsd);
  });

  it('kas nol → REJECTED_INSUFFICIENT_CASH', () => {
    const s = computeOrderSizing({
      side: 'LONG', entry: 100, initialStop: 95, target: 115,
      equity: 10000, riskFraction: 0.005, availableCash: 0,
    });
    expect(s.valid).toBe(false);
    expect(s.reasonCode).toBe('REJECTED_INSUFFICIENT_CASH');
  });

  it('estimasi fee dihitung dari notional entry + exit', () => {
    const s = computeOrderSizing({
      side: 'LONG', entry: 100, initialStop: 95, target: 115,
      equity: 10000, riskFraction: 0.005, availableCash: 10000, feeRatePerSide: 0.001,
    });
    expect(s.valid).toBe(true);
    // qty 10 → notional 1000 + exit 1150 → fee = 2.15
    expect(s.estimatedFees).toBeCloseTo(2.15, 2);
  });
});

describe('P0.6 — circuit breakers (T10, T12, T16)', () => {
  const baseConfig = {
    perTradeRiskPct: 0.5,
    maxPortfolioHeatPct: 4,
    dailyLossGuardrailPct: 2,
    maxConsecutiveStopped: 3,
    maxQuoteAgeMs: 30000,
  };

  const pos = (riskUsd: number, notional: number): OpenRiskPosition => ({
    symbol: 'BTC', side: 'LONG', initialRiskUsd: riskUsd, notional,
  });

  // T10: heat cap
  it('T10: heat agregat >= 4% memblokir entry baru', () => {
    // equity 10.000 → 4% = 400; 8 posisi × 50 risk = 400 → heat 4%
    const positions: OpenRiskPosition[] = Array.from({ length: 8 }, () => pos(50, 1000));
    const st = evaluateRiskEngine({
      equity: 10000, openPositions: positions, dailyRealizedPnl: 0,
      consecutiveStoppedTrades: 0, cooldowns: {}, now: Date.now(),
      lastQuoteAgeMs: 1000, mode: 'PAPER', killSwitch: 'NONE', config: baseConfig,
    });
    expect(st.portfolioHeatPct).toBe(4);
    expect(st.health).toBe('HALTED');
    expect(st.canEnter).toBe(false);
    expect(st.reasons.join(' ')).toContain('heat');
  });

  // T12: quote stale
  it('T12: quote basi > threshold memblokir entry (fail-closed)', () => {
    const st = evaluateRiskEngine({
      equity: 10000, openPositions: [], dailyRealizedPnl: 0,
      consecutiveStoppedTrades: 0, cooldowns: {}, now: Date.now(),
      lastQuoteAgeMs: 45000, mode: 'PAPER', killSwitch: 'NONE', config: baseConfig,
    });
    expect(st.canEnter).toBe(false);
    expect(st.health).toBe('HALTED');
    expect(st.reasons.join(' ')).toContain('basi');
  });

  // T16: kill switch PAUSE_ENTRIES
  it('T16: PAUSE_ENTRIES memblokir entry; alasan jelas', () => {
    const st = evaluateRiskEngine({
      equity: 10000, openPositions: [], dailyRealizedPnl: 0,
      consecutiveStoppedTrades: 0, cooldowns: {}, now: Date.now(),
      lastQuoteAgeMs: 1000, mode: 'PAPER', killSwitch: 'PAUSE_ENTRIES', config: baseConfig,
    });
    expect(st.canEnter).toBe(false);
    expect(st.health).toBe('DEGRADED');
    expect(st.reasons[0]).toContain('PAUSED');
  });

  it('daily loss guardrail 2% menghentikan entry', () => {
    const st = evaluateRiskEngine({
      equity: 10000, openPositions: [], dailyRealizedPnl: -250,
      consecutiveStoppedTrades: 0, cooldowns: {}, now: Date.now(),
      lastQuoteAgeMs: 1000, mode: 'PAPER', killSwitch: 'NONE', config: baseConfig,
    });
    expect(st.dailyLossPct).toBe(2.5);
    expect(st.canEnter).toBe(false);
    expect(st.health).toBe('HALTED');
  });

  it('3 stop-loss beruntun menjeda strategi', () => {
    const st = evaluateRiskEngine({
      equity: 10000, openPositions: [], dailyRealizedPnl: 0,
      consecutiveStoppedTrades: 3, cooldowns: {}, now: Date.now(),
      lastQuoteAgeMs: 1000, mode: 'PAPER', killSwitch: 'NONE', config: baseConfig,
    });
    expect(st.canEnter).toBe(false);
    expect(st.reasons.join(' ')).toContain('beruntun');
  });

  it('kondisi sehat → HEALTHY dan boleh entry', () => {
    const st = evaluateRiskEngine({
      equity: 10000, openPositions: [pos(30, 800)], dailyRealizedPnl: 12,
      consecutiveStoppedTrades: 1, cooldowns: {}, now: Date.now(),
      lastQuoteAgeMs: 2000, mode: 'PAPER', killSwitch: 'NONE', config: baseConfig,
    });
    expect(st.health).toBe('HEALTHY');
    expect(st.canEnter).toBe(true);
  });
});

describe('P0.4 — cooldown & lifecycle (T06)', () => {
  // T06: setelah SL, setup sama tidak boleh re-entry selama cooldown
  it('T06: simbol dalam cooldown diblokir sampai cooldown berakhir', () => {
    const now = 1_700_000_000_000;
    const cooldowns = { TAO: now + 30 * 60 * 1000 };
    expect(isSymbolInCooldown('TAO', cooldowns, now)).toBe(true);
    expect(isSymbolInCooldown('TAO', cooldowns, now + 31 * 60 * 1000)).toBe(false);
    expect(isSymbolInCooldown('BTC', cooldowns, now)).toBe(false);
  });

  it('transisi lifecycle hanya lewat jalur valid', () => {
    expect(canTransition('CLOSED', 'COOLDOWN')).toBe(true);
    expect(canTransition('COOLDOWN', 'ELIGIBLE')).toBe(true);
    expect(canTransition('OPEN', 'COOLDOWN')).toBe(false);
    expect(canTransition('REJECTED', 'ARMED')).toBe(false);
    expect(canTransition('DISCOVERED', 'QUALIFIED')).toBe(true);
  });

  it('setupId stabil-format dan unik', () => {
    const a = makeSetupId('TAO', 'PURE_AI_V1', 1_700_000_000_000);
    const b = makeSetupId('TAO', 'PURE_AI_V1', 1_700_000_000_000);
    expect(a).toContain('TAO');
    expect(a).not.toBe(b);
    expect(a.startsWith('setup-TAO-PURE_AI_V1-')).toBe(true);
  });
});
