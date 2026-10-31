# AUDIT_NOTES — HALFY AI Terminal (31 Oktober 2026)

Reconnaissance sesuai brief "Trading Terminal Reliability, Intelligence & UX Upgrade". Diagnosa berdasarkan membaca kode aktual (bukan label UI).

## 1. Arsitektur & Topologi Runtime

| Aspek | Kondisi aktual |
|---|---|
| Framework | React 19 + TypeScript + Vite (client) · Express di `server.ts` (proxy + market data) |
| State management | React hooks di `App.tsx` (buku Manual) & `PortfolioView.tsx` (buku Pure AI + Hybrid) · persistensi **localStorage** (bukan DB) |
| Styling | Tailwind CSS 4, tema terminal gelap, `Plus Jakarta Sans`/mono |
| Halaman/tab | 7 tab: Kondisi Pasar, AI Picks & Radar, TradingView Chart, Whale Flow, Portofolio, Alert Sinyal, Dokumentasi |
| Runtime topology | Tidak ada worker/scheduler/DB/Redis/queue terpisah. Semua trading engine berjalan **di browser** (`PortfolioView.tsx`, interval `setInterval`). Server hanya: proxy Binance (sync 3s, `data-api.binance.vision` + fallback `api.binance.com`), klines asli (cache 60s), universe top-100 discovery (CoinGecko + filter), `/api/gemini/analyze`, sinyal teknikal live dari klines harian (RSI/MA/ATR rule-based untuk extended universe). |
| WebSocket | Tidak ada — polling REST (5s default UI, 3s server sync) |
| Tests | **Tidak ada test infra sebelum upgrade ini** (hanya `tsc --noEmit`). Vitest ditambahkan pada Stage 1. |
| Mode | **Tidak ada eksekusi live sama sekali** — tidak ada endpoint order ke exchange mana pun. Seluruh trading adalah simulasi kertas di browser. Tidak ada API key exchange yang tersimpan. `GEMINI_API_KEY` hanya di server. |

## 2. Sumber data (real / cached / fallback / simulated)

| Feed | Status |
|---|---|
| Harga spot (ticker 24h, 100 aset) | **REAL** — Binance via `data-api.binance.vision`, sync 3s, fallback base + fallback full-fetch |
| Klines harian (chart + fitur teknikal) | **REAL** — klines asli, cache 60s; fallback `generateCandles` sintetis ditandai `simulated: true` |
| Nama & market cap koin | REAL dari CoinGecko (cache per siklus 5 menit); fallback nama simbol |
| Indeks makro (TOTAL MCap, BTC.D, dll.) | **STATIS** dari `marketDatabase.ts` + random-walk kosmetik di server (`getDynamicIndices`) |
| aiSignal 18 koin kurasi | **STATIS** (field database) — dengan sinyal teknikal live hanya untuk 82 koin extended |
| Bandarmology / on-chain / funding / OI | **STATIS / placeholder** — tidak ada sumber independen |
| Alert feed | Hardcoded + harga BTC dinamis |

## 3. Alur signal → risk → order → fill (kondisi pra-upgrade)

```
scan (browser, PortfolioView.tsx handleRunBotAutoScan / runBotScan)
  → kandidat dari stocks (universe 100)
  → gating: isAlreadyActive → strategyFocus → isLongSignal → confidence >= min → R:R >= min   [semua client-side]
  → sizing: calculateBotPositionSize (stop-distance based, Kelly-form dengan p asumsi)
  → POSISI kertas langsung dibuat (tidak ada order intent, tidak ada fill model, tidak ada state machine)
  → TP/SL dipantau di scan berikutnya (manual klik atau autopilot interval)
  → PnL dihitung dari closeValue; kas buku di-update
```

**Tidak ada**: validasi geometri SL/TP, setup lifecycle, idempotency, cooldown, portfolio heat, circuit breaker, fill ledger, fees/slippage.

