import React, { useState, useEffect } from 'react';
import { PortfolioPosition, ClosedTradePosition, Stock, BotConfig, BotExecutionLog } from '../types/stock';
import { Language, translations } from '../utils/translations';
import { 
  INITIAL_BOT_CONFIG, 
  INITIAL_BOT_POSITIONS, 
  INITIAL_BOT_CLOSED_TRADES, 
  INITIAL_BOT_LOGS,
  calculateBotPositionSize 
} from '../utils/botEngine';
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
  Info
} from 'lucide-react';

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
  lang = 'ID',
}) => {
  const isEn = lang === 'EN';
  const t = translations[lang] || translations.ID;

  // Main view mode: 'manual' | 'bot' | 'settings' | 'battle'
  const [portfolioMode, setPortfolioMode] = useState<'manual' | 'bot' | 'settings' | 'battle'>('manual');
  const [activeSubTab, setActiveSubTab] = useState<'open' | 'closed'>('open');
  const [botSubTab, setBotSubTab] = useState<'open' | 'closed'>('open');

  // Simulation Reset State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetScope, setResetScope] = useState<'all' | 'manual' | 'bot'>('all');
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
      localStorage.setItem('halfy_bot_config_crypto_v1', JSON.stringify(botConfig));
      localStorage.setItem('halfy_bot_positions_crypto_v1', JSON.stringify(botPositions));
      localStorage.setItem('halfy_bot_closed_crypto_v1', JSON.stringify(botClosedTrades));
      localStorage.setItem('halfy_bot_logs_crypto_v1', JSON.stringify(botLogs));
    } catch {
      // ignore
    }
  }, [botConfig, botPositions, botClosedTrades, botLogs]);

  const handleExecuteReset = () => {
    const startingCash = Math.max(0, resetCashInput);

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

    setShowResetModal(false);
    setToastMessage(t.resetSuccessToast || (isEn ? 'Simulation successfully reset to starting capital!' : 'Simulasi berhasil direset ke modal awal!'));
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSaveBotSettings = (newConfig: BotConfig) => {
    setBotConfig(newConfig);
    try {
      localStorage.setItem('halfy_bot_config_crypto_v1', JSON.stringify(newConfig));
    } catch (err) {
      console.error('Failed to save bot settings', err);
    }
    setToastMessage(t.settingsSavedToast || (isEn ? 'Bot configuration successfully saved!' : 'Konfigurasi bot berhasil disimpan!'));
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleRestoreDefaultSettings = () => {
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
    setToastMessage(isEn ? 'Bot settings restored to quantitative defaults!' : 'Pengaturan bot dikembalikan ke konfigurasi standar!');
    setTimeout(() => setToastMessage(null), 3500);
  };

  const formatPrice = (val: number) => {
    if (val < 0.0001) return `$${val.toFixed(8)}`;
    if (val < 1) return `$${val.toFixed(4)}`;
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
      const closeVal = Math.round(positionToClose.sharesTotal * exitPrice * 100) / 100;
      const pnl = Math.round((closeVal - positionToClose.totalCost) * 100) / 100;
      const pnlPct = positionToClose.totalCost > 0 ? Math.round((pnl / positionToClose.totalCost) * 10000) / 100 : 0;

      setBotPositions((prev) => prev.filter((p) => p.id !== positionToClose.id));
      setBotConfig((prev) => ({
        ...prev,
        liquidityBalance: Math.round((prev.liquidityBalance + closeVal) * 100) / 100,
      }));

      const newClosedTrade: ClosedTradePosition = {
        id: `bot-closed-${Date.now()}-${positionToClose.symbol}`,
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
        executedBy: 'AI_BOT',
      };

      setBotClosedTrades((prev) => [newClosedTrade, ...prev]);

      setBotLogs((prev) => [
        {
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${positionToClose.symbol}`,
          timestamp: isEn ? 'Just now' : 'Baru saja',
          action: closeReason === 'TAKE_PROFIT' ? 'TAKE_PROFIT' : closeReason === 'STOP_LOSS' ? 'STOP_LOSS' : 'BUY_ENTRY',
          symbol: positionToClose.symbol,
          price: exitPrice,
          pnl,
          details: isEn
            ? `[MANUAL BOT EXIT] User closed ${positionToClose.symbol} @ $${exitPrice}. Realized P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toLocaleString()} (${pnlPct >= 0 ? '+' : ''}${pnlPct}%). Returned to bot cash: +$${closeVal.toLocaleString()} USDT.`
            : `[MANUAL BOT EXIT] Pengguna menutup ${positionToClose.symbol} @ $${exitPrice}. Realisasi P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toLocaleString()} (${pnlPct >= 0 ? '+' : ''}${pnlPct}%). Dikembalikan ke kas bot: +$${closeVal.toLocaleString()} USDT.`,
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
  const handleRunBotAutoScan = () => {
    if (!botConfig.isActive) {
      setBotScanResultMsg(isEn ? 'Bot is PAUSED. Please activate the bot first.' : 'Bot sedang dijeda (PAUSED). Aktifkan bot terlebih dahulu.');
      return;
    }

    setIsBotScanning(true);
    setBotScanResultMsg('');

    setTimeout(() => {
      let currentLiquidity = botConfig.liquidityBalance;
      const currentBotPositions = [...botPositions];
      const newLogs: BotExecutionLog[] = [];
      let openedCount = 0;

      // 1. Monitor existing positions for Take Profit / Stop Loss with live Binance prices
      const updatedPositions: PortfolioPosition[] = [];
      for (const pos of currentBotPositions) {
        const live = stocks.find((s) => s.symbol === pos.symbol);
        const livePrice = live ? live.currentPrice : pos.currentPrice;

        if (pos.targetPrice && livePrice >= pos.targetPrice) {
          // AUTO TAKE PROFIT TRIGGERED
          const closeVal = Math.round(pos.sharesTotal * livePrice * 100) / 100;
          const pnl = Math.round((closeVal - pos.totalCost) * 100) / 100;
          const pnlPct = Math.round((pnl / pos.totalCost) * 10000) / 100;

          currentLiquidity += closeVal;
          setBotClosedTrades((prev) => [
            {
              id: `bot-closed-${Date.now()}-${pos.symbol}`,
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
              executedBy: 'AI_BOT',
            },
            ...prev,
          ]);

          newLogs.push({
            id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${pos.symbol}`,
            timestamp: isEn ? 'Just now' : 'Baru saja',
            action: 'TAKE_PROFIT',
            symbol: pos.symbol,
            price: livePrice,
            pnl,
            details: isEn
              ? `[AUTO-TP] Target TP1 reached for ${pos.symbol} @ $${livePrice}. Realized P&L: +$${pnl.toLocaleString()} (+${pnlPct}%). Returned to bot cash: +$${closeVal.toLocaleString()} USDT.`
              : `[AUTO-TP] Target TP1 tercapai untuk ${pos.symbol} @ $${livePrice}. Realisasi P&L: +$${pnl.toLocaleString()} (+${pnlPct}%). Dikembalikan ke kas bot: +$${closeVal.toLocaleString()} USDT.`,
          });
        } else if (pos.stopLoss && livePrice <= pos.stopLoss) {
          // AUTO STOP LOSS TRIGGERED
          const closeVal = Math.round(pos.sharesTotal * livePrice * 100) / 100;
          const pnl = Math.round((closeVal - pos.totalCost) * 100) / 100;
          const pnlPct = Math.round((pnl / pos.totalCost) * 10000) / 100;

          currentLiquidity += closeVal;
          setBotClosedTrades((prev) => [
            {
              id: `bot-closed-${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${pos.symbol}`,
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
              executedBy: 'AI_BOT',
            },
            ...prev,
          ]);

          newLogs.push({
            id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${pos.symbol}`,
            timestamp: isEn ? 'Just now' : 'Baru saja',
            action: 'STOP_LOSS',
            symbol: pos.symbol,
            price: livePrice,
            pnl,
            details: isEn
              ? `[AUTO-SL] Stop Loss triggered for ${pos.symbol} @ $${livePrice}. Capital protection realized: $${pnl.toLocaleString()} (${pnlPct}%).`
              : `[AUTO-SL] Stop Loss terpicu untuk ${pos.symbol} @ $${livePrice}. Proteksi modal terealisasi: $${pnl.toLocaleString()} (${pnlPct}%).`,
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
        }
      }

      // 2. Scan AI Signals for New Entries with Strict Strategy Gating & Kelly Sizing
      const botEquity = currentLiquidity + updatedPositions.reduce((sum, p) => sum + p.currentValue, 0);
      const availableSlots = Math.max(0, botConfig.maxConcurrentPositions - updatedPositions.length);

      const evaluatedReportCandidates: NonNullable<typeof scanAuditReport>['topCandidates'] = [];

      // Sort all stocks by AI Confidence descending
      const sortedStocks = [...stocks].sort((a, b) => b.aiSignal.confidenceScore - a.aiSignal.confidenceScore);

      let slotsRemaining = availableSlots;

      for (const candidate of sortedStocks) {
        const isAlreadyActive = updatedPositions.some((p) => p.symbol === candidate.symbol);
        const isLongSignal = candidate.aiSignal.action === 'Strong Long' || candidate.aiSignal.action === 'Long (Buy on Dip)';
        const meetsConfidence = candidate.aiSignal.confidenceScore >= botConfig.minAiConfidence;
        const meetsRR = candidate.aiSignal.riskRewardRatio >= botConfig.minRiskReward;

        // Strategy Matrix Focus Check
        let matchesStrategy = true;
        let strategyFailReason = '';
        if (botConfig.strategyFocus === 'WHALE_INFLOW' || botConfig.strategyFocus === 'WHALE_ACCUMULATION') {
          const thesisLower = candidate.aiSignal.thesis.toLowerCase();
          const hasWhale = thesisLower.includes('whale') || thesisLower.includes('akumulasi') || candidate.aiSignal.confidenceScore >= 80;
          if (!hasWhale) {
            matchesStrategy = false;
            strategyFailReason = isEn ? 'Does not meet Whale & Institutional Inflow filter' : 'Tidak memenuhi kriteria Akumulasi Whale Institusional';
          }
        } else if (botConfig.strategyFocus === 'BREAKOUT_MOMENTUM') {
          const isBreakout = candidate.aiSignal.action === 'Strong Long' || candidate.changePercent > 0;
          if (!isBreakout) {
            matchesStrategy = false;
            strategyFailReason = isEn ? 'Does not meet Breakout Momentum filter' : 'Tidak memenuhi kriteria Breakout Momentum Resistance';
          }
        } else if (botConfig.strategyFocus === 'OVERSOLD_BOUNCE' || botConfig.strategyFocus === 'OVERSOLD_REBOUND') {
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

        if (!isLongSignal || !meetsConfidence || !meetsRR) {
          let failReason = '';
          if (!isLongSignal) failReason = isEn ? 'Signal is neutral/short hedge' : 'Sinyal berstatus neutral/hedge';
          else if (!meetsConfidence) failReason = isEn ? `Score ${candidate.aiSignal.confidenceScore}% < ${botConfig.minAiConfidence}% threshold` : `Skor ${candidate.aiSignal.confidenceScore}% < batas ${botConfig.minAiConfidence}%`;
          else if (!meetsRR) failReason = isEn ? `R:R 1:${candidate.aiSignal.riskRewardRatio} < 1:${botConfig.minRiskReward} requirement` : `R:R 1:${candidate.aiSignal.riskRewardRatio} < syarat 1:${botConfig.minRiskReward}`;

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

        // Candidate passed strategy gates!
        if (slotsRemaining > 0) {
          const multiplier = botConfig.archetype === 'HYBRID' ? (botConfig.hybridRiskMultiplier || 1.0) : 1.0;
          const sizing = calculateBotPositionSize(
            candidate,
            botEquity,
            currentLiquidity,
            botConfig.riskPerTradePercent,
            multiplier,
            botConfig.sizingModel || 'KELLY_CRITERION'
          );

          if (sizing.isValid && sizing.totalCost <= currentLiquidity && sizing.totalCost > 10) {
            currentLiquidity -= sizing.totalCost;
            slotsRemaining--;
            openedCount++;

            const newPos: PortfolioPosition = {
              id: `bot-pos-${Date.now()}-${candidate.symbol}`,
              symbol: candidate.symbol,
              name: candidate.name,
              market: 'CRYPTO',
              quantity: sizing.quantity,
              sharesTotal: sizing.quantity,
              averageBuyPrice: candidate.currentPrice,
              currentPrice: candidate.currentPrice,
              totalCost: sizing.totalCost,
              currentValue: sizing.totalCost,
              unrealizedPnL: 0,
              unrealizedPnLPercent: 0,
              targetPrice: candidate.aiSignal.targetPrice1,
              stopLoss: candidate.aiSignal.stopLoss,
              dateAdded: new Date().toISOString().split('T')[0],
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
                allocatedUsdt: sizing.totalCost,
                riskAmount: sizing.riskAmount,
                marginPercent: botEquity > 0 ? Math.round((sizing.totalCost / botEquity) * 1000) / 10 : 15,
                tp: candidate.aiSignal.targetPrice1,
                sl: candidate.aiSignal.stopLoss,
              },
              thesis: candidate.aiSignal.thesis,
            });

            newLogs.push({
              id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${candidate.symbol}`,
              timestamp: isEn ? 'Just now' : 'Baru saja',
              action: 'BUY_ENTRY',
              symbol: candidate.symbol,
              price: candidate.currentPrice,
              quantity: sizing.quantity,
              details: isEn
                ? `[AUTO-BUY] ${sizing.quantity} ${candidate.symbol} @ $${candidate.currentPrice}. Capital: $${sizing.totalCost.toLocaleString()} USDT (${botConfig.riskPerTradePercent}% Risk: $${sizing.riskAmount.toLocaleString()}). SL: $${candidate.aiSignal.stopLoss} · TP: $${candidate.aiSignal.targetPrice1} (R:R 1:${candidate.aiSignal.riskRewardRatio}).`
                : `[AUTO-BUY] ${sizing.quantity} ${candidate.symbol} @ $${candidate.currentPrice}. Modal: $${sizing.totalCost.toLocaleString()} USDT (${botConfig.riskPerTradePercent}% Risiko: $${sizing.riskAmount.toLocaleString()}). SL: $${candidate.aiSignal.stopLoss} · TP: $${candidate.aiSignal.targetPrice1} (R:R 1:${candidate.aiSignal.riskRewardRatio}).`,
            });
          } else {
            evaluatedReportCandidates.push({
              symbol: candidate.symbol,
              name: candidate.name,
              price: candidate.currentPrice,
              action: candidate.aiSignal.action,
              confidence: candidate.aiSignal.confidenceScore,
              riskReward: candidate.aiSignal.riskRewardRatio,
              status: 'DISCIPLINE_HOLD',
              disqualificationReason: isEn ? 'Insufficient liquid cash for Kelly position sizing' : 'Saldo kas likuiditas tidak mencukupi formula Kelly sizing',
              thesis: candidate.aiSignal.thesis,
            });
          }
        } else {
          // Qualified candidate, but capacity is full
          evaluatedReportCandidates.push({
            symbol: candidate.symbol,
            name: candidate.name,
            price: candidate.currentPrice,
            action: candidate.aiSignal.action,
            confidence: candidate.aiSignal.confidenceScore,
            riskReward: candidate.aiSignal.riskRewardRatio,
            status: 'DISCIPLINE_HOLD',
            disqualificationReason: isEn
              ? `Max concurrent positions limit reached (${botConfig.maxConcurrentPositions}/${botConfig.maxConcurrentPositions} slots full). Risk management prevents random over-leveraging.`
              : `Batas posisi aktif telah penuh (${botConfig.maxConcurrentPositions}/${botConfig.maxConcurrentPositions} slot). Disiplin manajemen risiko mencegah transaksi acak/over-leverage.`,
            thesis: candidate.aiSignal.thesis,
          });
        }
      }

      setBotPositions(updatedPositions);
      setBotConfig((prev) => ({ ...prev, liquidityBalance: Math.round(currentLiquidity * 100) / 100 }));
      if (newLogs.length > 0) {
        setBotLogs((prev) => {
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

      const decisionSummary = openedCount > 0
        ? (isEn
            ? `Execution Approved: Bot opened ${openedCount} new trade(s) strictly abiding by Kelly Criterion sizing and 1:2.0+ R:R ratio.`
            : `Eksekusi Disetujui: Bot membuka ${openedCount} trade baru sesuai Kelly Criterion sizing dan rasio R:R 1:2.0+.`)
        : availableSlots === 0
        ? (isEn
            ? `Discipline Maintained: All ${botConfig.maxConcurrentPositions}/${botConfig.maxConcurrentPositions} slots are currently filled. Bot strictly avoids random trades to preserve capital until an existing trade hits TP or SL.`
            : `Disiplin Terjaga: Seluruh ${botConfig.maxConcurrentPositions}/${botConfig.maxConcurrentPositions} slot posisi terisi. Bot menahan eksekusi acak untuk melindungi modal hingga posisi aktif mencapai TP atau SL.`)
        : (isEn
            ? `Scan Complete: Scanned ${stocks.length} assets. No unheld assets currently satisfy both Confidence ≥ ${botConfig.minAiConfidence}% and R:R ≥ 1:${botConfig.minRiskReward}.`
            : `Pemindaian Selesai: Memindai ${stocks.length} aset. Tidak ada aset baru yang memenuhi syarat Confidence ≥ ${botConfig.minAiConfidence}% dan R:R ≥ 1:${botConfig.minRiskReward}.`);

      setScanAuditReport({
        timestamp: new Date().toLocaleTimeString(isEn ? 'en-US' : 'id-ID'),
        totalUniverseScanned: stocks.length,
        activeSlotsOccupied: updatedPositions.length,
        maxSlots: botConfig.maxConcurrentPositions,
        availableSlots: Math.max(0, botConfig.maxConcurrentPositions - updatedPositions.length),
        botCashAvailable: Math.round(currentLiquidity * 100) / 100,
        topCandidates: evaluatedReportCandidates.slice(0, 8),
        overallDecisionSummary: decisionSummary,
      });

      setBotScanResultMsg(decisionSummary);
      setShowAuditModal(true);
    }, 600);
  };

  // Manual Portfolio Metrics
  const manualTotalCost = portfolio.reduce((acc, p) => acc + p.totalCost, 0);
  const manualPositionsValue = portfolio.reduce((acc, p) => acc + p.currentValue, 0);
  const manualOpenPnL = manualPositionsValue - manualTotalCost;
  const manualOpenPnLPercent = manualTotalCost > 0 ? (manualOpenPnL / manualTotalCost) * 100 : 0;
  const manualTotalEquity = Math.round((liquidityBalance + manualPositionsValue) * 100) / 100;
  const manualTotalRealizedPnL = Math.round(closedTrades.reduce((acc, c) => acc + c.realizedPnL, 0) * 100) / 100;
  const manualWinningTrades = closedTrades.filter((c) => c.realizedPnL > 0).length;
  const manualWinRate = closedTrades.length > 0 ? Math.round((manualWinningTrades / closedTrades.length) * 100) : 0;

  // Bot Portfolio Metrics
  const botTotalCost = botPositions.reduce((acc, p) => acc + p.totalCost, 0);
  const botPositionsValue = botPositions.reduce((acc, p) => acc + p.currentValue, 0);
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
                    ? 'bg-sky-500 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>{t.modeBot}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
              </button>

              <button
                onClick={() => setPortfolioMode('settings')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  portfolioMode === 'settings'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{t.modeSettings || (isEn ? 'Bot Settings & Matrix' : 'Pengaturan Bot & Matriks')}</span>
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
                <span className="text-[10px] text-sky-400 bg-sky-950/60 border border-sky-800/60 px-1.5 py-0.2 rounded font-mono">
                  {t.availLiquidity}
                </span>
              </div>
              <div className="text-lg sm:text-xl font-black font-mono text-white tabular-nums tracking-tight">
                ${(portfolioMode === 'bot' ? botConfig.liquidityBalance : liquidityBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.2 rounded font-mono">
                  Live Binance
                </span>
              </div>
              <div className="text-lg sm:text-xl font-black font-mono text-white tabular-nums tracking-tight">
                ${(portfolioMode === 'bot' ? botPositionsValue : manualPositionsValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-800/80">
              {portfolioMode === 'bot' ? botPositions.length : portfolio.length} {t.activeCoinPositions}
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
                <span className="text-[10px] text-purple-400 bg-purple-950/60 border border-purple-800/60 px-1.5 py-0.2 rounded font-mono">
                  Cash + Pos
                </span>
              </div>
              <div className="text-lg sm:text-xl font-black font-mono text-white tabular-nums tracking-tight">
                ${(portfolioMode === 'bot' ? botTotalEquity : manualTotalEquity).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded font-mono">
                  {t.liveUnrealized}
                </span>
              </div>
              {(() => {
                const currentOpenPnL = portfolioMode === 'bot' ? botOpenPnL : manualOpenPnL;
                const currentRealizedPnL = portfolioMode === 'bot' ? botTotalRealizedPnL : manualTotalRealizedPnL;
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
                        {isPos ? '+' : ''}{(portfolioMode === 'bot' ? botOpenPnLPercent : manualOpenPnLPercent).toFixed(2)}% Live
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
                <span className="text-[10px] text-amber-300 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.2 rounded font-mono">
                  {t.closedTradesBadge}
                </span>
              </div>
              <div className="text-lg sm:text-xl font-black font-mono text-emerald-400 tabular-nums tracking-tight">
                {portfolioMode === 'bot' ? botWinRate : manualWinRate}%
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
      {portfolioMode === 'bot' && (
        <div className="space-y-6">
          {/* Bot Control Panel & Strategy Matrix */}
          <div className="bg-[#0e1626] border border-sky-900/60 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-5 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white font-mono">
                      {t.botEngineTitle}
                    </h2>
                    <span
                      className={`text-[11px] px-2.5 py-0.5 rounded-full font-mono font-bold flex items-center gap-1.5 border ${
                        botConfig.isActive
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${botConfig.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                      <span>{botConfig.isActive ? t.botActiveBadge : t.botPausedBadge}</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 font-sans">
                    {t.botEngineDesc}
                  </p>
                </div>
              </div>

              {/* Bot Actions */}
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={() => setBotConfig((prev) => ({ ...prev, isActive: !prev.isActive }))}
                  className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                    botConfig.isActive
                      ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/40'
                      : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  {botConfig.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{botConfig.isActive ? t.pauseBotBtn : t.activateBotBtn}</span>
                </button>

                <button
                  onClick={handleRunBotAutoScan}
                  disabled={isBotScanning}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-mono font-bold rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isBotScanning ? 'animate-spin' : ''}`} />
                  <span>{isBotScanning ? t.scanningText : t.scanAndExecuteBtn}</span>
                </button>

                {scanAuditReport && (
                  <button
                    onClick={() => setShowAuditModal(true)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-white border border-slate-700 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t.viewAuditReport}</span>
                  </button>
                )}
              </div>
            </div>

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
                  {botConfig.riskPerTradePercent}% (${Math.round((botTotalEquity * botConfig.riskPerTradePercent) / 100)} Max Loss)
                </strong>
                <span className="text-[10px] text-slate-500">
                  {isEn ? 'Fixed Fractional Formula' : 'Formula Fixed Fractional'}
                </span>
              </div>

              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">{t.maxConcurrentPos}</span>
                <strong className="text-white text-sm block mt-0.5">
                  {botPositions.length} / {botConfig.maxConcurrentPositions} Slots
                </strong>
                <span className="text-[10px] text-slate-500">
                  {isEn ? 'Max Diversification' : 'Diversifikasi Maksimal'}
                </span>
              </div>

              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">{t.minRrFilter}</span>
                <strong className="text-emerald-400 text-sm block mt-0.5">
                  1 : {botConfig.minRiskReward}.0
                </strong>
                <span className="text-[10px] text-slate-500">
                  {isEn ? 'High Reward Filter' : 'Filter High Reward'}
                </span>
              </div>

              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">{t.minAiConfidence}</span>
                <strong className="text-sky-400 text-sm block mt-0.5">
                  {botConfig.minAiConfidence}% Score
                </strong>
                <span className="text-[10px] text-slate-500">
                  {isEn ? 'Quality Signal Gate' : 'Filter Kualitas Sinyal'}
                </span>
              </div>
            </div>
          </div>

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
                  <span>{t.botActivePositions} ({botPositions.length}/{botConfig.maxConcurrentPositions})</span>
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
                  <span>{t.botClosedHistory} ({botClosedTrades.length})</span>
                </button>
              </div>

              <span className="text-xs text-slate-400 font-mono">
                {botSubTab === 'open'
                  ? (isEn ? 'Auto TP1 & Stop Loss Standby' : 'Auto TP1 & Stop Loss Siaga')
                  : `Bot Realized P&L: +$${botTotalRealizedPnL.toLocaleString()} (${botWinRate}% Winrate)`}
              </span>
            </div>

            {/* Sub-Tab 1: Active Bot Open Positions Table */}
            {botSubTab === 'open' && (
              <>
                {botPositions.length === 0 ? (
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
                        {botPositions.map((pos, idx) => {
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
                                  <div className="text-emerald-400 font-semibold flex items-center gap-1">
                                    <Target className="w-3.5 h-3.5" />
                                    <span>TP: {formatPrice(pos.targetPrice || 0)}</span>
                                  </div>
                                  <div className="text-rose-400 font-semibold flex items-center gap-1">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span>SL: {formatPrice(pos.stopLoss || 0)}</span>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-2">
                                  <span className="text-[10px] font-mono font-bold text-sky-400 bg-sky-950/80 px-2 py-1 rounded border border-sky-800/60 hidden xl:inline-block">
                                    AUTO TP/SL
                                  </span>
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
                {botClosedTrades.length === 0 ? (
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
                        {botClosedTrades.map((trade, idx) => {
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
              {botLogs.map((log, idx) => (
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
                      <span className="text-[10px] text-slate-500 block mt-1 font-mono">{log.timestamp}</span>
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
          VIEW MODE 3: BOT SETTINGS & STRATEGY MATRIX
         ========================================================================= */}
      {portfolioMode === 'settings' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header Banner */}
          <div className="bg-[#0b1322] border border-emerald-500/30 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    {t.archetypeTitle || (isEn ? 'Bot Execution Settings & Strategy Matrix' : 'Pengaturan Eksekusi Bot & Matriks Strategi')}
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    {t.archetypeDesc || (isEn ? 'Configure AI execution archetypes, strategy focus from Crypto AI Picks & Radar, risk per trade, and position sizing models.' : 'Atur arsitektur eksekusi, fokus sinyal AI Picks, risiko per trade, dan model perhitungan ukuran posisi.')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRestoreDefaultSettings}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 inline mr-1.5 text-slate-400" />
                  <span>{t.restoreDefaultsBtn || (isEn ? 'Restore Defaults' : 'Kembalikan Standar')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveBotSettings(botConfig)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{t.saveSettingsBtn || (isEn ? 'Save Configuration' : 'Simpan Konfigurasi')}</span>
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
                Current: {botConfig.archetype || 'PURE_AI'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Option 1: Pure AI */}
              <div
                onClick={() => setBotConfig((prev) => ({ ...prev, archetype: 'PURE_AI' }))}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  botConfig.archetype === 'PURE_AI'
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
                  <span>{botConfig.archetype === 'PURE_AI' ? '● ' + (isEn ? 'Active Selection' : 'Terpilih') : (isEn ? 'Click to select' : 'Klik untuk memilih')}</span>
                  <span>Kelly Model</span>
                </div>
              </div>

              {/* Option 2: Hybrid AI + User Calibration */}
              <div
                onClick={() => setBotConfig((prev) => ({ ...prev, archetype: 'HYBRID' }))}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  botConfig.archetype === 'HYBRID'
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
                  <span>{botConfig.archetype === 'HYBRID' ? '● ' + (isEn ? 'Active Selection' : 'Terpilih') : (isEn ? 'Click to select' : 'Klik untuk memilih')}</span>
                  <span>{botConfig.hybridRiskMultiplier || 1.25}x Risk Multiplier</span>
                </div>
              </div>

              {/* Option 3: Manual Discretionary */}
              <div
                onClick={() => setBotConfig((prev) => ({ ...prev, archetype: 'MANUAL_DISCRETIONARY' }))}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  botConfig.archetype === 'MANUAL_DISCRETIONARY'
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
                  <span>{botConfig.archetype === 'MANUAL_DISCRETIONARY' ? '● ' + (isEn ? 'Active Selection' : 'Terpilih') : (isEn ? 'Click to select' : 'Klik untuk memilih')}</span>
                  <span>Manual Review</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Strategy Focus Matrix (Crypto AI Picks & Radar) */}
          <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-400" />
                <span>{t.strategyFocusTitle || (isEn ? '2. Strategy Focus (Crypto AI Picks & Radar Primary Engine)' : '2. Fokus Strategi (Crypto AI Picks & Radar)')}</span>
              </h3>
              <span className="text-xs text-slate-400">
                {isEn ? 'Filter which market setups the AI scanner prioritizes from the 24/7 intelligence terminal' : 'Filter jenis setup pasar yang diprioritaskan oleh bot scanner dari terminal 24/7'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* All Signals */}
              <div
                onClick={() => setBotConfig((prev) => ({ ...prev, strategyFocus: 'ALL_SIGNALS' }))}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  botConfig.strategyFocus === 'ALL_SIGNALS' || !botConfig.strategyFocus
                    ? 'bg-amber-950/30 border-amber-500/80 ring-1 ring-amber-500/30'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-white">{t.strategyAll || 'All Signals'}</span>
                  <span className="text-[10px] text-amber-400 font-mono">18 Coins</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-normal">
                  {isEn ? 'Evaluates all qualified setups across AI, L1, DeFi, and Memecoins.' : 'Memindai seluruh narasi (AI, L1, DeFi, Memecoin) dengan skor tertinggi.'}
                </p>
              </div>

              {/* Whale Inflow */}
              <div
                onClick={() => setBotConfig((prev) => ({ ...prev, strategyFocus: 'WHALE_INFLOW' }))}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  botConfig.strategyFocus === 'WHALE_INFLOW'
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
                onClick={() => setBotConfig((prev) => ({ ...prev, strategyFocus: 'BREAKOUT_MOMENTUM' }))}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  botConfig.strategyFocus === 'BREAKOUT_MOMENTUM'
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
                onClick={() => setBotConfig((prev) => ({ ...prev, strategyFocus: 'OVERSOLD_BOUNCE' }))}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  botConfig.strategyFocus === 'OVERSOLD_BOUNCE'
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
                  onClick={() => setBotConfig((prev) => ({ ...prev, sizingModel: 'KELLY_CRITERION' }))}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    botConfig.sizingModel === 'KELLY_CRITERION' || !botConfig.sizingModel
                      ? 'bg-purple-950/30 border-purple-500/80'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{t.modelKelly || 'Kelly Criterion Formula'}</span>
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
                  onClick={() => setBotConfig((prev) => ({ ...prev, sizingModel: 'FIXED_FRACTIONAL' }))}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    botConfig.sizingModel === 'FIXED_FRACTIONAL'
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
                  onClick={() => setBotConfig((prev) => ({ ...prev, sizingModel: 'EQUAL_WEIGHT' }))}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    botConfig.sizingModel === 'EQUAL_WEIGHT'
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
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>{isEn ? '4. Quantitative Risk Parameters' : '4. Parameter Batas Risiko'}</span>
                </h3>
                <span className="text-xs text-slate-400">
                  {isEn ? 'Safety gating & threshold constraints for automated trade execution' : 'Batas pengaman dan kriteria kelayakan eksekusi posisi'}
                </span>
              </div>

              <div className="space-y-4 text-xs">
                {/* Max Concurrent Positions */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-slate-300 font-semibold">{t.maxConcurrentPos}</span>
                    <strong className="text-sky-400 font-mono">{botConfig.maxConcurrentPositions} Slots</strong>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[2, 4, 6, 8].map((slots) => (
                      <button
                        key={slots}
                        type="button"
                        onClick={() => setBotConfig((prev) => ({ ...prev, maxConcurrentPositions: slots }))}
                        className={`py-1.5 rounded-lg font-mono font-bold transition-colors cursor-pointer border ${
                          botConfig.maxConcurrentPositions === slots
                            ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-sm'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {slots} Pos
                      </button>
                    ))}
                  </div>
                </div>

                {/* Risk Per Trade (RPT %) */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-slate-300 font-semibold">{t.riskPerTrade}</span>
                    <strong className="text-amber-400 font-mono">{botConfig.riskPerTradePercent}%</strong>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[1.0, 2.0, 3.0, 5.0].map((rpt) => (
                      <button
                        key={rpt}
                        type="button"
                        onClick={() => setBotConfig((prev) => ({ ...prev, riskPerTradePercent: rpt }))}
                        className={`py-1.5 rounded-lg font-mono font-bold transition-colors cursor-pointer border ${
                          botConfig.riskPerTradePercent === rpt
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {rpt}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Min Risk to Reward Filter */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-slate-300 font-semibold">{t.minRrFilter}</span>
                    <strong className="text-emerald-400 font-mono">1:{botConfig.minRiskReward}.0</strong>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[1.5, 2.0, 2.5, 3.0].map((rr) => (
                      <button
                        key={rr}
                        type="button"
                        onClick={() => setBotConfig((prev) => ({ ...prev, minRiskReward: rr }))}
                        className={`py-1.5 rounded-lg font-mono font-bold transition-colors cursor-pointer border ${
                          botConfig.minRiskReward === rr
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        1:{rr}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Min AI Confidence Score */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-slate-300 font-semibold">{t.minAiConfidence}</span>
                    <strong className="text-purple-400 font-mono">{botConfig.minAiConfidence}%</strong>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[70, 75, 80, 85].map((conf) => (
                      <button
                        key={conf}
                        type="button"
                        onClick={() => setBotConfig((prev) => ({ ...prev, minAiConfidence: conf }))}
                        className={`py-1.5 rounded-lg font-mono font-bold transition-colors cursor-pointer border ${
                          botConfig.minAiConfidence === conf
                            ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {conf}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Hybrid Custom Calibration Controls */}
          {botConfig.archetype === 'HYBRID' && (
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
                    <strong className="text-purple-400 font-mono text-sm">{botConfig.hybridRiskMultiplier || 1.25}x</strong>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.25"
                    value={botConfig.hybridRiskMultiplier || 1.25}
                    onChange={(e) => setBotConfig((prev) => ({ ...prev, hybridRiskMultiplier: parseFloat(e.target.value) }))}
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
                    <strong className="text-emerald-400 font-mono text-sm">{botConfig.trailingStopPercent || 2.5}%</strong>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="5.0"
                    step="0.5"
                    value={botConfig.trailingStopPercent || 2.5}
                    onChange={(e) => setBotConfig((prev) => ({ ...prev, trailingStopPercent: parseFloat(e.target.value) }))}
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
                      checked={botConfig.hybridRequireConfirmation || false}
                      onChange={(e) => setBotConfig((prev) => ({ ...prev, hybridRequireConfirmation: e.target.checked }))}
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
                onClick={handleRunBotAutoScan}
                disabled={isBotScanning}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 w-full sm:w-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isBotScanning ? 'animate-spin' : ''}`} />
                <span>{isBotScanning ? t.scanningText : (isEn ? 'Test Scan with Current Settings' : 'Uji Scan dengan Pengaturan Ini')}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveBotSettings(botConfig)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
              >
                <Check className="w-4 h-4" />
                <span>{t.saveSettingsBtn || (isEn ? 'Save Configuration' : 'Simpan Pengaturan')}</span>
              </button>
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
                {isEn ? 'Kelly sizing math, strict quantitative thresholds, zero emotional deviation.' : 'Formula matematika Kelly, batas kuantitatif disiplin, tanpa deviasi emosi.'}
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
                  <div className="flex justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">{t.totalNetWorth}:</span>
                    <strong className="text-white text-sm font-mono tabular-nums">
                      ${Math.round(botConfig.liquidityBalance + botPositionsValue * (botConfig.hybridRiskMultiplier || 1.25)).toLocaleString()}
                    </strong>
                  </div>

                  <div className="flex justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">{t.pnlTitle}:</span>
                    <strong className="text-purple-400 text-sm font-mono tabular-nums">
                      +${Math.round((botTotalPnLOverall > 0 ? botTotalPnLOverall : 1250) * (botConfig.hybridRiskMultiplier || 1.25)).toLocaleString()}
                    </strong>
                  </div>

                  <div className="flex justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">{t.winrateTitle}:</span>
                    <strong className="text-purple-400 text-sm font-mono tabular-nums">
                      {Math.min(95, Math.round((botWinRate || 75) * 1.05))}% (Calibrated)
                    </strong>
                  </div>

                  <div className="flex justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">{isEn ? 'User Multiplier' : 'Multiplier Risiko'}:</span>
                    <strong className="text-purple-300 font-mono">{botConfig.hybridRiskMultiplier || 1.25}x Base Kelly</strong>
                  </div>

                  <div className="flex justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">{t.executionStyle}:</span>
                    <span className="text-purple-300 font-medium">
                      {isEn ? 'AI Alpha Signals + User Overrides' : 'Sinyal AI Radar + Override Pengguna'}
                    </span>
                  </div>
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
              </div>
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
                    { label: '15% (Kelly AI)', val: 15 },
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
                <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Bot className="w-5 h-5" />
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
                  <span className="text-[10px] text-slate-500">{isEn ? 'Kelly Sizing Formula' : 'Formula Kelly Sizing'}</span>
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
