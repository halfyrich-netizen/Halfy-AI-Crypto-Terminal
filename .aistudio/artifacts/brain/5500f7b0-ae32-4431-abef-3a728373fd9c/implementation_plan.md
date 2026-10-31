# Gigantum-Grade Dual-Market AI Stock Intelligence & Terminal (IDX & US)

Platform terminal analitik pasar modal terpadu untuk bursa Indonesia (IDX) dan Amerika Serikat (US Wall Street) yang menggabungkan analisis teknikal, fundamental, bandarmologi (foreign flow/broker accumulation), AI sentiment intelligence menggunakan Gemini, sistem sinyal stockpick prediktif, notifikasi push instan, dan manajemen portofolio profesional.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Keputusan Desain & Fungsional yang Telah Dikonfirmasi (Phase 1):**
> 1. **Cakupan Pasar**: Dual pasar **IDX (Indonesia)** dan **US (Wall Street)** dengan toggle cepat tanpa reload (*sub-second market switching*).
> 2. **Pilar Analisis Stockpick**: Model hibrida 4-faktor yang menyatukan **Teknikal** (RSI, MACD, Moving Averages), **Fundamental** (PER, PBV, ROE, DER), **AI Sentimen & Narasi Berita Pasar**, serta **Bandarmologi / Foreign Flow** (khusus IDX dan Institutional Flow untuk US).
> 3. **Gaya Visual & Tema**: **Dark Terminal Pro** berstandar Bloomberg Terminal dan TradingView — kontras tinggi, palet slate gelap monokromatis dengan aksen neon hijau (*emerald*) untuk bullish/profit dan merah (*rose*) untuk bearish/loss, serta font tabular angka monospaced anti-jitter.

---

### 1. Overview & Core Concept

- **Apa yang Dibangun**: Sebuah platform terminal analitik saham all-in-one (*desktop-first responsive web app*) yang mengadopsi dan menyempurnakan kapabilitas Gigantum AI. Aplikasi menyajikan pemindaian pasar real-time (*screener*), rekomendasi sinyal harian (*AI Stockpick* dengan target price & stop-loss), charting interaktif multi-timeframe (candlestick & area) lengkap dengan indikator teknikal, modul bandarmologi/broker summary, analisis sentimen berita berbasis LLM, pusat notifikasi push real-time untuk sinyal krusial, dan modul pencatatan portofolio investasi multi-aset (Rupiah & USD).
- **Target Pengguna**: Investor retail aktif, swing trader, dan growth investor di pasar modal Indonesia dan Amerika yang membutuhkan wawasan berbasis data tanpa harus membuka banyak aplikasi terpisah.
- **Nilai Unggul Dibandingkan Kompetitor**: Mengintegrasikan analisis bandarmologi khas IDX dengan kecerdasan sintesis narasi AI model terkini (`gemini-3.8-flash`) yang mampu membaca data kuantitatif sekaligus sentimen berita global, dilengkapi kalkulator *risk-to-reward* otomatis dan sistem alert browser real-time.

---

### 2. User Experience & Visual Design

