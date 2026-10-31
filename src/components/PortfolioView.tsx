import React, { useState, useEffect, useRef } from 'react';
import { PortfolioPosition, ClosedTradePosition, Stock, BotConfig, BotExecutionLog, MarketRegime } from '../types/stock';
import { Language, translations } from '../utils/translations';
import {
  INITIAL_BOT_CONFIG,
  INITIAL_HYBRID_CONFIG,
  INITIAL_BOT_POSITIONS,
  INITIAL_BOT_CLOSED_TRADES,
  INITIAL_BOT_LOGS,
  calculateBotPositionSize
} from '../utils/botEngine';
import {
  evaluateRiskEngine,
  validateInitialGeometry,
  isStopTriggered,
  isSymbolInCooldown,
  computeOrderSizing,
  makeSetupId,
} from '../utils/riskEngine';
import { TradingRobotMascot, RobotTradeEvent } from './TradingRobotMascot';

// ---- Arsip Sesi: snapshot lengkap tiap buku sebelum reset ----
interface SessionBookSnapshot {
  liquidity: number;
  openPositions: number;
  closedTrades: ClosedTradePosition[];
  realizedPnL: number;
  openPnL: number;
  finalEquity: number;
  winrate: number;
  wins: number;
}

interface RecordedSession {
  id: string;
  endedAt: string;
  scope: string;
  manual: SessionBookSnapshot;
  bot: SessionBookSnapshot;
  hybrid: SessionBookSnapshot;
}
import { 
  Briefcase, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  ShieldCheck, 
  Zap, 
  Activity, 
  LogOut, 
  History, 
  CheckCircle2, 
  Sparkles, 
  DollarSign, 
  ArrowUpRight,
  AlertCircle,
  Percent,
  SlidersHorizontal,
  Wallet,
  Coins,
  Scale,
  Bot,
  Swords,
  Play,
  Pause,
  RefreshCw,
  Trophy,
  CheckCircle,
  Clock,
  ArrowRight,
  RotateCcw,
  Sliders,
  Settings,
  Flame,
  Check,
  Info,
  X
} from 'lucide-react';
import { executeGeminiBotScan, GeminiBotScanTrade } from '../services/api';

