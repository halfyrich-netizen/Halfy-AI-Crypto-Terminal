export type Language = 'ID' | 'EN';

export interface TranslationDictionary {
  // Navigation & Header
  brandSubtitle: string;
  navDashboard: string;
  navPicks: string;
  navChart: string;
  navWhale: string;
  navPortfolio: string;
  navAlerts: string;
  navDocs: string;
  liveStatus: string;
  refreshFreq: string;
  pushActive: string;
  pushEnable: string;
  soundOn: string;
  soundOff: string;

  // Market Clock & Ticker
  crypto247: string;
  nextSettlement: string;
  dailyClose: string;
  sessionCycles: string;
  liveTicker: string;
  normalSpeed: string;

  // Dashboard Master Header
  dashTitle: string;
  dashDesc: string;
  dashSessionLabel: string;
  dashStreamLabel: string;
  dashEverySec: string;
  dashSyncText: string;
  dashManual: string;
  dashCalibrateBtn: string;

  // Dashboard Barometer
  barometerTitle: string;
  barometerSubtitle: string;

  // Top 10 Market Cap Table
  top10Title: string;
  top10Subtitle: string;
  top10TabTop10: string;
  top10TabAll: string;
  top10SearchPlaceholder: string;
  colRank: string;
  colCryptoAsset: string;
  colLivePrice: string;
  col24hChg: string;
  colMcapShare: string;
  col24hVol: string;
  colQuickAction: string;
  actionViewChart: string;
  actionAddPortfolio: string;

  // Dashboard Breadth, Movers & Liquidations
  breadthTitle: string;
  moversTitle: string;
  liquidationTitle: string;
  topGainers: string;
  topLosers: string;
  mostActive: string;
  marketDraggers: string;
  advancersLabel: string;
  declinersLabel: string;
  unchangedLabel: string;
  netLiquidations: string;
  longLiq: string;
  shortLiq: string;

  // Stockpicks / AI Picks
  picksTitle: string;
  picksDesc: string;
  allSignals: string;
  highConfidence: string;
  breakoutMomentum: string;
  whaleAccumulation: string;
  oversoldRebound: string;
  signalConfidence: string;
  riskReward: string;
  recordPortfolioBtn: string;
  rationaleHeader: string;
  supportResistance: string;

  // Whale / Bandarmology Flow
  whaleTitle: string;
  whaleDesc: string;
  netWhaleInflow: string;
  largeTxCount: string;
  exchangeReserve: string;
  sentimentGauge: string;
  recentWhaleAlerts: string;

  // Chart Terminal
  chartTitle: string;
  chartDesc: string;
  timeframe: string;
  orderBookTitle: string;
  depthAnalysis: string;

  // Alert Center
  alertsTitle: string;
  alertsDesc: string;
  filterAll: string;
  filterUnread: string;
  filterWhale: string;
  filterBreakout: string;
  markAllRead: string;
  noAlertsFound: string;

  // Portfolio KPI
  portfolioTitle: string;
  portfolioDesc: string;
  manageLiquidity: string;
  addPosition: string;
  balanceLiquidity: string;
  availLiquidity: string;
  freeCashEntry: string;
  positionsValue: string;
  activeCoinPositions: string;
  totalNetWorth: string;
  netWorthDesc: string;
  pnlTitle: string;
  liveUnrealized: string;
  realizedPnlText: string;
  winrateTitle: string;
  closedTradesBadge: string;
  alphaAccuracy: string;

  // Portfolio Modes
  modeManual: string;
  modeBot: string;
  modeBattle: string;
  tabOpenPositions: string;
  tabClosedTrades: string;
  noOpenPositions: string;
  noOpenPositionsDesc: string;
  openPositionNow: string;
  noClosedPositions: string;
  noClosedPositionsDesc: string;

  // Table Columns
  colCoin: string;
  colQuantity: string;
  colEntryPrice: string;
  colMarketValue: string;
  colUnrealizedPnl: string;
  colTargetSl: string;
  colAction: string;
  colDateClosed: string;
  colExitPrice: string;
  colRealizedPnl: string;
  colCloseReason: string;
  colStatus: string;
  closePositionBtn: string;

  // Bot Section
  botEngineTitle: string;
  botEngineDesc: string;
  botActiveBadge: string;
  botPausedBadge: string;
  pauseBotBtn: string;
  activateBotBtn: string;
  scanAndExecuteBtn: string;
  scanningText: string;
  riskPerTrade: string;
  maxConcurrentPos: string;
  minRrFilter: string;
  minAiConfidence: string;
  botActivePositions: string;
  botClosedHistory: string;
  liveActivityLog: string;
  noBotPositions: string;
  noBotClosedTrades: string;

