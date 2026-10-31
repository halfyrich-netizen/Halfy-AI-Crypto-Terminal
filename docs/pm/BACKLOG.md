# Backlog — Halfy AI Crypto Terminal

Terakhir diaudit: 2026-10-31 (audit langsung ke kode, bukan dari rencana).

## Legenda Status

`todo` → belum dikerjakan · `doing` → sedang dikerjakan · `review` → menunggu verifikasi · `done` → selesai & terverifikasi

Prioritas: 🔴 P1 (blocking) · 🟡 P2 (penting) · 🟢 P3 (bisa menunggu)

---

## 🔴 P1 — Blocking

| ID | Task | Milestone | Status | Catatan |
|----|------|-----------|--------|---------|
| HAC-1 | Integrasi Binance Klines API untuk candle historis asli | M2 | `done` | 2026-10-31: `/api/market/chart` kini dari klines asli (cache 60s, validasi simbol, flag `simulated` saat fallback); terverifikasi candle terakhir = harga live |
| HAC-2 | Rate limiting per IP di semua endpoint `/api/*` | M3 | `todo` | `/api/docs/spec` mengklaim "60 req/min" tapi tidak ada middleware-nya |
| HAC-3 | Validasi & sanitasi input (simbol, timeframe, body analyze) | M3 | `todo` | `req.params.symbol` langsung dipakai tanpa validator |
| HAC-4 | Fallback & status stale-data saat Binance/Gemini gagal | M2 | `todo` | Saat ini UI tidak tahu bedanya data live vs gagal fetch |

## 🟡 P2 — Penting

| ID | Task | Milestone | Status | Catatan |
|----|------|-----------|--------|---------|
| HAC-5 | Caching layer (quote 60s, klines 1 jam) | M2 | `todo` | Menghemat rate limit Binance & mempercepat response |
| HAC-6 | Multi-timeframe dari data asli (1H/4H/1D/1W) | M2 | `todo` | Bergantung HAC-1 |
| HAC-7 | Ganti `package.json` name `"react-example"` → `halfy-ai-crypto-terminal` | M4 | `todo` | Identitas project |
| HAC-8 | Test runner (Vitest) + test untuk `botEngine`, PnL portfolio, normalisasi simbol | M4 | `todo` | Logika finansial tanpa test = risiko bug uang |
| HAC-9 | CI GitHub Actions: lint + build + test | M4 | `todo` | Repo sudah di GitHub, tinggal tambah workflow |
| HAC-10 | Keputusan nasib folder `.aistudio/` & `metadata.json` | M4 | `todo` | Implementation plan lama sudah usang (masih bahas saham IDX/US) |
| HAC-11 | Security headers (CSP, X-Frame-Options) | M3 | `todo` | |

## 🟢 P3 — Nanti

