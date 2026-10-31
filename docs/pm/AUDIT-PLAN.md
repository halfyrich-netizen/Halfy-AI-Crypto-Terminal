# Audit Plan — Pengecekan Fungsional Per Halaman & Per Fungsi

Terakhir diperbarui: 2026-10-31
Hasil inventarisasi kode: 7 view + 3 komponen global + 9 endpoint server · **24 temuan awal dari audit statis** (lihat lampiran bawah).

## Tujuan

Memastikan **setiap halaman dan setiap fungsi punya alur kerja utama (critical path / "jalan merah") yang jelas dan benar-benar berfungsi end-to-end** — tidak ada tombol mati, tidak ada alur buntu, dan tidak ada data dummy yang tampil seolah data nyata tanpa label.

## Definisi Status Per Fungsi

Setiap fungsi setelah dicek WAJIB diberi salah satu status ini:

| Status | Arti | Tindak lanjut |
|--------|------|---------------|
| ✅ LIVE | Alur jalan end-to-end dengan data asli (Binance/Gemini) | Tidak ada |
| ⚠️ MOCK-OK | Alur jalan end-to-end, tapi datanya dummy/simulasi **dan sudah diberi label jelas di UI** | Beri label jika belum |
| 🛑 MOCK-PALSU | Alur jalan, datanya dummy, **tampil seolah nyata** | Wajib diperbaiki: label "Simulasi" atau sambungkan data asli |
| ❌ BROKEN | Alur jalan di tengah jalan / error / hasil tidak sesuai | Wajib diperbaiki |
| ⚫ DEAD | Fungsi ada di UI atau di kode tapi tidak pernah dieksekusi / tidak terhubung | Hapus atau sambungkan |

## Metode Pengecekan

1. Jalankan `npm run dev` → buka `http://localhost:3000`.
2. Untuk tiap view, ikuti langkah **critical path** di bawah secara berurutan (klik per klik). Satu fungsi = satu baris checklist = satu status.
3. Semua pengecekan API dulu lewat `curl` (Phase 1) supaya kalau backend bermasalah, ketahuan sebelum menyalahkan UI.
4. Isi kolom Status + Catatan langsung di dokumen ini. Jangan ubah kode dulu — Phase 1–3 murni observasi.
5. Semua temuan ❌/🛑/⚫ dimasukkan ke `BACKLOG.md` dengan ID baru setelah audit selesai.

---

## Phase 0 — Persiapan (± 10 menit)

- [ ] `npm run lint` lolos (baseline: sudah lolos per 2026-10-31)
- [ ] `npm run dev` jalan di `http://localhost:3000`
- [ ] Tentukan 2 skenario key: **(a) tanpa `GEMINI_API_KEY`** dan **(b) dengan key valid** — audit Gemini engine harus dilakukan 2× (lihat C-4)
- [ ] Siapkan tab DevTools: Network (filter Fetch/XHR) + Console (filter Error)

## Phase 1 — Smoke Test Endpoint (± 20 menit, via curl)

Jalankan tiap perintah, cek HTTP status + ciri khas response-nya:

