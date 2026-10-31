import React, { useState, useEffect } from 'react';
import { MarketType, Stock, MarketIndex, PredictiveAlert, PortfolioPosition, ClosedTradePosition, MarketRegime } from './types/stock';
import { fetchMarketSummary, fetchStocks, fetchLiveAlerts } from './services/api';
import { playSignalChime } from './utils/audio';
import { Navbar } from './components/Navbar';
import { TickerTape } from './components/TickerTape';
import { DashboardView } from './components/DashboardView';
import { StockpicksView } from './components/StockpicksView';
import { ChartTerminal } from './components/ChartTerminal';
import { BandarmologyView } from './components/BandarmologyView';
import { PortfolioView } from './components/PortfolioView';
import { AlertCenterView } from './components/AlertCenterView';
import { DocumentationView } from './components/DocumentationView';
import { MarketClockBar } from './components/MarketClockBar';
import { Language, translations } from './utils/translations';

const INITIAL_CLOSED_TRADES: ClosedTradePosition[] = [
  {
    id: 'closed-1',
    symbol: 'NEAR',
    name: 'Near Protocol (NEAR / USDT)',
    market: 'CRYPTO',
    quantity: 350,
    averageBuyPrice: 3.80,
    closePrice: 4.62,
    totalCost: 1330,
    closeValue: 1617,
    realizedPnL: 287,
    realizedPnLPercent: 21.58,
    dateAdded: '2026-10-18',
    dateClosed: '2026-10-28',
    closeReason: 'TAKE_PROFIT',
    notes: 'TP Target 1 tercapai setelah breakout volume',
  },
  {
    id: 'closed-2',
    symbol: 'PEPE',
    name: 'Pepe Meme Token (PEPE / USDT)',
    market: 'CRYPTO',
    quantity: 120000000,
    averageBuyPrice: 0.0000085,
    closePrice: 0.0000098,
    totalCost: 1020,
    closeValue: 1176,
    realizedPnL: 156,
    realizedPnLPercent: 15.29,
    dateAdded: '2026-10-21',
    dateClosed: '2026-10-27',
    closeReason: 'TAKE_PROFIT',
    notes: 'Kenaikan meme narasi',
  },
];

const INITIAL_PORTFOLIO: PortfolioPosition[] = [
  {
    id: 'pos-1',
    symbol: 'BTC',
    name: 'Bitcoin (BTC / USDT)',
    market: 'CRYPTO',
    quantity: 0.25, // 0.25 BTC
    sharesTotal: 0.25,
    averageBuyPrice: 75200,
    currentPrice: 76970,
    totalCost: 18800,
    currentValue: 19242.5,
    unrealizedPnL: 442.5,
    unrealizedPnLPercent: 2.35,
    targetPrice: 84000,
    stopLoss: 74200,
    dateAdded: '2026-10-15',
  },
  {
    id: 'pos-2',
    symbol: 'SOL',
    name: 'Solana (SOL / USDT)',
    market: 'CRYPTO',
    quantity: 15, // 15 SOL
    sharesTotal: 15,
    averageBuyPrice: 94.0,
    currentPrice: 100.62,
    totalCost: 1410,
    currentValue: 1509.3,
    unrealizedPnL: 99.3,
    unrealizedPnLPercent: 7.04,
    targetPrice: 125.0,
    stopLoss: 91.0,
    dateAdded: '2026-10-20',
  },
  {
    id: 'pos-3',
    symbol: 'SUI',
    name: 'Sui Network (SUI / USDT)',
    market: 'CRYPTO',
    quantity: 1250, // 1250 SUI
    sharesTotal: 1250,
    averageBuyPrice: 1.85,
    currentPrice: 2.12,
    totalCost: 2312.5,
    currentValue: 2650.0,
    unrealizedPnL: 337.5,
    unrealizedPnLPercent: 14.59,
    targetPrice: 2.65,
    stopLoss: 1.80,
    dateAdded: '2026-10-22',
  },
];