#### A. Key User Flows
1. **Market Overview & Ticker Ribbon**: Pengguna membuka terminal, melihat live ticker tape di bagian atas (IHSG, S&P 500, Nasdaq, LQ45, Top Movers IDX & US), dan dapat beralih antara pasar IDX dan US dengan tombol toggle 1-klik di top bar.
2. **AI Stockpick & Signal Radar**: Tab Stockpick menampilkan rekomendasi harian terklasifikasi (*Strong Buy, Buy, Hold, Sell, Cut Loss*) dengan metrik *Confidence Score* (0–100%), *Target Price 1 & 2*, *Stop Loss*, dan *Risk/Reward Ratio*, disertai ringkasan tesis investasi AI 3-pilar (Teknikal, Fundamental, Sentimen).
3. **Interactive Charting & Technical Hub**: Memilih emiten (misal: BBCA, BBRI, NVDA, AAPL) membuka panel chart interaktif dengan opsi Candlestick / Line, pemilihan timeframe (1D, 1W, 1M, 3M, 1Y), overlay MA20/MA50/MA200, Bollinger Bands, sub-chart Volume, dan indikator RSI.
4. **Bandarmologi & Flow Detector**: Khusus emiten IDX, menampilkan akumulasi/distribusi 5 broker teratas (Broker Summary), status Net Foreign Buy/Sell (NFB/NFS), dan indikator deteksi akumulasi bandar (Big Acc, Normal Acc, Neutral, Normal Dist, Big Dist). Untuk pasar US, modul ini beradaptasi menjadi *Institutional Dark Pool & 13F Sentiment Flow*.
5. **AI Deep Dive & News Sentiment Engine**: Pengguna dapat memicu analisis mendalam satu emiten menggunakan tombol *"Analyze with AI"*, yang mengirimkan profil keuangan terkini dan sentimen berita ke backend Gemini untuk menghasilkan sintesis risiko, sentimen skor (-100 s/d +100), dan katalis penggerak harga.
6. **Live Predictive Alerts & Push Notifications**: Sistem memonitor pergerakan harga dan sinyal teknikal (misal Breakout Resistance, Golden Cross MA50/200, Volume Spike >200%, Sudden Bandar Accumulation). Pengguna dapat mengaktifkan Web Push Notifications dan menerima notifikasi desktop serta log toast interaktif di dalam aplikasi.
7. **Comprehensive Portfolio Tracker**: Pengguna dapat mencatat transaksi beli/jual saham IDX (konversi lot x 100 lembar) dan saham US (konversi lembar/shares), melacak nilai portofolio total, keuntungan/kerugian belum terealisasi (*Unrealized PnL*), alokasi aset sektoral (*Sector Breakdown*), dan target profit.

#### B. Visual Identity & Theme (Bloomberg / TradingView Terminal Pro)
- **Palette & Atmosphere**:
  - Latar Utama Canvas: Slate Ultra-Dark (`#090D16` / `#0B0F19`)
  - Permukaan Panel & Header: Neutral Charcoal (`#131B2E` / `#162035`) dengan hairline border tipis (`#1E293B`)
  - Aksen Bullish / Profit: Crisp Emerald Green (`#10B981` / `#34D399`)
  - Aksen Bearish / Loss: Vibrant Rose Red (`#F43F5E` / `#FB7185`)
  - Aksen Netral / Brand: Electric Cyan / Sky Blue (`#0EA5E9` / `#38BDF8`) untuk penanda active tabs dan indikator AI
- **Tipografi**:
  - Font Display & UI: `Plus Jakarta Sans` / `Outfit` untuk kejelasan hirarki navigasi dan heading.
  - Font Angka & Keuangan: `JetBrains Mono` / Monospace dengan `tabular-nums` wajib pada semua harga, persentase, volume, dan target harga untuk mencegah pergeseran layout saat angka berfluktuasi.
- **Layout & Spatial Density**:
  - Full-width desktop terminal layout (1440px baseline) dengan sidebar navigasi ramping (Dashboard, Stockpick, Screener, Charting, Bandarmologi, Portofolio, Alert Center).
  - Top Bar Contract 3-zona yang bersih: Brand Wordmark -> Navigation Links / Toggles -> Primary Action (Search & Push Notification Toggle).

---