## 4. Temuan P0 terkonfirmasi (root cause + lokasi)

| # | Temuan | Root cause & lokasi | Bukti |
|---|--------|---------------------|-------|
| P0-A | **Geometri stop tidak divalidasi** — SL bisa di atas entry untuk LONG (kasus TAO entry 234.30 / SL 460) | `runBotScan` di `PortfolioView.tsx` hanya mengecek `isLongSignal`/confidence/R:R; tidak pernah mengecek `stopLoss < entry < target`. aiSignal koin kurasi statis bisa menghasilkan SL di atas harga live setelah harga anjlok (SL statis 460 vs harga live 234). `calculateBotPositionSize` bahkan menjaga `riskDistance = max(price - stop, price*0.02)` — menutupi geometry rusak dengan asumsi. | Snapshot UI user; kode `PortfolioView.tsx` loop kandidat |
| P0-B | **Loop STOP_LOSS → BUY_ENTRY ulang** untuk simbol sama, tanpa cooldown/lifecycle | Tidak ada cooldown map, tidak ada setupId, `isAlreadyActive` hanya cek posisi terbuka — setelah SL posisi tertutup sehingga simbol langsung eligible lagi di scan berikutnya (30-60 dtk). | Log feed user; kode scan |
| P0-C | **Tidak ada circuit breaker / portfolio heat** — 8 posisi konsentrasi long bisa terbuka tanpa batas risiko agregat; max 8 slot ≠ diversifikasi | Tidak ada perhitungan heat; `maxConcurrentPositions` satu-satunya gate. | Kode scan |
| P0-D | **Timestamp log "Baru saja"/"Just now" statis** | `botEngine.ts` seed + `runBotScan` menulis string relatif; tidak pernah bertambah. | `botEngine.ts:135`, scan |
| P0-E | **`$0.00T` untuk indeks market-cap** | Formatter ticker memformat nilai indeks (2.84, satuan sudah triliun) dengan pembagi triliun. | `TickerTape.tsx` / `DashboardView.tsx` |
| P0-F | **Klaim menyesatkan**: "Kelly Criterion" (p asumsi dari skor tak terkalibrasi), "75% AI Confidence" (bukan probabilitas), "tanpa emosi / pure AI" | Label UI di `translations.ts`, `PortfolioView.tsx`, `StockpicksView.tsx`. Formula Kelly memang diimplementasi (`calculateBotPositionSize`) tapi p tidak terkalibrasi. | Kode + snapshot |
| P0-G | **Mode PAPER tidak terlabel eksplisit** di header; batas risiko default 2%/trade (brief: default PAPER 0.5%) | `botEngine.ts INITIAL_*_CONFIG`. | Kode |
| P0-H | Risiko konsentrasi/heat, stale quote, daily loss guardrail tidak ada | Tidak diimplementasi sama sekali. | Kode |

## 5. Batas arsitektur yang diakui (limitation badge)

Engine trading berjalan di browser (paper simulation). Brief §5 mengizinkan: *"migrate execution/state to a durable service **or use a clear limitation badge until migrated**"*. Keputusan: **mem pertahankan engine browser + badge limitasi eksplisit** ("Paper engine berjalan di browser — refresh tidak mengeksekusi order, tapi state engine tidak server-authoritative"), sementara **validator risiko dibuat deterministic & shared** (`src/utils/riskEngine.ts`) sehingga bisa dipindah ke server nanti tanpa rewrite.

Tidak ada eksekusi live → aturan "never place real exchange orders" terpenuhi by design; kill-switch PAUSE_ENTRIES tetap diimplementasi untuk gating entry paper.

## 6. Baseline commands

- `npm run lint` (tsc --noEmit) — baseline PASS
- `npm test` — **belum ada** (ditambahkan Vitest pada Stage 1)
- `npm run build` — belum diverifikasi baseline
- `npm run dev` — server :3000
