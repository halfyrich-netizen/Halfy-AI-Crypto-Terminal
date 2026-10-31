# Roadmap — Halfy AI Crypto Terminal

Terakhir diperbarui: 2026-10-31

Roadmap ini disusun ulang berdasarkan **audit kode aktual** (31 Okt 2026). Implementation plan lama di `.aistudio/` masih berbicara tentang pasar saham IDX/US — aplikasi sudah berubah arah menjadi **crypto terminal** dengan live sync Binance, jadi roadmap lama tidak lagi valid dan digantikan dokumen ini.

## Gambaran Status

```
M1 MVP Terminal          [██████████] SELESAI
M2 Data Integrity        [░░░░░░░░░░] BELUM MULAI   ← fokus berikutnya
M3 Security & Hardening  [░░░░░░░░░░] BELUM MULAI
M4 Quality Infrastructure[░░░░░░░░░░] BELUM MULAI
M5 Fitur Lanjutan        [░░░░░░░░░░] BELUM MULAI
M6 Release & Deployment  [░░░░░░░░░░] BELUM MULAI
```

---

## M1 — MVP Terminal ✅ (selesai)

Shell terminal React 19 + Tailwind 4 dengan semua view utama sudah jalan:

- [x] Dashboard, Stockpicks, Chart Terminal, Bandarmology/Flow, Portfolio, Alert Center, Documentation
- [x] Live sync harga 24/7 dari API publik Binance (batch 24h ticker)
- [x] Endpoint `/api/gemini/analyze` — sintesis AI multi-faktor (sentimen, funding rate, OI, risiko likuidasi)
- [x] Alert engine + notifikasi suara + log sinyal
- [x] Portfolio tracker dengan persistensi localStorage
- [x] i18n (722 baris translations)

## M2 — Data Integrity (prioritas tertinggi)

**Masalah inti saat ini:** data candle historis masih **disintesis** (`generateCandles()` di `server.ts:146`), bukan data pasar sungguhan. Semua analisis teknikal di atas data palsu tidak bisa dipercaya untuk keputusan trading.

- [ ] Ganti `generateCandles` dengan **Binance Klines API** (`/api/v3/klines`) — data OHLCV asli per simbol
- [ ] Dukung multi-timeframe dari sumber asli (1H, 4H, 1D, 1W) — bukan re-sampling data sintetis
- [ ] Caching layer: quote aktif ~60 detik, klines historis ~1 jam, untuk menghemat rate limit Binance
- [ ] Fallback graceful saat API Binance down/gagal (tampilkan status "stale data", jangan diam-diam tampilkan data basi)
- [ ] Validasi & normalisasi simbol (mis. `BTC` → `BTCUSDT`) di satu tempat

**Definition of done:** chart menampilkan candle historis asli Binance yang cocok dengan chart TradingView/Binance untuk aset & timeframe yang sama.

## M3 — Security & Hardening

Spec internal (`/api/docs/spec`) sudah mengklaim rate limiting & validasi, tapi **belum ada implementasinya** di server. Gap klaim vs kenyataan ini harus ditutup.

- [ ] Rate limiting nyata per IP (mis. `express-rate-limit`, 60 req/menit) di semua endpoint `/api/*`
- [ ] Security headers (CSP, X-Frame-Options, dll. — via middleware manual atau `helmet`)
- [ ] Validator ketat untuk semua input user: simbol (`^[A-Z0-9]{1,10}$`), query timeframe, body `/api/gemini/analyze`
- [ ] Timeout + retry dengan backoff untuk panggilan keluar (Binance, Gemini)
- [ ] Error handling terpusat — jangan biarkan stack trace bocor ke response
- [ ] Audit penanganan `GEMINI_API_KEY` (pastikan tidak pernah sampai ke client bundle)

## M4 — Quality Infrastructure

- [ ] Perbaiki identitas project: `package.json` name masih `"react-example"` → ganti `halfy-ai-crypto-terminal`
- [ ] Bersihkan metadata AI Studio (`metadata.json`, folder `.aistudio/` — putuskan dipindah ke docs atau dihapus dari repo)
- [ ] Setup test runner (mis. Vitest) + test pertama untuk logika kritis: `botEngine`, kalkulasi PnL portfolio, normalisasi simbol
- [ ] CI sederhana (GitHub Actions): `npm run lint` + test + build di setiap push
- [ ] Prettier/ESLint config konsisten

## M5 — Fitur Lanjutan

- [ ] Web Push Notifications (browser push) untuk alert kritis — saat ini baru ada notifikasi in-app + suara
- [ ] Portfolio: opsi sinkronisasi server-side (saat ini hilang jika localStorage dibersihkan)
- [ ] Screener/filter universe aset via API (bukan filter client-side penuh)
- [ ] Data on-chain tambahan (dominasi BTC, flow ETF, dsb. — indikatornya sudah ada di dashboard, tinggal disambungkan ke sumber live)
- [ ] Simulasi/paper trading untuk strategi botEngine

## M6 — Release & Deployment

- [ ] Tentukan target deployment (Cloud Run / VPS / Vercel + server terpisah)
- [ ] Logging & monitoring dasar (error rate, latency per endpoint)
- [ ] Environment produksi: secret management untuk `GEMINI_API_KEY`
- [ ] Internal beta release + user testing