  // Battle Arena
  battleTitle: string;
  battleDesc: string;
  alphaSpreadText: string;
  botLeading: string;
  manualLeading: string;
  fighterManual: string;
  fighterBot: string;
  executionStyle: string;
  styleManualDesc: string;
  styleBotDesc: string;

  // Modals
  closeTradeModalTitle: string;
  closeTradeModalDesc: string;
  confirmCloseTradeBtn: string;
  cancelBtn: string;
  reasonTp: string;
  reasonSl: string;
  reasonManual: string;
  newPositionModalTitle: string;
  newPositionModalDesc: string;
  selectCoinPlaceholder: string;
  marginPercentLabel: string;
  calculatedUnits: string;
  confirmPositionBtn: string;
  manageCashTitle: string;
  quickDepositLabel: string;
  customCashLabel: string;
  saveCashBtn: string;
  botAuditTitle: string;
  botAuditSubtitle: string;
  viewAuditReport: string;
  executionCapital: string;
  remainingLiquidity: string;
  overBudgetWarning: string;
  closeBotPositionBtn: string;
  resetSimulationBtn: string;
  resetModalTitle: string;
  resetModalDesc: string;
  resetScopeLabel: string;
  resetScopeManual: string;
  resetScopeBot: string;
  resetScopeAll: string;
  initialCashChoice: string;
  confirmResetBtn: string;
  resetSuccessToast: string;
  modeSettings: string;
  archetypeTitle: string;
  archetypeDesc: string;
  archetypeAi: string;
  archetypeAiDesc: string;
  archetypeHybrid: string;
  archetypeHybridDesc: string;
  archetypeManual: string;
  archetypeManualDesc: string;
  strategyFocusTitle: string;
  strategyAll: string;
  strategyWhale: string;
  strategyBreakout: string;
  strategyOversold: string;
  sizingModelTitle: string;
  modelKelly: string;
  modelFixed: string;
  modelEqual: string;
  saveSettingsBtn: string;
  restoreDefaultsBtn: string;
  settingsSavedToast: string;

  // Documentation
  docsTitle: string;
  docsDesc: string;

  // Footer
  footerDesc: string;
}