### 3. Roadmap Pengembangan (Riset s/d Perilisan MVP)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ROADMAP PENGEMBANGAN GIGANTUM AI                      │
└─────────────────────────────────────────────────────────────────────────────┘
  FASE 1: RISET & BENCHMARKING (Minggu 1 - 2)
  ├── Bedah fitur inti Gigantum ID (AI Screener, Bandarmology, Stockpick bot)
  ├── Audit arsitektur data vendor (IDX Data Feed, Yahoo Finance, Finnhub, Alpha Vantage)
  └── Evaluasi model prompt engineering & response schema Gemini untuk finansial

  FASE 2: ARSITEKTUR CORE & INGESTI DATA (Minggu 3 - 4)
  ├── Desain skema data multi-market (IDX & US ticker symbology, currency IDR/USD)
  ├── Pipeline normalisasi metrik teknikal (RSI, MACD, SMA/EMA ribbons)
  └── Pipeline sintesis sentimen berita menggunakan Gemini API dengan Search Grounding

  FASE 3: PEMBUATAN ALGORITMA STOCKPICK & BANDARMOLOGI (Minggu 5 - 6)
  ├── Algoritma perhitungan Net Foreign Flow & Broker Summary Top 3/Top 5
  ├── Multi-factor Scoring Engine (Teknikal 35% + Fundamental 25% + Bandar 25% + Sentimen 15%)
  └── Generator sinyal dinamis: Target Price, Stop Loss, dan Risk/Reward Ratio

  FASE 4: DASHBOARD & FITUR INTERAKTIF FRONTEND (Minggu 7 - 8)
  ├── TradingView-grade interactive charting (Candlestick, Volume, Overlay MA/BB)
  ├── Dual-market switch controller dengan instant client-side filtering
  └── In-app notification hub & integrasi Web Push Notification API

  FASE 5: MANAJEMEN PORTOFOLIO & AUDIT KEAMANAN (Minggu 9 - 10)
  ├── Multi-asset portfolio tracker (Kalkulasi lot IDX vs shares US, PnL, alokasi)
  ├── Hardening backend: rate limiting, payload sanitization, caching layer
  └── Verifikasi akurasi data & user testing MVP (Internal Beta Release)
```

---

### 4. Technical Architecture, Backend & Real-time Integrations

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            ARSITEKTUR SISTEM TERMINAL                            │
└──────────────────────────────────────────────────────────────────────────────────┘

  [ Client Tier: React 19 + Tailwind CSS 4 + Motion + Lucide ]
  ├── Top Navigation & Dual-Market Switcher (IDX / US)
  ├── Live Ticker Tape & Market Pulse (IHSG, S&P 500, LQ45, Nasdaq)
  ├── Interactive Chart Viewport (Candlestick, Moving Averages, RSI, Volume)
  ├── AI Stockpick Radar (Composite Score, Action Signals, Risk-Reward)
  ├── Bandarmology & Broker Flow Matrix (Foreign Flow, Accumulation Phase)
  ├── Portfolio Performance Engine (Holdings, Lots/Shares, Realized/Unrealized PnL)
  └── Push Notification Dispatcher (Browser Push API + Sound Alert + Activity Log)
                                │
                                ▼ [REST & Stream Proxy API]
  [ Server Tier: Node.js Express Server (/api/*) ]
  ├── /api/market/quote          -> Live & Historical Candle Data (IDX & US)
  ├── /api/market/screener       -> Multi-factor filterable stock universe
  ├── /api/market/bandarmology   -> Broker summary & foreign flow aggregation
  ├── /api/gemini/sentiment      -> Gemini 3.8 Flash AI News & Market Sentiment
  ├── /api/gemini/stockpick      -> Algorithmic Multi-factor Stockpick Synthesis
  ├── /api/alerts/stream         -> Predictive signal dispatcher & threshold events
  └── /api/portfolio/*           -> Persistent portfolio storage & PnL calculus
                                │
                                ▼
  [ External Data Providers & AI Models ]
  ├── Real-time / EOD Financial APIs (Yahoo Finance API / Finnhub / IDX Web API)
  ├── Google Gemini AI API (`@google/genai` via process.env.GEMINI_API_KEY)
  └── Local Storage / Persistent Cache for user settings & portfolio state
```

#### A. Backend Architecture & Integrasi Data Real-Time
1. **Server-Side API Proxying**: Seluruh pemanggilan ke Google Gemini API dan data penyedia finansial dilakukan dari backend Express (`server.ts`). Kunci API tersimpan aman di environment server dan tidak pernah terekspos ke bundle browser client.
2. **Data Pipeline & Fallback Cache**:
   - Pasar US: Data harga real-time dan historis diambil melalui provider finansial standar dengan *caching layer* 60 detik untuk quote aktif dan 24 jam untuk laporan keuangan historis.
   - Pasar IDX: Simbologi 4 huruf ticker IDX (misal `BBCA.JK`, `BBRI.JK`) dinormalisasi dengan data broker summary agregat dan foreign flow harian.