interface PortfolioViewProps {
  portfolio: PortfolioPosition[];
  closedTrades?: ClosedTradePosition[];
  stocks: Stock[];
  liquidityBalance?: number;
  onUpdateLiquidity?: (newBalance: number) => void;
  onAddPosition: (position: Omit<PortfolioPosition, 'id'>) => void;
  onClosePosition: (id: string, closeReason: 'TAKE_PROFIT' | 'STOP_LOSS' | 'MANUAL_EXIT', exitPrice?: number) => void;
  onRemovePosition: (id: string) => void;
  onSelectStock: (symbol: string) => void;
  pendingAddStock?: Stock | null;
  openAddModalSignal?: number;
  onClearPendingAddStock?: () => void;
  onResetSimulation?: (initialBalance?: number) => void;
  binanceLastSync?: number | null;
  marketRegime?: MarketRegime | null;
  lang?: Language;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  portfolio,
  closedTrades = [],
  stocks,
  liquidityBalance = 26652.50,
  onUpdateLiquidity,
  onAddPosition,
  onClosePosition,
  onRemovePosition,
  onSelectStock,
  pendingAddStock,
  openAddModalSignal,
  onClearPendingAddStock,
  onResetSimulation,
  binanceLastSync = null,
  marketRegime = null,
  lang = 'ID',
}) => {
  const isEn = lang === 'EN';
  const t = translations[lang] || translations.ID;

  // Main view mode: 'manual' | 'bot' | 'settings' | 'battle'
  const [portfolioMode, setPortfolioMode] = useState<'manual' | 'bot' | 'hybrid' | 'settings' | 'battle'>('manual');
  const [activeSubTab, setActiveSubTab] = useState<'open' | 'closed'>('open');
  const [botSubTab, setBotSubTab] = useState<'open' | 'closed' | 'hybrid'>('open');
  // Panel Settings & Strategi inline di dalam mode Bot (bukan mode terpisah)
  const [showBotSettingsPanel, setShowBotSettingsPanel] = useState(false);

  // Simulation Reset State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetScope, setResetScope] = useState<'all' | 'manual' | 'bot' | 'hybrid'>('all');
  const [resetCashInput, setResetCashInput] = useState<number>(25000);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Manual Add Position Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [symbolInput, setSymbolInput] = useState('');
  const [quantityInput, setQuantityInput] = useState<number>(1);
  const [buyPriceInput, setBuyPriceInput] = useState<number>(0);
  const [targetPriceInput, setTargetPriceInput] = useState<number>(0);
  const [stopLossInput, setStopLossInput] = useState<number>(0);
  const [activeImportedSignal, setActiveImportedSignal] = useState<Stock['aiSignal'] | null>(null);

  // Margin % from Liquidity state
  const [marginPercentInput, setMarginPercentInput] = useState<number>(15);
  const [modalAllocAmount, setModalAllocAmount] = useState<number>(0);

  // Close Trade Confirmation Modal state
  const [positionToClose, setPositionToClose] = useState<PortfolioPosition | null>(null);
  const [isClosingBotPosition, setIsClosingBotPosition] = useState(false);
  const [closeReason, setCloseReason] = useState<'TAKE_PROFIT' | 'STOP_LOSS' | 'MANUAL_EXIT'>('TAKE_PROFIT');
  const [customExitPrice, setCustomExitPrice] = useState<number>(0);

  // Liquidity Management Modal state (Deposit / Rebalance)
  const [showLiquidityModal, setShowLiquidityModal] = useState(false);
  const [customLiquidityInput, setCustomLiquidityInput] = useState<number>(liquidityBalance);

  // ==========================================
  // AI AUTOTRADE BOT STATE & LOCALSTORAGE
  // ==========================================
  const [botConfig, setBotConfig] = useState<BotConfig>(() => {
    try {
      const saved = localStorage.getItem('halfy_bot_config_crypto_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...INITIAL_BOT_CONFIG, ...parsed };
      }
    } catch {
      // fallback
    }
    return INITIAL_BOT_CONFIG;
  });

  const [botPositions, setBotPositions] = useState<PortfolioPosition[]>(() => {
    try {
      const saved = localStorage.getItem('halfy_bot_positions_crypto_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_BOT_POSITIONS;
  });

  const [botClosedTrades, setBotClosedTrades] = useState<ClosedTradePosition[]>(() => {
    try {
      const saved = localStorage.getItem('halfy_bot_closed_crypto_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_BOT_CLOSED_TRADES;
  });

  const [botLogs, setBotLogs] = useState<BotExecutionLog[]>(() => {
    try {
      const saved = localStorage.getItem('halfy_bot_logs_crypto_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const seen = new Set<string>();
          return parsed.filter((l) => {
            if (!l || !l.id || seen.has(l.id)) return false;
            seen.add(l.id);
            return true;
          });
        }
      }
    } catch {
      // fallback
    }
    return INITIAL_BOT_LOGS;
  });

  const [isBotScanning, setIsBotScanning] = useState(false);
  const [botScanResultMsg, setBotScanResultMsg] = useState('');
  // Autopilot 24/7 — waktu scan otomatis terakhir (untuk indikator di header bot)
  const [lastBotScanAt, setLastBotScanAt] = useState<Date | null>(null);
  const botScanRunningRef = useRef(false);

  // Robot Mascot Animation States (Pure AI Hijau & Hybrid Ungu)
  const [lastBotTradeEvent, setLastBotTradeEvent] = useState<RobotTradeEvent | null>(null);
  const [isBotTradingActive, setIsBotTradingActive] = useState(false);
  const botTradingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerBotTradingAnimation = (event: RobotTradeEvent) => {
    setLastBotTradeEvent(event);
    setIsBotTradingActive(true);
    if (botTradingTimerRef.current) clearTimeout(botTradingTimerRef.current);
    botTradingTimerRef.current = setTimeout(() => {
      setIsBotTradingActive(false);
    }, 4500);
  };

  // ==========================================
  // HYBRID BOOK — buku portofolio ketiga yang berdiri sendiri
  // (kas, posisi, riwayat & konfigurasi sendiri; engine sama dengan Pure AI,
  // tapi archetype HYBRID + risk multiplier kalibrasi user). Mulai dari nol, tanpa seed fiktif.
  // ==========================================
  const [hybridConfig, setHybridConfig] = useState<BotConfig>(() => {
    try {
      const saved = localStorage.getItem('halfy_hybrid_config_crypto_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...INITIAL_HYBRID_CONFIG, ...parsed };
      }
    } catch {
      // fallback
    }
    return INITIAL_HYBRID_CONFIG;
  });
  const [hybridPositions, setHybridPositions] = useState<PortfolioPosition[]>(() => {
    try {
      const saved = localStorage.getItem('halfy_hybrid_positions_crypto_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [];
  });
  const [hybridClosedTrades, setHybridClosedTrades] = useState<ClosedTradePosition[]>(() => {
    try {
      const saved = localStorage.getItem('halfy_hybrid_closed_crypto_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [];
  });
  const [hybridLogs, setHybridLogs] = useState<BotExecutionLog[]>(() => {
    try {
      const saved = localStorage.getItem('halfy_hybrid_logs_crypto_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // fallback
    }
    return [];
  });
  const [lastHybridScanAt, setLastHybridScanAt] = useState<Date | null>(null);
  // Arsip sesi — snapshot tiap reset untuk analisis historis
  const [showSessionArchive, setShowSessionArchive] = useState(false);
  const [sessionArchive, setSessionArchive] = useState<RecordedSession[]>(() => {
    try {
      const saved = localStorage.getItem('halfy_session_archive_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [];
  });
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  // ==========================================
  // P0.4/P0.6 — RISK STATE per buku: cooldown SL per simbol + stop beruntun.
  // Persisten agar restart/refresh tidak mereset proteksi.
  // ==========================================
  const [botRiskState, setBotRiskState] = useState<{ cooldowns: Record<string, number>; consecutiveStopped: number }>(() => {
    try {
      const saved = localStorage.getItem('halfy_bot_riskstate_crypto_v1');
      if (saved) return { cooldowns: {}, consecutiveStopped: 0, ...JSON.parse(saved) };
    } catch {
      // fallback
    }
    return { cooldowns: {}, consecutiveStopped: 0 };
  });
  const [hybridRiskState, setHybridRiskState] = useState<{ cooldowns: Record<string, number>; consecutiveStopped: number }>(() => {
    try {
      const saved = localStorage.getItem('halfy_hybrid_riskstate_crypto_v1');
      if (saved) return { cooldowns: {}, consecutiveStopped: 0, ...JSON.parse(saved) };
    } catch {
      // fallback
    }
    return { cooldowns: {}, consecutiveStopped: 0 };
  });
  useEffect(() => {
    try { const __next = JSON.stringify(botRiskState); if (localStorage.getItem('halfy_bot_riskstate_crypto_v1') !== __next) localStorage.setItem('halfy_bot_riskstate_crypto_v1', __next); } catch { /* ignore */ }
  }, [botRiskState]);
  useEffect(() => {
    try { const __next = JSON.stringify(hybridRiskState); if (localStorage.getItem('halfy_hybrid_riskstate_crypto_v1') !== __next) localStorage.setItem('halfy_hybrid_riskstate_crypto_v1', __next); } catch { /* ignore */ }
  }, [hybridRiskState]);

  // Persistensi buku hybrid
  useEffect(() => {
    try { do { const __next = JSON.stringify(hybridConfig); if (localStorage.getItem('halfy_hybrid_config_crypto_v1') !== __next) localStorage.setItem('halfy_hybrid_config_crypto_v1', __next); } while (0); } catch { /* ignore */ }
  }, [hybridConfig]);
  useEffect(() => {
    try { do { const __next = JSON.stringify(hybridPositions); if (localStorage.getItem('halfy_hybrid_positions_crypto_v1') !== __next) localStorage.setItem('halfy_hybrid_positions_crypto_v1', __next); } while (0); } catch { /* ignore */ }
  }, [hybridPositions]);
  useEffect(() => {
    try { do { const __next = JSON.stringify(hybridClosedTrades); if (localStorage.getItem('halfy_hybrid_closed_crypto_v1') !== __next) localStorage.setItem('halfy_hybrid_closed_crypto_v1', __next); } while (0); } catch { /* ignore */ }
  }, [hybridClosedTrades]);
  useEffect(() => {
    try { do { const __next = JSON.stringify(hybridLogs); if (localStorage.getItem('halfy_hybrid_logs_crypto_v1') !== __next) localStorage.setItem('halfy_hybrid_logs_crypto_v1', __next); } while (0); } catch { /* ignore */ }
  }, [hybridLogs]);

  // Sinkronisasi lintas-tab untuk buku bot & hybrid: adopsi perubahan dari tab lain
  // alih-alih saling menimpa dengan state basi.
  useEffect(() => {
    const bookKeys = new Set([
      'halfy_bot_config_crypto_v1', 'halfy_bot_positions_crypto_v1', 'halfy_bot_closed_crypto_v1', 'halfy_bot_logs_crypto_v1',
      'halfy_hybrid_config_crypto_v1', 'halfy_hybrid_positions_crypto_v1', 'halfy_hybrid_closed_crypto_v1', 'halfy_hybrid_logs_crypto_v1',
    ]);
    const onStorage = (e: StorageEvent) => {
      if (!e.key || !bookKeys.has(e.key) || e.newValue == null) return;
      try {
        const next = JSON.parse(e.newValue);
        if (e.key === 'halfy_bot_config_crypto_v1') setBotConfig((prev) => (JSON.stringify(prev) === e.newValue ? prev : { ...INITIAL_BOT_CONFIG, ...next }));
        else if (e.key === 'halfy_bot_positions_crypto_v1') setBotPositions((prev) => (JSON.stringify(prev) === e.newValue ? prev : next));
        else if (e.key === 'halfy_bot_closed_crypto_v1') setBotClosedTrades((prev) => (JSON.stringify(prev) === e.newValue ? prev : next));
        else if (e.key === 'halfy_bot_logs_crypto_v1') setBotLogs((prev) => (JSON.stringify(prev) === e.newValue ? prev : next));
        else if (e.key === 'halfy_hybrid_config_crypto_v1') setHybridConfig((prev) => (JSON.stringify(prev) === e.newValue ? prev : { ...INITIAL_HYBRID_CONFIG, ...next }));
        else if (e.key === 'halfy_hybrid_positions_crypto_v1') setHybridPositions((prev) => (JSON.stringify(prev) === e.newValue ? prev : next));
        else if (e.key === 'halfy_hybrid_closed_crypto_v1') setHybridClosedTrades((prev) => (JSON.stringify(prev) === e.newValue ? prev : next));
        else if (e.key === 'halfy_hybrid_logs_crypto_v1') setHybridLogs((prev) => (JSON.stringify(prev) === e.newValue ? prev : next));
      } catch {
        // ignore malformed
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Bot Scan & Trade Execution Audit Report Modal state
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [scanAuditReport, setScanAuditReport] = useState<{
    timestamp: string;
    totalUniverseScanned: number;
    activeSlotsOccupied: number;
    maxSlots: number;
    availableSlots: number;
    botCashAvailable: number;
    topCandidates: {
      symbol: string;
      name: string;
      price: number;
      action: string;
      confidence: number;
      riskReward: number;
      status: 'EXECUTED' | 'DISCIPLINE_HOLD' | 'DISQUALIFIED';
      disqualificationReason?: string;
      sizing?: {
        units: number;
        allocatedUsdt: number;
        riskAmount: number;
        marginPercent: number;
        tp: number;
        sl: number;
      };
      thesis: string;
    }[];
    overallDecisionSummary: string;
  } | null>(null);

  // Persist Bot State
  useEffect(() => {
    try {
      do { const __next = JSON.stringify(botConfig); if (localStorage.getItem('halfy_bot_config_crypto_v1') !== __next) localStorage.setItem('halfy_bot_config_crypto_v1', __next); } while (0);
      do { const __next = JSON.stringify(botPositions); if (localStorage.getItem('halfy_bot_positions_crypto_v1') !== __next) localStorage.setItem('halfy_bot_positions_crypto_v1', __next); } while (0);
      do { const __next = JSON.stringify(botClosedTrades); if (localStorage.getItem('halfy_bot_closed_crypto_v1') !== __next) localStorage.setItem('halfy_bot_closed_crypto_v1', __next); } while (0);
      do { const __next = JSON.stringify(botLogs); if (localStorage.getItem('halfy_bot_logs_crypto_v1') !== __next) localStorage.setItem('halfy_bot_logs_crypto_v1', __next); } while (0);
    } catch {
      // ignore
    }
  }, [botConfig, botPositions, botClosedTrades, botLogs]);

  const handleExecuteReset = () => {
    const startingCash = Math.max(0, resetCashInput);

    // 1. ARSIPKAN sesi yang berjalan SEBELUM dihapus — untuk analisis historis.
    //    Semua buku disnapshot lengkap dengan riwayat trade tertutupnya.
    try {
      const prevArchive: RecordedSession[] = JSON.parse(localStorage.getItem('halfy_session_archive_v1') || '[]');
      const entry: RecordedSession = {
        id: `session-${Date.now()}`,
        endedAt: new Date().toISOString(),
        scope: resetScope,
        manual: {
          liquidity: liquidityBalance,
          openPositions: portfolio.length,
          closedTrades: closedTrades,
          realizedPnL: manualTotalRealizedPnL,
          openPnL: manualOpenPnL,
          finalEquity: manualTotalEquity,
          winrate: manualWinRate,
          wins: manualWinningTrades,
        },
        bot: {
          liquidity: botConfig.liquidityBalance,
          openPositions: botPositions.length,
          closedTrades: botClosedTrades,
          realizedPnL: botTotalRealizedPnL,
          openPnL: botOpenPnL,
          finalEquity: botTotalEquity,
          winrate: botWinRate,
          wins: botWinningTrades,
        },
        hybrid: {
          liquidity: hybridConfig.liquidityBalance,
          openPositions: hybridPositions.length,
          closedTrades: hybridClosedTrades,
          realizedPnL: hybridRealizedPnL,
          openPnL: hybridOpenPnL,
          finalEquity: hybridTotalEquity,
          winrate: hybridWinRate,
          wins: hybridWinningTrades,
        },
      };
      const archived = [entry, ...prevArchive].slice(0, 30);
      localStorage.setItem('halfy_session_archive_v1', JSON.stringify(archived));
      setSessionArchive(archived);
    } catch (err) {
      console.error('Gagal mengarsipkan sesi', err);
    }

    // 2. Hapus sesi aktif sesuai cakupan
    if (resetScope === 'manual' || resetScope === 'all') {
      if (onResetSimulation) {
        onResetSimulation(startingCash);
      }
    }

    if (resetScope === 'bot' || resetScope === 'all') {
      setBotPositions([]);
      setBotClosedTrades([]);
      setBotLogs([]);
      setBotConfig((prev) => ({
        ...prev,
        liquidityBalance: startingCash,
      }));
      try {
        localStorage.removeItem('halfy_bot_positions_crypto_v1');
        localStorage.removeItem('halfy_bot_closed_crypto_v1');
        localStorage.removeItem('halfy_bot_logs_crypto_v1');
        const updatedCfg = { ...botConfig, liquidityBalance: startingCash };
        localStorage.setItem('halfy_bot_config_crypto_v1', JSON.stringify(updatedCfg));
      } catch (err) {
        console.error('Failed to clear bot storage', err);
      }
    }

    if (resetScope === 'hybrid' || resetScope === 'all') {
      setHybridPositions([]);
      setHybridClosedTrades([]);
      setHybridLogs([]);
      setHybridConfig((prev) => ({
        ...prev,
        liquidityBalance: startingCash,
      }));
      try {
        localStorage.removeItem('halfy_hybrid_positions_crypto_v1');
        localStorage.removeItem('halfy_hybrid_closed_crypto_v1');
        localStorage.removeItem('halfy_hybrid_logs_crypto_v1');
        localStorage.setItem('halfy_hybrid_config_crypto_v1', JSON.stringify({ ...hybridConfig, liquidityBalance: startingCash }));
      } catch (err) {
        console.error('Failed to clear hybrid storage', err);
      }
    }

    setShowResetModal(false);
    setToastMessage(t.resetSuccessToast || (isEn ? 'Session archived & simulation reset to starting capital!' : 'Sesi diarsipkan & simulasi direset ke modal awal!'));
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSaveBotSettings = (newConfig: BotConfig) => {
    if (isHybridMode) {
      setHybridConfig(newConfig);
      try {
        localStorage.setItem('halfy_hybrid_config_crypto_v1', JSON.stringify(newConfig));
      } catch (err) {
        console.error('Failed to save hybrid settings', err);
      }
      setToastMessage(isEn ? 'Hybrid AI Bot configuration successfully saved!' : 'Konfigurasi Bot Hybrid AI berhasil disimpan!');
    } else {
      setBotConfig(newConfig);
      try {
        localStorage.setItem('halfy_bot_config_crypto_v1', JSON.stringify(newConfig));
      } catch (err) {
        console.error('Failed to save bot settings', err);
      }
      setToastMessage(t.settingsSavedToast || (isEn ? 'Pure AI Bot configuration successfully saved!' : 'Konfigurasi Pure AI Bot berhasil disimpan!'));
    }
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleRestoreDefaultSettings = () => {
    if (isHybridMode) {
      setHybridConfig((prev) => ({
        ...INITIAL_HYBRID_CONFIG,
        liquidityBalance: prev.liquidityBalance,
      }));
      try {
        localStorage.setItem(
          'halfy_hybrid_config_crypto_v1',
          JSON.stringify({ ...INITIAL_HYBRID_CONFIG, liquidityBalance: hybridConfig.liquidityBalance })
        );
      } catch (err) {
        console.error('Failed to save hybrid defaults', err);
      }
      setToastMessage(isEn ? 'Hybrid settings restored to defaults!' : 'Pengaturan Hybrid dikembalikan ke standar!');
    } else {
      setBotConfig((prev) => ({
        ...INITIAL_BOT_CONFIG,
        liquidityBalance: prev.liquidityBalance,
      }));
      try {
        localStorage.setItem(
          'halfy_bot_config_crypto_v1',
          JSON.stringify({ ...INITIAL_BOT_CONFIG, liquidityBalance: botConfig.liquidityBalance })
        );
      } catch (err) {
        console.error('Failed to save bot defaults', err);
      }
      setToastMessage(isEn ? 'Pure AI Bot settings restored to quantitative defaults!' : 'Pengaturan bot dikembalikan ke konfigurasi standar!');
    }
    setTimeout(() => setToastMessage(null), 3500);
  };

  const formatPrice = (val: number) => {
    if (val < 0.0001) return `$${val.toFixed(8)}`;
    if (val < 1) return `$${val.toFixed(4)}`;
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // P0.7 — log timestamp: tampilkan waktu eksak (dari ISO) + usia relatif sekunder.
  // Log lama dengan string relatif statis ("Baru saja") tetap ditampilkan apa adanya.
  const formatLogTimestamp = (ts: string, en: boolean): string => {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts; // seed lama berbasis teks relatif
    const exact = d.toLocaleTimeString(en ? 'en-US' : 'id-ID') + ' ' + (en ? 'UTC+' + (-d.getTimezoneOffset() / 60) : 'WIB');
    const ageMin = Math.floor((Date.now() - d.getTime()) / 60000);
    const rel = ageMin < 1 ? (en ? 'just now' : 'baru saja')
      : ageMin < 60 ? (en ? `${ageMin}m ago` : `${ageMin} mnt lalu`)
      : `${Math.floor(ageMin / 60)}${en ? 'h ago' : ' jam lalu'}`;
    return `${exact} · ${rel} · ${ts}`;
  };

  // Synchronize Margin % -> Allocation Amount -> Coin Quantity
  const applyMarginPercent = (percent: number, price: number) => {
    const clampedPct = Math.min(100, Math.max(0.5, percent));
    setMarginPercentInput(clampedPct);
    const allocatedCash = Math.round(((liquidityBalance * clampedPct) / 100) * 100) / 100;
    setModalAllocAmount(allocatedCash);

    if (price > 0) {
      let qty = allocatedCash / price;
      if (price > 1000) {
        qty = Math.round(qty * 10000) / 10000;
      } else if (price < 1) {
        qty = Math.round(qty);
      } else {
        qty = Math.round(qty * 100) / 100;
      }
      setQuantityInput(Math.max(0.00000001, qty));
    }
  };

  const handleQuantityChange = (qty: number, price: number) => {
    setQuantityInput(qty);
    const cost = Math.round(qty * price * 100) / 100;
    setModalAllocAmount(cost);
    const pct = liquidityBalance > 0 ? (cost / liquidityBalance) * 100 : 0;
    setMarginPercentInput(Math.round(pct * 10) / 10);
  };

  // Auto-populate & trigger Add Position Modal when user clicks "+ Catat di Portfolio"
  useEffect(() => {
    if (openAddModalSignal && openAddModalSignal > 0 && pendingAddStock) {
      setPortfolioMode('manual');
      setSymbolInput(pendingAddStock.symbol);
      setBuyPriceInput(pendingAddStock.currentPrice);
      setTargetPriceInput(pendingAddStock.aiSignal.targetPrice1);
      setStopLossInput(pendingAddStock.aiSignal.stopLoss);
      setActiveImportedSignal(pendingAddStock.aiSignal);

      const defaultMargin = 15;
      applyMarginPercent(defaultMargin, pendingAddStock.currentPrice);

      setShowAddModal(true);
      setActiveSubTab('open');

      if (onClearPendingAddStock) {
        onClearPendingAddStock();
      }
    }
  }, [openAddModalSignal, pendingAddStock]);

  const handleSelectCandidate = (sym: string) => {
    setSymbolInput(sym);
    const matched = stocks.find((s) => s.symbol === sym);
    if (matched) {
      setBuyPriceInput(matched.currentPrice);
      setTargetPriceInput(matched.aiSignal.targetPrice1);
      setStopLossInput(matched.aiSignal.stopLoss);
      setActiveImportedSignal(matched.aiSignal);
      applyMarginPercent(marginPercentInput || 15, matched.currentPrice);
    } else {
      setActiveImportedSignal(null);
    }
  };

  const handleOpenManualAdd = () => {
    const firstStock = stocks[0];
    if (firstStock) {
      handleSelectCandidate(firstStock.symbol);
    }
    setShowAddModal(true);
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbolInput || quantityInput <= 0 || buyPriceInput <= 0) return;

    const matched = stocks.find((s) => s.symbol === symbolInput);
    const name = matched ? matched.name : symbolInput;
    const currentPrice = matched ? matched.currentPrice : buyPriceInput;

    const sharesTotal = quantityInput;
    const totalCost = Math.round(sharesTotal * buyPriceInput * 100) / 100;
    const currentValue = Math.round(sharesTotal * currentPrice * 100) / 100;
    const unrealizedPnL = Math.round((currentValue - totalCost) * 100) / 100;
    const unrealizedPnLPercent = totalCost > 0 ? (unrealizedPnL / totalCost) * 100 : 0;

    onAddPosition({
      symbol: symbolInput.toUpperCase(),
      name,
      market: 'CRYPTO',
      quantity: quantityInput,
      sharesTotal,
      averageBuyPrice: buyPriceInput,
      currentPrice,
      totalCost,
      currentValue,
      unrealizedPnL,
      unrealizedPnLPercent,
      targetPrice: targetPriceInput || undefined,
      stopLoss: stopLossInput || undefined,
      dateAdded: new Date().toISOString().split('T')[0],
    });

    setShowAddModal(false);
    setSymbolInput('');
    setActiveImportedSignal(null);
  };

  // Close Trade modal handlers
  const handleInitiateCloseTrade = (pos: PortfolioPosition) => {
    setIsClosingBotPosition(false);
    setPositionToClose(pos);
    setCustomExitPrice(pos.currentPrice);
    if (pos.targetPrice && pos.currentPrice >= pos.targetPrice) {
      setCloseReason('TAKE_PROFIT');
    } else if (pos.stopLoss && pos.currentPrice <= pos.stopLoss) {
      setCloseReason('STOP_LOSS');
    } else {
      setCloseReason('MANUAL_EXIT');
    }
  };

  const handleInitiateBotCloseTrade = (pos: PortfolioPosition) => {
    setIsClosingBotPosition(true);
    setPositionToClose(pos);
    setCustomExitPrice(pos.currentPrice);
    if (pos.targetPrice && pos.currentPrice >= pos.targetPrice) {
      setCloseReason('TAKE_PROFIT');
    } else if (pos.stopLoss && pos.currentPrice <= pos.stopLoss) {
      setCloseReason('STOP_LOSS');
    } else {
      setCloseReason('MANUAL_EXIT');
    }
  };

  const handleConfirmCloseTrade = () => {
    if (!positionToClose) return;
    const exitPrice = customExitPrice || positionToClose.currentPrice;

    if (isClosingBotPosition) {
      // P0.4 — tutup manual book-aware: mode Bot = buku Pure AI, mode Hybrid = buku Hybrid
      const setBookPositions = isHybridMode ? setHybridPositions : setBotPositions;
      const setBookConfig = isHybridMode ? setHybridConfig : setBotConfig;
      const setBookClosedTrades = isHybridMode ? setHybridClosedTrades : setBotClosedTrades;
      const setBookLogs = isHybridMode ? setHybridLogs : setBotLogs;
      const setRiskState = isHybridMode ? setHybridRiskState : setBotRiskState;
      const bookCfg = isHybridMode ? hybridConfig : botConfig;
      const closeNowMs = Date.now();

      const closeVal = Math.round(positionToClose.sharesTotal * exitPrice * 100) / 100;
      const pnl = Math.round((closeVal - positionToClose.totalCost) * 100) / 100;
      const pnlPct = positionToClose.totalCost > 0 ? Math.round((pnl / positionToClose.totalCost) * 10000) / 100 : 0;

      setBookPositions((prev) => prev.filter((p) => p.id !== positionToClose.id));
      setBookConfig((prev) => ({
        ...prev,
        liquidityBalance: Math.round((prev.liquidityBalance + closeVal) * 100) / 100,
      }));

      const newClosedTrade: ClosedTradePosition = {
        id: `${isHybridMode ? 'hyb' : 'bot'}-closed-${Date.now()}-${positionToClose.symbol}`,
        symbol: positionToClose.symbol,
        name: positionToClose.name,
        market: positionToClose.market,
        quantity: positionToClose.quantity,
        averageBuyPrice: positionToClose.averageBuyPrice,
        closePrice: exitPrice,
        totalCost: positionToClose.totalCost,
        closeValue: closeVal,
        realizedPnL: pnl,
        realizedPnLPercent: pnlPct,
        dateAdded: positionToClose.dateAdded,
        dateClosed: new Date().toISOString(),
        closeReason,
        notes: isEn
          ? `Manual exit on bot position at $${exitPrice} (${pnlPct >= 0 ? '+' : ''}${pnlPct}%)`
          : `Market exit manual pada posisi bot di $${exitPrice} (${pnlPct >= 0 ? '+' : ''}${pnlPct}%)`,
        executedBy: isHybridMode ? 'HYBRID' : 'AI_BOT',
      };

      setBookClosedTrades((prev) => [newClosedTrade, ...prev]);

      // P0.6 — SL manual ikut memicu cooldown & hitungan stop beruntun; TP me-reset
      if (closeReason === 'STOP_LOSS') {
        setRiskState((prev) => ({
          cooldowns: { ...prev.cooldowns, [positionToClose.symbol]: closeNowMs + 30 * 60 * 1000 },
          consecutiveStopped: prev.consecutiveStopped + 1,
        }));
      } else if (closeReason === 'TAKE_PROFIT') {
        setRiskState((prev) => ({ ...prev, consecutiveStopped: 0 }));
      }

      // Trigger robot mascot trade execution animation
      triggerBotTradingAnimation({
        symbol: positionToClose.symbol,
        action: closeReason === 'TAKE_PROFIT' ? 'TP' : closeReason === 'STOP_LOSS' ? 'SL' : 'CLOSE',
        price: exitPrice,
        timestamp: closeNowMs,
      });

      setBookLogs((prev) => [
        {
          id: `log-${closeNowMs}-${Math.random().toString(36).substring(2, 8)}-${positionToClose.symbol}`,
          timestamp: new Date(closeNowMs).toISOString(),
          action: closeReason === 'TAKE_PROFIT' ? 'TAKE_PROFIT' : closeReason === 'STOP_LOSS' ? 'STOP_LOSS' : 'BUY_ENTRY',
          symbol: positionToClose.symbol,
          price: exitPrice,
          pnl,
          details: isEn
            ? `[MANUAL ${bookCfg.archetype === 'HYBRID' ? 'HYBRID' : 'BOT'} EXIT] User closed ${positionToClose.symbol} @ $${exitPrice}. Realized P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toLocaleString()} (${pnlPct >= 0 ? '+' : ''}${pnlPct}%). Returned to ${isHybridMode ? 'hybrid' : 'bot'} cash: +$${closeVal.toLocaleString()} USDT.${closeReason === 'STOP_LOSS' ? ' Cooldown 30m active.' : ''}`
            : `[MANUAL ${bookCfg.archetype === 'HYBRID' ? 'HYBRID' : 'BOT'} EXIT] Pengguna menutup ${positionToClose.symbol} @ $${exitPrice}. Realisasi P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toLocaleString()} (${pnlPct >= 0 ? '+' : ''}${pnlPct}%). Dikembalikan ke kas ${isHybridMode ? 'hybrid' : 'bot'}: +$${closeVal.toLocaleString()} USDT.${closeReason === 'STOP_LOSS' ? ' Cooldown 30m aktif.' : ''}`,
        },
        ...prev,
      ]);

      setPositionToClose(null);
      setIsClosingBotPosition(false);
      return;
    }

    onClosePosition(positionToClose.id, closeReason, exitPrice);
    setPositionToClose(null);
  };

  // ==========================================
  // BOT AUTO-TRADE SCANNER & MONEY MANAGEMENT
  // ==========================================
  // ==========================================
  // BOT AUTO-TRADE SCANNER & MONEY MANAGEMENT
  // Engine yang sama untuk dua buku terpisah: Pure AI (botConfig) & Hybrid (hybridConfig).
  // Masing-masing punya kas, posisi, riwayat, dan konfigurasi sendiri.
  // ==========================================
  type ScanBook = 'bot' | 'hybrid';
  const runBotScan = async (book: ScanBook = 'bot', auto = false, isTestScan = false) => {
    const isHybridBook = book === 'hybrid';
    const cfg = isHybridBook ? hybridConfig : botConfig;
    const positions = isHybridBook ? hybridPositions : botPositions;
    const setConfig = isHybridBook ? setHybridConfig : setBotConfig;
    const setPositions = isHybridBook ? setHybridPositions : setBotPositions;
    const setClosed = isHybridBook ? setHybridClosedTrades : setBotClosedTrades;
    const setLogs = isHybridBook ? setHybridLogs : setBotLogs;
    const bookLabel = isHybridBook ? (isEn ? 'Hybrid Bot' : 'Bot Hybrid') : (isEn ? 'Pure AI Bot' : 'Bot Pure AI');
    const idPrefix = isHybridBook ? 'hyb' : 'bot';
    const cashLabel = isHybridBook ? (isEn ? 'hybrid cash' : 'kas hybrid') : (isEn ? 'bot cash' : 'kas bot');
    const buyTag = isHybridBook ? 'HYBRID-BUY' : 'AUTO-BUY';

    // P0.6 — risk state & batas keras PAPER (configurable; lihat riskEngine.ts)
    const riskState = isHybridBook ? hybridRiskState : botRiskState;
    const setRiskState = isHybridBook ? setHybridRiskState : setBotRiskState;
    const bookClosedList = isHybridBook ? hybridClosedTrades : botClosedTrades;
    const RISK_CONFIG = {
      perTradeRiskPct: 0.5,        // default PAPER brief: 0.5% ekuitas per trade (hard cap)
      maxPortfolioHeatPct: 4,      // heat stop-loss agregat maksimum
      dailyLossGuardrailPct: 2,    // guardrail kerugian harian
      maxConsecutiveStopped: 3,    // jeda strategi setelah 3 SL beruntun
      maxQuoteAgeMs: 30000,        // quote lebih tua dari ini → fail-closed
    };
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    // Usia quote: dari lastSync server (fallback null → cek stale dilewati tapi dilaporkan)
    const quoteAgeMs = binanceLastSync != null ? Math.max(0, nowMs - binanceLastSync) : null;
    // P1.2 — regime sebagai ELIGIBILITY GATE: TREND_DOWN & HIGH_VOLATILITY memblokir LONG baru
    const regimeBlocksLong = marketRegime != null
      && (marketRegime.state === 'TREND_DOWN' || marketRegime.state === 'HIGH_VOLATILITY');

    if (botScanRunningRef.current) return; // cegah scan tumpang tindih (manual vs autopilot, bot vs hybrid)
    if (!cfg.isActive && !isTestScan) {
      setBotScanResultMsg(
        isEn
          ? `${bookLabel} is PAUSED. Please activate it first or click "Test Scan with Current Settings".`
          : `${bookLabel} sedang dijeda (PAUSED). Aktifkan terlebih dahulu atau klik "Uji Scan dengan Pengaturan Ini".`
      );
      return;
    }

    botScanRunningRef.current = true;
    setIsBotScanning(true);
    if (!auto) setBotScanResultMsg('');

    await new Promise((resolve) => setTimeout(resolve, 300));

    let currentLiquidity = cfg.liquidityBalance;
    const currentPositions = [...positions];
    const newLogs: BotExecutionLog[] = [];
    let openedCount = 0;

    // 1. Monitor existing positions for Take Profit / Stop Loss with live Binance prices
    const quarantinedSymbols = new Set<string>();
    const updatedPositions: PortfolioPosition[] = [];
    for (const pos of currentPositions) {
      const live = stocks.find((s) => s.symbol === pos.symbol);
      const livePrice = live ? live.currentPrice : pos.currentPrice;

      const invalidInitialStop = pos.stopLoss != null && pos.stopLoss >= pos.averageBuyPrice; // LONG
      const invalidTarget = pos.targetPrice != null && pos.targetPrice <= pos.averageBuyPrice; // LONG

      if (pos.targetPrice && !invalidTarget && livePrice >= pos.targetPrice) {
        // AUTO TAKE PROFIT TRIGGERED
        const closeVal = Math.round(pos.sharesTotal * livePrice * 100) / 100;
        const pnl = Math.round((closeVal - pos.totalCost) * 100) / 100;
        const pnlPct = Math.round((pnl / pos.totalCost) * 10000) / 100;

        currentLiquidity += closeVal;
        setClosed((prev) => [
          {
            id: `${idPrefix}-closed-${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${pos.symbol}`,
            symbol: pos.symbol,
            name: pos.name,
            market: pos.market,
            quantity: pos.quantity,
            averageBuyPrice: pos.averageBuyPrice,
            closePrice: livePrice,
            totalCost: pos.totalCost,
            closeValue: closeVal,
            realizedPnL: pnl,
            realizedPnLPercent: pnlPct,
            dateAdded: pos.dateAdded,
            dateClosed: new Date().toISOString(),
            closeReason: 'TAKE_PROFIT',
            notes: isEn ? `Auto TP1 triggered at $${livePrice} (+${pnlPct}%)` : `Auto TP1 terpicu di $${livePrice} (+${pnlPct}%)`,
            executedBy: isHybridBook ? 'HYBRID' : 'AI_BOT',
          },
          ...prev,
        ]);

        // TP meng-reset hitungan stop-loss beruntun
        setRiskState((prev) => ({ ...prev, consecutiveStopped: 0 }));
        triggerBotTradingAnimation({
          symbol: pos.symbol,
          action: 'TP',
          price: livePrice,
          timestamp: nowMs,
        });

        newLogs.push({
          id: `log-${nowMs}-${Math.random().toString(36).substring(2, 8)}-${pos.symbol}`,
          timestamp: nowIso,
          action: 'TAKE_PROFIT',
          symbol: pos.symbol,
          price: livePrice,
          pnl,
          details: isEn
            ? `[AUTO-TP] Target TP1 reached for ${pos.symbol} @ $${livePrice}. Realized P&L: +$${pnl.toLocaleString()} (+${pnlPct}%). Returned to ${cashLabel}: +$${closeVal.toLocaleString()} USDT.`
            : `[AUTO-TP] Target TP1 tercapai untuk ${pos.symbol} @ $${livePrice}. Realisasi P&L: +$${pnl.toLocaleString()} (+${pnlPct}%). Dikembalikan ke ${cashLabel}: +$${closeVal.toLocaleString()} USDT.`,
        });
      } else if (pos.stopLoss && !invalidInitialStop && isStopTriggered('LONG', livePrice, pos.stopLoss)) {
        // AUTO STOP LOSS TRIGGERED
        const closeVal = Math.round(pos.sharesTotal * livePrice * 100) / 100;
        const pnl = Math.round((closeVal - pos.totalCost) * 100) / 100;
        const pnlPct = Math.round((pnl / pos.totalCost) * 10000) / 100;

        currentLiquidity += closeVal;
        setClosed((prev) => [
          {
            id: `${idPrefix}-closed-${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${pos.symbol}`,
            symbol: pos.symbol,
            name: pos.name,
            market: pos.market,
            quantity: pos.quantity,
            averageBuyPrice: pos.averageBuyPrice,
            closePrice: livePrice,
            totalCost: pos.totalCost,
            closeValue: closeVal,
            realizedPnL: pnl,
            realizedPnLPercent: pnlPct,
            dateAdded: pos.dateAdded,
            dateClosed: new Date().toISOString(),
            closeReason: 'STOP_LOSS',
            notes: isEn ? `Stop loss discipline protection at $${livePrice} (${pnlPct}%)` : `Disiplin proteksi stop loss di $${livePrice} (${pnlPct}%)`,
            executedBy: isHybridBook ? 'HYBRID' : 'AI_BOT',
          },
          ...prev,
        ]);

        // SL memicu cooldown per simbol (30 menit) + hitung stop beruntun
        setRiskState((prev) => ({
          cooldowns: { ...prev.cooldowns, [pos.symbol]: nowMs + 30 * 60 * 1000 },
          consecutiveStopped: prev.consecutiveStopped + 1,
        }));
        triggerBotTradingAnimation({
          symbol: pos.symbol,
          action: 'SL',
          price: livePrice,
          timestamp: nowMs,
        });

        newLogs.push({
          id: `log-${nowMs}-${Math.random().toString(36).substring(2, 8)}-${pos.symbol}`,
          timestamp: nowIso,
          action: 'STOP_LOSS',
          symbol: pos.symbol,
          price: livePrice,
          pnl,
          details: isEn
            ? `[AUTO-SL] Stop Loss triggered for ${pos.symbol} @ $${livePrice}. Capital protection realized: $${pnl.toLocaleString()} (${pnlPct}%). Cooldown 30m active for this symbol.`
            : `[AUTO-SL] Stop Loss terpicu untuk ${pos.symbol} @ $${livePrice}. Proteksi modal terealisasi: $${pnl.toLocaleString()} (${pnlPct}%). Cooldown 30m aktif untuk simbol ini.`,
        });
      } else {
        // Keep active position updated with live Binance price
        const updatedVal = Math.round(pos.sharesTotal * livePrice * 100) / 100;
        const updatedPnl = Math.round((updatedVal - pos.totalCost) * 100) / 100;
        const updatedPct = pos.totalCost > 0 ? Math.round((updatedPnl / pos.totalCost) * 10000) / 100 : 0;
        updatedPositions.push({
          ...pos,
          currentPrice: livePrice,
          currentValue: updatedVal,
          unrealizedPnL: updatedPnl,
          unrealizedPnLPercent: updatedPct,
        });
        if (invalidInitialStop || invalidTarget) {
          quarantinedSymbols.add(pos.symbol);
        }
      }
    }

    // Alert karantina sekali per simbol per scan
    for (const sym of quarantinedSymbols) {
      newLogs.push({
        id: `log-${nowMs}-quarantine-${sym}`,
        timestamp: nowIso,
        action: 'SIGNAL_SKIPPED',
        symbol: sym,
        price: stocks.find((s) => s.symbol === sym)?.currentPrice ?? 0,
        details: isEn
          ? `[RISK] Position ${sym} QUARANTINED: corrupted stop/target geometry (initial stop >= entry for LONG). Auto stop-loss DISABLED pending review — close manually or fix the signal source.`
          : `[RISK] Posisi ${sym} DIKARANTINA: geometri stop/target rusak (initial stop >= entry untuk LONG). Auto stop-loss DINONAKTIFKAN menunggu tinjauan — tutup manual atau perbaiki sumber sinyal.`,
      });
    }

    // 2. Scan AI Signals for New Entries with Strict Strategy Gating & Kelly Sizing
    const botEquity = currentLiquidity + updatedPositions.reduce((sum, p) => sum + p.currentValue, 0);
    const availableSlots = Math.max(0, cfg.maxConcurrentPositions - updatedPositions.length);

    // Circuit breakers dievaluasi sebelum entry apa pun (fail-closed)
    const dailyRealizedPnl = bookClosedList
      .filter((c) => (c.dateClosed || '').slice(0, 10) === nowIso.slice(0, 10))
      .reduce((acc, c) => acc + c.realizedPnL, 0);
    const riskEval = evaluateRiskEngine({
      equity: botEquity,
      openPositions: updatedPositions.map((p) => ({
        symbol: p.symbol,
        side: 'LONG' as const,
        initialRiskUsd: p.stopLoss != null
          ? p.sharesTotal * Math.abs(p.averageBuyPrice - p.stopLoss)
          : p.totalCost * 0.02,
        notional: p.currentValue,
      })),
      dailyRealizedPnl,
      consecutiveStoppedTrades: riskState.consecutiveStopped,
      cooldowns: riskState.cooldowns,
      now: nowMs,
      lastQuoteAgeMs: quoteAgeMs,
      mode: 'PAPER',
      killSwitch: cfg.entriesPaused ? 'PAUSE_ENTRIES' : 'NONE',
      config: RISK_CONFIG,
    });

    const evaluatedReportCandidates: NonNullable<typeof scanAuditReport>['topCandidates'] = [];
    const sortedStocks = [...stocks].sort((a, b) => b.aiSignal.confidenceScore - a.aiSignal.confidenceScore);
    let slotsRemaining = availableSlots;

    const regimeNote = regimeBlocksLong
      ? ` [REGIME ${marketRegime!.state}: ${marketRegime!.reasons[0] || 'pasar tidak mendukung LONG baru'}]`
      : marketRegime ? ` [REGIME ${marketRegime.state}]` : '';

    let geminiEngineUsed: string = 'quantitative-math';
    let geminiMarketAnalysis: string | undefined;
    let geminiTrades: GeminiBotScanTrade[] = [];

    // REAL GEMINI AI MULTI-FACTOR ENGINE EXECUTION
    if (riskEval.canEnter && !regimeBlocksLong && slotsRemaining > 0) {
      try {
        const candidateSlice = sortedStocks.slice(0, 10).map((c) => ({
          symbol: c.symbol,
          name: c.name,
          currentPrice: c.currentPrice,
          changePercent: c.changePercent,
          volume: c.volume,
          sector: c.sector,
          rsi14: c.technicals?.rsi14,
          ma20: c.technicals?.ma20,
          support: c.technicals?.supportLevel,
          resistance: c.technicals?.resistanceLevel,
          fundingRate: c.bandarmology?.fundingRate,
          whaleStatus: c.bandarmology?.accumulationStatus,
          score: c.aiSignal.confidenceScore,
          targetPrice1: c.aiSignal.targetPrice1,
          stopLoss: c.aiSignal.stopLoss,
        }));

        const scanRes = await executeGeminiBotScan({
          mode: isHybridBook ? 'HYBRID' : 'PURE_AI',
          candidates: candidateSlice,
          config: {
            riskPerTradePercent: cfg.riskPerTradePercent,
            minRiskReward: cfg.minRiskReward,
            minAiConfidence: cfg.minAiConfidence,
            maxPositions: cfg.maxConcurrentPositions,
            liquidityBalance: currentLiquidity,
          },
          marketRegime: marketRegime?.state,
        });

        if (scanRes && scanRes.result && Array.isArray(scanRes.result.selectedTrades)) {
          geminiTrades = scanRes.result.selectedTrades;
          geminiEngineUsed = scanRes.engine;
          geminiMarketAnalysis = scanRes.result.marketAnalysis;
        }
      } catch (err) {
        console.warn('[GeminiBotScan] API fallback triggered:', err);
      }

      // 2A. Process Gemini-selected high-conviction trades first
      if (geminiTrades.length > 0) {
        for (const gTrade of geminiTrades) {
          if (slotsRemaining <= 0) break;
          const candidate = sortedStocks.find((s) => s.symbol === gTrade.symbol) || {
            symbol: gTrade.symbol,
            name: gTrade.symbol,
            currentPrice: gTrade.entryPrice,
            changePercent: 0,
            aiSignal: {
              action: gTrade.action,
              confidenceScore: gTrade.confidenceScore,
              riskRewardRatio: gTrade.riskRewardRatio,
              targetPrice1: gTrade.targetPrice,
              stopLoss: gTrade.stopLoss,
              thesis: gTrade.thesis,
            }
          };

          const isAlreadyActive = updatedPositions.some((p) => p.symbol === gTrade.symbol);
          if (isAlreadyActive) {
            evaluatedReportCandidates.push({
              symbol: gTrade.symbol,
              name: candidate.name,
              price: gTrade.entryPrice,
              action: gTrade.action,
              confidence: gTrade.confidenceScore,
              riskReward: gTrade.riskRewardRatio,
              status: 'DISCIPLINE_HOLD',
              disqualificationReason: isEn ? 'Already holding active position' : 'Posisi aktif sudah ada',
              thesis: gTrade.thesis,
            });
            continue;
          }

          if (isSymbolInCooldown(gTrade.symbol, riskState.cooldowns, nowMs)) {
            evaluatedReportCandidates.push({
              symbol: gTrade.symbol,
              name: candidate.name,
              price: gTrade.entryPrice,
              action: gTrade.action,
              confidence: gTrade.confidenceScore,
              riskReward: gTrade.riskRewardRatio,
              status: 'DISCIPLINE_HOLD',
              disqualificationReason: `REJECTED_COOLDOWN: Cooldown active until ${new Date(riskState.cooldowns[gTrade.symbol]).toLocaleTimeString()}`,
              thesis: gTrade.thesis,
            });
            continue;
          }

          const geo = validateInitialGeometry({
            side: 'LONG',
            entry: gTrade.entryPrice,
            initialStop: gTrade.stopLoss,
            targets: [gTrade.targetPrice],
          });

          if (!geo.valid) {
            evaluatedReportCandidates.push({
              symbol: gTrade.symbol,
              name: candidate.name,
              price: gTrade.entryPrice,
              action: gTrade.action,
              confidence: gTrade.confidenceScore,
              riskReward: gTrade.riskRewardRatio,
              status: 'DISQUALIFIED',
              disqualificationReason: `${geo.reasonCode}: ${geo.detail}`,
              thesis: gTrade.thesis,
            });
            continue;
          }

          const multiplier = isHybridBook ? (cfg.hybridRiskMultiplier || 1.0) : 1.0;
          const sizing = computeOrderSizing({
            side: 'LONG',
            entry: gTrade.entryPrice,
            initialStop: gTrade.stopLoss,
            target: gTrade.targetPrice,
            equity: botEquity,
            riskFraction: Math.min((cfg.riskPerTradePercent / 100) * multiplier, RISK_CONFIG.perTradeRiskPct / 100),
            availableCash: currentLiquidity,
            minNotional: 10,
            maxNotional: currentLiquidity,
          });

          if (sizing.valid && sizing.quantity > 0) {
            currentLiquidity -= sizing.notional;
            slotsRemaining--;
            openedCount++;

            const newPos: PortfolioPosition = {
              id: `${idPrefix}-pos-${Date.now()}-${gTrade.symbol}`,
              symbol: gTrade.symbol,
              name: candidate.name,
              market: 'CRYPTO',
              quantity: sizing.quantity,
              sharesTotal: sizing.quantity,
              averageBuyPrice: gTrade.entryPrice,
              currentPrice: gTrade.entryPrice,
              totalCost: sizing.notional,
              currentValue: sizing.notional,
              unrealizedPnL: 0,
              unrealizedPnLPercent: 0,
              targetPrice: gTrade.targetPrice,
              stopLoss: gTrade.stopLoss,
              dateAdded: new Date().toISOString().split('T')[0],
              executedArchetype: isHybridBook ? 'HYBRID' : 'AI_AUTONOMOUS',
              setupId: makeSetupId(gTrade.symbol, isHybridBook ? 'HYBRID' : (geminiEngineUsed === 'gemini-3.8-flash' ? 'GEMINI' : 'PURE_AI'), nowMs),
            };

            updatedPositions.push(newPos);

            evaluatedReportCandidates.push({
              symbol: gTrade.symbol,
              name: candidate.name,
              price: gTrade.entryPrice,
              action: gTrade.action,
              confidence: gTrade.confidenceScore,
              riskReward: gTrade.riskRewardRatio,
              status: 'EXECUTED',
              sizing: {
                units: sizing.quantity,
                allocatedUsdt: sizing.notional,
                riskAmount: sizing.finalRiskUsd,
                marginPercent: botEquity > 0 ? Math.round((sizing.notional / botEquity) * 1000) / 10 : 15,
                tp: gTrade.targetPrice,
                sl: gTrade.stopLoss,
              },
              thesis: gTrade.thesis,
            });

            const isGeminiAI = geminiEngineUsed.startsWith('gemini');
            const execTag = isGeminiAI
              ? (isHybridBook ? '⚡ Gemini Hybrid AI' : '⚡ Gemini AI')
              : buyTag;

            newLogs.push({
              id: `log-${nowMs}-${Math.random().toString(36).substring(2, 8)}-${gTrade.symbol}`,
              timestamp: nowIso,
              action: 'BUY_ENTRY',
              symbol: gTrade.symbol,
              price: gTrade.entryPrice,
              quantity: sizing.quantity,
              details: isEn
                ? `[${execTag}] ${sizing.quantity} ${gTrade.symbol} @ $${gTrade.entryPrice}. Notional: $${sizing.notional.toLocaleString()} USDT. Actual risk: $${sizing.finalRiskUsd} (${sizing.finalRiskPct}% equity, stop-distance). SL: $${gTrade.stopLoss} · TP: $${gTrade.targetPrice} (R:R 1:${sizing.rewardRiskRatio}). Thesis: ${gTrade.thesis}`
                : `[${execTag}] ${sizing.quantity} ${gTrade.symbol} @ $${gTrade.entryPrice}. Notional: $${sizing.notional.toLocaleString()} USDT. Risiko: $${sizing.finalRiskUsd} (${sizing.finalRiskPct}% ekuitas, jarak stop). SL: $${gTrade.stopLoss} · TP: $${gTrade.targetPrice} (R:R 1:${sizing.rewardRiskRatio}). Thesis: ${gTrade.thesis}`,
            });
          }
        }
      }
    }

    // 2B. If slots remain and no trade opened by Gemini, evaluate algorithmic candidates
    if (riskEval.canEnter && !regimeBlocksLong && slotsRemaining > 0 && openedCount === 0) {
      for (const candidate of sortedStocks) {
        if (slotsRemaining <= 0) break;
        const isAlreadyActive = updatedPositions.some((p) => p.symbol === candidate.symbol);
        const isLongSignal = candidate.aiSignal.action === 'Strong Long' || candidate.aiSignal.action === 'Long (Buy on Dip)';
        const meetsConfidence = candidate.aiSignal.confidenceScore >= cfg.minAiConfidence;
        const meetsRR = candidate.aiSignal.riskRewardRatio >= cfg.minRiskReward;

        // Strategy Matrix Focus Check
        let matchesStrategy = true;
        let strategyFailReason = '';
        if (cfg.strategyFocus === 'WHALE_INFLOW' || cfg.strategyFocus === 'WHALE_ACCUMULATION') {
          const thesisLower = candidate.aiSignal.thesis.toLowerCase();
          const hasWhale = thesisLower.includes('whale') || thesisLower.includes('akumulasi') || candidate.aiSignal.confidenceScore >= 80;
          if (!hasWhale) {
            matchesStrategy = false;
            strategyFailReason = isEn ? 'Does not meet Whale & Institutional Inflow filter' : 'Tidak memenuhi kriteria Akumulasi Whale Institusional';
          }
        } else if (cfg.strategyFocus === 'BREAKOUT_MOMENTUM') {
          const isBreakout = candidate.aiSignal.action === 'Strong Long' || candidate.changePercent > 0;
          if (!isBreakout) {
            matchesStrategy = false;
            strategyFailReason = isEn ? 'Does not meet Breakout Momentum filter' : 'Tidak memenuhi kriteria Breakout Momentum Resistance';
          }
        } else if (cfg.strategyFocus === 'OVERSOLD_BOUNCE' || cfg.strategyFocus === 'OVERSOLD_REBOUND') {
          const isOversold = candidate.aiSignal.action === 'Long (Buy on Dip)' || candidate.changePercent <= 0;
          if (!isOversold) {
            matchesStrategy = false;
            strategyFailReason = isEn ? 'Does not meet Oversold Reversal filter' : 'Tidak memenuhi kriteria Pantulan Oversold Dip';
          }
        }

        if (isAlreadyActive) {
          evaluatedReportCandidates.push({
            symbol: candidate.symbol,
            name: candidate.name,
            price: candidate.currentPrice,
            action: candidate.aiSignal.action,
            confidence: candidate.aiSignal.confidenceScore,
            riskReward: candidate.aiSignal.riskRewardRatio,
            status: 'DISCIPLINE_HOLD',
            disqualificationReason: isEn ? 'Already holding open position in bot portfolio' : 'Sudah memiliki posisi terbuka di portofolio bot',
            thesis: candidate.aiSignal.thesis,
          });
          continue;
        }

        if (!matchesStrategy) {
          evaluatedReportCandidates.push({
            symbol: candidate.symbol,
            name: candidate.name,
            price: candidate.currentPrice,
            action: candidate.aiSignal.action,
            confidence: candidate.aiSignal.confidenceScore,
            riskReward: candidate.aiSignal.riskRewardRatio,
            status: 'DISQUALIFIED',
            disqualificationReason: strategyFailReason,
            thesis: candidate.aiSignal.thesis,
          });
          continue;
        }

        const geo = validateInitialGeometry({
          side: 'LONG',
          entry: candidate.currentPrice,
          initialStop: candidate.aiSignal.stopLoss,
          targets: [candidate.aiSignal.targetPrice1, candidate.aiSignal.targetPrice2],
        });
        if (!geo.valid) {
          evaluatedReportCandidates.push({
            symbol: candidate.symbol,
            name: candidate.name,
            price: candidate.currentPrice,
            action: candidate.aiSignal.action,
            confidence: candidate.aiSignal.confidenceScore,
            riskReward: candidate.aiSignal.riskRewardRatio,
            status: 'DISQUALIFIED',
            disqualificationReason: `${geo.reasonCode}: ${geo.detail} — sinyal tidak dikoreksi otomatis`,
            thesis: candidate.aiSignal.thesis,
          });
          continue;
        }

        if (isSymbolInCooldown(candidate.symbol, riskState.cooldowns, nowMs)) {
          evaluatedReportCandidates.push({
            symbol: candidate.symbol,
            name: candidate.name,
            price: candidate.currentPrice,
            action: candidate.aiSignal.action,
            confidence: candidate.aiSignal.confidenceScore,
            riskReward: candidate.aiSignal.riskRewardRatio,
            status: 'DISCIPLINE_HOLD',
            disqualificationReason: `REJECTED_COOLDOWN: simbol ini baru mengalami stop-loss — cooldown 30 menit aktif sampai ${new Date(riskState.cooldowns[candidate.symbol]).toLocaleTimeString(isEn ? 'en-US' : 'id-ID')}`,
            thesis: candidate.aiSignal.thesis,
          });
          continue;
        }

        if (!isLongSignal || !meetsConfidence || !meetsRR) {
          let failReason = '';
          if (!isLongSignal) failReason = isEn ? 'Signal is neutral/short hedge' : 'Sinyal berstatus neutral/hedge';
          else if (!meetsConfidence) failReason = isEn ? `Quality ${candidate.aiSignal.confidenceScore}/100 < ${cfg.minAiConfidence}/100 threshold` : `Kualitas ${candidate.aiSignal.confidenceScore}/100 < batas ${cfg.minAiConfidence}/100`;
          else if (!meetsRR) failReason = isEn ? `R:R 1:${candidate.aiSignal.riskRewardRatio} < 1:${cfg.minRiskReward} requirement` : `R:R 1:${candidate.aiSignal.riskRewardRatio} < syarat 1:${cfg.minRiskReward}`;

          evaluatedReportCandidates.push({
            symbol: candidate.symbol,
            name: candidate.name,
            price: candidate.currentPrice,
            action: candidate.aiSignal.action,
            confidence: candidate.aiSignal.confidenceScore,
            riskReward: candidate.aiSignal.riskRewardRatio,
            status: 'DISQUALIFIED',
            disqualificationReason: failReason,
            thesis: candidate.aiSignal.thesis,
          });
          continue;
        }

        const multiplier = isHybridBook ? (cfg.hybridRiskMultiplier || 1.0) : 1.0;
        const sizing = computeOrderSizing({
          side: 'LONG',
          entry: candidate.currentPrice,
          initialStop: candidate.aiSignal.stopLoss,
          target: candidate.aiSignal.targetPrice1,
          equity: botEquity,
          riskFraction: Math.min((cfg.riskPerTradePercent / 100) * multiplier, RISK_CONFIG.perTradeRiskPct / 100),
          availableCash: currentLiquidity,
          minNotional: 10,
          maxNotional: currentLiquidity,
        });

        if (sizing.valid && sizing.quantity > 0) {
          currentLiquidity -= sizing.notional;
          slotsRemaining--;
          openedCount++;

          const newPos: PortfolioPosition = {
            id: `${idPrefix}-pos-${Date.now()}-${candidate.symbol}`,
            symbol: candidate.symbol,
            name: candidate.name,
            market: 'CRYPTO',
            quantity: sizing.quantity,
            sharesTotal: sizing.quantity,
            averageBuyPrice: candidate.currentPrice,
            currentPrice: candidate.currentPrice,
            totalCost: sizing.notional,
            currentValue: sizing.notional,
            unrealizedPnL: 0,
            unrealizedPnLPercent: 0,
            targetPrice: candidate.aiSignal.targetPrice1,
            stopLoss: candidate.aiSignal.stopLoss,
            dateAdded: new Date().toISOString().split('T')[0],
            executedArchetype: isHybridBook ? 'HYBRID' : (cfg.archetype || 'AI_AUTONOMOUS'),
            setupId: makeSetupId(candidate.symbol, isHybridBook ? 'HYBRID' : (cfg.archetype || 'PURE_AI'), nowMs),
          };

          updatedPositions.push(newPos);

          evaluatedReportCandidates.push({
            symbol: candidate.symbol,
            name: candidate.name,
            price: candidate.currentPrice,
            action: candidate.aiSignal.action,
            confidence: candidate.aiSignal.confidenceScore,
            riskReward: candidate.aiSignal.riskRewardRatio,
            status: 'EXECUTED',
            sizing: {
              units: sizing.quantity,
              allocatedUsdt: sizing.notional,
              riskAmount: sizing.finalRiskUsd,
              marginPercent: botEquity > 0 ? Math.round((sizing.notional / botEquity) * 1000) / 10 : 15,
              tp: candidate.aiSignal.targetPrice1,
              sl: candidate.aiSignal.stopLoss,
            },
            thesis: candidate.aiSignal.thesis,
          });

          newLogs.push({
            id: `log-${nowMs}-${Math.random().toString(36).substring(2, 8)}-${candidate.symbol}`,
            timestamp: nowIso,
            action: 'BUY_ENTRY',
            symbol: candidate.symbol,
            price: candidate.currentPrice,
            quantity: sizing.quantity,
            details: isEn
              ? `[${buyTag}] ${sizing.quantity} ${candidate.symbol} @ $${candidate.currentPrice}. Notional: $${sizing.notional.toLocaleString()} USDT. Actual risk: $${sizing.finalRiskUsd} (${sizing.finalRiskPct}% of equity, stop-distance). SL: $${candidate.aiSignal.stopLoss} · TP: $${candidate.aiSignal.targetPrice1} (final R:R 1:${sizing.rewardRiskRatio}). setupId: ${newPos.setupId}.`
              : `[${buyTag}] ${sizing.quantity} ${candidate.symbol} @ $${candidate.currentPrice}. Notional: $${sizing.notional.toLocaleString()} USDT. Risiko aktual: $${sizing.finalRiskUsd} (${sizing.finalRiskPct}% ekuitas, jarak stop). SL: $${candidate.aiSignal.stopLoss} · TP: $${candidate.aiSignal.targetPrice1} (R:R final 1:${sizing.rewardRiskRatio}). setupId: ${newPos.setupId}.`,
          });

          // Trigger robot mascot trade execution animation
          triggerBotTradingAnimation({
            symbol: candidate.symbol,
            action: 'BUY',
            price: candidate.currentPrice,
            timestamp: nowMs,
          });
        }
      }
    }

    setPositions(updatedPositions);
    setConfig((prev) => ({ ...prev, liquidityBalance: Math.round(currentLiquidity * 100) / 100 }));
    if (newLogs.length > 0) {
      setLogs((prev) => {
        const combined = [...newLogs, ...prev];
        const seen = new Set<string>();
        return combined.filter((l) => {
          if (!l || !l.id || seen.has(l.id)) return false;
          seen.add(l.id);
          return true;
        });
      });
    }
    setIsBotScanning(false);

    const isGeminiAI = geminiEngineUsed.startsWith('gemini');
    const engineBadge = isGeminiAI ? `⚡ Gemini AI (${geminiEngineUsed.replace('gemini-', '')})` : '⚡ AI Quant Engine';

    const decisionSummary = (
      !riskEval.canEnter
        ? (isEn
            ? `ENTRIES BLOCKED BY RISK ENGINE (${riskEval.health}): ${riskEval.reasons.join(' ')} Existing positions are still monitored for TP/SL.`
            : `ENTRY DIBLOKIR RISK ENGINE (${riskEval.health}): ${riskEval.reasons.join(' ')} Posisi existing tetap dipantau untuk TP/SL.`)
        : openedCount > 0
        ? (isEn
            ? `${engineBadge}: Executed ${openedCount} high-conviction trade(s). ${geminiMarketAnalysis ? `(${geminiMarketAnalysis}) ` : ''}Sizing strictly calibrated to actual stop-distance, hard cap ${RISK_CONFIG.perTradeRiskPct}% equity risk.`
            : `${engineBadge}: Mengeksekusi ${openedCount} posisi terpilih. ${geminiMarketAnalysis ? `(${geminiMarketAnalysis}) ` : ''}Sizing terkalibrasi presisi dengan jarak stop aktual, hard cap ${RISK_CONFIG.perTradeRiskPct}% risiko ekuitas.`)
        : availableSlots === 0
        ? (isEn
            ? `Discipline Maintained: All ${cfg.maxConcurrentPositions}/${cfg.maxConcurrentPositions} slots are currently filled. No random trades until an existing trade hits TP or SL.`
            : `Disiplin Terjaga: Seluruh ${cfg.maxConcurrentPositions}/${cfg.maxConcurrentPositions} slot posisi terisi. Tidak ada eksekusi acak sampai posisi aktif mencapai TP atau SL.`)
        : (isEn
            ? `${engineBadge} Scan Complete: Evaluated live market assets. No unheld assets currently satisfy Confidence ≥ ${cfg.minAiConfidence}/100, R:R ≥ 1:${cfg.minRiskReward}, and valid risk geometry.`
            : `${engineBadge} Pemindaian Selesai: Mengevaluasi aset pasar live. Tidak ada aset baru yang memenuhi Confidence ≥ ${cfg.minAiConfidence}/100, R:R ≥ 1:${cfg.minRiskReward}, dan geometri risiko valid.`)
    ) + (quarantinedSymbols.size > 0 ? ` [${isEn ? 'QUARANTINED' : 'DIKARANTINA'}: ${Array.from(quarantinedSymbols).join(', ')} — stop invalid, auto-SL off]` : '') + regimeNote;

    setScanAuditReport({
      timestamp: new Date().toLocaleTimeString(isEn ? 'en-US' : 'id-ID'),
      totalUniverseScanned: stocks.length,
      activeSlotsOccupied: updatedPositions.length,
      maxSlots: cfg.maxConcurrentPositions,
      availableSlots: Math.max(0, cfg.maxConcurrentPositions - updatedPositions.length),
      botCashAvailable: Math.round(currentLiquidity * 100) / 100,
      topCandidates: evaluatedReportCandidates.slice(0, 8),
      overallDecisionSummary: decisionSummary,
    });

    setBotScanResultMsg(decisionSummary);
    if (!auto || isTestScan) setShowAuditModal(true);
    if (isHybridBook) setLastHybridScanAt(new Date()); else setLastBotScanAt(new Date());
    botScanRunningRef.current = false;
  };

  // Autopilot 24/7 — dua buku berjalan independen: Pure AI & Hybrid masing-masing
  // punya interval sendiri selama book-nya aktif. Mode Manual tidak terpengaruh.
  const botScanRef = useRef(runBotScan);
  useEffect(() => {
    botScanRef.current = runBotScan;
  });

  useEffect(() => {
    const sec = botConfig.autoScanIntervalSec || 0;
    if (!botConfig.isActive || sec <= 0) return;
    const id = setInterval(() => botScanRef.current('bot', true), sec * 1000);
    return () => clearInterval(id);
  }, [botConfig.isActive, botConfig.autoScanIntervalSec]);

  useEffect(() => {
    const sec = hybridConfig.autoScanIntervalSec || 0;
    if (!hybridConfig.isActive || sec <= 0) return;
    const id = setInterval(() => botScanRef.current('hybrid', true), sec * 1000);
    return () => clearInterval(id);
  }, [hybridConfig.isActive, hybridConfig.autoScanIntervalSec]);

  // Manual Portfolio Metrics
  const manualTotalCost = portfolio.reduce((acc, p) => acc + p.totalCost, 0);
  const manualPositionsValue = portfolio.reduce((acc, p) => acc + p.currentValue, 0);
  const manualOpenPnL = manualPositionsValue - manualTotalCost;
  const manualOpenPnLPercent = manualTotalCost > 0 ? (manualOpenPnL / manualTotalCost) * 100 : 0;
  const manualTotalEquity = Math.round((liquidityBalance + manualPositionsValue) * 100) / 100;
  const manualTotalRealizedPnL = Math.round(closedTrades.reduce((acc, c) => acc + c.realizedPnL, 0) * 100) / 100;
  const manualWinningTrades = closedTrades.filter((c) => c.realizedPnL > 0).length;
  const manualWinRate = closedTrades.length > 0 ? Math.round((manualWinningTrades / closedTrades.length) * 100) : 0;

  // Live mark-to-market untuk posisi bot — KPI, tabel, dan Battle Arena selalu
  // tally dengan harga Binance terkini, bukan menunggu scan berikutnya.
  const liveBotPositions = botPositions.map((p) => {
    const live = stocks.find((s) => s.symbol === p.symbol);
    const price = live ? live.currentPrice : p.currentPrice;
    const value = Math.round(p.sharesTotal * price * 100) / 100;
    const pnl = Math.round((value - p.totalCost) * 100) / 100;
    const pct = p.totalCost > 0 ? Math.round((pnl / p.totalCost) * 10000) / 100 : 0;
    return { ...p, currentPrice: price, currentValue: value, unrealizedPnL: pnl, unrealizedPnLPercent: pct };
  });

  // Bot Portfolio Metrics — berbasis liveBotPositions agar tally dengan harga live
  const botTotalCost = liveBotPositions.reduce((acc, p) => acc + p.totalCost, 0);
  const botPositionsValue = liveBotPositions.reduce((acc, p) => acc + p.currentValue, 0);
  const botOpenPnL = botPositionsValue - botTotalCost;
  const botOpenPnLPercent = botTotalCost > 0 ? (botOpenPnL / botTotalCost) * 100 : 0;
  const botTotalEquity = Math.round((botConfig.liquidityBalance + botPositionsValue) * 100) / 100;
  const botTotalRealizedPnL = Math.round(botClosedTrades.reduce((acc, c) => acc + c.realizedPnL, 0) * 100) / 100;
  const botWinningTrades = botClosedTrades.filter((c) => c.realizedPnL > 0).length;
  const botWinRate = botClosedTrades.length > 0 ? Math.round((botWinningTrades / botClosedTrades.length) * 100) : 0;

  // Battle Arena Alpha Comparison
  const manualTotalPnLOverall = manualOpenPnL + manualTotalRealizedPnL;
  const botTotalPnLOverall = botOpenPnL + botTotalRealizedPnL;
  const alphaSpread = Math.round((botTotalPnLOverall - manualTotalPnLOverall) * 100) / 100;

  // Hybrid Book Metrics — buku ketiga berdiri sendiri (bukan atribusi dari buku bot)
  const liveHybridPositions = hybridPositions.map((p) => {
    const live = stocks.find((s) => s.symbol === p.symbol);
    const price = live ? live.currentPrice : p.currentPrice;
    const value = Math.round(p.sharesTotal * price * 100) / 100;
    const pnl = Math.round((value - p.totalCost) * 100) / 100;
    const pct = p.totalCost > 0 ? Math.round((pnl / p.totalCost) * 10000) / 100 : 0;
    return { ...p, currentPrice: price, currentValue: value, unrealizedPnL: pnl, unrealizedPnLPercent: pct };
  });
  const hybridTotalCost = liveHybridPositions.reduce((acc, p) => acc + p.totalCost, 0);
  const hybridPositionsValue = liveHybridPositions.reduce((acc, p) => acc + p.currentValue, 0);
  const hybridOpenPnL = hybridPositionsValue - hybridTotalCost;
  const hybridTotalEquity = Math.round((hybridConfig.liquidityBalance + hybridPositionsValue) * 100) / 100;
  const hybridRealizedPnL = Math.round(hybridClosedTrades.reduce((acc, c) => acc + c.realizedPnL, 0) * 100) / 100;
  const hybridUnrealizedPnL = Math.round(hybridOpenPnL * 100) / 100;
  const hybridTotalPnL = Math.round((hybridOpenPnL + hybridRealizedPnL) * 100) / 100;
  const hybridWinningTrades = hybridClosedTrades.filter((c) => c.realizedPnL > 0).length;
  const hybridWinRate = hybridClosedTrades.length > 0 ? Math.round((hybridWinningTrades / hybridClosedTrades.length) * 100) : 0;
  const hybridOpenPositions = liveHybridPositions;
  const hybridHasTrackRecord = hybridPositions.length > 0 || hybridClosedTrades.length > 0;
  const hybridAlphaSpread = Math.round((hybridTotalPnL - manualTotalPnLOverall) * 100) / 100;

  // P1.6 — Analitik performa per buku dari closed trades (label jujur + sample size).
  // Expectancy dalam R memakai initial risk (jarak entry→SL); gross & net dipisah.
  const computePerformanceStats = (closed: ClosedTradePosition[], currentEquity: number) => {
    const n = closed.length;
    if (n === 0) return null;
    const wins = closed.filter((c) => c.realizedPnL > 0);
    const losses = closed.filter((c) => c.realizedPnL < 0);
    const grossWin = wins.reduce((a, c) => a + c.realizedPnL, 0);
    const grossLoss = Math.abs(losses.reduce((a, c) => a + c.realizedPnL, 0));
    const profitFactor = grossLoss > 0 ? Math.round((grossWin / grossLoss) * 100) / 100 : null;
    // R per trade: riwayat lama tidak menyimpan initial stop → aproximasi 3% dari entry
    // (label PARTIAL — bukan R presisi; posisi baru menyimpan setupId & stop untuk presisi nanti)
    const rValues = closed
      .filter((c) => c.realizedPnL !== 0)
      .map((c) => {
        const initialRisk = c.quantity * c.averageBuyPrice * 0.03;
        return initialRisk > 0 ? c.realizedPnL / initialRisk : 0;
      });
    const expectancyR = rValues.length > 0 ? Math.round((rValues.reduce((a, b) => a + b, 0) / rValues.length) * 100) / 100 : null;
    const avgWin = wins.length > 0 ? Math.round((grossWin / wins.length) * 100) / 100 : null;
    const avgLoss = losses.length > 0 ? Math.round((grossLoss / losses.length) * 100) / 100 : null;
    // Max drawdown dari kurva kumulatif realized PnL (urut tanggal tutup)
    const sorted = [...closed].sort((a, b) => (a.dateClosed || '').localeCompare(b.dateClosed || ''));
    let peak = 0, cum = 0, maxDd = 0;
    for (const c of sorted) {
      cum += c.realizedPnL;
      peak = Math.max(peak, cum);
      maxDd = Math.max(maxDd, peak - cum);
    }
    return {
      n,
      winRatePct: Math.round((wins.length / n) * 100),
      profitFactor,
      expectancyR,
      rQuality: 'PARTIAL' as const,
      avgWin,
      avgLoss,
      maxDrawdown: Math.round(maxDd * 100) / 100,
      maxDrawdownPct: currentEquity > 0 ? Math.round((maxDd / currentEquity) * 10000) / 100 : 0,
    };
  };
  const botPerf = computePerformanceStats(botClosedTrades, botTotalEquity);
  const hybridPerf = computePerformanceStats(hybridClosedTrades, hybridTotalEquity);

  // Book-aware bindings — mode 'bot' memakai buku Pure AI, mode 'hybrid' memakai buku Hybrid.
  // Engine & JSX sama persis; hanya sumber data/konfigurasi yang berpindah.
  const isHybridMode = portfolioMode === 'hybrid';
  const bookConfig = isHybridMode ? hybridConfig : botConfig;
  const setBookConfig = isHybridMode ? setHybridConfig : setBotConfig;
  const bookPositions = isHybridMode ? hybridPositions : botPositions;
  const bookClosedTrades = isHybridMode ? hybridClosedTrades : botClosedTrades;
  const bookLogs = isHybridMode ? hybridLogs : botLogs;
  const liveBookPositions = isHybridMode ? liveHybridPositions : liveBotPositions;
  const bookTotalCost = isHybridMode ? hybridTotalCost : botTotalCost;
  const bookPositionsValue = isHybridMode ? hybridPositionsValue : botPositionsValue;
  const bookOpenPnL = isHybridMode ? hybridOpenPnL : botOpenPnL;
  const bookOpenPnLPercent = isHybridMode
    ? (hybridTotalCost > 0 ? (hybridOpenPnL / hybridTotalCost) * 100 : 0)
    : botOpenPnLPercent;
  const bookTotalEquity = isHybridMode ? hybridTotalEquity : botTotalEquity;
  const bookTotalRealizedPnL = isHybridMode ? hybridRealizedPnL : botTotalRealizedPnL;
  const bookWinningTrades = isHybridMode ? hybridWinningTrades : botWinningTrades;
  const bookWinRate = isHybridMode ? hybridWinRate : botWinRate;
  const bookInitialConfig = isHybridMode ? INITIAL_HYBRID_CONFIG : INITIAL_BOT_CONFIG;
  const bookConfigStorageKey = isHybridMode ? 'halfy_hybrid_config_crypto_v1' : 'halfy_bot_config_crypto_v1';
  const bookLastScanAt = isHybridMode ? lastHybridScanAt : lastBotScanAt;
  const scanCurrentBook = (auto = false, isTestScan = false) => runBotScan(isHybridMode ? 'hybrid' : 'bot', auto, isTestScan);

  // P0.6 — risk health buku aktif untuk UI (dihitung dari state live, bukan klaim)
  const bookRiskEval = (() => {
    const dailyRealized = bookClosedTrades
      .filter((c) => (c.dateClosed || '').slice(0, 10) === new Date().toISOString().slice(0, 10))
      .reduce((a, c) => a + c.realizedPnL, 0);
    const rs = isHybridMode ? hybridRiskState : botRiskState;
    return evaluateRiskEngine({
      equity: bookTotalEquity,
      openPositions: liveBookPositions.map((p) => ({
        symbol: p.symbol,
        side: 'LONG' as const,
        initialRiskUsd: p.stopLoss != null ? p.sharesTotal * Math.abs(p.averageBuyPrice - p.stopLoss) : p.totalCost * 0.02,
        notional: p.currentValue,
      })),
      dailyRealizedPnl: dailyRealized,
      consecutiveStoppedTrades: rs.consecutiveStopped,
      cooldowns: rs.cooldowns,
      now: Date.now(),
      lastQuoteAgeMs: binanceLastSync != null ? Math.max(0, Date.now() - binanceLastSync) : null,
      mode: 'PAPER',
      killSwitch: bookConfig.entriesPaused ? 'PAUSE_ENTRIES' : 'NONE',
      config: { perTradeRiskPct: 0.5, maxPortfolioHeatPct: 4, dailyLossGuardrailPct: 2, maxConsecutiveStopped: 3, maxQuoteAgeMs: 30000 },
    });
  })();

  const handleQuickDeposit = (amount: number) => {
    if (onUpdateLiquidity) {
      onUpdateLiquidity(liquidityBalance + amount);
    }
  };

  const handleSaveCustomLiquidity = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateLiquidity && customLiquidityInput >= 0) {
      onUpdateLiquidity(customLiquidityInput);
      setShowLiquidityModal(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Mode Segmented Navigation */}
      <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Briefcase className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {t.portfolioTitle}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
              {t.portfolioDesc}
            </p>
          </div>

          {/* Action Row: Mode Switcher + Reset Simulation Button */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Mode Switcher Buttons: Manual vs AI Bot vs Settings vs Battle Arena */}
            <div className="flex items-center p-1 bg-slate-900 border border-slate-700/80 rounded-xl">
              <button
                onClick={() => setPortfolioMode('manual')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  portfolioMode === 'manual'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>{t.modeManual}</span>
              </button>

              <button
                onClick={() => setPortfolioMode('bot')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  portfolioMode === 'bot'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>{t.modeBot}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
              </button>

              <button
                onClick={() => setPortfolioMode('hybrid')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  portfolioMode === 'hybrid'
                    ? 'bg-purple-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{isEn ? 'Hybrid AI Bot' : 'Bot Hybrid AI'}</span>
                {hybridConfig.isActive && (
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse ml-0.5" />
                )}
              </button>

              <button
                onClick={() => setPortfolioMode('battle')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  portfolioMode === 'battle'
                    ? 'bg-purple-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Swords className="w-3.5 h-3.5" />
                <span>{t.modeBattle}</span>
              </button>
            </div>

            {/* Reset Simulation Button */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowSessionArchive(true)}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 shadow-sm"
                title={isEn ? 'View archived sessions (analysis history)' : 'Lihat arsip sesi (riwayat analisis)'}
              >
                <History className="w-3.5 h-3.5 text-sky-400" />
                <span>{isEn ? 'Session History' : 'Riwayat Sesi'}{sessionArchive.length > 0 ? ` (${sessionArchive.length})` : ''}</span>
              </button>
              <button
                onClick={() => setShowResetModal(true)}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-white border border-rose-500/30 shadow-sm"
                title={isEn ? "Reset portfolio positions, cash, and bot logs to start from scratch" : "Reset portofolio, kas, dan log bot untuk mulai dari nol"}
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                <span>{t.resetSimulationBtn || (isEn ? 'Reset Simulation' : 'Reset Simulasi')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Toast Banner if action completed */}
        {toastMessage && (
          <div className="mb-5 p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-xs text-emerald-300 flex items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium">{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-emerald-400 hover:text-white text-xs underline cursor-pointer"
            >
              OK
            </button>
          </div>
        )}

        {/* =========================================================================
            5-CARD EQUAL-SIZED KPI STRIP (Balance, Positions, Net Worth, PNL, Winrate)
           ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Card 1: Balance Liquidity */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-inner flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-sky-400" />
                  <span>{t.balanceLiquidity}</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {t.availLiquidity}
                </span>
              </div>
              <div className="text-lg sm:text-xl font-black font-mono text-white tabular-nums tracking-tight">
                ${(portfolioMode === 'bot' ? botConfig.liquidityBalance : portfolioMode === 'hybrid' ? hybridConfig.liquidityBalance : liquidityBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <span>{t.freeCashEntry}</span>
              {portfolioMode === 'manual' ? (
                <button
                  onClick={() => setShowLiquidityModal(true)}
                  className="text-[10px] text-amber-400 hover:underline cursor-pointer font-medium"
                >
                  {t.manageLiquidity}
                </button>
              ) : (
                <span className="text-[10px] text-sky-400 font-mono">Bot Cash</span>
              )}
            </div>
          </div>

          {/* Card 2: Positions Value */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-inner flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t.positionsValue}</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Live Binance
                </span>
              </div>
              <div className="text-lg sm:text-xl font-black font-mono text-white tabular-nums tracking-tight">
                ${(portfolioMode === 'bot' ? botPositionsValue : portfolioMode === 'hybrid' ? hybridPositionsValue : manualPositionsValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-800/80">
              {portfolioMode === 'bot' ? botPositions.length : portfolioMode === 'hybrid' ? hybridPositions.length : portfolio.length} {t.activeCoinPositions}
            </div>
          </div>

          {/* Card 3: Total Equity (Net Worth) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-inner flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-purple-400" />
                  <span>{t.totalNetWorth}</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Cash + Pos
                </span>
              </div>
              <div className="text-lg sm:text-xl font-black font-mono text-white tabular-nums tracking-tight">
                ${(portfolioMode === 'bot' ? botTotalEquity : portfolioMode === 'hybrid' ? hybridTotalEquity : manualTotalEquity).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-800/80">
              {t.netWorthDesc}
            </div>
          </div>

          {/* Card 4: P&L Portofolio (Unrealized & Realized PNL) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-inner flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t.pnlTitle}</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {t.liveUnrealized}
                </span>
              </div>
              {(() => {
                const currentOpenPnL = portfolioMode === 'bot' ? botOpenPnL : portfolioMode === 'hybrid' ? hybridOpenPnL : manualOpenPnL;
                const currentRealizedPnL = portfolioMode === 'bot' ? botTotalRealizedPnL : portfolioMode === 'hybrid' ? hybridRealizedPnL : manualTotalRealizedPnL;
                const isPos = currentOpenPnL >= 0;

                return (
                  <div>
                    <div
                      className={`text-lg sm:text-xl font-black font-mono tabular-nums tracking-tight ${
                        isPos ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isPos ? '+' : ''}${currentOpenPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] font-mono mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className={isPos ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {isPos ? '+' : ''}{(portfolioMode === 'bot' ? botOpenPnLPercent : portfolioMode === 'hybrid' ? (hybridTotalCost > 0 ? (hybridOpenPnL / hybridTotalCost) * 100 : 0) : manualOpenPnLPercent).toFixed(2)}% Live
                      </span>
                      <span className="text-slate-400">
                        {t.realizedPnlText} <strong className={currentRealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {currentRealizedPnL >= 0 ? '+' : ''}${currentRealizedPnL.toFixed(0)}
                        </strong>
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Card 5: WINRATE TRADING PERFORMANCE */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-inner flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span className="font-mono font-bold text-slate-300 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t.winrateTitle}</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {t.closedTradesBadge}
                </span>
              </div>
              <div className="text-lg sm:text-xl font-black font-mono text-emerald-400 tabular-nums tracking-tight">
                {portfolioMode === 'bot' ? botWinRate : portfolioMode === 'hybrid' ? hybridWinRate : manualWinRate}%
              </div>
            </div>
            <div className="text-xs text-slate-400 font-mono mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <span>
                {portfolioMode === 'bot'
                  ? `${botWinningTrades}/${botClosedTrades.length} Win`
                  : `${manualWinningTrades}/${closedTrades.length} Win`}
              </span>
              <span className="text-[10px] text-emerald-400 font-bold">{t.alphaAccuracy}</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          VIEW MODE 1: MANUAL TRADER PORTFOLIO
         ========================================================================= */}
      {portfolioMode === 'manual' && (
        <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveSubTab('open')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeSubTab === 'open'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>{t.tabOpenPositions} ({portfolio.length})</span>
              </button>

              <button
                onClick={() => setActiveSubTab('closed')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeSubTab === 'closed'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <History className="w-4 h-4" />
                <span>{t.tabClosedTrades} ({closedTrades.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleOpenManualAdd}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ {t.addPosition}</span>
              </button>
            </div>
          </div>

          {/* Open Positions Table */}
          {activeSubTab === 'open' && (
            <>
              {portfolio.length === 0 ? (
                <div className="text-center py-14 text-slate-400 text-sm font-sans space-y-3">
                  <p>{t.noOpenPositions}</p>
                  <button
                    onClick={handleOpenManualAdd}
                    className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs cursor-pointer shadow inline-flex items-center gap-1.5 mt-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t.openPositionNow}</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm font-mono">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                        <th className="py-3 px-3.5 text-left min-w-[150px]">{t.colCoin}</th>
                        <th className="py-3 px-3.5 text-right min-w-[110px]">{t.colQuantity}</th>
                        <th className="py-3 px-3.5 text-right min-w-[110px]">{t.colEntryPrice}</th>
                        <th className="py-3 px-3.5 text-right min-w-[110px]">{t.colLivePrice}</th>
                        <th className="py-3 px-3.5 text-right min-w-[120px]">{t.colMarketValue}</th>
                        <th className="py-3 px-3.5 text-right min-w-[130px]">{t.colUnrealizedPnl}</th>
                        <th className="py-3 px-3.5 text-center min-w-[130px]">{t.colTargetSl}</th>
                        <th className="py-3 px-3.5 text-right min-w-[110px]">{t.colAction}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {portfolio.map((pos, idx) => {
                        const isPos = pos.unrealizedPnL >= 0;

                        return (
                          <tr key={`${pos.id || 'pos'}-${idx}`} className="hover:bg-slate-900/50 transition-colors">
                            <td className="py-3.5 px-3.5 text-left">
                              <button
                                onClick={() => onSelectStock(pos.symbol)}
                                className="font-bold text-white hover:text-amber-400 text-left font-mono text-sm sm:text-base flex items-center gap-1.5 cursor-pointer"
                              >
                                <span className="text-xs px-1.5 py-0.2 rounded bg-amber-950/70 text-amber-300 border border-amber-800/60 font-sans">
                                  ⚡ {pos.symbol}
                                </span>
                              </button>
                              <div className="text-xs text-slate-400 truncate max-w-[150px] font-sans mt-0.5">
                                {pos.name}
                              </div>
                            </td>

                            <td className="py-3.5 px-3.5 text-right font-bold text-slate-200 tabular-nums">
                              {pos.quantity < 1 ? pos.quantity.toString() : pos.quantity.toLocaleString()} Coins
                            </td>

                            <td className="py-3.5 px-3.5 text-right tabular-nums text-slate-300">
                              {formatPrice(pos.averageBuyPrice)}
                            </td>

                            <td className="py-3.5 px-3.5 text-right tabular-nums font-bold text-white">
                              {formatPrice(pos.currentPrice)}
                            </td>

                            <td className="py-3.5 px-3.5 text-right tabular-nums font-bold text-slate-200">
                              ${pos.currentValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>

                            <td className="py-3.5 px-3.5 text-right tabular-nums">
                              <div className={`font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isPos ? '+' : ''}
                                ${pos.unrealizedPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              <div className={`text-xs font-semibold ${isPos ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {isPos ? '+' : ''}{pos.unrealizedPnLPercent.toFixed(2)}%
                              </div>
                            </td>

                            <td className="py-3.5 px-3.5 text-center text-xs">
                              <div className="flex flex-col items-center gap-0.5">
                                {pos.targetPrice ? (
                                  <div className="text-emerald-400 flex items-center gap-1 font-semibold">
                                    <Target className="w-3.5 h-3.5" />
                                    <span>TP: {formatPrice(pos.targetPrice)}</span>
                                  </div>
                                ) : null}
                                {pos.stopLoss ? (
                                  <div className="text-rose-400 flex items-center gap-1 font-semibold">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span>SL: {formatPrice(pos.stopLoss)}</span>
                                  </div>
                                ) : null}
                              </div>
                            </td>

                            <td className="py-3.5 px-3.5 text-right">
                              <button
                                onClick={() => handleInitiateCloseTrade(pos)}
                                className="px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 hover:text-white border border-rose-500/40 rounded-lg text-xs font-bold font-mono inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                                title={isEn ? "Close position and refund capital + PnL to liquidity balance" : "Tutup Posisi dan Kembalikan Modal + P&L ke Saldo Kas Likuiditas"}
                              >
                                <LogOut className="w-3.5 h-3.5" />
                                <span>{t.closePositionBtn}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Closed Trades History */}
          {activeSubTab === 'closed' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="py-3 px-3.5 text-left min-w-[100px]">{t.colDateClosed}</th>
                    <th className="py-3 px-3.5 text-left min-w-[150px]">{t.colCoin}</th>
                    <th className="py-3 px-3.5 text-right min-w-[110px]">{t.colQuantity}</th>
                    <th className="py-3 px-3.5 text-right min-w-[110px]">{t.colEntryPrice}</th>
                    <th className="py-3 px-3.5 text-right min-w-[110px]">{t.colExitPrice}</th>
                    <th className="py-3 px-3.5 text-right min-w-[130px]">{t.colRealizedPnl}</th>
                    <th className="py-3 px-3.5 text-center min-w-[160px]">{t.colCloseReason}</th>
                    <th className="py-3 px-3.5 text-right min-w-[90px]">{t.colStatus}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {closedTrades.map((trade, idx) => {
                    const isProfit = trade.realizedPnL >= 0;

                    return (
                      <tr key={`${trade.id || 'closed'}-${idx}`} className="hover:bg-slate-900/50 transition-colors">
                        <td className="py-3.5 px-3.5 text-left text-slate-400 text-xs">
                          {trade.dateClosed.split('T')[0]}
                        </td>

                        <td className="py-3.5 px-3.5 text-left">
                          <button
                            onClick={() => onSelectStock(trade.symbol)}
                            className="font-bold text-white hover:text-amber-400 text-left font-mono text-sm flex items-center gap-1.5 cursor-pointer"
                          >
                            <span className="text-xs px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 font-sans">
                              {trade.symbol}
                            </span>
                          </button>
                          <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                            {trade.name}
                          </div>
                        </td>

                        <td className="py-3.5 px-3.5 text-right text-slate-300 tabular-nums font-bold">
                          {trade.quantity < 1 ? trade.quantity.toString() : trade.quantity.toLocaleString()} Coins
                        </td>

                        <td className="py-3.5 px-3.5 text-right tabular-nums text-slate-400">
                          {formatPrice(trade.averageBuyPrice)}
                        </td>

                        <td className="py-3.5 px-3.5 text-right tabular-nums font-bold text-white">
                          {formatPrice(trade.closePrice)}
                        </td>

                        <td className="py-3.5 px-3.5 text-right tabular-nums">
                          <div className={`font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isProfit ? '+' : ''}${trade.realizedPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className={`text-xs font-semibold ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {isProfit ? '+' : ''}{trade.realizedPnLPercent.toFixed(2)}%
                          </div>
                        </td>

                        <td className="py-3.5 px-3.5 text-center">
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded font-mono font-bold border inline-block ${
                              trade.closeReason === 'TAKE_PROFIT'
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : trade.closeReason === 'STOP_LOSS'
                                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            {trade.closeReason === 'TAKE_PROFIT'
                              ? (isEn ? 'Target TP Reached' : 'Target TP Tercapai')
                              : trade.closeReason === 'STOP_LOSS'
                              ? (isEn ? 'Stop Loss Triggered' : 'Stop Loss Terpicu')
                              : (isEn ? 'Manual Market Exit' : 'Market Exit Manual')}
                          </span>
                        </td>

                        <td className="py-3.5 px-3.5 text-right">
                          <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                            CLOSED
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          VIEW MODE 2: AI AUTOTRADE BOT (WITH CLOSED TRADES HISTORY SUB-TAB)
         ========================================================================= */}
      {(portfolioMode === 'bot' || portfolioMode === 'hybrid') && (
        <div className="space-y-6">
          {/* Animated Trading Robot Unified Command Banner (Hijau untuk Pure AI, Ungu untuk Hybrid Bot) */}
          <TradingRobotMascot
            variant={isHybridMode ? 'hybrid' : 'pure_ai'}
            state={isBotTradingActive ? 'trading' : isBotScanning ? 'scanning' : 'idle'}
            lastTrade={lastBotTradeEvent}
            isBotActive={bookConfig.isActive}
            onToggleActive={() => setBookConfig((prev) => ({ ...prev, isActive: !prev.isActive }))}
            onTriggerScan={() => scanCurrentBook(false)}
            onOpenSettings={() => setShowBotSettingsPanel((prev) => !prev)}
            showSettings={showBotSettingsPanel}
            isPausedEntries={bookConfig.entriesPaused}
            onTriggerDemoTrade={() => {
              triggerBotTradingAnimation({
                symbol: 'SOLUSDT',
                action: 'BUY',
                price: 185.4,
                timestamp: Date.now(),
              });
            }}
            isEn={isEn}
          />

            {botScanResultMsg && (
              <div className="mt-4 p-3 rounded-xl bg-sky-950/40 border border-sky-800/60 text-xs font-mono text-sky-300 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{botScanResultMsg}</span>
                </div>
                {scanAuditReport && (
                  <button
                    onClick={() => setShowAuditModal(true)}
                    className="text-[11px] font-bold text-amber-400 hover:underline shrink-0 cursor-pointer flex items-center gap-1"
                  >
                    <span>{t.viewAuditReport}</span>
                    <span>→</span>
                  </button>
                )}
              </div>
            )}

            {/* 4 Auto Money Management Parameters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-5 font-mono text-xs">
              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">{t.riskPerTrade}</span>
                <strong className="text-amber-400 text-sm block mt-0.5">
                  {Math.min(bookConfig.riskPerTradePercent, 0.5)}% (${Math.round((bookTotalEquity * Math.min(bookConfig.riskPerTradePercent, 0.5)) / 100)} Max Loss — stop-distance, cap PAPER 0.5%)
                </strong>
                <span className="text-[10px] text-slate-500">
                  {isEn ? 'Fixed Fractional Formula' : 'Formula Fixed Fractional'}
                </span>
              </div>

              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">{t.maxConcurrentPos}</span>
                <strong className="text-white text-sm block mt-0.5">
                  {bookPositions.length} / {bookConfig.maxConcurrentPositions} Slots
                </strong>
                <span className="text-[10px] text-slate-500">
                  {isEn ? 'Max Diversification' : 'Diversifikasi Maksimal'}
                </span>
              </div>

              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">{t.minRrFilter}</span>
                <strong className="text-emerald-400 text-sm block mt-0.5">
                  1 : {bookConfig.minRiskReward}.0
                </strong>
                <span className="text-[10px] text-slate-500">
                  {isEn ? 'High Reward Filter' : 'Filter High Reward'}
                </span>
              </div>

              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">{t.minAiConfidence}</span>
                <strong className="text-sky-400 text-sm block mt-0.5">
                  {bookConfig.minAiConfidence}/100 Quality
                </strong>
                <span className="text-[10px] text-slate-500">
                  {isEn ? 'Quality Signal Gate' : 'Filter Kualitas Sinyal'}
                </span>
              </div>
            </div>

            {/* P1.6 — Analitik performa per buku (dari closed trades; label jujur + sample size) */}
            {(() => {
              const perf = isHybridMode ? hybridPerf : botPerf;
              if (!perf) return null;
              return (
                <div className="mt-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-3 text-[11px] font-mono">
                  <div>
                    <span className="text-slate-500 block">{isEn ? 'Profit Factor' : 'Profit Factor'}</span>
                    <strong className={perf.profitFactor != null && perf.profitFactor >= 1 ? 'text-emerald-400' : 'text-rose-400'}>
                      {perf.profitFactor ?? '—'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">{isEn ? 'Expectancy (R, approx)' : 'Ekspektansi (R, aproks)'}</span>
                    <strong className={(perf.expectancyR ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {perf.expectancyR != null ? `${perf.expectancyR >= 0 ? '+' : ''}${perf.expectancyR}R` : '—'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">{isEn ? 'Avg Win / Avg Loss' : 'Menang / Rata-rata Rugi'}</span>
                    <strong className="text-slate-300">
                      {perf.avgWin != null ? `+$${perf.avgWin.toLocaleString()}` : '—'} / {perf.avgLoss != null ? `-$${perf.avgLoss.toLocaleString()}` : '—'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">{isEn ? 'Max Drawdown (realized)' : 'Max Drawdown (realisasi)'}</span>
                    <strong className="text-rose-400">-${perf.maxDrawdown.toLocaleString()} ({perf.maxDrawdownPct}%)</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">{isEn ? 'Sample' : 'Sampel'}</span>
                    <strong className="text-slate-300">
                      {perf.n} {isEn ? 'closed' : 'selesai'}
                    </strong>
                    <span className="text-amber-400/80 block text-[9px]">{isEn ? 'PAPER cohort · R approx' : 'Kohort PAPER · R aproks'}</span>
                  </div>
                </div>
              );
            })()}

          {/* Bot Positions & CLOSED POSITIONS HISTORY Sub-Tabs */}
          <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBotSubTab('open')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    botSubTab === 'open'
                      ? 'bg-sky-500 text-white shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Bot className="w-4 h-4" />
                  <span>{t.botActivePositions} ({bookPositions.length}/{bookConfig.maxConcurrentPositions})</span>
                </button>

                <button
                  onClick={() => setBotSubTab('closed')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    botSubTab === 'closed'
                      ? 'bg-sky-500 text-white shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <History className="w-4 h-4" />
                  <span>{t.botClosedHistory} ({bookClosedTrades.length})</span>
                </button>

                
              </div>

              <span className="text-xs text-slate-400 font-mono">
                {botSubTab === 'open'
                  ? (isEn ? 'Auto TP1 & Stop Loss Standby' : 'Auto TP1 & Stop Loss Siaga')
                  : botSubTab === 'hybrid'
                  ? `Hybrid P&L: ${hybridTotalPnL >= 0 ? '+' : ''}$${hybridTotalPnL.toLocaleString()} (${hybridWinRate}% Winrate)`
                  : `Bot Realized P&L: +$${bookTotalRealizedPnL.toLocaleString()} (${bookWinRate}% Winrate)`}
              </span>
            </div>

            {/* Sub-Tab 1: Active Bot Open Positions Table */}
            {botSubTab === 'open' && (
              <>
                {bookPositions.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm font-sans space-y-2">
                    <p>{t.noBotPositions}</p>
                    <p className="text-xs text-slate-500">
                      {isEn ? 'Click "Scan & Auto-Execute" to evaluate AI picks and open new positions.' : 'Klik "Pindai & Eksekusi Otomatis" untuk mengevaluasi Crypto AI Picks dan membuka posisi.'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm font-mono">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                          <th className="py-3 px-3.5 text-left min-w-[150px]">{t.colCoin}</th>
                          <th className="py-3 px-3.5 text-right min-w-[110px]">{t.colQuantity}</th>
                          <th className="py-3 px-3.5 text-right min-w-[110px]">{t.colEntryPrice}</th>
                          <th className="py-3 px-3.5 text-right min-w-[110px]">{t.colLivePrice}</th>
                          <th className="py-3 px-3.5 text-right min-w-[120px]">{t.colMarketValue}</th>
                          <th className="py-3 px-3.5 text-right min-w-[130px]">{t.colUnrealizedPnl}</th>
                          <th className="py-3 px-3.5 text-center min-w-[130px]">{t.colTargetSl}</th>
                          <th className="py-3 px-3.5 text-right min-w-[160px]">{t.colAction}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {liveBookPositions.map((pos, idx) => {
                          const isPos = pos.unrealizedPnL >= 0;

                          return (
                            <tr key={`${pos.id || 'bot-pos'}-${idx}`} className="hover:bg-slate-900/50 transition-colors">
                              <td className="py-3.5 px-3.5 text-left">
                                <span className="font-bold text-white font-mono text-sm block">
                                  ⚡ {pos.symbol}
                                </span>
                                <span className="text-xs text-slate-400 block truncate max-w-[140px]">{pos.name}</span>
                              </td>

                              <td className="py-3.5 px-3.5 text-right font-bold text-slate-200 tabular-nums">
                                {pos.quantity < 1 ? pos.quantity.toString() : pos.quantity.toLocaleString()} Coins
                              </td>

                              <td className="py-3.5 px-3.5 text-right tabular-nums text-slate-300">
                                {formatPrice(pos.averageBuyPrice)}
                              </td>

                              <td className="py-3.5 px-3.5 text-right tabular-nums font-bold text-white">
                                {formatPrice(pos.currentPrice)}
                              </td>

                              <td className="py-3.5 px-3.5 text-right tabular-nums text-slate-200 font-bold">
                                ${pos.currentValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>

                              <td className="py-3.5 px-3.5 text-right tabular-nums">
                                <div className={`font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {isPos ? '+' : ''}${pos.unrealizedPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div className={`text-xs font-semibold ${isPos ? 'text-emerald-500' : 'text-rose-500'}`}>
                                  {isPos ? '+' : ''}{pos.unrealizedPnLPercent.toFixed(2)}%
                                </div>
                              </td>

                              <td className="py-3.5 px-3.5 text-center text-xs">
                                <div className="flex flex-col items-center gap-0.5">
                                  <div className={`font-semibold flex items-center gap-1 ${pos.stopLoss != null && pos.stopLoss >= pos.averageBuyPrice ? 'text-rose-400' : 'text-emerald-400'}`}>
                                    <Target className="w-3.5 h-3.5" />
                                    <span>TP: {formatPrice(pos.targetPrice || 0)}</span>
                                  </div>
                                  <div className={`font-semibold flex items-center gap-1 ${pos.stopLoss != null && pos.stopLoss >= pos.averageBuyPrice ? 'text-rose-400 font-bold' : 'text-rose-400'}`}>
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span>SL: {formatPrice(pos.stopLoss || 0)}</span>
                                  </div>
                                  {/* P0.2/T14 — stop geometry invalid → NEEDS REVIEW menyolok */}
                                  {pos.stopLoss != null && pos.stopLoss >= pos.averageBuyPrice && (
                                    <span
                                      className="text-[9px] font-mono font-black text-rose-300 bg-rose-950/80 border border-rose-500/60 px-1.5 py-0.5 rounded animate-pulse"
                                      title={isEn ? 'Invalid stop: initial stop >= entry for LONG. Auto stop-loss disabled — close manually or review the signal source.' : 'Stop invalid: initial stop >= entry untuk LONG. Auto stop-loss dinonaktifkan — tutup manual atau tinjau sumber sinyal.'}
                                    >
                                      ⚠ NEEDS REVIEW
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-2">
                                  {pos.stopLoss != null && pos.stopLoss >= pos.averageBuyPrice ? (
                                    <span className="text-[11px] font-mono text-rose-400 font-medium hidden xl:inline-block">
                                      ⚠ Quarantined
                                    </span>
                                  ) : (
                                    <span className="text-[11px] font-mono text-sky-400/80 font-medium hidden xl:inline-block">
                                      ● Auto TP/SL
                                    </span>
                                  )}
                                  <button
                                    onClick={() => handleInitiateBotCloseTrade(pos)}
                                    className="px-2.5 py-1 bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 hover:text-white border border-rose-500/40 rounded-lg text-xs font-bold font-mono inline-flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                                    title={isEn ? "Exit bot position early and return capital + PnL to bot cash" : "Tutup posisi bot lebih awal dan kembalikan modal + PnL ke kas bot"}
                                  >
                                    <LogOut className="w-3 h-3" />
                                    <span>{isEn ? 'Close Trade' : 'Tutup Trade'}</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* Sub-Tab 2: Bot CLOSED TRADES HISTORY TABLE */}
            {botSubTab === 'closed' && (
              <>
                {bookClosedTrades.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm font-sans space-y-2">
                    <p>{t.noBotClosedTrades}</p>
                    <p className="text-xs text-slate-500">
                      {isEn ? 'Closed trades by auto take-profit or stop-loss will be recorded here.' : 'Trade yang ditutup oleh auto take-profit atau stop-loss akan otomatis terarsip di sini.'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm font-mono">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                          <th className="py-3 px-3.5 text-left min-w-[100px]">{t.colDateClosed}</th>
                          <th className="py-3 px-3.5 text-left min-w-[150px]">{t.colCoin}</th>
                          <th className="py-3 px-3.5 text-right min-w-[110px]">{t.colQuantity}</th>
                          <th className="py-3 px-3.5 text-right min-w-[110px]">{t.colEntryPrice}</th>
                          <th className="py-3 px-3.5 text-right min-w-[110px]">{t.colExitPrice}</th>
                          <th className="py-3 px-3.5 text-right min-w-[130px]">{t.colRealizedPnl}</th>
                          <th className="py-3 px-3.5 text-center min-w-[160px]">{t.colCloseReason}</th>
                          <th className="py-3 px-3.5 text-right min-w-[90px]">{t.colStatus}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {bookClosedTrades.map((trade, idx) => {
                          const isProfit = trade.realizedPnL >= 0;

                          return (
                            <tr key={`${trade.id || 'bot-closed'}-${idx}`} className="hover:bg-slate-900/50 transition-colors">
                              <td className="py-3.5 px-3.5 text-left text-slate-400 text-xs">
                                {trade.dateClosed.split('T')[0]}
                              </td>

                              <td className="py-3.5 px-3.5 text-left">
                                <button
                                  onClick={() => onSelectStock(trade.symbol)}
                                  className="font-bold text-white hover:text-sky-400 text-left font-mono text-sm flex items-center gap-1.5 cursor-pointer"
                                >
                                  <span className="text-xs px-1.5 py-0.2 rounded bg-sky-950/70 text-sky-300 border border-sky-800/60 font-sans">
                                    ⚡ {trade.symbol}
                                  </span>
                                </button>
                                <div className="text-[11px] text-slate-400 truncate max-w-[150px] font-sans">
                                  {trade.name}
                                </div>
                              </td>

                              <td className="py-3.5 px-3.5 text-right font-bold text-slate-300 tabular-nums">
                                {trade.quantity < 1 ? trade.quantity.toString() : trade.quantity.toLocaleString()} Coins
                              </td>

                              <td className="py-3.5 px-3.5 text-right tabular-nums text-slate-400">
                                {formatPrice(trade.averageBuyPrice)}
                              </td>

                              <td className="py-3.5 px-3.5 text-right tabular-nums font-bold text-white">
                                {formatPrice(trade.closePrice)}
                              </td>

                              <td className="py-3.5 px-3.5 text-right tabular-nums">
                                <div className={`font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {isProfit ? '+' : ''}${trade.realizedPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div className={`text-xs font-semibold ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                                  {isProfit ? '+' : ''}{trade.realizedPnLPercent.toFixed(2)}%
                                </div>
                              </td>

                              <td className="py-3.5 px-3.5 text-center">
                                <span
                                  className={`text-[11px] px-2 py-0.5 rounded font-mono font-bold border inline-block ${
                                    trade.closeReason === 'TAKE_PROFIT'
                                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                      : trade.closeReason === 'STOP_LOSS'
                                      ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                  }`}
                                >
                                  {trade.closeReason === 'TAKE_PROFIT'
                                    ? (isEn ? '🎯 Auto Take Profit (TP1)' : '🎯 Auto Take Profit (TP1)')
                                    : trade.closeReason === 'STOP_LOSS'
                                    ? (isEn ? '🛑 Auto Stop Loss Protection' : '🛑 Auto Stop Loss Proteksi')
                                    : (isEn ? '⚡ Manual Market Exit' : '⚡ Market Exit Manual')}
                                </span>
                              </td>

                              <td className="py-3.5 px-3.5 text-right">
                                <span className="text-[11px] font-mono font-bold text-sky-400 bg-sky-950 px-2 py-0.5 rounded border border-sky-800">
                                  BOT CLOSED
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Live Bot Execution & Decision Logs */}
          <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 mb-4">
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>{t.liveActivityLog}</span>
              </h3>
              <span className="text-xs text-slate-500 font-mono">Real-Time Audit Feed</span>
            </div>

            <div className="space-y-2.5">
              {bookLogs.map((log, idx) => (
                <div
                  key={`${log.id || 'log'}-${idx}`}
                  className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/80 flex items-start justify-between gap-4 font-mono text-xs"
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 mt-0.5 ${
                        log.action === 'BUY_ENTRY'
                          ? 'bg-sky-500/15 text-sky-300 border-sky-500/40'
                          : log.action === 'TAKE_PROFIT'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                          : 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                      }`}
                    >
                      {log.action}
                    </span>
                    <div>
                      <p className="text-slate-200 leading-relaxed font-sans text-xs">{log.details}</p>
                      {/* P0.7 — timestamp eksak (UTC source) + relatif sekunder; bukan "Just now" statis */}
                      <span className="text-[10px] text-slate-500 block mt-1 font-mono">
                        {formatLogTimestamp(log.timestamp, isEn)}
                      </span>
                    </div>
                  </div>

                  {log.pnl !== undefined && (
                    <div className="text-right font-mono shrink-0">
                      <span
                        className={`font-bold block ${log.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                      >
                        {log.pnl >= 0 ? '+' : ''}${log.pnl.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW MODE 3: BOT SETTINGS & STRATEGY MATRIX (DEDICATED OVERLAY MODAL)
         ========================================================================= */}
      {(portfolioMode === 'settings' || ((portfolioMode === 'bot' || portfolioMode === 'hybrid') && showBotSettingsPanel)) && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowBotSettingsPanel(false);
              if (portfolioMode === 'settings') setPortfolioMode(isHybridMode ? 'hybrid' : 'bot');
            }
          }}
        >
          <div className="bg-[#0b1322] border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto p-4 sm:p-7 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200 relative">
            {/* Header Banner */}
            <div className="bg-[#0e172a] border border-emerald-500/30 rounded-2xl p-5 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <SlidersHorizontal className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-white tracking-tight">
                        {isHybridMode
                          ? (isEn ? 'Hybrid AI Bot Settings & Strategy' : 'Pengaturan & Strategi Bot Hybrid AI')
                          : (isEn ? 'Pure AI Autotrade Bot Settings' : 'Pengaturan Bot Pure AI Autotrade')}
                      </h2>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-sky-400" />
                        <span>Gemini 3.8 Flash</span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                      {isHybridMode
                        ? (isEn ? 'Customize risk per trade, stop-distance sizing, R:R filters, and strategy focus while retaining Gemini AI multi-factor scanning.' : 'Atur risiko per trade, sizing jarak stop, filter R:R, dan fokus strategi dengan tetap memanfaatkan scan multi-faktor Gemini AI.')
                        : (isEn ? 'Autonomous institutional execution with locked rules for fair Battle Arena competition.' : 'Eksekusi institusional otonom dengan aturan terkunci demi keadilan kompetisi Battle Arena.')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRestoreDefaultSettings}
                    className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t.restoreDefaultsBtn || (isEn ? 'Restore Defaults' : 'Kembalikan Standar')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleSaveBotSettings(bookConfig);
                      setShowBotSettingsPanel(false);
                      if (portfolioMode === 'settings') setPortfolioMode(isHybridMode ? 'hybrid' : 'bot');
                    }}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{t.saveSettingsBtn || (isEn ? 'Save' : 'Simpan')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowBotSettingsPanel(false);
                      if (portfolioMode === 'settings') setPortfolioMode(isHybridMode ? 'hybrid' : 'bot');
                    }}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ml-1"
                    title={isEn ? 'Close' : 'Tutup'}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

          {/* Section 1: Execution Archetype (AI vs Hybrid vs Manual) */}
          <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Bot className="w-4 h-4 text-sky-400" />
                  <span>{isEn ? '1. Execution Archetype Architecture' : '1. Arsitektur Eksekusi Bot'}</span>
                </h3>
                <span className="text-xs text-slate-400">
                  {isEn ? 'Select how the trading bot executes signals in your portfolio' : 'Pilih bagaimana bot memperlakukan sinyal dan eksekusi order'}
                </span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                Current: {bookConfig.archetype || 'PURE_AI'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Option 1: Pure AI */}
              <div
                onClick={() => setBookConfig((prev) => ({ ...prev, archetype: 'PURE_AI' }))}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  bookConfig.archetype === 'PURE_AI'
                    ? 'bg-sky-950/40 border-sky-500/80 ring-1 ring-sky-500/40 shadow-md'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                      <span>{t.archetypeAi || 'Pure AI Autonomous'}</span>
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">
                      100% ALGO
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {isEn
                      ? 'Fully autonomous execution based on Halfy AI quantitative scores. Strict stop-loss & take-profit discipline with zero emotional bias.'
                      : 'Eksekusi sepenuhnya otomatis berdasarkan skor kuantitatif Halfy AI. Disiplin TP/SL ketat tanpa pengaruh bias emosional manusia.'}
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] font-semibold text-sky-400 flex items-center justify-between">
                  <span>{bookConfig.archetype === 'PURE_AI' ? '● ' + (isEn ? 'Active Selection' : 'Terpilih') : (isEn ? 'Click to select' : 'Klik untuk memilih')}</span>
                  <span>Fixed Fractional (Kelly-form, p asumsi)</span>
                </div>
              </div>

              {/* Option 2: Hybrid AI + User Calibration */}
              <div
                onClick={() => setBookConfig((prev) => ({ ...prev, archetype: 'HYBRID' }))}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  bookConfig.archetype === 'HYBRID'
                    ? 'bg-purple-950/40 border-purple-500/80 ring-1 ring-purple-500/40 shadow-md'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-purple-400" />
                      <span>{t.archetypeHybrid || 'Hybrid (AI + User Calibration)'}</span>
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      RECOMMENDED
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {isEn
                      ? 'Powered by Crypto AI Picks & Radar signals, combined with user risk calibration (custom risk multiplier, trailing SL, and optional 1-click confirmation).'
                      : 'Menggabungkan sinyal unggulan Crypto AI Picks & Radar dengan penyesuaian khusus Anda: Multiplier risiko, trailing stop loss, dan konfirmasi 1-klik.'}
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] font-semibold text-purple-400 flex items-center justify-between">
                  <span>{bookConfig.archetype === 'HYBRID' ? '● ' + (isEn ? 'Active Selection' : 'Terpilih') : (isEn ? 'Click to select' : 'Klik untuk memilih')}</span>
                  <span>{bookConfig.hybridRiskMultiplier || 1.25}x Risk Multiplier</span>
                </div>
              </div>

              {/* Option 3: Manual Discretionary */}
              <div
                onClick={() => setBookConfig((prev) => ({ ...prev, archetype: 'MANUAL_DISCRETIONARY' }))}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  bookConfig.archetype === 'MANUAL_DISCRETIONARY'
                    ? 'bg-amber-950/40 border-amber-500/80 ring-1 ring-amber-500/40 shadow-md'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-amber-400" />
                      <span>{t.archetypeManual || 'Manual Discretionary Advisor'}</span>
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      ADVISOR ONLY
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {isEn
                      ? 'Bot serves strictly as an alert advisor and quantitative radar. No automated trades execute without your explicit manual review and order submission.'
                      : 'Bot berfungsi sebagai penasihat sinyal dan radar kuantitatif. Tidak ada order otomatis yang dieksekusi tanpa persetujuan manual Anda di portofolio.'}
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] font-semibold text-amber-400 flex items-center justify-between">
                  <span>{bookConfig.archetype === 'MANUAL_DISCRETIONARY' ? '● ' + (isEn ? 'Active Selection' : 'Terpilih') : (isEn ? 'Click to select' : 'Klik untuk memilih')}</span>
                  <span>Manual Review</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Strategy Focus Matrix (Crypto AI Picks & Radar) */}
          <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Target className="w-4 h-4 text-amber-400" />
                  <span>{isEn ? '2. Strategy Focus & Multi-Factor Intelligence' : '2. Fokus Strategi & Intelijen Multi-Faktor'}</span>
                </h3>
                <span className="text-xs text-slate-400">
                  {isEn
                    ? (isHybridMode ? 'Select which market setups the Hybrid AI Bot prioritizes' : 'Pure AI dynamically weights all setups based on market regime and Kelly criterion')
                    : (isHybridMode ? 'Pilih jenis setup pasar yang diprioritaskan oleh Bot Hybrid AI' : 'Pure AI menentukan bobot setup secara otonom berdasarkan rezim pasar dan kriteria Kelly')}
                </span>
              </div>
              {!isHybridMode && (
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/30 flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-sky-400" />
                  <span>{isEn ? 'PURE AI LOCKED' : 'TERKUNCI OTONOM'}</span>
                </span>
              )}
            </div>

            {!isHybridMode ? (
              /* Pure AI: Display-only / Locked philosophy banner as instructed by user */
              <div className="p-4 rounded-xl bg-slate-900/80 border border-sky-500/30 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-400">
                  <Bot className="w-4 h-4" />
                  <span>{isEn ? 'Autonomous Neural Multi-Factor Engine (Locked for Battle Arena Competition)' : 'Engine Neural Multi-Faktor Otonom (Terkunci demi Keadilan Arena Kompetisi)'}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {isEn
                    ? 'In Pure AI mode, all setups across Whale Inflows, Momentum Breakouts, and Oversold Dips are evaluated autonomously without user overrides. This ensures the AI competes authentically against your manual and hybrid trading in the Battle Arena. To customize strategy focus, switch to Hybrid AI Bot.'
                    : 'Pada mode Pure AI, seluruh setup (Aliran Whale, Momentum Breakout, dan Pantulan Oversold) dievaluasi secara otonom tanpa campur tangan pengguna. Ini menjamin AI bersaing murni melawan trading manual dan hybrid Anda di Battle Arena. Untuk mengkustomisasi fokus strategi, gunakan Bot Hybrid AI.'}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 font-mono text-[11px]">
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-300">
                    <span className="text-sky-400 font-bold block">1. Whale Flow</span>
                    <span className="text-slate-400 text-[10px]">CEX Reserve Outflows</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-300">
                    <span className="text-emerald-400 font-bold block">2. Breakout</span>
                    <span className="text-slate-400 text-[10px]">EMA Resistance Thrust</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-300">
                    <span className="text-rose-400 font-bold block">3. Oversold</span>
                    <span className="text-slate-400 text-[10px]">RSI Mean Reversion</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-300">
                    <span className="text-purple-400 font-bold block">4. Sizing</span>
                    <span className="text-slate-400 text-[10px]">Kelly Math Compounding</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Hybrid AI & Manual: Fully interactive strategy selector */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* All Signals */}
                <div
                  onClick={() => setBookConfig((prev) => ({ ...prev, strategyFocus: 'ALL_SIGNALS' }))}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    bookConfig.strategyFocus === 'ALL_SIGNALS' || !bookConfig.strategyFocus
                      ? 'bg-amber-950/30 border-amber-500/80 ring-1 ring-amber-500/30'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white">{t.strategyAll || 'All Signals'}</span>
                    <span className="text-[10px] text-amber-400 font-mono">{stocks.length} Coins</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-normal">
                    {isEn ? 'Evaluates all qualified setups across AI, L1, DeFi, and Memecoins.' : 'Memindai seluruh narasi (AI, L1, DeFi, Memecoin) dengan skor tertinggi.'}
                  </p>
                </div>

                {/* Whale Inflow */}
                <div
                  onClick={() => setBookConfig((prev) => ({ ...prev, strategyFocus: 'WHALE_INFLOW' }))}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    bookConfig.strategyFocus === 'WHALE_INFLOW'
                      ? 'bg-sky-950/30 border-sky-500/80 ring-1 ring-sky-500/30'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white">{t.strategyWhale || 'Whale Accumulation'}</span>
                    <span className="text-[10px] text-sky-400 font-mono">On-Chain</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-normal">
                    {isEn ? 'Focuses on institutional wallet inflows and exchange reserve outflows.' : 'Fokus pada lonjakan akumulasi dompet bandar besar & outflow bursa.'}
                  </p>
                </div>

                {/* Breakout Momentum */}
                <div
                  onClick={() => setBookConfig((prev) => ({ ...prev, strategyFocus: 'BREAKOUT_MOMENTUM' }))}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    bookConfig.strategyFocus === 'BREAKOUT_MOMENTUM'
                      ? 'bg-emerald-950/30 border-emerald-500/80 ring-1 ring-emerald-500/30'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white">{t.strategyBreakout || 'Breakout Momentum'}</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Dynamic Res</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-normal">
                    {isEn ? 'Strong Long continuation through key resistance levels with high volume.' : 'Sinyal Strong Long penembusan level resistance EMA dengan lonjakan volume.'}
                  </p>
                </div>

                {/* Oversold Bounce */}
                <div
                  onClick={() => setBookConfig((prev) => ({ ...prev, strategyFocus: 'OVERSOLD_BOUNCE' }))}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    bookConfig.strategyFocus === 'OVERSOLD_BOUNCE'
                      ? 'bg-rose-950/30 border-rose-500/80 ring-1 ring-rose-500/30'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white">{t.strategyOversold || 'Oversold Dip'}</span>
                    <span className="text-[10px] text-rose-400 font-mono">Buy On Dip</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-normal">
                    {isEn ? 'Mean-reversion setups on deeply discounted RSI support levels.' : 'Peluang akumulasi di lembah diskon saat indikator RSI menyentuh oversold.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Sizing Model & Risk Management Parameters */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sizing Model */}
            <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Scale className="w-4 h-4 text-purple-400" />
                  <span>{t.sizingModelTitle || (isEn ? '3. Position Sizing Model' : '3. Model Ukuran Posisi')}</span>
                </h3>
                <span className="text-xs text-slate-400">
                  {isEn ? 'Mathematical formula used to calculate trade allocation' : 'Rumus matematis untuk alokasi modal dan margin setiap trade'}
                </span>
              </div>

              <div className="space-y-3">
                {/* Kelly Criterion */}
                <div
                  onClick={() => setBookConfig((prev) => ({ ...prev, sizingModel: 'KELLY_CRITERION' }))}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    bookConfig.sizingModel === 'KELLY_CRITERION' || !bookConfig.sizingModel
                      ? 'bg-purple-950/30 border-purple-500/80'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{t.modelKelly || 'Sizing Fixed Fractional (bentuk Kelly, p tidak terkalibrasi)'}</span>
                    <span className="text-[10px] text-purple-400 font-mono font-bold">Standard Pro</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    {isEn
                      ? 'Calculates optimal fraction via win probability vs payoff ratio for maximized long-term geometric compounding.'
                      : 'Menghitung fraksi optimal via probabilitas menang vs rasio payoff untuk memaksimalkan compounding modal.'}
                  </p>
                </div>

                {/* Fixed Fractional */}
                <div
                  onClick={() => setBookConfig((prev) => ({ ...prev, sizingModel: 'FIXED_FRACTIONAL' }))}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    bookConfig.sizingModel === 'FIXED_FRACTIONAL'
                      ? 'bg-purple-950/30 border-purple-500/80'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{t.modelFixed || 'Fixed Fractional (% Equity at Risk)'}</span>
                    <span className="text-[10px] text-purple-400 font-mono font-bold">Conservative</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    {isEn
                      ? 'Strict dollar loss limitation per trade based on portfolio equity and exact stop loss distance.'
                      : 'Batasan kerugian pasti per trade berdasarkan persentase modal dan jarak stop loss.'}
                  </p>
                </div>

                {/* Equal Weight */}
                <div
                  onClick={() => setBookConfig((prev) => ({ ...prev, sizingModel: 'EQUAL_WEIGHT' }))}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    bookConfig.sizingModel === 'EQUAL_WEIGHT'
                      ? 'bg-purple-950/30 border-purple-500/80'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{t.modelEqual || 'Equal Weight Allocation'}</span>
                    <span className="text-[10px] text-purple-400 font-mono font-bold">Balanced</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    {isEn
                      ? 'Divides liquid cash evenly across available slots (e.g. 25% per position on 4 slots).'
                      : 'Membagi kas likuid secara seimbang ke setiap slot posisi terbuka yang tersedia.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Core Numerical Parameters */}
            <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>{isEn ? '4. Quantitative Risk Parameters' : '4. Parameter Batas Risiko'}</span>
                  </h3>
                  <span className="text-xs text-slate-400">
                    {isEn ? 'Safety gating & threshold constraints for automated trade execution' : 'Batas pengaman dan kriteria kelayakan eksekusi posisi'}
                  </span>
                </div>
                {!isHybridMode && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                    🔒 AI CONTROLLED
                  </span>
                )}
              </div>

              {!isHybridMode ? (
                /* Pure AI: Locked / Calibrated Quantitative Gating */
                <div className="space-y-3.5 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 font-semibold">{t.maxConcurrentPos}</span>
                      <strong className="text-sky-400 font-mono text-sm">4 Slots (Diversified)</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span>{isEn ? 'Algorithm limit' : 'Batas algoritma'}</span>
                      <span className="text-sky-300/80 font-mono">Kelly optimal 4 max</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 font-semibold">{t.riskPerTrade}</span>
                      <strong className="text-amber-400 font-mono text-sm">0.50% Equity / Trade</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span>{isEn ? 'Stop distance sizing' : 'Sizing jarak stop'}</span>
                      <span className="text-amber-300/80 font-mono">Strict capital protection</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 font-semibold">{t.minRrFilter}</span>
                      <strong className="text-emerald-400 font-mono text-sm">1:2.0 Minimum</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span>{isEn ? 'Asymmetric payoff filter' : 'Filter payoff asimetris'}</span>
                      <span className="text-emerald-300/80 font-mono">Reward ≥ 2x Risk</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 font-semibold">{t.minAiConfidence}</span>
                      <strong className="text-purple-400 font-mono text-sm">75% Quality Threshold</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span>{isEn ? 'Neural Alpha score' : 'Skor Alpha neural'}</span>
                      <span className="text-purple-300/80 font-mono">High-conviction setups only</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                    {isEn
                      ? 'Note: In Pure AI mode, all risk parameters are locked to Halfy AI’s mathematical standards for fair Battle Arena benchmarking. Custom sliders and manual numeric entries are unlocked in Hybrid AI Bot mode.'
                      : 'Catatan: Pada mode Pure AI, seluruh parameter risiko terkunci pada standar matematis Halfy AI demi integritas Battle Arena. Pengaturan manual dan input angka bebas tersedia di mode Bot Hybrid AI.'}
                  </p>
                </div>
              ) : (
                /* Hybrid AI: Interactive with quick buttons PLUS manual number inputs */
                <div className="space-y-4 text-xs">
                  {/* Max Concurrent Positions */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 font-semibold">{t.maxConcurrentPos}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 text-[11px]">{isEn ? 'Current:' : 'Saat ini:'}</span>
                        <strong className="text-sky-400 font-mono text-sm">{bookConfig.maxConcurrentPositions} Slots</strong>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {[2, 4, 6, 8].map((slots) => (
                        <button
                          key={slots}
                          type="button"
                          onClick={() => setBookConfig((prev) => ({ ...prev, maxConcurrentPositions: slots }))}
                          className={`px-3 py-1.5 rounded-lg font-mono font-bold transition-colors cursor-pointer border ${
                            bookConfig.maxConcurrentPositions === slots
                              ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-sm'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                          }`}
                        >
                          {slots} Pos
                        </button>
                      ))}
                      <div className="flex items-center gap-1.5 ml-auto">
                        <span className="text-[11px] text-slate-400">{isEn ? 'Custom:' : 'Manual:'}</span>
                        <input
                          type="number"
                          min="1"
                          max="25"
                          step="1"
                          value={bookConfig.maxConcurrentPositions}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) {
                              setBookConfig((prev) => ({ ...prev, maxConcurrentPositions: Math.max(1, Math.min(25, val)) }));
                            }
                          }}
                          className="w-16 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs text-center focus:border-sky-400 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Risk Per Trade (RPT %) */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 font-semibold">{t.riskPerTrade}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 text-[11px]">{isEn ? 'Current:' : 'Saat ini:'}</span>
                        <strong className="text-amber-400 font-mono text-sm">{bookConfig.riskPerTradePercent}%</strong>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {[0.25, 0.5, 1.0, 2.0].map((rpt) => (
                        <button
                          key={rpt}
                          type="button"
                          onClick={() => setBookConfig((prev) => ({ ...prev, riskPerTradePercent: rpt }))}
                          className={`px-3 py-1.5 rounded-lg font-mono font-bold transition-colors cursor-pointer border ${
                            bookConfig.riskPerTradePercent === rpt
                              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                          }`}
                        >
                          {rpt}%
                        </button>
                      ))}
                      <div className="flex items-center gap-1.5 ml-auto">
                        <span className="text-[11px] text-slate-400">{isEn ? 'Custom %:' : 'Manual %:'}</span>
                        <input
                          type="number"
                          min="0.05"
                          max="10.0"
                          step="0.05"
                          value={bookConfig.riskPerTradePercent}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) {
                              setBookConfig((prev) => ({ ...prev, riskPerTradePercent: Math.max(0.05, Math.min(10, val)) }));
                            }
                          }}
                          className="w-16 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs text-center focus:border-amber-400 focus:outline-none"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {isEn
                        ? 'Position risk is calculated from exact distance between entry and stop loss. Allows flexible custom risk allocation.'
                        : 'Risiko posisi dihitung dari jarak pasti antara harga entry dan stop loss. Mendukung alokasi risiko bebas sesuai toleransi Anda.'}
                    </p>
                  </div>

                  {/* Min Risk to Reward Filter */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 font-semibold">{t.minRrFilter}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 text-[11px]">{isEn ? 'Current:' : 'Saat ini:'}</span>
                        <strong className="text-emerald-400 font-mono text-sm">1:{bookConfig.minRiskReward}</strong>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {[1.5, 2.0, 2.5, 3.0].map((rr) => (
                        <button
                          key={rr}
                          type="button"
                          onClick={() => setBookConfig((prev) => ({ ...prev, minRiskReward: rr }))}
                          className={`px-3 py-1.5 rounded-lg font-mono font-bold transition-colors cursor-pointer border ${
                            bookConfig.minRiskReward === rr
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                          }`}
                        >
                          1:{rr}
                        </button>
                      ))}
                      <div className="flex items-center gap-1.5 ml-auto">
                        <span className="text-[11px] text-slate-400">{isEn ? 'Custom R:R:' : 'Manual R:R:'}</span>
                        <input
                          type="number"
                          min="1.0"
                          max="10.0"
                          step="0.1"
                          value={bookConfig.minRiskReward}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) {
                              setBookConfig((prev) => ({ ...prev, minRiskReward: Math.max(1.0, Math.min(10, val)) }));
                            }
                          }}
                          className="w-16 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs text-center focus:border-emerald-400 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Min AI Confidence Score */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 font-semibold">{t.minAiConfidence}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 text-[11px]">{isEn ? 'Current:' : 'Saat ini:'}</span>
                        <strong className="text-purple-400 font-mono text-sm">{bookConfig.minAiConfidence}%</strong>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {[65, 70, 75, 80, 85].map((conf) => (
                        <button
                          key={conf}
                          type="button"
                          onClick={() => setBookConfig((prev) => ({ ...prev, minAiConfidence: conf }))}
                          className={`px-3 py-1.5 rounded-lg font-mono font-bold transition-colors cursor-pointer border ${
                            bookConfig.minAiConfidence === conf
                              ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                          }`}
                        >
                          {conf}%
                        </button>
                      ))}
                      <div className="flex items-center gap-1.5 ml-auto">
                        <span className="text-[11px] text-slate-400">{isEn ? 'Custom Score:' : 'Manual Skor:'}</span>
                        <input
                          type="number"
                          min="50"
                          max="99"
                          step="1"
                          value={bookConfig.minAiConfidence}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) {
                              setBookConfig((prev) => ({ ...prev, minAiConfidence: Math.max(50, Math.min(99, val)) }));
                            }
                          }}
                          className="w-16 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs text-center focus:border-purple-400 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section: Autopilot 24/7 — scan otomatis selama bot aktif */}
          <div className="bg-gradient-to-r from-emerald-950/30 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-2xl p-6 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <RefreshCw className={`w-4 h-4 text-emerald-400 ${isBotScanning ? 'animate-spin' : ''}`} />
                  <span>{isEn ? 'Autopilot 24/7 (Auto-Scan)' : 'Autopilot 24/7 (Scan Otomatis)'}</span>
                </h3>
                <span className="text-xs text-slate-400">
                  {isEn
                    ? 'While the bot is active, it monitors TP/SL and opens new positions automatically — works for both Pure AI and Hybrid archetypes. Manual mode is unaffected.'
                    : 'Selama bot aktif, bot memantau TP/SL dan membuka posisi baru secara otomatis — berlaku untuk archetype Pure AI maupun Hybrid. Mode Manual tidak terpengaruh.'}
                </span>
              </div>
              <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                bookConfig.isActive && (bookConfig.autoScanIntervalSec || 0) > 0
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {bookConfig.isActive && (bookConfig.autoScanIntervalSec || 0) > 0
                  ? (isEn ? 'RUNNING' : 'BERJALAN')
                  : (isEn ? 'OFF' : 'MATI')}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[0, 30, 60, 120, 300].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setBookConfig((prev) => ({ ...prev, autoScanIntervalSec: sec }))}
                  className={`py-1.5 rounded-lg font-mono font-bold text-xs transition-colors cursor-pointer border ${
                    (bookConfig.autoScanIntervalSec || 0) === sec
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {sec === 0 ? (isEn ? 'Off' : 'Mati') : sec < 60 ? `${sec}s` : `${sec / 60}m`}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">
              {bookLastScanAt
                ? (isEn ? `Last scan: ${bookLastScanAt.toLocaleTimeString(isEn ? 'en-US' : 'id-ID')}` : `Scan terakhir: ${bookLastScanAt.toLocaleTimeString('id-ID')}`)
                : (isEn ? 'No automatic scan executed yet in this session.' : 'Belum ada scan otomatis di sesi ini.')}
            </p>
          </div>

          {/* Section 4: Hybrid Custom Calibration Controls */}
          {bookConfig.archetype === 'HYBRID' && (
            <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/50 rounded-2xl p-6 shadow-md space-y-4 animate-in fade-in duration-200">
              <div className="border-b border-purple-800/60 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-purple-400" />
                    <span>{isEn ? 'Hybrid Mode User Calibration' : 'Kalibrasi Khusus Mode Hybrid'}</span>
                  </h3>
                  <span className="text-xs text-slate-400">
                    {isEn ? 'Fine-tune AI quantitative suggestions with discretionary overrides' : 'Sesuaikan bobot rekomendasi AI dengan preferensi risiko personal Anda'}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  HYBRID ACTIVE
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                {/* Risk Multiplier Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 font-semibold">{isEn ? 'Risk Multiplier' : 'Multiplier Risiko'}:</span>
                    <strong className="text-purple-400 font-mono text-sm">{bookConfig.hybridRiskMultiplier || 1.25}x</strong>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.25"
                    value={bookConfig.hybridRiskMultiplier || 1.25}
                    onChange={(e) => setBookConfig((prev) => ({ ...prev, hybridRiskMultiplier: parseFloat(e.target.value) }))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>0.5x (Safe)</span>
                    <span>1.0x (Normal)</span>
                    <span>2.0x (Aggressive)</span>
                  </div>
                </div>

                {/* Trailing Stop % */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 font-semibold">{isEn ? 'Trailing Stop Buffer' : 'Buffer Trailing Stop'}:</span>
                    <strong className="text-emerald-400 font-mono text-sm">{bookConfig.trailingStopPercent || 2.5}%</strong>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="5.0"
                    step="0.5"
                    value={bookConfig.trailingStopPercent || 2.5}
                    onChange={(e) => setBookConfig((prev) => ({ ...prev, trailingStopPercent: parseFloat(e.target.value) }))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>1.0% (Tight)</span>
                    <span>2.5% (Standard)</span>
                    <span>5.0% (Wide)</span>
                  </div>
                </div>

                {/* 1-Click Confirmation Toggle */}
                <div className="flex flex-col justify-center space-y-2 bg-slate-900/80 p-3.5 rounded-xl border border-purple-500/30">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bookConfig.hybridRequireConfirmation || false}
                      onChange={(e) => setBookConfig((prev) => ({ ...prev, hybridRequireConfirmation: e.target.checked }))}
                      className="w-4 h-4 rounded text-purple-500 accent-purple-500 cursor-pointer"
                    />
                    <span className="font-semibold text-white text-xs">
                      {isEn ? 'Require 1-Click Approval' : 'Wajibkan Persetujuan 1-Klik'}
                    </span>
                  </label>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    {isEn ? 'Bot alerts and prepares order, waiting for single user tap to execute.' : 'Bot menyusun order dan menunggu satu ketukan konfirmasi Anda sebelum masuk ke pasar.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Save & Run Test Scan Bar */}
          <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {isEn
                  ? 'All settings persist locally in your terminal and update live sizing algorithms immediately.'
                  : 'Seluruh konfigurasi tersimpan aman secara lokal di terminal dan langsung mengaktifkan kalkulasi sizing.'}
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => scanCurrentBook(false, true)}
                disabled={isBotScanning}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 w-full sm:w-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isBotScanning ? 'animate-spin' : ''}`} />
                <span>{isBotScanning ? t.scanningText : (isEn ? 'Test Scan with Current Settings' : 'Uji Scan dengan Pengaturan Ini')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowBotSettingsPanel(false);
                  if (portfolioMode === 'settings') setPortfolioMode(isHybridMode ? 'hybrid' : 'bot');
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white border border-slate-700 bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer w-full sm:w-auto"
              >
                <span>{isEn ? 'Close' : 'Tutup'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleSaveBotSettings(bookConfig);
                  setShowBotSettingsPanel(false);
                  if (portfolioMode === 'settings') setPortfolioMode(isHybridMode ? 'hybrid' : 'bot');
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
              >
                <Check className="w-4 h-4" />
                <span>{t.saveSettingsBtn || (isEn ? 'Save & Apply' : 'Simpan & Terapkan')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* =========================================================================
          VIEW MODE 4: BATTLE ARENA (3-WAY COMPARISON: PURE AI VS HYBRID VS MANUAL)
         ========================================================================= */}
      {portfolioMode === 'battle' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Battle Arena Header */}
          <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-800/60 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <Swords className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    {t.battleTitle}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
                  {isEn
                    ? '3-Way Battle Arena: Compare discretionary manual trading against pure algorithmic AI execution and calibrated Hybrid models.'
                    : 'Arena Perbandingan 3 Sistem: Bandingkan trading manual diskresioner vs bot Pure AI otomatis vs model Hybrid terkalibrasi.'}
                </p>
              </div>

              {/* Alpha Indicator Card */}
              <div className="bg-slate-900 border border-purple-500/40 rounded-xl p-4 text-right shrink-0">
                <span className="text-[10px] text-slate-400 block">{t.alphaSpreadText}</span>
                <span
                  className={`text-xl font-black font-mono tabular-nums ${
                    alphaSpread >= 0 ? 'text-purple-400' : 'text-rose-400'
                  }`}
                >
                  {alphaSpread >= 0 ? '+' : ''}${alphaSpread.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {alphaSpread >= 0 ? t.botLeading : t.manualLeading}
                </span>
              </div>
            </div>
          </div>

          {/* 3-Way Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Fighter 1: Manual Trader */}
            <div className="bg-[#0b1322] border border-amber-500/30 rounded-2xl p-6 space-y-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-amber-400" />
                    <h3 className="text-base font-bold text-white">{t.fighterManual}</h3>
                  </div>
                  <span className="text-xs font-bold text-amber-400 bg-amber-950/70 px-2 py-0.5 rounded border border-amber-800/60">
                    DISCRETIONARY
                  </span>
                </div>

                <div className="space-y-3 text-xs mt-4">
                  <div className="flex justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">{t.totalNetWorth}:</span>
                    <strong className="text-white text-sm font-mono tabular-nums">${manualTotalEquity.toLocaleString()}</strong>
                  </div>

                  <div className="flex justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">{t.pnlTitle}:</span>
                    <strong className={`text-sm font-mono tabular-nums ${manualTotalPnLOverall >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {manualTotalPnLOverall >= 0 ? '+' : ''}${manualTotalPnLOverall.toLocaleString()}
                    </strong>
                  </div>

                  <div className="flex justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">{t.winrateTitle}:</span>
                    <strong className="text-emerald-400 text-sm font-mono tabular-nums">{manualWinRate}% ({manualWinningTrades}/{closedTrades.length})</strong>
                  </div>

                  <div className="flex justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">{t.positionsValue}:</span>
                    <strong className="text-slate-200 font-mono">{portfolio.length} Assets</strong>
                  </div>

                  <div className="flex justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">{t.executionStyle}:</span>
                    <span className="text-amber-300 font-medium">{t.styleManualDesc}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
                {isEn ? 'Full user discretion on entry timing, margin percentage, and trade closures.' : 'Kendali penuh pengguna dalam penentuan margin, titik beli, dan penutupan posisi.'}
              </div>
            </div>

            {/* Fighter 2: Pure AI Autonomous Bot */}
            <div className="bg-[#0b1322] border border-sky-500/30 rounded-2xl p-6 space-y-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-sky-400" />
                    <h3 className="text-base font-bold text-white">{t.fighterBot}</h3>
                  </div>
                  <span className="text-xs font-bold text-sky-400 bg-sky-950/70 px-2 py-0.5 rounded border border-sky-800/60">
                    PURE ALGO
                  </span>
                </div>

                <div className="space-y-3 text-xs mt-4">
                  <div className="flex justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">{t.totalNetWorth}:</span>
                    <strong className="text-white text-sm font-mono tabular-nums">${botTotalEquity.toLocaleString()}</strong>
                  </div>

                  <div className="flex justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">{t.pnlTitle}:</span>
                    <strong className={`text-sm font-mono tabular-nums ${botTotalPnLOverall >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {botTotalPnLOverall >= 0 ? '+' : ''}${botTotalPnLOverall.toLocaleString()}
                    </strong>
                  </div>

                  <div className="flex justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">{t.winrateTitle}:</span>
                    <strong className="text-emerald-400 text-sm font-mono tabular-nums">{botWinRate}% ({botWinningTrades}/{botClosedTrades.length})</strong>
                  </div>

                  <div className="flex justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">{t.positionsValue}:</span>
                    <strong className="text-slate-200 font-mono">{botPositions.length} Assets (Cap {botConfig.maxConcurrentPositions})</strong>
                  </div>

                  <div className="flex justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">{t.executionStyle}:</span>
                    <span className="text-sky-300 font-medium">{t.styleBotDesc}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
                {isEn ? 'Fixed-fractional sizing from actual stop distance (Kelly-form with assumed, uncalibrated p), deterministic quantitative gates.' : 'Sizing fixed-fractional dari jarak stop aktual (bentuk Kelly dengan p asumsi, tidak terkalibrasi), gate kuantitatif deterministik.'}
              </div>
            </div>

            {/* Fighter 3: Hybrid System (AI + User Calibration) */}
            <div className="bg-[#0b1322] border border-purple-500/40 rounded-2xl p-6 space-y-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-400" />
                    <h3 className="text-base font-bold text-white">{isEn ? 'Hybrid AI System' : 'Sistem Hybrid AI'}</h3>
                  </div>
                  <span className="text-xs font-bold text-purple-400 bg-purple-950/70 px-2 py-0.5 rounded border border-purple-800/60">
                    AI + CALIBRATION
                  </span>
                </div>

                <div className="space-y-3 text-xs mt-4">
                  {hybridHasTrackRecord ? (
                    <>
                      <div className="flex justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-slate-400">{t.totalNetWorth}:</span>
                        <strong className="text-white text-sm font-mono tabular-nums">${hybridTotalEquity.toLocaleString()}</strong>
                      </div>

                      <div className="flex justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-slate-400">{t.pnlTitle} Hybrid:</span>
                        <strong className={`text-sm font-mono tabular-nums ${hybridTotalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {hybridTotalPnL >= 0 ? '+' : ''}${hybridTotalPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                      </div>

                      <div className="flex justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-slate-400">{isEn ? 'Realized / Unrealized:' : 'Realisasi / Belum Realisasi:'}</span>
                        <strong className="text-slate-200 font-mono text-sm">
                          {hybridRealizedPnL >= 0 ? '+' : ''}${hybridRealizedPnL.toLocaleString()} / {hybridUnrealizedPnL >= 0 ? '+' : ''}${hybridUnrealizedPnL.toLocaleString()}
                        </strong>
                      </div>

                      <div className="flex justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-slate-400">{t.winrateTitle} Hybrid:</span>
                        <strong className="text-purple-400 text-sm font-mono tabular-nums">
                          {hybridWinRate}% ({hybridWinningTrades}/{hybridClosedTrades.length} {isEn ? 'closed' : 'selesai'})
                        </strong>
                      </div>

                      <div className="flex justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-slate-400">{t.positionsValue}:</span>
                        <strong className="text-slate-200 font-mono">{hybridOpenPositions.length} {isEn ? 'open hybrid positions' : 'posisi hybrid terbuka'}</strong>
                      </div>

                      <div className="flex justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-slate-400">{isEn ? 'User Multiplier' : 'Multiplier Risiko'}:</span>
                        <strong className="text-purple-300 font-mono">{hybridConfig.hybridRiskMultiplier || 1.25}x Base Kelly</strong>
                      </div>

                      <div className="flex justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-slate-400">{t.executionStyle}:</span>
                        <span className="text-purple-300 font-medium">
                          {isEn ? 'AI Alpha Signals + User Overrides' : 'Sinyal AI Radar + Override Pengguna'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 rounded-lg bg-slate-900/60 border border-dashed border-purple-800/50 text-center">
                      <p className="text-slate-300 text-xs leading-relaxed">
                        {isEn
                          ? 'The Hybrid book is empty. Open the Hybrid AI Bot mode and run a scan — it trades its own capital with your risk multiplier, and results appear here.'
                          : 'Buku Hybrid masih kosong. Buka mode Bot Hybrid AI dan jalankan scan — dia trading dengan modal sendiri dan multiplier risikomu; hasilnya tampil di sini.'}
                      </p>
                      <p className="text-purple-300 text-[11px] font-mono mt-2 uppercase tracking-wider">
                        {isEn ? 'No fabricated numbers' : 'Tanpa angka karangan'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
                {isEn ? 'Combines high-confidence quantitative picks with user discretionary risk tuning.' : 'Menggabungkan sinyal berprobabilitas tinggi dengan penyetelan risiko oleh trader.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: RESET SIMULATION (CUSTOM STARTING CASH / CLEAN SLATE WIPE)
         ========================================================================= */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0b1322] border border-rose-500/40 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {t.resetModalTitle || (isEn ? 'Reset Simulation State' : 'Reset Data Simulasi Portofolio')}
                  </h3>
                  <span className="text-xs text-slate-400">
                    {t.resetModalDesc || (isEn ? 'Start fresh from $0 or custom starting cash' : 'Mulai kembali dari nol atau tentukan saldo modal awal')}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="text-slate-400 hover:text-white text-base p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scope Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                {t.resetScopeLabel || (isEn ? 'Select Reset Scope:' : 'Pilih Cakupan Reset:')}
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setResetScope('all')}
                  className={`py-2 px-2 rounded-xl font-bold transition-all border cursor-pointer ${
                    resetScope === 'all'
                      ? 'bg-rose-500 text-white border-rose-400 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {t.resetScopeAll || (isEn ? 'All (Manual + Bot)' : 'Semua (Manual & Bot)')}
                </button>
                <button
                  type="button"
                  onClick={() => setResetScope('manual')}
                  className={`py-2 px-2 rounded-xl font-bold transition-all border cursor-pointer ${
                    resetScope === 'manual'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {t.resetScopeManual || (isEn ? 'Manual Only' : 'Manual Saja')}
                </button>
                <button
                  type="button"
                  onClick={() => setResetScope('bot')}
                  className={`py-2 px-2 rounded-xl font-bold transition-all border cursor-pointer ${
                    resetScope === 'bot'
                      ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {t.resetScopeBot || (isEn ? 'AI Bot Only' : 'AI Bot Saja')}
                </button>
                <button
                  type="button"
                  onClick={() => setResetScope('hybrid')}
                  className={`py-2 px-2 rounded-xl font-bold transition-all border cursor-pointer ${
                    resetScope === 'hybrid'
                      ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {isEn ? 'Hybrid Only' : 'Hybrid Saja'}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <History className="w-3 h-3 text-slate-500" />
                {isEn
                  ? 'Before wiping, the running session is archived to Session History for later analysis.'
                  : 'Sebelum dihapus, sesi yang berjalan diarsipkan ke Riwayat Sesi untuk analisis lebih lanjut.'}
              </p>
            </div>

            {/* Initial Starting Cash Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="font-semibold text-slate-300">
                  {t.initialCashChoice || (isEn ? 'Initial Liquidity Balance ($ USDT):' : 'Modal Likuiditas Awal ($ USDT):')}
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  ${resetCashInput.toLocaleString()} USDT
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-mono">$</span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={resetCashInput}
                  onChange={(e) => setResetCashInput(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-7 pr-3 text-white text-xs font-mono font-bold focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { label: isEn ? '$0 (Clean Slate)' : '$0 (Mulai dari Nol)', val: 0 },
                  { label: '$10,000', val: 10000 },
                  { label: '$25,000 (Default)', val: 25000 },
                  { label: '$50,000', val: 50000 },
                  { label: '$100,000', val: 100000 },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => setResetCashInput(preset.val)}
                    className={`text-[10px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                      resetCashInput === preset.val
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 font-bold'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Warning Note */}
            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-900/50 flex items-start gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <p className="leading-relaxed">
                {isEn
                  ? 'This will wipe all active positions, closed trade history, and bot logs within the chosen scope. Custom bot strategy configurations will be preserved.'
                  : 'Tindakan ini akan menghapus seluruh posisi aktif, riwayat trade tertutup, dan log bot pada cakupan yang dipilih. Pengaturan strategi bot tetap dipertahankan.'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 cursor-pointer"
              >
                {t.cancelBtn}
              </button>
              <button
                type="button"
                onClick={handleExecuteReset}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-lg cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t.confirmResetBtn || (isEn ? 'Confirm Reset & Restart' : 'Konfirmasi Reset & Mulai Ulang')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: RIWAYAT SESI (ARSIP HASIL RESET UNTUK ANALISIS)
         ========================================================================= */}
      {showSessionArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0b1322] border border-sky-500/40 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {isEn ? 'Session History (Archived on Reset)' : 'Riwayat Sesi (Diarsipkan saat Reset)'}
                  </h3>
                  <span className="text-xs text-slate-400">
                    {isEn
                      ? 'Every reset archives the finished session here — compare books, review closed trades, analyze what worked.'
                      : 'Setiap reset mengarsipkan sesi yang selesai ke sini — bandingkan buku, tinjau trade tertutup, analisis apa yang berhasil.'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowSessionArchive(false)}
                className="text-slate-400 hover:text-white text-xl leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            {sessionArchive.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                {isEn
                  ? 'No archived sessions yet. They are created automatically every time you run a reset.'
                  : 'Belum ada sesi terarsip. Arsip dibuat otomatis setiap kali kamu menjalankan reset.'}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Grafik pertumbuhan ekuitas lintas sesi (tertua → terbaru) */}
                {(() => {
                  const chrono = [...sessionArchive].reverse();
                  const W = 640, H = 170, PAD_L = 8, PAD_R = 56, PAD_Y = 14;
                  const series = [
                    { key: 'manual' as const, color: '#fbbf24', label: isEn ? 'Manual' : 'Manual' },
                    { key: 'bot' as const, color: '#38bdf8', label: isEn ? 'Pure AI' : 'Pure AI' },
                    { key: 'hybrid' as const, color: '#c084fc', label: isEn ? 'Hybrid' : 'Hybrid' },
                  ];
                  const equities = chrono.flatMap((s) => [s.manual.finalEquity, s.bot.finalEquity, s.hybrid.finalEquity]);
                  const minV = Math.min(...equities, 0);
                  const maxV = Math.max(...equities, 1);
                  const span = maxV - minV || 1;
                  const xAt = (i: number) => PAD_L + (chrono.length === 1 ? (W - PAD_L - PAD_R) / 2 : (i * (W - PAD_L - PAD_R)) / (chrono.length - 1));
                  const yAt = (v: number) => PAD_Y + (1 - (v - minV) / span) * (H - 2 * PAD_Y);
                  return (
                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] text-slate-300 font-bold uppercase tracking-wider">
                          {isEn ? 'Equity Growth Across Sessions' : 'Pertumbuhan Ekuitas Lintas Sesi'}
                        </span>
                        <div className="flex items-center gap-3 text-[10px] font-mono">
                          {series.map((s) => (
                            <span key={s.key} className="flex items-center gap-1" style={{ color: s.color }}>
                              <span className="inline-block w-2 h-2 rounded-full" style={{ background: s.color }} />
                              {s.label}
                            </span>
                          ))}
                        </div>
                      </div>
                      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[150px]" preserveAspectRatio="none">
                        <line x1={PAD_L} y1={yAt(0)} x2={W - PAD_R} y2={yAt(0)} stroke="#334155" strokeDasharray="4 4" strokeWidth="1" />
                        <text x={W - PAD_R + 4} y={yAt(0) + 3} fill="#64748b" fontSize="9">$0</text>
                        {series.map((s) => {
                          const pts = chrono.map((sess, i) => `${xAt(i)},${yAt(sess[s.key].finalEquity)}`).join(' ');
                          const last = chrono[chrono.length - 1];
                          return (
                            <g key={s.key}>
                              <polyline points={pts} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" />
                              {chrono.map((sess, i) => (
                                <circle key={i} cx={xAt(i)} cy={yAt(sess[s.key].finalEquity)} r="3" fill={s.color}>
                                  <title>{`${s.label} · ${new Date(sess.endedAt).toLocaleString(isEn ? 'en-US' : 'id-ID')} · $${sess[s.key].finalEquity.toLocaleString()}`}</title>
                                </circle>
                              ))}
                              <text x={xAt(chrono.length - 1) + 6} y={yAt(last[s.key].finalEquity) + 3} fill={s.color} fontSize="9">
                                ${Math.round(last[s.key].finalEquity).toLocaleString()}
                              </text>
                            </g>
                          );
                        })}
                        {chrono.map((sess, i) => (
                          <text key={i} x={xAt(i)} y={H - 2} fill="#64748b" fontSize="8" textAnchor="middle">
                            #{i + 1}
                          </text>
                        ))}
                      </svg>
                      <p className="text-[10px] text-slate-500 mt-1">
                        {isEn
                          ? `Equity at archive time per book, oldest (#1) to newest (#${chrono.length}). Hover dots for exact values.`
                          : `Ekuitas saat arsip per buku, tertua (#1) ke terbaru (#${chrono.length}). Arahkan kursor ke titik untuk nilai persis.`}
                      </p>
                    </div>
                  );
                })()}

                {sessionArchive.map((session) => {
                  const expanded = expandedSessionId === session.id;
                  const books: Array<{ key: string; label: string; color: string; snap: SessionBookSnapshot }> = [
                    { key: 'manual', label: isEn ? 'Manual' : 'Manual', color: 'text-amber-300', snap: session.manual },
                    { key: 'bot', label: isEn ? 'Pure AI Bot' : 'Bot Pure AI', color: 'text-sky-300', snap: session.bot },
                    { key: 'hybrid', label: isEn ? 'Hybrid Bot' : 'Bot Hybrid', color: 'text-purple-300', snap: session.hybrid },
                  ];
                  return (
                    <div key={session.id} className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedSessionId(expanded ? null : session.id)}
                        className="w-full flex items-center justify-between p-3.5 hover:bg-slate-900 transition-colors cursor-pointer text-left"
                      >
                        <div>
                          <span className="text-xs font-bold text-white font-mono">
                            {new Date(session.endedAt).toLocaleString(isEn ? 'en-US' : 'id-ID')}
                          </span>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider ml-2">
                            {isEn ? 'scope' : 'cakupan'}: {session.scope}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-[11px] font-mono">
                          <span className="text-amber-300">M: {session.manual.finalEquity >= 0 ? '+' : ''}{session.manual.finalEquity.toLocaleString()}</span>
                          <span className="text-sky-300">AI: {session.bot.finalEquity >= 0 ? '+' : ''}{session.bot.finalEquity.toLocaleString()}</span>
                          <span className="text-purple-300">H: {session.hybrid.finalEquity >= 0 ? '+' : ''}{session.hybrid.finalEquity.toLocaleString()}</span>
                          <span className="text-slate-500">{expanded ? '▲' : '▼'}</span>
                        </div>
                      </button>

                      {expanded && (
                        <div className="p-3.5 pt-0 space-y-3">
                          <div className="grid grid-cols-3 gap-2">
                            {books.map((b) => (
                              <div key={b.key} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${b.color}`}>{b.label}</span>
                                <div className="text-[11px] text-slate-300 font-mono">
                                  {isEn ? 'Equity' : 'Ekuitas'}: <strong>${b.snap.finalEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                </div>
                                <div className={`text-[11px] font-mono ${b.snap.realizedPnL + b.snap.openPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  P&L: {b.snap.realizedPnL + b.snap.openPnL >= 0 ? '+' : ''}${(b.snap.realizedPnL + b.snap.openPnL).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  <span className="text-slate-500"> ({isEn ? 'real' : 'real'} {b.snap.realizedPnL >= 0 ? '+' : ''}{b.snap.realizedPnL.toLocaleString()} / {isEn ? 'open' : 'open'} {b.snap.openPnL >= 0 ? '+' : ''}{b.snap.openPnL.toLocaleString()})</span>
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono">
                                  {isEn ? 'Winrate' : 'Winrate'}: {b.snap.winrate}% ({b.snap.wins}/{b.snap.closedTrades.length})
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono">
                                  {isEn ? 'Open at archive' : 'Posisi saat arsip'}: {b.snap.openPositions}
                                </div>
                              </div>
                            ))}
                          </div>

                          {(['manual', 'bot', 'hybrid'] as const).map((bk) =>
                            session[bk].closedTrades.length > 0 ? (
                              <div key={bk}>
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono block mb-1.5">
                                  {bk === 'manual' ? (isEn ? 'Manual closed trades' : 'Trade tertutup Manual') : bk === 'bot' ? (isEn ? 'Pure AI closed trades' : 'Trade tertutup Pure AI') : (isEn ? 'Hybrid closed trades' : 'Trade tertutup Hybrid')} ({session[bk].closedTrades.length})
                                </span>
                                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                                  {session[bk].closedTrades.map((c) => (
                                    <div key={c.id} className="flex items-center justify-between px-3 py-1.5 rounded bg-slate-950/60 border border-slate-800/70 text-[11px] font-mono">
                                      <span className="text-slate-200 font-bold">{c.symbol}</span>
                                      <span className="text-slate-500">{c.closeReason === 'TAKE_PROFIT' ? 'TP' : c.closeReason === 'STOP_LOSS' ? 'SL' : 'EXIT'} @ {c.closePrice.toLocaleString()}</span>
                                      <span className="text-slate-500">{(c.dateClosed || '').slice(0, 10)}</span>
                                      <strong className={c.realizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                        {c.realizedPnL >= 0 ? '+' : ''}${c.realizedPnL.toLocaleString()} ({c.realizedPnLPercent >= 0 ? '+' : ''}{c.realizedPnLPercent.toFixed(1)}%)
                                      </strong>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD / PENGAMBILAN POSISI MANUAL DENGAN MARGIN % SLIDER
         ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0b1322] border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono">
                    {t.newPositionModalTitle}
                  </h3>
                  <span className="text-xs text-slate-400">{t.newPositionModalDesc}</span>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-base p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Available Liquidity Indicator Banner */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between font-mono text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Wallet className="w-4 h-4 text-sky-400" />
                <span>{t.balanceLiquidity}:</span>
              </div>
              <div className="text-right">
                <strong className="text-sky-300 font-bold text-sm block">
                  ${liquidityBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                </strong>
                <span className="text-[10px] text-slate-400 font-sans">{t.freeCashEntry}</span>
              </div>
            </div>

            {/* Imported AI Signal Badge Info */}
            {activeImportedSignal && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between font-mono">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>AI Signal: {activeImportedSignal.action}</span>
                  </span>
                  <span className="text-[10px] text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60">
                    Confidence: {activeImportedSignal.confidenceScore}% · R:R 1:{activeImportedSignal.riskRewardRatio}
                  </span>
                </div>
                <div className="text-slate-300 leading-relaxed font-sans text-[11px]">
                  {activeImportedSignal.thesis}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmitAdd} className="space-y-4 text-xs sm:text-sm font-sans">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">{t.colCoin}</label>
                <select
                  value={symbolInput}
                  onChange={(e) => handleSelectCandidate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono text-xs cursor-pointer focus:border-amber-400 outline-none"
                  required
                >
                  <option value="">{t.selectCoinPlaceholder}</option>
                  {stocks.map((c) => (
                    <option key={c.symbol} value={c.symbol}>
                      {c.symbol} ({c.name}) - {formatPrice(c.currentPrice)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Margin % from Liquidity Calculator */}
              <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between font-mono">
                  <div className="flex items-center gap-1.5 text-slate-200 font-bold text-xs">
                    <Percent className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t.marginPercentLabel}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-amber-400 font-bold text-base">{marginPercentInput}%</span>
                    <span className="text-slate-400 text-xs">(${modalAllocAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT)</span>
                  </div>
                </div>

                <input
                  type="range"
                  min="1"
                  max="100"
                  step="1"
                  value={marginPercentInput}
                  onChange={(e) => applyMarginPercent(parseFloat(e.target.value), buyPriceInput)}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />

                <div className="flex items-center gap-1.5 pt-1 overflow-x-auto scrollbar-none">
                  {[
                    { label: '10%', val: 10 },
                    { label: '15%', val: 15 },
                    { label: '25%', val: 25 },
                    { label: '50%', val: 50 },
                    { label: '75%', val: 75 },
                    { label: 'MAX (100%)', val: 100 },
                  ].map((preset) => (
                    <button
                      type="button"
                      key={preset.label}
                      onClick={() => applyMarginPercent(preset.val, buyPriceInput)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold transition-colors cursor-pointer shrink-0 ${
                        marginPercentInput === preset.val
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price and Calculated Quantity Fields */}
              <div className="grid grid-cols-2 gap-3 font-mono">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5 font-sans text-xs">
                    {t.colEntryPrice} ($)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={buyPriceInput}
                    onChange={(e) => {
                      const newPrice = parseFloat(e.target.value) || 0;
                      setBuyPriceInput(newPrice);
                      applyMarginPercent(marginPercentInput, newPrice);
                    }}
                    placeholder="Contoh: 76970"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:border-amber-400 outline-none"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Live Binance tick</span>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5 font-sans text-xs">
                    {t.calculatedUnits}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.00000001"
                    value={quantityInput}
                    onChange={(e) => handleQuantityChange(parseFloat(e.target.value) || 0, buyPriceInput)}
                    placeholder="Contoh: 0.25 atau 15"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:border-amber-400 outline-none"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Units</span>
                </div>
              </div>

              {/* Target Price & Stop Loss */}
              <div className="grid grid-cols-2 gap-3 font-mono">
                <div>
                  <label className="block text-slate-400 mb-1 font-sans text-xs flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Target Price (TP $)</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={targetPriceInput}
                    onChange={(e) => setTargetPriceInput(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:border-emerald-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-sans text-xs flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
                    <span>Stop Loss (SL $)</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={stopLossInput}
                    onChange={(e) => setStopLossInput(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:border-rose-400 outline-none"
                  />
                </div>
              </div>

              {/* Order Execution Margin Summary */}
              {(() => {
                const totalCostNeeded = Math.round(quantityInput * buyPriceInput * 100) / 100;
                const isOverBudget = totalCostNeeded > liquidityBalance;

                return (
                  <div className="space-y-2">
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center justify-between font-mono text-xs">
                      <div>
                        <span className="text-slate-400 block">{t.executionCapital}:</span>
                        <span className="text-[10px] text-slate-500">{t.remainingLiquidity}:</span>
                      </div>
                      <div className="text-right">
                        <span className={`font-bold text-sm block ${isOverBudget ? 'text-rose-400' : 'text-white'}`}>
                          ${totalCostNeeded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className={`text-[10px] ${isOverBudget ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                          ${Math.max(0, liquidityBalance - totalCostNeeded).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                        </span>
                      </div>
                    </div>

                    {isOverBudget && (
                      <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 font-sans">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                        <span>{t.overBudgetWarning}</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-semibold rounded-lg hover:bg-slate-700 text-xs cursor-pointer"
                >
                  {t.cancelBtn}
                </button>
                <button
                  type="submit"
                  disabled={quantityInput * buyPriceInput > liquidityBalance || quantityInput <= 0}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-xs shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t.confirmPositionBtn}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: KONFIRMASI TUTUP POSISI / CLOSE TRADE ================= */}
      {positionToClose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0b1322] border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <LogOut className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono">
                    {t.closeTradeModalTitle} {positionToClose.symbol}
                  </h3>
                  <span className="text-xs text-slate-400">{t.closeTradeModalDesc}</span>
                </div>
              </div>
              <button
                onClick={() => setPositionToClose(null)}
                className="text-slate-400 hover:text-white text-base p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {(() => {
              const exitPrice = customExitPrice || positionToClose.currentPrice;
              const cost = positionToClose.quantity * positionToClose.averageBuyPrice;
              const closeVal = positionToClose.quantity * exitPrice;
              const realizedPnL = closeVal - cost;
              const realizedPnLPercent = cost > 0 ? (realizedPnL / cost) * 100 : 0;
              const isProfit = realizedPnL >= 0;

              return (
                <div className="space-y-3.5">
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2.5 font-mono text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>{t.colQuantity}:</span>
                      <strong className="text-white">{positionToClose.quantity} Coins</strong>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>{t.colEntryPrice}:</span>
                      <span className="text-slate-300">{formatPrice(positionToClose.averageBuyPrice)}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>{t.colExitPrice} (Live):</span>
                      <span className="text-white font-bold">{formatPrice(exitPrice)}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm">
                      <span className="text-slate-300 font-sans font-semibold">{t.colRealizedPnl}:</span>
                      <div className="text-right">
                        <div className={`font-bold font-mono ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isProfit ? '+' : ''}${realizedPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className={`text-xs font-semibold font-mono ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {isProfit ? '+' : ''}{realizedPnLPercent.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                    <div className="pt-1 text-[11px] text-sky-400">
                      {isEn ? 'Refund to Cash Liquidity:' : 'Pengembalian ke Kas Likuiditas:'} +${closeVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                    </div>
                  </div>

                  <div className="space-y-2 font-sans text-xs">
                    <label className="block text-slate-300 font-semibold">{t.colCloseReason}:</label>
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 p-2 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer hover:border-slate-700">
                        <input
                          type="radio"
                          name="closeReason"
                          checked={closeReason === 'TAKE_PROFIT'}
                          onChange={() => setCloseReason('TAKE_PROFIT')}
                          className="accent-emerald-500 cursor-pointer"
                        />
                        <span className="text-slate-200">{t.reasonTp}</span>
                      </label>

                      <label className="flex items-center gap-2 p-2 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer hover:border-slate-700">
                        <input
                          type="radio"
                          name="closeReason"
                          checked={closeReason === 'STOP_LOSS'}
                          onChange={() => setCloseReason('STOP_LOSS')}
                          className="accent-rose-500 cursor-pointer"
                        />
                        <span className="text-slate-200">{t.reasonSl}</span>
                      </label>

                      <label className="flex items-center gap-2 p-2 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer hover:border-slate-700">
                        <input
                          type="radio"
                          name="closeReason"
                          checked={closeReason === 'MANUAL_EXIT'}
                          onChange={() => setCloseReason('MANUAL_EXIT')}
                          className="accent-amber-500 cursor-pointer"
                        />
                        <span className="text-slate-200">{t.reasonManual}</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2.5 font-sans">
                    <button
                      type="button"
                      onClick={() => setPositionToClose(null)}
                      className="px-4 py-2 bg-slate-800 text-slate-300 font-semibold rounded-lg hover:bg-slate-700 text-xs cursor-pointer"
                    >
                      {t.cancelBtn}
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmCloseTrade}
                      className="px-5 py-2 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-lg text-xs shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{t.confirmCloseTradeBtn}</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ================= MODAL: KELOLA SALDO LIKUIDITAS ================= */}
      {showLiquidityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0b1322] border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono">
                    {t.manageCashTitle}
                  </h3>
                  <span className="text-xs text-slate-400">{t.freeCashEntry}</span>
                </div>
              </div>
              <button
                onClick={() => setShowLiquidityModal(false)}
                className="text-slate-400 hover:text-white text-base p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCustomLiquidity} className="space-y-4 text-xs sm:text-sm font-sans">
              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 flex justify-between items-center font-mono">
                <span className="text-slate-400">{t.balanceLiquidity}:</span>
                <strong className="text-white text-base">${liquidityBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</strong>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-2">{t.quickDepositLabel}</label>
                <div className="grid grid-cols-3 gap-2 font-mono">
                  {[2500, 5000, 10000].map((amt) => (
                    <button
                      type="button"
                      key={amt}
                      onClick={() => {
                        handleQuickDeposit(amt);
                        setShowLiquidityModal(false);
                      }}
                      className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold border border-slate-700 text-xs transition-colors cursor-pointer"
                    >
                      +${amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <label className="block text-slate-300 font-semibold mb-1.5">{t.customCashLabel}</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={customLiquidityInput}
                  onChange={(e) => setCustomLiquidityInput(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono text-xs focus:border-sky-400 outline-none"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowLiquidityModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-semibold rounded-lg hover:bg-slate-700 text-xs cursor-pointer"
                >
                  {t.cancelBtn}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg text-xs shadow-md cursor-pointer"
                >
                  {t.saveCashBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: BOT SCAN & EXECUTION AUDIT REPORT ================= */}
      {showAuditModal && scanAuditReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0b1322] border border-sky-500/40 rounded-2xl max-w-4xl w-full p-6 space-y-4 shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${
                    isHybridMode
                      ? 'bg-purple-500/15 border-purple-500/40 text-purple-400'
                      : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                  }`}
                >
                  <TradingRobotMascot
                    variant={isHybridMode ? 'hybrid' : 'pure_ai'}
                    state={isBotScanning ? 'scanning' : 'idle'}
                    size="icon"
                    isEn={isEn}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-white font-mono">
                      {t.botAuditTitle}
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono font-bold">
                      {isEn ? 'LIVE BINANCE AUDIT' : 'AUDIT LIVE BINANCE'}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-sans mt-0.5 block">
                    {t.botAuditSubtitle} • <strong className="text-slate-300 font-mono">{scanAuditReport.timestamp}</strong>
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                className="text-slate-400 hover:text-white text-base p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Audit Content - Scrollable */}
            <div className="overflow-y-auto space-y-4 py-3 pr-1">
              {/* 4 Metric Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">{isEn ? 'Universe Scanned' : 'Semesta Dipindai'}</span>
                  <strong className="text-white text-sm block mt-0.5">{scanAuditReport.totalUniverseScanned} Crypto Pairs</strong>
                  <span className="text-[10px] text-slate-500">{isEn ? 'Binance 24/7 Spot' : 'Binance 24/7 Spot'}</span>
                </div>

                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">{isEn ? 'Capacity & Slots' : 'Kapasitas Slot'}</span>
                  <strong className="text-sky-400 text-sm block mt-0.5">
                    {scanAuditReport.activeSlotsOccupied} / {scanAuditReport.maxSlots} Slots
                  </strong>
                  <span className="text-[10px] text-slate-400">
                    {scanAuditReport.availableSlots > 0
                      ? (isEn ? `${scanAuditReport.availableSlots} Available Slot(s)` : `${scanAuditReport.availableSlots} Slot Tersedia`)
                      : (isEn ? 'Capacity Full (Risk Gated)' : 'Kapasitas Penuh')}
                  </span>
                </div>

                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">{isEn ? 'Bot Cash Reserve' : 'Cadangan Kas Bot'}</span>
                  <strong className="text-amber-400 text-sm block mt-0.5">
                    ${scanAuditReport.botCashAvailable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                  </strong>
                  <span className="text-[10px] text-slate-500">{isEn ? 'Liquid capital' : 'Modal likuid'}</span>
                </div>

                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">{isEn ? 'Risk Filter' : 'Filter Risiko'}</span>
                  <strong className="text-emerald-400 text-sm block mt-0.5">
                    {botConfig.riskPerTradePercent}% Risk / Trade
                  </strong>
                  <span className="text-[10px] text-slate-500">{isEn ? 'Sizing: fixed fractional from stop distance' : 'Sizing: fixed fractional dari jarak stop'}</span>
                </div>
              </div>

              {/* Bot Executive Decision Box */}
              <div className="bg-sky-950/40 border border-sky-800/60 p-4 rounded-xl flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-mono font-bold text-sky-200">
                    {isEn ? 'Algorithmic Decision & Risk Discipline Thesis:' : 'Keputusan Algoritmik & Disiplin Risiko:'}
                  </div>
                  <p className="text-slate-300 font-sans leading-relaxed">
                    {scanAuditReport.overallDecisionSummary}
                  </p>
                </div>
              </div>

              {/* Evaluated Candidates Breakdown Table */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-sky-400" />
                    <span>{isEn ? 'Candidate Evaluation Matrix (Top 8 AI Signals)' : 'Matriks Evaluasi Kandidat (Top 8 Sinyal AI)'}</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {isEn ? 'Gates: Conf ≥ 75% · R:R ≥ 1:2.0' : 'Syarat: Conf ≥ 75% · R:R ≥ 1:2.0'}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/50">
                        <th className="py-2.5 px-3 text-left min-w-[130px]">{t.colCoin}</th>
                        <th className="py-2.5 px-3 text-right min-w-[100px]">{t.colLivePrice}</th>
                        <th className="py-2.5 px-3 text-center min-w-[140px]">{isEn ? 'AI Signal & Metrics' : 'Sinyal AI & Metrik'}</th>
                        <th className="py-2.5 px-3 text-center min-w-[130px]">{isEn ? 'Audit Status' : 'Status Audit'}</th>
                        <th className="py-2.5 px-3 text-left min-w-[200px]">{isEn ? 'Audit Reason & Sizing' : 'Alasan Audit & Sizing'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {scanAuditReport.topCandidates.map((c, idx) => (
                        <tr key={`${c.symbol}-${idx}`} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-3 text-left">
                            <span className="font-bold text-white block">⚡ {c.symbol}</span>
                            <span className="text-[10px] text-slate-400 truncate block max-w-[120px]">{c.name}</span>
                          </td>

                          <td className="py-3 px-3 text-right tabular-nums font-bold text-white">
                            {formatPrice(c.price)}
                          </td>

                          <td className="py-3 px-3 text-center">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 block mb-1">
                              {c.action}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Conf: <strong className="text-sky-300">{c.confidence}%</strong> · R:R <strong className="text-amber-300">1:{c.riskReward}</strong>
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center">
                            {c.status === 'EXECUTED' ? (
                              <span className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 inline-flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                <span>EXECUTED</span>
                              </span>
                            ) : c.status === 'DISCIPLINE_HOLD' ? (
                              <span className="text-[10px] font-bold px-2 py-1 rounded bg-amber-500/15 text-amber-300 border border-amber-500/40 inline-flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" />
                                <span>DISCIPLINE HOLD</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700 inline-block">
                                DISQUALIFIED
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-left">
                            {c.status === 'EXECUTED' && c.sizing ? (
                              <div className="space-y-1">
                                <div className="text-emerald-400 font-bold">
                                  {isEn ? 'Trade Opened:' : 'Posisi Dibuka:'} {c.sizing.units} units (${c.sizing.allocatedUsdt.toLocaleString()} USDT)
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  SL: ${c.sizing.sl} · TP: ${c.sizing.tp} ({c.sizing.marginPercent}% equity)
                                </div>
                              </div>
                            ) : (
                              <div className="text-slate-300 font-sans text-[11px] leading-tight">
                                {c.disqualificationReason}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-800 flex justify-between items-center shrink-0">
              <span className="text-[11px] text-slate-500 font-mono">
                {isEn ? 'Halfy AI Systematic Algorithmic Protection Engine' : 'Engine Perlindungan Algoritmik Sistematis Halfy AI'}
              </span>
              <button
                type="button"
                onClick={() => setShowAuditModal(false)}
                className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold font-mono rounded-xl text-xs cursor-pointer shadow-md transition-colors"
              >
                {isEn ? 'Close Audit Report' : 'Tutup Laporan Audit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
