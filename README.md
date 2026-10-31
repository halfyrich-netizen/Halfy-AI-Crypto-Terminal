# Halfy AI Crypto Terminal

Terminal intelijen kripto all-in-one: dashboard pasar real-time (live sync Binance), AI stockpick/signal radar, charting interaktif, analisis derivatives (funding rate & open interest), manajemen portofolio, dan alert center — dengan sintesis AI via Google Gemini.

> Dikembangkan dari prototipe AI Studio; roadmap & backlog pengembangan aktif ada di [`docs/pm/`](docs/pm/).

## Fitur Utama

- **Live Market Sync** — harga real-time 24/7 dari API publik Binance (BTC, ETH, SOL, BNB, XRP, dst.)
- **AI Stockpicks** — rekomendasi sinyal dengan confidence score, target price, dan stop loss
- **Chart Terminal** — candlestick interaktif multi-timeframe
- **Flow / Bandarmology** — deteksi akumulasi-distribusi & top movers pasar
- **AI Deep Dive** — analisis mendalam per aset via Gemini (sentimen, katalis, risiko likuidasi)
- **Portfolio Tracker** — pencatatan posisi, PnL, alokasi aset (tersimpan di localStorage)
- **Alert Center** — sinyal prediktif real-time + notifikasi suara

## Tech Stack

React 19 · TypeScript · Vite · Tailwind CSS 4 · Motion · Express (server proxy) · Google Gemini API (`@google/genai`)

## Menjalankan di Lokal

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env
# isi GEMINI_API_KEY dengan API key Gemini kamu

# 3. Jalankan dev server (Vite + Express sekaligus)
npm run dev
```

Aplikasi berjalan di `http://localhost:3000` (cek output terminal untuk port persisnya).

### Script lainnya

| Script | Fungsi |
|---|---|
| `npm run dev` | Jalankan server dev (`tsx server.ts`) |
| `npm run build` | Build produksi (`vite build`) |
| `npm run preview` | Preview hasil build |
| `npm run lint` | Type-check tanpa emit (`tsc --noEmit`) |
| `npm run clean` | Hapus artefak build |

## Struktur Project

```
server.ts                  # Express backend: proxy API, live Binance sync, Gemini analyze
src/
  App.tsx                  # Shell terminal + navigasi tab
  components/              # View utama (Dashboard, Stockpicks, Chart, Portfolio, dll.)
  data/marketDatabase.ts   # Universe aset & baseline harga
  services/api.ts          # Client API layer
  types/stock.ts           # Skema tipe data pasar
  utils/                   # botEngine, marketHours, translations (i18n), audio
docs/pm/                   # Project management: roadmap, backlog, proses kerja
```

## Konvensi Kontribusi

Lihat [`docs/pm/PROCESS.md`](docs/pm/PROCESS.md) untuk alur kerja branching, format commit, dan definition of done.