export const translations: Record<Language, TranslationDictionary> = {
  ID: {
    brandSubtitle: '24/7 Crypto Intelligence Terminal',
    navDashboard: 'Kondisi Pasar',
    navPicks: '⚡ Crypto AI Picks & Radar',
    navChart: 'TradingView Binance',
    navWhale: 'Whale & On-Chain Flow',
    navPortfolio: 'Portofolio Crypto',
    navAlerts: 'Alert Sinyal',
    navDocs: 'Dokumentasi & API',
    liveStatus: 'BINANCE 24/7 LIVE',
    refreshFreq: 'Binance/TV:',
    pushActive: 'Notifikasi Web Push aktif',
    pushEnable: 'Aktifkan Notifikasi Web Push',
    soundOn: 'Matikan audio sinyal lonceng',
    soundOff: 'Nyalakan audio sinyal lonceng',

    crypto247: 'CRYPTO 24/7',
    nextSettlement: 'Next Settlement:',
    dailyClose: 'UTC Daily Close: 07:00 WIB (00:00 UTC)',
    sessionCycles: 'Siklus Sesi Global & Funding 8J',
    liveTicker: 'LIVE TICKER',
    normalSpeed: '1x Normal',

    dashTitle: 'Kondisi Pasar Lengkap · 24/7 Global Crypto (Binance Streaming)',
    dashDesc: 'Monitoring komprehensif seluruh indikator makro kripto: Bitcoin Dominance (BTC.D), total kapitalisasi pasar kripto ($2.84T), likuidasi harian, pergerakan on-chain aliran paus (whale flow), serta aset penopang dan pemberat pasar.',
    dashSessionLabel: 'JAM & SESI CRYPTO GLOBAL',
    dashStreamLabel: 'BINANCE/TV STREAM',
    dashEverySec: 'Tiap',
    dashSyncText: 'Sync',
    dashManual: 'Manual',
    dashCalibrateBtn: 'Kalibrasi Harga Live Broker',

    barometerTitle: 'INDEKS ACUAN & BAROMETER PASAR (CRYPTO 24/7)',
    barometerSubtitle: 'Data agregat volatilitas, likuiditas, dan dominasi modal pasar kripto global.',

    top10Title: 'Top 10 Market Cap Kripto Global (Valuasi & Likuiditas)',
    top10Subtitle: 'Peringkat aset digital terbesar dunia berdasarkan kapitalisasi pasar aktual, pangsa pasar (dominance %), harga live Binance, volume 24 jam, dan analisis cepat.',
    top10TabTop10: '10 Terbesar (Top 10)',
    top10TabAll: 'Semua Koin',
    top10SearchPlaceholder: 'Cari koin atau simbol (misal: BTC, SOL, SUI)...',
    colRank: '# Rank',
    colCryptoAsset: 'Aset Kripto',
    colLivePrice: 'Harga Live Binance',
    col24hChg: 'Perubahan 24J',
    colMcapShare: 'Market Cap & Pangsa',
    col24hVol: 'Volume 24 Jam',
    colQuickAction: 'Aksi Cepat',
    actionViewChart: 'Lihat Chart TV',
    actionAddPortfolio: 'Tambah Posisi',

    breadthTitle: 'SEBARAN PASAR & HEATMAP MOMENTUM',
    moversTitle: 'PENGGERAK PASAR: GAINERS & LOSERS 24J',
    liquidationTitle: 'LIKUIDASI & DATA DERIVATIF (FUTURES)',
    topGainers: 'TOP GAINERS',
    topLosers: 'TOP LOSERS',
    mostActive: 'MOST ACTIVE (VOLUME)',
    marketDraggers: 'PEMBERAT PASAR',
    advancersLabel: 'Naik',
    declinersLabel: 'Turun',
    unchangedLabel: 'Stagnan',
    netLiquidations: 'Total Likuidasi 24J',
    longLiq: 'Likuidasi Long',
    shortLiq: 'Likuidasi Short',

    picksTitle: '⚡ Crypto AI Picks & Quantitative Alpha Radar',
    picksDesc: 'Model kuantitatif algoritmik multi-faktor (<2ms) mengidentifikasi peluang asimetris berdasarkan momentum RSI, breakout volume, aliran akumulasi whale, dan level support/resistance.',
    allSignals: 'Semua Sinyal',
    highConfidence: 'High Confidence (>85%)',
    breakoutMomentum: 'Breakout Momentum',
    whaleAccumulation: 'Whale Accumulation',
    oversoldRebound: 'Oversold Rebound',
    signalConfidence: 'Tingkat Keyakinan AI',
    riskReward: 'Risk / Reward Ratio',
    recordPortfolioBtn: 'Catat di Portofolio',
    rationaleHeader: 'Rasional Algoritmik & Analisis On-Chain',
    supportResistance: 'Zona Support / Resistance',

    whaleTitle: 'Whale & On-Chain Flow Intelligence',
    whaleDesc: 'Melacak pergerakan dompet institusi besar, arus masuk/keluar bursa (exchange inflow/outflow), dan transaksi transfer bernilai >$1M secara real-time.',
    netWhaleInflow: 'Arus Bersih Akumulasi Paus',
    largeTxCount: 'Jumlah Transaksi >$1M',
    exchangeReserve: 'Cadangan Koin di Bursa',
    sentimentGauge: 'Indeks Sentimen Smart Money',
    recentWhaleAlerts: 'Deteksi Transaksi Paus Terbaru',

    chartTitle: 'Terminal Chart Interaktif Binance & TradingView',
    chartDesc: 'Grafik candlestick real-time dengan indikator teknikal lengkap (EMA, RSI, MACD, Volume Profile) dan kedalaman orderbook live.',
    timeframe: 'Kerangka Waktu',
    orderBookTitle: 'Live Orderbook Binance',
    depthAnalysis: 'Kedalaman Likuiditas Pasar',

    alertsTitle: 'Pusat Alert & Peringatan Prediktif Pasar',
    alertsDesc: 'Sistem deteksi anomali volume, breakout volatilitas, dan sinyal beli kuantitatif secara otomatis dengan opsi notifikasi audio dan Web Push.',
    filterAll: 'Semua Alert',
    filterUnread: 'Belum Dibaca',
    filterWhale: 'Whale & Smart Money',
    filterBreakout: 'Breakout & Volume',
    markAllRead: 'Tandai Semua Dibaca',
    noAlertsFound: 'Tidak ada alert dalam kategori ini.',

    portfolioTitle: 'Portofolio Terminal Kripto & Autotrade Bot',
    portfolioDesc: 'Pantau alokasi margin likuiditas kas, posisi terbuka Mark-to-Market Binance 24/7, P&L bersih, serta performa Winrate secara terpusat.',
    manageLiquidity: 'Kelola Kas Likuiditas',
    addPosition: 'Tambah Posisi Kripto',
    balanceLiquidity: 'Saldo Kas Likuiditas',
    availLiquidity: 'Available',
    freeCashEntry: 'Kas Bebas USDT',
    positionsValue: 'Nilai Posisi Terbuka',
    activeCoinPositions: 'Posisi Koin Aktif',
    totalNetWorth: 'Total Ekuitas (Net Worth)',
    netWorthDesc: 'Valuasi Total Akun Portofolio',
    pnlTitle: 'P&L Portofolio',
    liveUnrealized: 'Live + Realized',
    realizedPnlText: 'Realized:',
    winrateTitle: 'Winrate Performa',
    closedTradesBadge: 'Closed Trades',
    alphaAccuracy: 'Akurasi Alpha',

    modeManual: 'Portofolio Manual',
    modeBot: 'AI Autotrade Bot',
    modeBattle: 'Battle Arena (VS)',
    tabOpenPositions: 'Posisi Terbuka',
    tabClosedTrades: 'Riwayat Trade Selesai',
    noOpenPositions: 'Belum ada posisi aset terbuka dalam portofolio Anda.',
    noOpenPositionsDesc: 'Saldo Likuiditas Tersedia. Pilih koin dari AI Picks atau klik tombol di bawah untuk membuka posisi baru.',
    openPositionNow: 'Buka Posisi Baru Sekarang',
    noClosedPositions: 'Belum ada riwayat trade yang ditutup.',
    noClosedPositionsDesc: 'Saat Anda mengklik Tutup Posisi pada aset terbuka, hasil realisasi P&L trade akan otomatis diarsipkan di sini.',

    colCoin: 'Koin / Simbol',
    colQuantity: 'Kuantitas Unit',
    colEntryPrice: 'Harga Beli Masuk',
    colMarketValue: 'Nilai Pasar',
    colUnrealizedPnl: 'Unrealized P&L',
    colTargetSl: 'Target TP / SL',
    colAction: 'Aksi Eksekusi',
    colDateClosed: 'Tanggal Tutup',
    colExitPrice: 'Harga Exit Jual',
    colRealizedPnl: 'Realized P&L',
    colCloseReason: 'Alasan Penutupan',
    colStatus: 'Status',
    closePositionBtn: 'Tutup Posisi',

    botEngineTitle: 'Halfy AI · Algorithmic Autotrade Bot Engine',
    botEngineDesc: 'Mengevaluasi sinyal kuantitatif Binance secara otomatis, menghitung ukuran lot berdasarkan risiko per trade dari jarak stop, dan mengeksekusi Auto Take Profit/Stop Loss secara rule-based.',
    botActiveBadge: 'BOT ACTIVE: 24/7 AUTO-EXECUTE',
    botPausedBadge: 'BOT PAUSED',
    pauseBotBtn: 'Jeda Bot',
    activateBotBtn: 'Aktifkan Bot',
    scanAndExecuteBtn: 'Pindai & Eksekusi Otomatis',
    scanningText: 'Scanning Sinyal AI...',
    riskPerTrade: 'Risk Per Trade:',
    maxConcurrentPos: 'Max Concurrent Pos:',
    minRrFilter: 'Minimum R:R Filter:',
    minAiConfidence: 'Kualitas Sinyal Min (0–100):',
    botActivePositions: 'Posisi Aktif Bot',
    botClosedHistory: 'Riwayat Trade Selesai Bot',
    liveActivityLog: 'Live Activity & Algorithmic Execution Log',
    noBotPositions: 'Bot saat ini belum memegang posisi terbuka.',
    noBotClosedTrades: 'Belum ada riwayat posisi yang ditutup oleh bot.',

    battleTitle: 'Battle Arena: Manual Trader vs AI Autotrade Bot',
    battleDesc: 'Tolok ukur komparatif antara intuisi & eksekusi manual Anda versus disiplin matematis rule-based dari algoritma AI Autotrade Bot.',
    alphaSpreadText: 'Alpha Spread (Bot vs Manual):',
    botLeading: '🏆 AI Bot Memimpin Kinerja',
    manualLeading: '🏆 Manual Trader Memimpin',
    fighterManual: '1. Manual Trader Portfolio',
    fighterBot: '2. AI Autotrade Bot Portfolio',
    executionStyle: 'Gaya Eksekusi:',
    styleManualDesc: 'Keputusan Manual & Intuisi Pengguna',
    styleBotDesc: 'Auto Money Management 2% Risk & Kelly Sizing',

    closeTradeModalTitle: 'Tutup Posisi (Close Trade):',
    closeTradeModalDesc: 'Realisasikan hasil dan kembalikan modal ke kas likuiditas',
    confirmCloseTradeBtn: 'Konfirmasi Tutup Trade',
    cancelBtn: 'Batal',
    reasonTp: '🎯 Target Profit (TP) Tercapai / Ambil Keuntungan',
    reasonSl: '🛑 Stop Loss (SL) Proteksi Modal & Disiplin Risiko',
    reasonManual: '⚡ Market Close / Rebalancing & Rotasi Koin',
    newPositionModalTitle: 'Pengambilan Posisi Kripto Baru',
    newPositionModalDesc: 'Tentukan persentase margin likuiditas & ukuran posisi',
    selectCoinPlaceholder: '-- Pilih Koin (BTC, ETH, SOL, SUI, dll.) --',
    marginPercentLabel: 'Margin dari Likuiditas (% Entry)',
    calculatedUnits: 'Kuantitas Unit Terhitung',
    confirmPositionBtn: 'Konfirmasi Pengambilan Posisi',
    manageCashTitle: 'Kelola Saldo Kas Likuiditas',
    quickDepositLabel: 'Deposit Cepat Likuiditas Kas:',
    customCashLabel: 'Atur Saldo Likuiditas Kas Manual ($):',
    saveCashBtn: 'Simpan Saldo Kas',
    botAuditTitle: 'Laporan Audit Algoritmik AI Bot',
    botAuditSubtitle: 'Transparansi penuh evaluasi 18 koin kripto & eksekusi posisi matematis',
    viewAuditReport: 'Lihat Laporan Audit',
    executionCapital: 'Total Modal Eksekusi',
    remainingLiquidity: 'Sisa Likuiditas Kas',
    overBudgetWarning: 'Modal eksekusi melebihi saldo kas likuiditas. Harap kurangi persentase margin.',
    closeBotPositionBtn: 'Tutup Posisi Bot',
    resetSimulationBtn: 'Reset Data & Simulasi',
    resetModalTitle: 'Reset Seluruh Simulasi Portofolio',
    resetModalDesc: 'Mulai ulang dari kas awal bersih ($0 atau nominal kustom) dan hapus seluruh posisi terbuka serta histori transaksi.',
    resetScopeLabel: 'Pilih Bagian yang Ingin Direset:',
    resetScopeManual: 'Portofolio Manual Trader Saja',
    resetScopeBot: 'AI Autotrade Bot Saja',
    resetScopeAll: 'Reset Semua (Manual & AI Bot)',
    initialCashChoice: 'Saldo Kas Likuiditas Awal ($):',
    confirmResetBtn: 'Konfirmasi Reset Bersih',
    resetSuccessToast: 'Simulasi portofolio berhasil direset ke saldo awal.',
    modeSettings: '⚙ Pengaturan & Strategi Bot',
    archetypeTitle: 'Arsitektur Sistem Trading',
    archetypeDesc: 'Pilih derajat otonomi eksekusi antara AI penuh, hybrid terkalibrasi, atau manual.',
    archetypeAi: '1. Pure AI Autonomous',
    archetypeAiDesc: 'Eksekusi otomatis rule-based berbasis sinyal kuantitatif & Crypto AI Picks Halfy AI (sizing fixed-fractional dari jarak stop).',
    archetypeHybrid: '2. Hybrid (AI + User Calibration)',
    archetypeHybridDesc: 'AI memindai kandidat & sizing, namun Anda dapat mengatur multiplier risiko, trailing SL, & konfirmasi 1-klik.',
    archetypeManual: '3. Manual Discretionary',
    archetypeManualDesc: 'Keputusan dan pengambilan posisi manual sepenuhnya. AI bertindak murni sebagai radar analitik.',
    strategyFocusTitle: 'Fokus Strategi (Engine Utama: Halfy AI Picks & Radar)',
    strategyAll: 'Seluruh Sinyal Universe (18 Koin)',
    strategyWhale: 'Akumulasi Paus & Aliran On-Chain (Whale Inflow >$100M)',
    strategyBreakout: 'Momentum Breakout & Volume Anomaly (2x+ Vol)',
    strategyOversold: 'Mean Reversion & Rebound Oversold (RSI < 35)',
    sizingModelTitle: 'Model Manajemen Modal (Money Management)',
    modelKelly: 'Kelly Criterion (Fraksional Peluang AI)',
    modelFixed: 'Fixed Fractional (% Risiko Ketat)',
    modelEqual: 'Equal Weight (Alokasi Rata Kas)',
    saveSettingsBtn: 'Simpan Konfigurasi Bot',
    restoreDefaultsBtn: 'Kembalikan ke Default Halfy AI',
    settingsSavedToast: 'Pengaturan bot AI berhasil disimpan dan aktif!',

    docsTitle: 'Dokumentasi Sistem & Spesifikasi API Halfy AI',
    docsDesc: 'Panduan teknis mengenai algoritma kuantitatif <2ms, arsitektur data streaming Binance, metrik on-chain, dan parameter manajemen modal bot.',

    footerDesc: 'Sarana analitik kuantitatif, riset on-chain & likuiditas pasar kripto. Data streaming Binance & TradingView. Bukan saran investasi finansial.',
  },
  EN: {
    brandSubtitle: '24/7 Crypto Intelligence Terminal',
    navDashboard: 'Market Conditions',
    navPicks: '⚡ Crypto AI Picks & Radar',
    navChart: 'TradingView Binance',
    navWhale: 'Whale & On-Chain Flow',
    navPortfolio: 'Crypto Portfolio',
    navAlerts: 'Signal Alerts',
    navDocs: 'Docs & API',
    liveStatus: 'BINANCE 24/7 LIVE',
    refreshFreq: 'Binance/TV:',
    pushActive: 'Web Push notifications active',
    pushEnable: 'Enable Web Push notifications',
    soundOn: 'Mute signal chime audio',
    soundOff: 'Unmute signal chime audio',

    crypto247: 'CRYPTO 24/7',
    nextSettlement: 'Next Settlement:',
    dailyClose: 'UTC Daily Close: 00:00 UTC (07:00 WIB)',
    sessionCycles: 'Global Sessions & 8H Funding Cycles',
    liveTicker: 'LIVE TICKER',
    normalSpeed: '1x Normal',

    dashTitle: 'Comprehensive Market Conditions · 24/7 Global Crypto (Binance Streaming)',
    dashDesc: 'Comprehensive monitoring of all crypto macro indicators: Bitcoin Dominance (BTC.D), total crypto market cap ($2.84T), daily liquidations, on-chain whale flow, and market pillars vs laggards.',
    dashSessionLabel: 'GLOBAL CRYPTO SESSION & TIME',
    dashStreamLabel: 'BINANCE/TV STREAM',
    dashEverySec: 'Every',
    dashSyncText: 'Sync',
    dashManual: 'Manual',
    dashCalibrateBtn: 'Calibrate Live Broker Price',

    barometerTitle: 'BENCHMARK INDICES & MARKET BAROMETER (CRYPTO 24/7)',
    barometerSubtitle: 'Aggregate volatility, liquidity, and capital dominance data of the global crypto market.',

    top10Title: 'Top 10 Global Crypto Market Cap (Valuation & Liquidity)',
    top10Subtitle: 'World\'s largest digital assets ranked by actual market capitalization, market dominance %, Binance live price, 24h volume, and quick analytics.',
    top10TabTop10: 'Top 10 Largest',
    top10TabAll: 'All Coins',
    top10SearchPlaceholder: 'Search coin or symbol (e.g., BTC, SOL, SUI)...',
    colRank: '# Rank',
    colCryptoAsset: 'Crypto Asset',
    colLivePrice: 'Binance Live Price',
    col24hChg: '24H Change',
    colMcapShare: 'Market Cap & Dominance',
    col24hVol: '24H Volume',
    colQuickAction: 'Quick Action',
    actionViewChart: 'View TV Chart',
    actionAddPortfolio: 'Add Position',

    breadthTitle: 'MARKET BREADTH & MOMENTUM HEATMAP',
    moversTitle: 'MARKET MOVERS: 24H GAINERS & LOSERS',
    liquidationTitle: 'LIQUIDATIONS & DERIVATIVES DATA (FUTURES)',
    topGainers: 'TOP GAINERS',
    topLosers: 'TOP LOSERS',
    mostActive: 'MOST ACTIVE (VOLUME)',
    marketDraggers: 'MARKET DRAGGERS',
    advancersLabel: 'Advancers',
    declinersLabel: 'Decliners',
    unchangedLabel: 'Unchanged',
    netLiquidations: 'Total 24H Liquidations',
    longLiq: 'Long Liquidations',
    shortLiq: 'Short Liquidations',

    picksTitle: '⚡ Crypto AI Picks & Quantitative Alpha Radar',
    picksDesc: 'Multi-factor quantitative algorithmic engine (<2ms) detecting asymmetric risk-reward setups via RSI momentum, volume breakout, whale accumulation, and key support/resistance zones.',
    allSignals: 'All Signals',
    highConfidence: 'High Confidence (>85%)',
    breakoutMomentum: 'Breakout Momentum',
    whaleAccumulation: 'Whale Accumulation',
    oversoldRebound: 'Oversold Rebound',
    signalConfidence: 'AI Confidence Level',
    riskReward: 'Risk / Reward Ratio',
    recordPortfolioBtn: 'Add to Portfolio',
    rationaleHeader: 'Algorithmic Rationale & On-Chain Analysis',
    supportResistance: 'Support / Resistance Zone',

    whaleTitle: 'Whale & On-Chain Flow Intelligence',
    whaleDesc: 'Real-time tracking of institutional whale wallets, exchange net inflows/outflows, and high-value transfers exceeding $1,000,000.',
    netWhaleInflow: 'Net Whale Inflow',
    largeTxCount: 'Transactions >$1M',
    exchangeReserve: 'Exchange Reserves',
    sentimentGauge: 'Smart Money Sentiment Gauge',
    recentWhaleAlerts: 'Latest Whale Activity Feed',

    chartTitle: 'Binance & TradingView Interactive Chart Terminal',
    chartDesc: 'Real-time candlestick charts with advanced technical indicators (EMA, RSI, MACD, Volume Profile) and live orderbook market depth.',
    timeframe: 'Timeframe',
    orderBookTitle: 'Binance Live Orderbook',
    depthAnalysis: 'Market Depth Liquidity',

    alertsTitle: 'Signal Alert Center & Predictive Market Warnings',
    alertsDesc: 'Autonomous anomaly detection for volume surges, volatility breakouts, and quantitative buy signals with real-time audio chime and Web Push notifications.',
    filterAll: 'All Alerts',
    filterUnread: 'Unread Only',
    filterWhale: 'Whale & Smart Money',
    filterBreakout: 'Breakout & Volume',
    markAllRead: 'Mark All as Read',
    noAlertsFound: 'No alerts found in this category.',

    portfolioTitle: 'Crypto Terminal Portfolio & Autotrade Bot',
    portfolioDesc: 'Track cash liquidity margin allocation, open positions marked to Binance 24/7 live tick, net P&L, and Winrate performance.',
    manageLiquidity: 'Manage Cash Liquidity',
    addPosition: 'Add Crypto Position',
    balanceLiquidity: 'Liquidity Cash Balance',
    availLiquidity: 'Available',
    freeCashEntry: 'Available USDT Cash',
    positionsValue: 'Open Positions Value',
    activeCoinPositions: 'Active Coin Positions',
    totalNetWorth: 'Total Equity (Net Worth)',
    netWorthDesc: 'Total Portfolio Account Valuation',
    pnlTitle: 'Portfolio P&L',
    liveUnrealized: 'Live + Realized',
    realizedPnlText: 'Realized:',
    winrateTitle: 'Winrate Performance',
    closedTradesBadge: 'Closed Trades',
    alphaAccuracy: 'Alpha Accuracy',

    modeManual: 'Manual Portfolio',
    modeBot: 'AI Autotrade Bot',
    modeBattle: 'Battle Arena (VS)',
    tabOpenPositions: 'Open Positions',
    tabClosedTrades: 'Closed Trades History',
    noOpenPositions: 'No open asset positions in your portfolio yet.',
    noOpenPositionsDesc: 'Available liquidity ready. Select a coin from AI Picks or click below to open a new position.',
    openPositionNow: 'Open New Position Now',
    noClosedPositions: 'No closed trades recorded yet.',
    noClosedPositionsDesc: 'When you close an open position, realized P&L records will be archived here automatically.',

    colCoin: 'Coin / Symbol',
    colQuantity: 'Unit Quantity',
    colEntryPrice: 'Average Buy Price',
    colMarketValue: 'Market Value',
    colUnrealizedPnl: 'Unrealized P&L',
    colTargetSl: 'Target TP / SL',
    colAction: 'Execution Action',
    colDateClosed: 'Closed Date',
    colExitPrice: 'Exit Sell Price',
    colRealizedPnl: 'Realized P&L',
    colCloseReason: 'Closure Reason',
    colStatus: 'Status',
    closePositionBtn: 'Close Trade',

    botEngineTitle: 'Halfy AI · Algorithmic Autotrade Bot Engine',
    botEngineDesc: 'Autonomously evaluates quantitative Binance signals, calculates lot sizing from actual stop distance, and executes Auto Take Profit/Stop Loss as deterministic rules.',
    botActiveBadge: 'BOT ACTIVE: 24/7 AUTO-EXECUTE',
    botPausedBadge: 'BOT PAUSED',
    pauseBotBtn: 'Pause Bot',
    activateBotBtn: 'Activate Bot',
    scanAndExecuteBtn: 'Scan & Auto-Execute',
    scanningText: 'Scanning AI Signals...',
    riskPerTrade: 'Risk Per Trade:',
    maxConcurrentPos: 'Max Concurrent Pos:',
    minRrFilter: 'Minimum R:R Filter:',
    minAiConfidence: 'Kualitas Sinyal Min (0–100):',
    botActivePositions: 'Active Bot Positions',
    botClosedHistory: 'Bot Closed Trades History',
    liveActivityLog: 'Live Activity & Algorithmic Execution Log',
    noBotPositions: 'Bot does not hold any open positions currently.',
    noBotClosedTrades: 'No closed trades recorded by the bot yet.',

    battleTitle: 'Battle Arena: Manual Trader vs AI Autotrade Bot',
    battleDesc: 'A comparative benchmark between your intuition & manual execution versus emotion-free mathematical discipline of the AI Autotrade Bot.',
    alphaSpreadText: 'Alpha Spread (Bot vs Manual):',
    botLeading: '🏆 AI Bot Leading Performance',
    manualLeading: '🏆 Manual Trader Leading',
    fighterManual: '1. Manual Trader Portfolio',
    fighterBot: '2. AI Autotrade Bot Portfolio',
    executionStyle: 'Execution Style:',
    styleManualDesc: 'Manual Discretionary & User Intuition',
    styleBotDesc: 'Auto Money Management 2% Risk & Kelly Sizing',

    closeTradeModalTitle: 'Close Trade Position:',
    closeTradeModalDesc: 'Realize trading P&L and return capital back to cash liquidity',
    confirmCloseTradeBtn: 'Confirm Close Trade',
    cancelBtn: 'Cancel',
    reasonTp: '🎯 Take Profit (TP) Target Reached / Profit Taking',
    reasonSl: '🛑 Stop Loss (SL) Capital Protection & Risk Discipline',
    reasonManual: '⚡ Market Close / Rebalancing & Capital Rotation',
    newPositionModalTitle: 'Open New Crypto Position',
    newPositionModalDesc: 'Select liquidity margin percentage & calculate position sizing',
    selectCoinPlaceholder: '-- Select Coin (BTC, ETH, SOL, SUI, etc.) --',
    marginPercentLabel: 'Margin from Liquidity (% Entry)',
    calculatedUnits: 'Calculated Unit Quantity',
    confirmPositionBtn: 'Confirm Position Entry',
    manageCashTitle: 'Manage Cash Liquidity Balance',
    quickDepositLabel: 'Quick Cash Liquidity Deposit:',
    customCashLabel: 'Manual Cash Liquidity Balance ($):',
    saveCashBtn: 'Save Cash Balance',
    botAuditTitle: 'AI Bot Algorithmic Scan & Trade Execution Report',
    botAuditSubtitle: 'Full transparency on 18 crypto coin evaluations & mathematical trade executions',
    viewAuditReport: 'View Audit Report',
    executionCapital: 'Total Execution Capital',
    remainingLiquidity: 'Remaining Cash Liquidity',
    overBudgetWarning: 'Execution capital exceeds available liquidity balance. Please reduce margin percentage.',
    closeBotPositionBtn: 'Close Bot Trade',
    resetSimulationBtn: 'Reset Simulation Data',
    resetModalTitle: 'Reset All Portfolio Simulation Data',
    resetModalDesc: 'Restart from clean initial cash ($0 or custom balance) and wipe all open positions and trade history.',
    resetScopeLabel: 'Select Scope to Reset:',
    resetScopeManual: 'Manual Trader Portfolio Only',
    resetScopeBot: 'AI Autotrade Bot Only',
    resetScopeAll: 'Reset Everything (Manual & AI Bot)',
    initialCashChoice: 'Starting Cash Liquidity Balance ($):',
    confirmResetBtn: 'Confirm Clean Reset',
    resetSuccessToast: 'Portfolio simulation successfully reset to starting balance.',
    modeSettings: '⚙ Bot Settings & Strategies',
    archetypeTitle: 'Trading System Archetype',
    archetypeDesc: 'Choose execution autonomy between pure AI, user-calibrated hybrid, or manual.',
    archetypeAi: '1. Pure AI Autonomous',
    archetypeAiDesc: '100% hands-free automatic execution based on Kelly Criterion & Halfy AI Alpha Picks.',
    archetypeHybrid: '2. Hybrid (AI + User Calibration)',
    archetypeHybridDesc: 'AI scans & sizes setups, but you adjust risk multiplier, trailing stop-loss, & 1-click confirmation.',
    archetypeManual: '3. Manual Discretionary',
    archetypeManualDesc: 'Pure discretionary manual trading. AI acts strictly as an analytical intelligence radar.',
    strategyFocusTitle: 'Strategy Focus (Primary Engine: Halfy AI Picks & Radar)',
    strategyAll: 'All Universe Signals (18 Coins)',
    strategyWhale: 'Whale Accumulation & On-Chain Inflows (>$100M)',
    strategyBreakout: 'Momentum Breakout & Volume Anomaly (2x+ Vol)',
    strategyOversold: 'Mean Reversion & Oversold Bounce (RSI < 35)',
    sizingModelTitle: 'Money Management Sizing Model',
    modelKelly: 'Kelly Criterion (Fractional Edge/Odds)',
    modelFixed: 'Fixed Fractional (Strict Risk %)',
    modelEqual: 'Equal Weight (Flat Cash Allocation)',
    saveSettingsBtn: 'Save Bot Configuration',
    restoreDefaultsBtn: 'Restore Default Settings',
    settingsSavedToast: 'AI Bot settings successfully saved and active!',

    docsTitle: 'Halfy AI System Documentation & API Specification',
    docsDesc: 'Technical overview of the <2ms quantitative algorithms, Binance streaming architecture, on-chain whale flow metrics, and autotrade bot money management rules.',

    footerDesc: 'Quantitative analytics, on-chain research & crypto market liquidity terminal. Binance & TradingView live streaming. Not personal financial advice.',
  },
};