3. **Algoritma Stockpick Multi-Faktor (Machine Learning & AI Sentiment)**:
   - Skor Akhir: $$Score = 0.35 \times T + 0.25 \times F + 0.25 \times B + 0.15 \times S$$
   - $T$ (Teknikal): Posisi RSI (30-70), EMA Cross (Bullish Golden Cross), Support-Resistance proximity.
   - $F$ (Fundamental): Valuasi PER vs Industri, PBV, ROE (>15%), Debt-to-Equity (<1.0).
   - $B$ (Bandarmologi): Rasio Akumulasi Top 3 Broker vs Total Volume, 5-day Net Foreign Flow.
   - $S$ (AI Sentimen): Gemini Flash menganalisis 5 headline berita terkini emiten dan menghasilkan skor sentimen numerik terkalibrasi (-100 hingga +100).
4. **Strategi Keamanan Sistem**:
   - *Rate Limiting*: 60 request/menit per IP untuk endpoint publik; perlindungan terhadap DoS dan scraping.
   - *Input Sanitization*: Ticker validator menggunakan regex ketat `^[A-Z0-9.]{1,10}$` untuk mencegah command injection / SSRF.
   - *CSP & Header Security*: Penggunaan header keamanan anti-clickjacking dan isolasi token.

---

### 5. Rencana Implementasi & Struktur Komponen

1. **Backend Infrastructure (`server.ts`)**:
   - Endpoint `/api/market/summary` (IHSG, S&P 500, top gainers, top volume)
   - Endpoint `/api/market/stocks` (Universe lengkap saham IDX & US dengan metrik fundamental dan teknikal)
   - Endpoint `/api/market/chart/:symbol` (Data bar candle OHLCV historis & intraday)
   - Endpoint `/api/market/bandar/:symbol` (Data broker summary & foreign flow)
   - Endpoint `/api/gemini/analyze` (Deep AI synthesis sentimen, katalis, dan target proyeksi)
2. **Terminal Shell & Navigation (`src/App.tsx`)**:
   - Top Bar dengan ticker tape ribbon live, toggle pasar IDX / US, dan tombol Notification Permission
   - Tab navigasi utama:
     - **Dashboard**: Ringkasan pasar, heatmap sektor, top signal harian
     - **AI Stockpicks**: Radar rekomendasi sinyal terverifikasi dengan target TP & SL
     - **Chart & Analytics**: Terminal charting interaktif candlestick + indikator teknikal
     - **Bandarmologi**: Broker summary top 5 buyer/seller dan flow asing
     - **Portofolio**: Pelacak investasi dengan kalkulasi lot IDX dan shares US, PnL, dan grafik performa
     - **Alert Center**: Log sinyal prediktif real-time dan konfigurasi notifikasi push
3. **Data Mocking & Real Feed Fallback Resilience**:
   - Dataset komprehensif saham-saham terpopuler IDX (BBCA, BBRI, BMRI, TLKM, ASII, BREN, AMMN, GOTO, ICBP, ADRO, KLBF, UNVR) dan US (NVDA, AAPL, MSFT, TSLA, AMZN, GOOGL, META, AMD, PLTR, COIN).
   - Live AI integration via Gemini untuk analisis on-demand yang fleksibel pada ticker mana pun.
4. **Interactive Push Notification Engine**:
   - Integrasi `Notification.requestPermission()` dan `new Notification(...)` saat terpicu sinyal beli/jual kuat.
   - In-app audible notification chime & alert toast center.

---

### 6. Verifikasi & Pengujian
- **Verifikasi Fungsional**: Uji toggle pasar IDX/US, pengubahan ticker di chart, pemicuan AI analysis, simulasi sinyal beli/jual dan push alert, serta penambahan transaksi ke portofolio.
- **Verifikasi Tipografi & Desain**: Pastikan semua angka menggunakan `tabular-nums`, tidak ada pill badge berlebih, kontras warna WCAG AA, dan layout responsif tanpa overflow.
- **Verifikasi Build**: Jalankan `compile_applet` dan `lint_applet` untuk menjamin tidak ada error TypeScript maupun dependensi yang rusak.