export default function App() {
  const [currentMarket, setCurrentMarket] = useState<MarketType>('CRYPTO');
  // R-7 — persist tab aktif per sesi browser (sessionStorage, bukan lintas-tab)
  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      const saved = sessionStorage.getItem('halfy_active_tab');
      if (saved) return saved;
    } catch {
      // ignore
    }
    return 'dashboard';
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('halfy_active_tab', activeTab);
    } catch {
      // ignore
    }
  }, [activeTab]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [alerts, setAlerts] = useState<PredictiveAlert[]>([]);
  const [selectedStockSymbol, setSelectedStockSymbol] = useState<string>('BTC');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [pushEnabled, setPushEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(5); // default 5s
  const [lastUpdated, setLastUpdated] = useState<Date | null>(new Date());
  // Status koneksi nyata ke data source (dari /api/market/summary — bukan asumsi UI)
  const [binanceConnected, setBinanceConnected] = useState<boolean | null>(null);
  const [binanceLastSync, setBinanceLastSync] = useState<number | null>(null);
  // P1.2 — regime pasar dari server (gate eligibility strategi)
  const [marketRegime, setMarketRegime] = useState<MarketRegime | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Bilingual (Indonesian & English) state with LocalStorage persistence
  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('halfy_lang') as Language;
      if (saved === 'EN' || saved === 'ID') return saved;
    } catch {
      // fallback
    }
    return 'ID';
  });

  const handleToggleLanguage = () => {
    setLang((prev) => (prev === 'ID' ? 'EN' : 'ID'));
  };

  useEffect(() => {
    try {
      localStorage.setItem('halfy_lang', lang);
    } catch {
      // ignore
    }
  }, [lang]);

  // Portfolio state with LocalStorage persistence under halfy_portfolio_crypto_v6
  const [portfolio, setPortfolio] = useState<PortfolioPosition[]>(() => {
    try {
      const saved = localStorage.getItem('halfy_portfolio_crypto_v6');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_PORTFOLIO;
  });

  // Closed Trades history state with LocalStorage persistence
  const [closedTrades, setClosedTrades] = useState<ClosedTradePosition[]>(() => {
    try {
      const saved = localStorage.getItem('halfy_closed_trades_crypto_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_CLOSED_TRADES;
  });

  // Pre-fill stock for Add Position modal when triggered from AI picks / charts / dashboard
  const [pendingAddStock, setPendingAddStock] = useState<Stock | null>(null);
  const [openAddModalSignal, setOpenAddModalSignal] = useState<number>(0);

  // Available Liquidity Cash Balance (USDT) state with LocalStorage persistence
  const [liquidityBalance, setLiquidityBalance] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('halfy_liquidity_crypto_v1');
      if (saved) return parseFloat(saved);
    } catch {
      // fallback
    }
    return 26652.50; // Starting available liquidity matching initial portfolio ($50k equity baseline)
  });

  // Persistensi manual portfolio — skip write bila isi tidak berubah: mencegah
  // tab lain menimpa localStorage dengan state basi (multi-tab clobber).
  useEffect(() => {
    try {
      const next = JSON.stringify(portfolio);
      if (localStorage.getItem('halfy_portfolio_crypto_v6') !== next) {
        localStorage.setItem('halfy_portfolio_crypto_v6', next);
      }
    } catch {
      // ignore
    }
  }, [portfolio]);

  useEffect(() => {
    try {
      const next = JSON.stringify(closedTrades);
      if (localStorage.getItem('halfy_closed_trades_crypto_v1') !== next) {
        localStorage.setItem('halfy_closed_trades_crypto_v1', next);
      }
    } catch {
      // ignore
    }
  }, [closedTrades]);

  useEffect(() => {
    try {
      const next = liquidityBalance.toString();
      if (localStorage.getItem('halfy_liquidity_crypto_v1') !== next) {
        localStorage.setItem('halfy_liquidity_crypto_v1', next);
      }
    } catch {
      // ignore
    }
  }, [liquidityBalance]);

  // Sinkronisasi lintas-tab: bila tab lain mengubah buku, adopsi perubahannya
  // alih-alih saling menimpa dengan state basi.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.newValue) return;
      try {
        if (e.key === 'halfy_portfolio_crypto_v6') {
          const next = JSON.parse(e.newValue);
          setPortfolio((prev) => (JSON.stringify(prev) === e.newValue ? prev : next));
        } else if (e.key === 'halfy_closed_trades_crypto_v1') {
          const next = JSON.parse(e.newValue);
          setClosedTrades((prev) => (JSON.stringify(prev) === e.newValue ? prev : next));
        } else if (e.key === 'halfy_liquidity_crypto_v1') {
          const next = parseFloat(e.newValue);
          setLiquidityBalance((prev) => (prev === next ? prev : (Number.isFinite(next) ? next : prev)));
        }
      } catch {
        // ignore malformed
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Check Web Push Notification status on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushEnabled(Notification.permission === 'granted');
    }
  }, []);

  // Core Data Fetcher
  const loadMarketData = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const [summary, allStocks, liveAlerts] = await Promise.all([
        fetchMarketSummary(),
        fetchStocks(),
        fetchLiveAlerts(),
      ]);

      setIndices(summary.indices);
      setStocks(allStocks);
      setAlerts(liveAlerts);
      setLastUpdated(new Date());
      setBinanceConnected(summary.binance ? summary.binance.connected : null);
      setBinanceLastSync(summary.binance ? summary.binance.lastSync : null);
      setMarketRegime((summary as { regime?: MarketRegime }).regime ?? null);

      // Auto-sync portfolio positions with live calibrated stock/crypto prices.
      // Return prev bila tidak ada harga yang berubah — mencegah churn identitas
      // state yang memicu persistensi ulang tiap polling (multi-tab clobber).
      setPortfolio((prevPortfolio) => {
        let changed = false;
        const next = prevPortfolio.map((pos) => {
          const liveStock = allStocks.find((s) => s.symbol === pos.symbol);
          if (!liveStock) return pos;
          const currentPrice = liveStock.currentPrice;
          const currentValue = Math.round(pos.sharesTotal * currentPrice * 100) / 100;
          const unrealizedPnL = Math.round((currentValue - pos.totalCost) * 100) / 100;
          const unrealizedPnLPercent = pos.totalCost > 0
            ? Math.round((unrealizedPnL / pos.totalCost) * 10000) / 100
            : 0;
          if (
            pos.currentPrice === currentPrice &&
            pos.currentValue === currentValue &&
            pos.unrealizedPnL === unrealizedPnL &&
            pos.unrealizedPnLPercent === unrealizedPnLPercent
          ) {
            return pos;
          }
          changed = true;
          return {
            ...pos,
            currentPrice,
            currentValue,
            unrealizedPnL,
            unrealizedPnLPercent,
          };
        });
        return changed ? next : prevPortfolio;
      });

      if (loading) {
        const defaultStock = allStocks.find((s) => s.market === (currentMarket === 'US' ? 'US' : 'CRYPTO'));
        if (defaultStock) {
          setSelectedStockSymbol(defaultStock.symbol);
        }
      }
    } catch (err) {
      console.error('Error fetching market data:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial load on mount
  useEffect(() => {
    loadMarketData(false);
  }, []);

  // Background active interval polling
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const timer = setInterval(() => {
      loadMarketData(true);
    }, refreshInterval * 1000);

    return () => clearInterval(timer);
  }, [refreshInterval, currentMarket]);

  const handleManualRefresh = () => {
    loadMarketData(false);
  };

  const handleMarketChange = (newMarket: MarketType) => {
    const target = newMarket === 'US' ? 'US' : 'CRYPTO';
    setCurrentMarket(target);
    const candidate = stocks.find((s) => s.market === target);
    if (candidate) {
      setSelectedStockSymbol(candidate.symbol);
    }
  };

  const handleSelectStock = (symbol: string) => {
    setSelectedStockSymbol(symbol);
    const matched = stocks.find((s) => s.symbol === symbol);
    if (matched && matched.market !== currentMarket) {
      setCurrentMarket(matched.market);
    }
    setActiveTab('chart');
  };

  const handleToggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      if (next) playSignalChime('info');
      return next;
    });
  };

  const handleRequestPush = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          setPushEnabled(true);
          if (soundEnabled) playSignalChime('bullish');
          new Notification('Halfy AI: Notifikasi Web Push Aktif', {
            body: 'Anda akan menerima notifikasi instan saat whale accumulation atau breakout krusial terdeteksi.',
          });
        }
      } catch (err) {
        console.error('Push notification request error:', err);
      }
    }
  };

  const handleAddPosition = (posData: Omit<PortfolioPosition, 'id'>) => {
    const newPos: PortfolioPosition = {
      ...posData,
      id: `pos-${Date.now()}`,
    };
    setPortfolio([newPos, ...portfolio]);
    setLiquidityBalance((prev) => Math.max(0, Math.round((prev - posData.totalCost) * 100) / 100));
    if (soundEnabled) playSignalChime('bullish');
  };

  const handleClosePosition = (id: string, closeReason: 'TAKE_PROFIT' | 'STOP_LOSS' | 'MANUAL_EXIT', exitPrice?: number) => {
    const pos = portfolio.find((p) => p.id === id);
    if (!pos) return;

    const actualExitPrice = exitPrice || pos.currentPrice;
    const closeValue = Math.round(pos.sharesTotal * actualExitPrice * 100) / 100;
    const realizedPnL = Math.round((closeValue - pos.totalCost) * 100) / 100;
    const realizedPnLPercent = pos.totalCost > 0
      ? Math.round((realizedPnL / pos.totalCost) * 10000) / 100
      : 0;

    const closedPos: ClosedTradePosition = {
      id: `closed-${Date.now()}`,
      symbol: pos.symbol,
      name: pos.name,
      market: pos.market,
      quantity: pos.quantity,
      averageBuyPrice: pos.averageBuyPrice,
      closePrice: actualExitPrice,
      totalCost: pos.totalCost,
      closeValue,
      realizedPnL,
      realizedPnLPercent,
      dateAdded: pos.dateAdded,
      dateClosed: new Date().toISOString(),
      closeReason,
    };

    setClosedTrades([closedPos, ...closedTrades]);
    setPortfolio(portfolio.filter((p) => p.id !== id));
    // Return trade proceeds (principal + realized PnL) back into available liquidity balance:
    setLiquidityBalance((prev) => Math.round((prev + closeValue) * 100) / 100);

    if (soundEnabled) {
      playSignalChime(realizedPnL >= 0 ? 'bullish' : 'info');
    }
  };

  const handleUpdateLiquidity = (newBalance: number) => {
    setLiquidityBalance(Math.max(0, Math.round(newBalance * 100) / 100));
  };

  const handleRemovePosition = (id: string) => {
    setPortfolio(portfolio.filter((p) => p.id !== id));
  };

  const handleResetSimulation = (initialLiquidity: number = 25000) => {
    setPortfolio([]);
    setClosedTrades([]);
    setLiquidityBalance(initialLiquidity);
    try {
      localStorage.removeItem('halfy_portfolio_crypto_v6');
      localStorage.removeItem('halfy_closed_trades_crypto_v1');
      localStorage.setItem('halfy_liquidity_crypto_v1', initialLiquidity.toString());
    } catch {
      // ignore
    }
  };

  const handleTriggerAddToPortfolio = (stock: Stock) => {
    setSelectedStockSymbol(stock.symbol);
    setPendingAddStock(stock);
    setOpenAddModalSignal((prev) => prev + 1);
    setActiveTab('portfolio');
  };

  const normalizedMarket = currentMarket === 'US' ? 'US' : 'CRYPTO';
  const selectedStock = stocks.find((s) => s.symbol === selectedStockSymbol) || 
    stocks.find((s) => s.market === normalizedMarket) || 
    stocks[0];

  const unreadAlerts = alerts.filter((a) => !a.read).length;

  return (
    <div className="min-h-screen bg-[#080d1a] text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        currentMarket={normalizedMarket}
        onMarketChange={handleMarketChange}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        pushEnabled={pushEnabled}
        onRequestPush={handleRequestPush}
        unreadAlertCount={unreadAlerts}
        refreshInterval={refreshInterval}
        onSetRefreshInterval={setRefreshInterval}
        lastUpdated={lastUpdated}
        isRefreshing={isRefreshing}
        onManualRefresh={handleManualRefresh}
        binanceConnected={binanceConnected}
        lang={lang}
        onToggleLanguage={handleToggleLanguage}
      />

      {/* Real-Time Dual Market Clocks & Trading Sessions */}
      <MarketClockBar
        currentMarket={normalizedMarket}
        onMarketChange={handleMarketChange}
        lang={lang}
      />

      {/* Live Ticker Ribbon */}
      <TickerTape
        indices={indices}
        stocks={stocks}
        onSelectStock={handleSelectStock}
        lang={lang}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 lg:px-6 py-6">
        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center space-y-3">
            <div className="w-9 h-9 rounded-full border-2 border-amber-400 border-t-transparent animate-spin"></div>
            <span className="text-sm font-mono text-slate-300">
              {lang === 'EN'
                ? 'Initializing Halfy AI · 24/7 Crypto Intelligence Terminal...'
                : 'Menginisialisasi Halfy AI · 24/7 Crypto Intelligence Terminal...'}
            </span>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardView
                indices={indices}
                stocks={stocks}
                alerts={alerts}
                currentMarket={normalizedMarket}
                onSelectStock={handleSelectStock}
                onNavigateTab={setActiveTab}
                onAddToPortfolio={handleTriggerAddToPortfolio}
                refreshInterval={refreshInterval}
                onSetRefreshInterval={setRefreshInterval}
                lastUpdated={lastUpdated}
                isRefreshing={isRefreshing}
                onManualRefresh={() => loadMarketData(false)}
                binanceConnected={binanceConnected}
                binanceLastSync={binanceLastSync}
                lang={lang}
              />
            )}

            {activeTab === 'stockpicks' && (
              <StockpicksView
                stocks={stocks}
                currentMarket={normalizedMarket}
                onSelectStock={handleSelectStock}
                onAddToPortfolio={handleTriggerAddToPortfolio}
                lang={lang}
              />
            )}

            {activeTab === 'chart' && selectedStock && (
              <ChartTerminal
                stock={selectedStock}
                onSelectAnotherStock={handleSelectStock}
                onAddToPortfolio={handleTriggerAddToPortfolio}
                lang={lang}
              />
            )}

            {activeTab === 'bandarmology' && (
              <BandarmologyView
                stocks={stocks}
                currentMarket={normalizedMarket}
                onSelectStock={handleSelectStock}
                lang={lang}
              />
            )}

            {activeTab === 'portfolio' && (
              <PortfolioView
                portfolio={portfolio}
                closedTrades={closedTrades}
                stocks={stocks}
                liquidityBalance={liquidityBalance}
                onUpdateLiquidity={handleUpdateLiquidity}
                onAddPosition={handleAddPosition}
                onClosePosition={handleClosePosition}
                onRemovePosition={handleRemovePosition}
                onSelectStock={handleSelectStock}
                pendingAddStock={pendingAddStock}
                openAddModalSignal={openAddModalSignal}
                onClearPendingAddStock={() => setPendingAddStock(null)}
                onResetSimulation={handleResetSimulation}
                binanceLastSync={binanceLastSync}
                marketRegime={marketRegime}
                lang={lang}
              />
            )}

            {activeTab === 'alerts' && (
              <AlertCenterView
                alerts={alerts}
                currentMarket={normalizedMarket}
                pushEnabled={pushEnabled}
                onRequestPush={handleRequestPush}
                soundEnabled={soundEnabled}
                onSelectStock={handleSelectStock}
                lang={lang}
              />
            )}

            {activeTab === 'docs' && <DocumentationView lang={lang} />}
          </>
        )}
      </main>

      {/* Terminal Footer */}
      <footer className="border-t border-slate-800 bg-[#090e1a] px-6 py-4 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-amber-400 font-mono">HALFY AI</span>
          <span>·</span>
          <span>24/7 Crypto Intelligence Terminal (Binance & On-Chain)</span>
          <span>·</span>
          <span>Live Data Feed Binance & TradingView</span>
          <span>·</span>
          <span>v2.0-PRO</span>
        </div>
        <div className="text-xs text-slate-400 text-center sm:text-right">
          {translations[lang]?.footerDesc ||
            'Sarana analitik kuantitatif, riset on-chain & likuiditas pasar kripto. Data streaming Binance & TradingView. Bukan saran investasi finansial.'}
        </div>
      </footer>
    </div>
  );
}