| ID | Task | Milestone | Status | Catatan |
|----|------|-----------|--------|---------|
| HAC-12 | Web Push Notifications untuk alert kritis | M5 | `todo` | Saat ini hanya in-app toast + suara |
| HAC-13 | Sinkronisasi portfolio server-side | M5 | `todo` | Data user hilang jika localStorage dibersihkan |
| HAC-14 | Screener endpoint dengan filter sisi server | M5 | `todo` | |
| HAC-15 | Simulasi/paper trading untuk strategi botEngine | M5 | `todo` | |
| HAC-16 | Logging & monitoring dasar | M6 | `todo` | |
| HAC-17 | Secret management untuk produksi | M6 | `todo` | |
| HAC-18 | Lockfile & install dari fresh clone (esbuild sudah dinaikkan ke ^0.28.0 — commit package.json + regenerate lockfile) | M4 | `done` | 2026-10-31: fresh clone gagal `npm install` karena esbuild ^0.25.0 bentrok dengan peer Vite 8 |
| HAC-19 | **Jalankan audit fungsional per halaman & per fungsi** sesuai [AUDIT-PLAN.md](AUDIT-PLAN.md) — konfirmasi 24 temuan audit statis, isi status tiap checklist | M2 | `done` | 2026-10-31: audit runtime tereksekusi penuh; hasil di bagian "HASIL AUDIT RUNTIME" AUDIT-PLAN.md; 9 temuan baru (R-1..R-9) |
| HAC-20 | Tindak lanjut hasil audit: konversi semua temuan ❌/🛑/⚫ menjadi task backlog + putuskan label/sambung/hapus untuk tiap fitur mock | M2 | `doing` | Dikerjakan 2026-10-31: temuan baru masuk sebagai HAC-21..HAC-28 di bawah |
| HAC-21 | 🔴 **R-1**: Data source tidak bisa diandalkan dari jaringan Indonesia (Binance HTTP 000) — tambah indikator status koneksi nyata di UI + fallback data source (proxy / provider alternatif) + tampilkan status "stale" saat fetch gagal | M2 | `done` | 2026-10-31: server & client pindah ke `data-api.binance.vision` (fallback `api.binance.com`); status koneksi nyata diekspos di `/api/market/summary` & ribbon Dashboard + badge Navbar (merah "DATA STALE" saat putus). Verifikasi akurasi: BTC app $77.458 vs CoinGecko $77.357 vs Gate.io $77.419 (<0,1% spread) |
| HAC-1b | Integrasi Binance Klines API untuk candle historis asli — sekarang bisa langsung via `data-api.binance.vision/api/v3/klines` (terverifikasi dari jaringan user) | M2 | `done` | Terealisasi bersama HAC-1 |
| HAC-22 | 🔴 **R-2**: Fix add-position salah aset — simbol dari modal "+ Posisi"/Stockpicks harus terbawa ke posisi tersimpan (submit PEPE menghasilkan BTC) | M2 | `done` | 2026-10-31 re-audit: logika modal & submit sudah benar (select bound ke `symbolInput`); reproduksi R-2 = klik ganda "+ Tambah Posisi" saat modal terbuka + **multi-tab clobber** (HAC-35). Verifikasi runtime: submit PEPE → posisi PEPE tersimpan & bertahan |
| HAC-23 | 🔴 **R-3**: Fix tutup posisi — refund modal ke kas likuiditas tidak pernah masuk (janji +$6.665,60, saldo tetap) | M2 | `done` | 2026-10-31 re-audit: logika refund (manual `+closeValue`; bot/hybrid `liquidityBalance + closeVal`) sudah benar; kegagalan audit = multi-tab clobber (HAC-35). Verifikasi runtime: tutup PEPE → kas $13.050,15 + $2.293,57 (closeValue live) = $15.343,72 persis |
| HAC-24 | 🟠 **R-4**: Engine kuantitatif rusak untuk token sub-sen (PEPE: ATR/target/SL = $0, R:R "1 : 0x") — perbaiki presisi/pembulatan | M2 | `todo` | |
| HAC-25 | 🟠 **R-5**: TickerTape format indeks "$0.00T" — perbaiki formatter nilai market cap | M3 | `todo` | |
| HAC-26 | 🟡 **R-6**: Kalibrasi harga mengotori dayLow/high permanen — reset atau kelola field turunan saat kalibrasi | M3 | `done` | 2026-10-31: kalibrasi tidak lagi menyentuh dayHigh/dayLow; verifikasi: kalibrasi ke $1, dayLow tetap $76.325,98 (nilai market asli) |
| HAC-27 | 🟡 **R-7**: Persist tab aktif (reload kembali ke Dashboard) | M4 | `todo` | |
| HAC-28 | 🟡 Labelisasi kejujuran data (kelompok temuan #2,3,4,5,7,9,11): beri badge "Simulasi/Static" untuk aiSignal statis, alert feed, bandarmology, panel makro, seed bot, fallback Gemini, ribbon koneksi | M2 | `todo` | Eksekusi keputusan HAC-20; lihat lampiran AUDIT-PLAN |
| HAC-29 | ⚫ Hapus/sambungkan dead code: `fetchMarketCondition`, `fetchStockDetail`, endpoint `condition` & `docs/spec`, prop `onSelectAnotherStock`, props MarketClockBar, kondisi badge 'Strong Buy' di TickerTape, checkbox RSI (render atau hapus) | M4 | `todo` | Gabungan temuan #13,14,15,16,17 |
| HAC-30 | 🛠 Mode Hybrid nyata: posisi/trade/log ditandai archetype saat eksekusi; Battle Arena Fighter Hybrid menampilkan atribusi PnL hybrid ASLI (bukan PnL bot × multiplier fiktif) dengan honest empty state; badge "HYBRID · x RISK" di mode Bot; posisi bot di-mark-to-market live antar scan agar KPI/tabel/Battle Arena selalu tally dengan harga Binance | M2 | `done` | 2026-10-31: terverifikasi runtime — scan HYBRID membuka 4 posisi bertag HYBRID, Fighter 3 menampilkan PnL hybrid live yang tally (selisih <0,01%); fighter lama menampilkan angka karangan ($1.250 fallback) |
| HAC-31 | 🤖 **Autopilot 24/7**: bot (Pure AI & Hybrid) scan otomatis tiap N detik selama `isActive` — pantau TP/SL & buka posisi tanpa klik manual; interval diatur di Settings (Mati/30s/1m/2m/5m, default 60s, persist); guard anti-scan-tumpang-tindih; scan auto tidak membuka modal audit; indikator "AUTOPILOT 24/7" + scan terakhir di header bot; mode Manual tetap penuh kendali user | M2 | `done` | 2026-10-31: terverifikasi runtime — 40 detik tanpa interaksi menghasilkan 2 scan otomatis (log 4→8) termasuk eksekusi AUTO-SL nyata pada TAO karena pergerakan harga live |
| HAC-32 | 🌐 **Universe dinamis top 100**: server menemukan top 100 pasangan USDT Binance berdasarkan volume nyata (refresh 5 menit), nama & market cap dari CoinGecko, sinyal teknikal LIVE dihitung dari klines harian asli (RSI/MA/ATR/Bollinger — rule-based transparan); sync tiap 3 detik mencakup seluruh universe dengan fallback batch→full-fetch; filter memblokir stablecoin/tokenized-stocks/gold; `/api/market/summary` mengekspos `universe{total,curated,extended}` | M2 | `done` | 2026-10-31: terverifikasi — 100 aset (18 kurasi + 82 extended, contoh: Zcash, TRON, Hyperliquid conf 74 Strong Long), Dashboard "Semua Universe (100)", bot memindai seluruh universe. Sinyal statis HAC-28 kini hanya menyisa di 18 koin kurasi |
| HAC-33 | 🧹 **UX Portofolio**: (a) tab "Buku Hybrid" di mode Bot — posisi, riwayat, dan KPI khusus eksekusi HYBRID; (b) Settings & Strategi jadi panel inline di mode Bot (toggle "Strategi & Pengaturan"), mode terpisah dihapus dari switcher (kini Manual/Bot/Battle) | M2 | `superseded` | Digantikan HAC-34: Hybrid kini buku mandiri dengan mode sendiri; sub-tab Buku Hybrid di mode Bot dihapus |
| HAC-34 | 📚 **Hybrid = buku portofolio mandiri + Reset arsip sesi**: (a) mode "Bot Hybrid AI" di switcher (Manual/Bot/Hybrid/Battle) dengan kas, posisi, riwayat, konfigurasi & autopilot SENDIRI (mulai nol tanpa seed fiktif); scan digeneralisasi per-book (`runBotScan(book)`); (b) Battle Arena Fighter Hybrid = buku nyata (net worth, PnL, winrate); (c) Reset: arsipkan sesi berjalan ke `halfy_session_archive_v1` (30 sesi, snapshot 3 buku lengkap dengan closed trades) SEBELUM menghapus, scope +Hybrid, viewer "Riwayat Sesi" di header portofolio | M2 | `done` | 2026-10-31: terverifikasi runtime — switcher 4 mode; scan hybrid buka 4 posisi di bukunya sendiri (bot tak tersentuh); reset all mengosongkan semua buku & arsip 1 sesi (bot: 20 closed, equity $24.924,77, winrate 40%); viewer tampil per-buku |
| HAC-40 | 🔴 **[SPEC BRIEF] Stage 0–4 P0 upgrade**: (a) `AUDIT_NOTES.md` recon lengkap; (b) `src/utils/riskEngine.ts` — validator geometri stop/target deterministik (REJECTED_* codes, tanpa auto-adjust), trailing-stop semantics, sizing stop-distance + cap + recompute post-rounding, circuit breakers (heat 4%, daily loss 2%, 0.5%/trade, 3 SL beruntun, stale quote fail-closed); (c) integrasi scan: geometri gate T01, cooldown 30m per simbol, setupId immutable, karantina posisi stop-rusak + badge NEEDS REVIEW, kill switch PAUSE_ENTRIES per buku, risk health badge; (d) P0.7: $0.00T→$2.84T, timestamp eksak ISO, badge PAPER navbar, label Quality/100, label sizing jujur, default risk 0.5% | P0 | `done` | Test matrix vitest **22/22 lulus** (T01–T05, T06, T09, T10, T12, T16 subset). Verifikasi runtime: scan live → `ENTRY DIBLOKIR RISK ENGINE (HALTED): heat 18.41% ≥ 4%` + `DIKARANTINA: TAO, AAVE` — sistem fail-closed bekerja pada data produksi nyata |
| HAC-45 | 🔴 **[USER REPORT] Sinyal Radar/Entry Zone beku & salah**: 18 koin kurasi memakai aiSignal STATIS (Entry Zone BTC $78.800 vs live $77.3xx; TAO SL $460 vs live $235). Fix: sinyal live dari klines asli untuk SEMUA koin (kurasi + extended) — metadata kaya kurasi tetap, technicals+aiSignal dioverride live di merged universe | P1 | `done` | 2026-10-31: BTC entry zone tepat harga live; TAO SL $218,72 < entry $236 (geometry valid); thesis menjelaskan RSI/MA nyata |
| HAC-46 | 🔴 **[USER REPORT] R-4 lanjutan — presisi sub-sen**: pembulatan desimal-tetap meng-nol-kan technicals/entry/target koin mikro (PEPE ATR $0, ma20 $0, Entry Zone $0). Fix: pembulatan significant-digits di semua titik komputasi server (technicals, entry/target/SL deriveSignal, MA chart, tampilan thesis) | P1 | `done` | 2026-10-31: PEPE entry [0.00000502, 0.00000505], SL/TP/MA20/bollinger presisi penuh, $0.00000000 tidak ada lagi di UI |
| HAC-35 | 🔴 **Akar bersama R-2/R-3 — multi-tab localStorage clobber**: setiap tab app menulis ulang localStorage tiap polling (churn identitas state di loadMarketData), menimpa perubahan tab lain → posisi menghilang & refund "hilang". Fix 3 lapis: (1) efek persistensi skip-write bila isi sama (App + 8 key buku bot/hybrid), (2) loadMarketData tidak membuat array portfolio baru bila tidak ada harga berubah, (3) listener storage event — tab lain mengadopsi perubahan alih-alih menimpa | M2 | `done` | 2026-10-31: verifikasi runtime — posisi PEPE bertahan >16 detik (3+ siklus polling) meski ada 3 tab terbuka; sebelumnya hilang dalam 2 detik |
| HAC-41 | 🔴 **[SPEC] Server hardening (HAC-2/3 done)**: rate limiting in-memory 120 req/min per IP di semua /api/*, validator simbol ketat di params (anti-injection), validasi body /api/gemini/analyze (simbol/engine/userNotes), endpoint pakai universe gabungan | M3 | `done` | Verifikasi: simbol invalid→400, engine invalid→400 |
| HAC-42 | 🧠 **[SPEC P1.2] Market Regime Engine**: TREND_UP/TREND_DOWN/RANGE/HIGH_VOLATILITY dari BTC/ETH vs MA20 harian + breadth universe live + ATR14 BTC; kualitas data GOOD/PARTIAL/POOR; diekspos di /api/market/summary; dipakai sebagai ELIGIBILITY GATE (TREND_DOWN/HIGH_VOLATILITY memblokir LONG baru) + badge REGIME di header buku | M5 | `done` | Runtime: RANGE breadth 55% (BTC<MA20, ETH<MA20) — data asli |
| HAC-43 | 📈 **[SPEC P1.6] Analitik performa per buku**: Profit Factor, Expectancy R (aproks, label PARTIAL), Avg Win/Loss, Max Drawdown realized, sample size — strip di mode Bot/Hybrid | M5 | `done` | Label jujur: kohort PAPER, R aproks 3% entry (riwayat lama tak simpan stop) |
| HAC-44 | 🔧 R-7 fix: tab aktif persist via sessionStorage + dead code cleanup (fetchMarketCondition/fetchStockDetail, endpoint condition & docs/spec, import calculateBotPositionSize) | M4 | `done` | Lint/tests/build lulus |
| HAC-36 | 📊 Grafik pertumbuhan ekuitas lintas sesi di viewer Riwayat Sesi: SVG murni, satu garis per buku (Manual kuning/Pure AI cyan/Hybrid ungu), baseline $0, tooltip nilai per titik, urutan tertua→terbaru | M5 | `done` | 2026-10-31: terverifikasi render dengan 1 sesi arsip; membentuk garis tren saat sesi bertambah |

---

## Selesai (arahkan ke M1)

- ✅ Terminal shell + 7 view utama (Dashboard, Stockpicks, Chart, Bandarmology, Portfolio, Alert Center, Documentation)
- ✅ Live Binance 24h ticker sync (batch, auto-refresh)
- ✅ `/api/gemini/analyze` — sintesis sentimen, funding rate, OI, risiko likuidasi
- ✅ Alert engine + notifikasi suara
- ✅ Portfolio tracker + localStorage
- ✅ i18n

## Aturan Main

1. Kerjakan P1 sebelum P2 sebelum P3 — kecuali ada dependency eksplisit.
2. Satu task = satu cabang = satu commit series (lihat [PROCESS.md](PROCESS.md)).
3. Pindahkan status di tabel ini saat mulai (`doing`) dan saat selesai (`done`) — backlog adalah satu-satunya sumber kebenaran status.
4. Task baru: tambah baris dengan ID berikutnya (HAC-18, dst.) lengkap dengan alasan.