| # | Endpoint | Cek | Status |
|---|----------|-----|--------|
| E-1 | `curl localhost:3000/api/market/summary` | HTTP 200; harga BTC berubah antara 2 panggilan berselang 4 detik (proves Binance sync hidup) | ☐ |
| E-2 | `curl localhost:3000/api/market/stocks` | HTTP 200; jumlah aset konsisten; field `price` bukan baseline statis | ☐ |
| E-3 | `curl localhost:3000/api/market/stocks/BTC` | HTTP 200; detail BTC lengkap | ☐ |
| E-4 | `curl localhost:3000/api/market/chart/BTC` | HTTP 200; **panggil 2× — bandingkan candle pertama. Kalau beda → data sintetis terkonfirmasi (temuan #1)** | ☐ |
| E-5 | `curl localhost:3000/api/alerts/live` | HTTP 200; hitung berapa alert yang harganya dinamis vs statis; cek timestamp tidak pernah bertambah (temuan #3) | ☐ |
| E-6 | `curl localhost:3000/api/market/condition` | Endpoint hidup — **lalu buktikan tidak ada pemanggilnya di UI (temuan #13: dead code)** | ☐ |
| E-7 | `curl -X POST localhost:3000/api/market/calibrate -H "Content-Type: application/json" -d '{"symbol":"BTC","price":50000}'` | Kalibrasi masuk → tunggu 4 detik → `curl /api/market/stocks/BTC` → harga kembali ke Binance? (temuan #20: kalibrasi futile) | ☐ |
| E-8 | `curl -X POST localhost:3000/api/gemini/analyze` (body symbol BTC, engine math) | HTTP 200, struktur JSON lengkap | ☐ |
| E-9 | E-8 dengan `engine: gemini` **tanpa** API key | Cek response `engine` field: tertulis apa? User tahu bahwa ini bukan Gemini? (temuan #9) | ☐ |
| E-10 | `curl localhost:3000/api/docs/spec` | Hidup — lalu konfirmasi tidak ada pemanggil di UI (dead) | ☐ |

## Phase 2 — Click-Through Per View (± 2–3 jam)

Ikuti langkah berurutan. Kolom Status diisi ✅/⚠️/🛑/❌/⚫.

### V1. Global Shell — Navbar, TickerTape, MarketClockBar

Critical path: load app → semua strip muncul → ticker bergerak → klik item ticker → pindah chart.

| # | Fungsi | Langkah verifikasi | Status |
|---|--------|--------------------|--------|
| G-1 | Tab navigation | Klik 7 tab satu-satu — masing-masing render tanpa blank/console error | ☐ |
| G-2 | Interval select (3/5/10/30/Manual) | Pilih tiap interval, pantau Network: frekuensi polling berubah sesuai | ☐ |
| G-3 | Manual refresh | Klik → request baru terlihat di Network | ☐ |
| G-4 | Toggle suara | Toggle → status ikut persist? (cek localStorage `halfy_*`) | ☐ |
| G-5 | Language switcher ID/EN | Toggle → seluruh teks berubah? Cari teks yang **tidak** ikut berubah (hardcoded) | ☐ |
| G-6 | TickerTape marquee | Bergerak; pause/play jalan; speed selector jalan; klik item → buka chart simbol itu | ☐ |
| G-7 | Badge BUY ticker | Cek: apakah badge BUY muncul untuk aset mana pun (temuan #16: kondisi string tak pernah cocok) | ☐ |
| G-8 | Market clock + funding countdown | Jam tick; countdown menuju funding 8 jam berikutnya dihitung benar | ☐ |
| G-9 | Ribbon "Binance Connected" | Matikan koneksi internet 10 detik → apakah ribbon berubah jadi disconnected? (temuan #11) | ☐ |

### V2. Dashboard

Critical path: buka dashboard → tabel Top 10 live → search → sort → klik baris → chart terbuka.

| # | Fungsi | Langkah verifikasi | Status |
|---|--------|--------------------|--------|
| D-1 | Tabel Top 10 | Harga & change berubah tiap interval polling; angka cocok dengan Binance.com untuk BTC/ETH | ☐ |
| D-2 | Toggle Top 10 / All Universe | Jumlah baris berubah | ☐ |
| D-3 | Search koin | Ketik "sol" → hanya SOL; tombol clear jalan | ☐ |
| D-4 | Sort kolom (price/change/mcap/volume) | Klik header: asc/desc benar, klik ketiga: reset | ☐ |
| D-5 | Speed controller 1/3/5/10s + Pause | Pilih 1s → polling 1 detik; Pause → polling berhenti (Network kosong) | ☐ |
| D-6 | Klik baris/kartu mover | Terbuka di Chart tab dengan simbol yang benar | ☐ |
| D-7 | Modal Kalibrasi → preset BTC → submit | Toast sukses muncul; **lalu cek apakah harga benar-benar berubah atau ditimpa sync 3 detik (temuan #20)** | ☐ |
| D-8 | Grid indeks benchmark | Bandingkan angka grid dengan TickerTape: sumbernya sama atau beda? (temuan #5: dashboard pakai statis, ticker pakai live) | ☐ |
| D-9 | Panel Fear & Greed, breadth, makro, whale flow | Buktikan angkanya statis (bandingkan antara 2 sesi berbeda hari) → status harus 🛑 MOCK-PALSU jika ada klaim "live" | ☐ |
| D-10 | "Open Screener" | Pindah ke tab Stockpicks | ☐ |

### V3. AI Stockpicks

Critical path: buka tab → radar sinyal tampil → filter → buka AI Deep Dive → switch engine → copy thesis → + Posisi.

| # | Fungsi | Langkah verifikasi | Status |
|---|--------|--------------------|--------|
| S-1 | Daftar sinyal | Tampil; cek apakah ada klaim "live scan" padahal `aiSignal` statis (temuan #2) | ☐ |
| S-2 | Filter ALL/LONG/RANGE/SHORT | Tiap filter benar; **cek apakah filter SHORT menghasilkan kosong selamanya (database tak punya sinyal short)** | ☐ |
| S-3 | Filter sektor | Kombinasi sektor + filter sinyal + search bekerja benar (AND logic) | ☐ |
| S-4 | Sort (score/upside/rr/inflow/change) | Urutan berubah benar, dua arah | ☐ |
| S-5 | Toggle cards/table | Kedua render konsisten datanya | ☐ |
| S-6 | AI Deep Dive engine "math" | Modal terbuka, angka (Z-Score/ATR/Kelly) terhitung; **lacak asal inputnya — bila dari field statis → 🛑 (temuan #22)** | ☐ |
| S-7 | Switch engine "gemini" (tanpa API key) | Apakah UI mengakui fallback ke math, atau diam-diam mengganti? (temuan #9) | ☐ |
| S-8 | Switch engine "gemini" (dengan API key) | Response Gemini tampil utuh; error handling saat API timeout/kecil | ☐ |
| S-9 | Copy thesis | Clipboard benar-benar terisi | ☐ |
| S-10 | "+ Posisi" | Terbuka di Portfolio dengan koin & harga terisi otomatis | ☐ |
| S-11 | Klik simbol | Terbuka di Chart tab | ☐ |

### V4. Chart Terminal

Critical path: pilih simbol → chart tampil → ganti timeframe → toggle indikator → AI analysis → + Portofolio.

| # | Fungsi | Langkah verifikasi | Status |
|---|--------|--------------------|--------|
| C-1 | TradingView engine | Widget load; simbol ikut berganti; interval widget sesuai selector | ☐ |
| C-2 | Canvas engine | Candle tampil; **bandingkan dengan chart Binance asli — data cocok atau acak? (temuan #1)**; refresh halaman → candle sama atau berubah semua? | ☐ |
| C-3 | Timeframe 1M/3M/1Y | Refetch terlihat di Network; jumlah candle masuk akal | ☐ |
| C-4 | Toggle Candle/Line | Render berubah | ☐ |
| C-5 | Checkbox MA20/MA50 | Overlay muncul/hilang di canvas | ☐ |
| C-6 | Checkbox RSI(14) | **Dugaan BROKEN: state toggle tapi tidak ada yang dirender (temuan #14)** | ☐ |
| C-7 | Hover candle | Readout OHLCV sesuai candle yang dihover | ☐ |
| C-8 | AI analysis math/gemini | Sama seperti S-6/S-7/S-8 dari chart | ☐ |
| C-9 | "+ Portofolio" | Masuk ke Portfolio dengan benar | ☐ |
| C-10 | Refresh widget & link keluar TradingView | Jalan | ☐ |

### V5. Bandarmology

Critical path: pilih aset → kartu flow tampil → lihat chart.

| # | Fungsi | Langkah verifikasi | Status |
|---|--------|--------------------|--------|
| B-1 | Asset selector | Semua aset bisa dipilih, kartu berganti | ☐ |
| B-2 | Data whale/CEX flow/funding/wallets | Buktikan statis (temuan #4) — bandingkan 2 hari berbeda → jika klaim "real-time" di header → 🛑 MOCK-PALSU | ☐ |
| B-3 | "Lihat Chart TradingView" | Pindah chart dengan simbol benar | ☐ |

### V6. Portfolio (paling besar — alokasikan waktu ekstra)

Critical path: buka portfolio → tambah posisi manual → posisi muncul & PnL jalan → tutup posisi → muncul di closed → **refresh browser: semua persist**.

| # | Fungsi | Langkah verifikasi | Status |
|---|--------|--------------------|--------|
| P-1 | KPI strip | Angka konsisten dengan daftar posisi (hitung manual 1×) | ☐ |
| P-2 | Add Position: pilih koin, margin% ↔ jumlah ↔ alokasi tersinkron | Ubah satu field, dua lainnya ikut benar (cek pembulatan) | ☐ |
| P-3 | Preset margin (10/20/50%) | Jalan | ☐ |
| P-4 | Submit Add | Posisi muncul di open; **PnL bergerak mengikuti harga live** | ☐ |
| P-5 | Tutup posisi (TP/SL/Manual + custom exit price) | Pindah ke closed; PnL realized terhitung benar (validasi manual: qty × (exit − entry)) | ☐ |
| P-6 | Liquidity: quick deposit & custom | Saldo bertambah; **dokumentasikan bahwa ini uang fiktif tanpa label (temuan #12)** | ☐ |
| P-7 | Persistensi | Refresh browser → posisi, closed trades, saldo tetap (localStorage v6) | ☐ |
| P-8 | Reset Simulasi (all/manual/bot) | Modal jalan; setelah reset, seed awal kembali; tidak ada sisa state | ☐ |
| P-9 | Bot: toggle aktif/pause | Status berubah; config persist | ☐ |
| P-10 | Bot auto-scan | Jalankan: entry dibuka sesuai gating; TP/SL auto-close terpicu saat harga menyentuh level; sizing sesuai Kelly config; log muncul | ☐ |
| P-11 | Bot seed data | **Dugaan 🛑: 3 posisi & 3 closed trade & kas $32.450 fiktif tampil sebagai hasil nyata (temuan #7)** | ☐ |
| P-12 | Bot close manual + audit report modal | Jalan | ☐ |
| P-13 | Settings: semua kontrol (archetype, focus, sizing, slots, risk %, min R:R, min confidence) | Tiap kontrol menyimpan & memengaruhi perilaku bot scan berikutnya | ☐ |
| P-14 | Restore default settings | Kembali ke nilai awal | ☐ |
| P-15 | Battle Arena | Angka manual vs AI vs hybrid konsisten dengan state masing-masing | ☐ |
| P-16 | Timestamp log bot | Log lama bertuliskan "Baru saja" selamanya (temuan #24) → status | ☐ |

### V7. Alert Center

Critical path: buka tab → feed tampil → filter → simulate signal → push permission.

| # | Fungsi | Langkah verifikasi | Status |
|---|--------|--------------------|--------|
| A-1 | Feed alert | Tampil; **identifikasi mana alert dinamis (BTC) vs statis total (temuan #3)** | ☐ |
| A-2 | Filter type | Tiap filter benar | ☐ |
| A-3 | Simulate signal | Alert mock muncul + chime + notification; **apakah dibedakan visual dari alert asli? (temuan #10)** | ☐ |
| A-4 | Sinkronisasi dengan polling App | Pindah tab → kembali: alert mock hilang? (temuan #19) | ☐ |
| A-5 | Badge unread Navbar | **Dugaan BROKEN: badge tidak pernah nol karena tak ada mark-as-read (temuan #18)** | ☐ |
| A-6 | Enable Browser Push | Permission prompt muncul; notifikasi desktop terkirim saat alert baru | ☐ |
| A-7 | Klik "Chart" | Pindah ke chart simbol benar | ☐ |

### V8. Documentation

| # | Fungsi | Langkah verifikasi | Status |
|---|--------|--------------------|--------|
| DOC-1 | Tab section | Semua section render | ☐ |
| DOC-2 | Sinkron dengan `/api/docs/spec` | **Dugaan DEAD: konten dokumen hardcoded, endpoint tidak pernah dipanggil (temuan #13)** — apakah isinya sudah sama dengan kenyataan fitur? | ☐ |

## Phase 3 — Cross-Cutting (± 30 menit)

- [ ] **X-1 Konsistensi angka**: harga aset yang sama di Dashboard vs Ticker vs Chart vs Portfolio vs Stockpicks = sama di waktu yang sama
- [ ] **X-2 i18n penuh**: ganti EN → cari sisa teks Indonesia (dan sebaliknya)
- [ ] **X-3 Responsive**: 1440px, 1024px, 768px — tidak ada overflow/overlap di tiap view
- [ ] **X-4 Console bersih**: 30 menit pemakaian normal, tidak ada error/warning merah yang berulang
- [ ] **X-5 Network bersih**: tidak ada request yang gagal (4xx/5xx) atau polling ganda tidak disengaja
- [ ] **X-6 Kill switch**: matikan server Express saat app jalan → UI harus menunjukkan status error, bukan diam membeku dengan data basi

## Phase 4 — Penutupan

1. Rekap semua status ke tabel rekap di bawah.
2. Konversi semua temuan ❌/🛑/⚫ menjadi task di `BACKLOG.md` (lanjutkan ID dari HAC-18).
3. Tulis keputusan di Decision Log (`PROCESS.md`): untuk tiap fitur MOCK, putuskan **[label simulasi]** atau **[sambungkan data asli]** atau **[hapus]**.

### Rekap (diisi setelah audit)

| View | Total fungsi | ✅ LIVE | ⚠️ MOCK-OK | 🛑 MOCK-PALSU | ❌ BROKEN | ⚫ DEAD |
|------|--------------|---------|------------|----------------|-----------|---------|
| Global Shell | 9 | 5 | 0 | 2 | 1 | 1 |
| Dashboard | 10 | 4 | 0 | 4 | 0 | 0 |
| Stockpicks | 11 | 1 | 0 | 8 | 1 | 0 |
| Chart | 10 | 2 | 0 | 4 | 2 | 1 |
| Bandarmology | 3 | 0 | 0 | 3 | 0 | 0 |
| Portfolio | 16 | 3 | 1 | 5 | 3 | 0 |
| Alert Center | 7 | 1 | 1 | 2 | 2 | 0 |
| Documentation | 2 | 1 | 0 | 1 | 0 | 0 |
| Endpoint server | 10 | 2 | 0 | 3 | 2 | 3 |

---

# HASIL AUDIT RUNTIME — 2026-10-31 (tereksekusi penuh)

Skenario: tanpa `GEMINI_API_KEY`, jaringan lokal **tidak bisa menjangkau `api.binance.com`** (HTTP 000; internet umum normal — google.com 200). Fakta jaringan ini sendiri menjadi temuan terbesar audit.

## Temuan Baru dari Runtime (tidak ada di audit statis)

| ID | Severity | Temuan |
|----|----------|--------|
| R-1 | 🔴 KRITIS | **Binance API tidak terjangkau dari jaringan pengguna** (HTTP 000, diduga blokir ISP/region). Akibatnya SEMUA harga "live" di app = baseline statis tanpa indikator apa pun. Ribbon tetap bilang "Terkoneksi Aktif". TradingView widget (embed) tetap dapat data asli — jadi app sendiri lebih basi dari widget-nya. |
| R-2 | 🔴 KRITIS | **Add Position salah aset**: submit posisi PEPE (qty 679.911.224 unit, entry 0.0000098) dari modal "+ Posisi" → yang tersimpan **BTC 0.0866 coins**. Simbol dari modal tidak terbawa; hanya nilai dolar yang dipakai. |
| R-3 | 🔴 KRITIS | **Tutup posisi tidak mengembalikan kas**: modal menjanjikan "Pengembalian ke Kas Likuiditas: +$6,665.60 USDT", tapi setelah konfirmasi DAN reload, `halfy_liquidity_crypto_v1` tetap 26.652,50. Uang hilang dari alur. |
| R-4 | 🟠 PENTING | **Engine kuantitatif rusak untuk token sub-sen**: modal Deep AI PEPE menampilkan ATR `$0.00000000`, Target 1 & 2 `$0.00000000`, SL `$1e-8`, R:R "1 : 0x" — pembulatan menghancurkan semua metrik. |
| R-5 | 🟠 PENTING | **TickerTape format rusak**: indeks market cap tampil "$0.00T" (nilai 2.84 diformat sebagai triliun). |
| R-6 | 🟡 SEDANG | **Kalibrasi mengotori field turunan**: setelah uji kalibrasi ke $50.000, `dayLow` BTC permanen $50.000 ("Rentang 24j: $50,000.00 - $79,026.00") meski harga sudah di-reset. |
| R-7 | 🟡 SEDANG | Tab aktif tidak dipersist — reload selalu kembali ke Dashboard. |
| R-8 | ⚪ MINOR | A-2: filter type Alert Center tidak menemukan label ALL/AI_SIGNAL/BREAKOUT (label beda dari plan — perlu cek label ID). |
| R-9 | ⚪ MINOR | Salinan tesis (S-9) tidak bisa diverifikasi otomatis (clipboard permission di automation) — tombol ada dan ter-render. |

## Status Konfirmasi Temuan Statis (24 → terverifikasi)

| # | Temuan | Status runtime |
|---|--------|----------------|
| 1 | Candle sintetis | ✅ terkonfirmasi: 2 panggilan API = file berbeda; open $63.115 ≠ harga live $76.970 |
| 2 | aiSignal statis + bias long | ✅ terkonfirmasi: 16/18 "Long setup", filter Short = kosong |
| 3 | Alert feed hardcoded | ✅ terkonfirmasi: 7 kartu, harga & timestamp statis |
| 4 | Bandarmology 100% statis | ✅ terkonfirmasi + header klaim "real-time" |
| 5 | Panel makro dashboard statis | ✅ terkonfirmasi: grid indeks = nilai baseline, bukan nilai server |
| 6 | Random walk indeks | ✅ terkonfirmasi: TOTAL MCap 2.82 → 2.83 antar panggilan |
| 7 | Bot seed fiktif | ✅ terkonfirmasi: 3 posisi + kas $32.450 + winrate 100% tanpa label simulasi |
| 9 | Fallback Gemini diam-diam | ✅ terkonfirmasi di API & UI: label engine berubah tanpa pemberitahuan |
| 11 | Ribbon koneksi dekoratif | ✅ terkonfirmasi ekstrem: bilang "Terkoneksi Aktif" saat Binance HTTP 000 |
| 13 | Dead code endpoint | ✅ terkonfirmasi: `/api/market/condition` & `/api/docs/spec` 0 pemanggil |
| 14 | Checkbox RSI tidak render | ✅ terkonfirmasi visual: tercentang, tidak ada panel RSI |
| 18 | Badge unread permanen | ✅ terkonfirmasi: tetap 6 sebelum & sesudah alert baru + reload |
| 19 | Alert mock tak tersinkron | ✅ terkonfirmasi: 7 kartu setelah pindah tab (mock hilang) |
| 20 | Kalibrasi futile | ✅ terkonfirmasi dua arah: di jaringan normal akan tertimpa sync 3s; di jaringan ini malah menempel & mengotori dayLow (R-6) |
| 24 | Timestamp log statis | ✅ terkonfirmasi: log seed "5 jam lalu"/"Baru saja" tidak pernah bertambah |

Temuan #8, #10, #12, #15, #16, #17, #21, #22, #23: terkonfirmasi via kode; verifikasi runtime rendah nilai tambahnya (perilaku sudah pasti dari sumber).

## Yang Berfungsi Baik (✅)

- Navigasi 7 tab, semua view render tanpa crash, layout terminal pro rapi
- Toggle Top 10/All Universe (18), search, sort kolom (asc/desc/reset), speed controller 1–10s + Pause
- TradingView embed: live asli, simbol & interval sinkron
- Chart Canvas: render candle + MA20/MA50 + volume; timeframe 1M/3M/1Y refetch benar; toggle Candle/Line
- AI Deep Dive math: modal penuh (Z-score, ATR, Kelly, tesis) — untuk aset harga normal
- Stockpicks: filter, sort upside terurut benar, toggle cards/table, Deep Dive modal
- Portfolio: sinkronisasi margin%↔jumlah↔alokasi akurat; deposit kas jalan; tutup posisi → riwayat benar; localStorage persist setelah reload; Reset Semua bersih sempurna; bot scan membuka posisi nyata dengan sizing terhitung + log
- Alert Center: feed render, simulasi jalan (dengan label), kartu + tombol chart jalan

---

## Lampiran — 24 Temuan Audit Statis (per 2026-10-31)

Dari inventarisasi kode (agent Explore). Audit runtime di atas bertugas **mengonfirmasi/membantah** tiap temuan, bukan mengulang dari nol.

**Data dummy tampil seolah nyata (🛑):** (1) candle historis sintetis `server.ts:146` · (2) aiSignal statis `marketDatabase.ts:101-1490` · (3) alert feed hardcoded `server.ts:313-412` · (4) Bandarmology 100% statis · (5) panel makro dashboard statis `DashboardView.tsx:433,551,582` · (6) indeks di-random-walk `server.ts:212-221` · (7) bot seed fiktif `botEngine.ts:21-160` · (8) setTimeout 600ms kosmetik `PortfolioView.tsx:497` · (9) fallback Gemini tanpa pemberitahuan `server.ts:626` · (10) alert simulasi tak terbedakan `AlertCenterView.tsx:37` · (11) ribbon koneksi dekoratif `DashboardView.tsx:398`, `Navbar.tsx:120` · (12) deposit fiktif `PortfolioView.tsx:3099` · (21) indexPoints × 1.8 arbitrer `server.ts:102` · (22) engine math input dari data statis `api.ts:49` + `server.ts:418` · (23) `latencyMs: 2` hardcoded `server.ts:482` · (24) timestamp log "Baru saja" statis `botEngine.ts:135`.

**Fungsi mati/broken (❌/⚫):** (13) `fetchMarketCondition` & `fetchStockDetail` tak pernah dipanggil `api.ts:168,226` · (14) checkbox RSI tidak merender apa pun `ChartTerminal.tsx:28,333` · (15) prop `onSelectAnotherStock` tak terpakai `ChartTerminal.tsx:10` · (16) badge BUY tak pernah cocok `TickerTape.tsx:90` · (17) props MarketClockBar tak terpakai `MarketClockBar.tsx:7-13` · (18) badge unread tak bisa dibersihkan `App.tsx:407` · (19) salinan alert lokal tidak tersinkron `AlertCenterView.tsx:30` · (20) kalibrasi langsung ditimpa Binance sync `server.ts:143`.
