import React, { useState } from 'react';
import { Language } from '../utils/translations';
import { BookOpen, Cpu, Shield, Database, GitBranch, Layers, CheckCircle } from 'lucide-react';

interface DocumentationViewProps {
  lang?: Language;
}

export const DocumentationView: React.FC<DocumentationViewProps> = ({ lang = 'ID' }) => {
  const isEn = lang === 'EN';
  const [activeSection, setActiveSection] = useState<'overview' | 'roadmap' | 'architecture' | 'algorithm' | 'security'>('overview');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0b101e] border border-slate-800 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-5 h-5 text-sky-400" />
          <h1 className="text-xl font-bold text-white tracking-tight">
            {isEn
              ? 'Halfy AI · Technical Blueprint, Architecture & Development Roadmap'
              : 'Halfy AI · Blueprint Teknis, Arsitektur & Roadmap Pengembangan'}
          </h1>
        </div>
        <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
          {isEn
            ? 'Comparative system study of Halfy AI vs Gigantum, TradingView real-time data backend blueprint, financial risk controls, quantitative machine learning models, and MVP development timeline.'
            : 'Kajian komparatif sistem analisis Halfy AI vs Gigantum, blueprint arsitektur backend data real-time TradingView, strategi keamanan finansial, algoritma machine learning kuantitatif, dan jadwal implementasi riset hingga MVP.'}
        </p>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-5 pt-3 border-t border-slate-800/80">
          {[
            { id: 'overview', label: isEn ? '1. Core Features & Benchmarking' : '1. Fitur Utama & Benchmarking', icon: Layers },
            { id: 'roadmap', label: isEn ? '2. Research Roadmap to MVP' : '2. Roadmap Riset s/d MVP', icon: GitBranch },
            { id: 'architecture', label: isEn ? '3. Backend & TradingView Architecture' : '3. Arsitektur Backend & TradingView Feed', icon: Database },
            { id: 'algorithm', label: isEn ? '4. ML Algorithm & AI Sentiment' : '4. Algoritma ML & AI Sentimen', icon: Cpu },
            { id: 'security', label: isEn ? '5. Financial Security Strategy' : '5. Strategi Keamanan Finansial', icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as typeof activeSection)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                  isActive
                    ? 'bg-slate-800 text-sky-400 border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Panes */}
      {activeSection === 'overview' && (
        <div className="space-y-4">
          <div className="bg-[#0e1626] border border-slate-800/90 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">
              1. Analisis Platform Gigantum AI Saham Indonesia vs Halfy AI
            </h2>
            <div className="text-sm text-slate-300 space-y-3.5 leading-relaxed">
              <p>
                <strong>Gigantum (PT Gigantum Teknologi Indonesia)</strong> adalah platform pelopor yang menggabungkan kecerdasan buatan (*AI Agents*) dengan data pasar modal Indonesia (IDX). Fitur utama yang diidentifikasi dari ekosistem Gigantum meliputi:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-300 pl-2">
                <li><strong className="text-sky-400">AI Stockpick Harian:</strong> Rekomendasi emiten dengan probabilitas swing trading atau momentum tinggi.</li>
                <li><strong className="text-emerald-400">Analisis Bandarmologi & Broker Summary:</strong> Membaca akumulasi broker asing (Net Foreign Flow) dan konsentrasi broker lokal (YP, CC, PD, NI, AK, dsb).</li>
                <li><strong className="text-amber-400">Screener Saham Multi-Strategi:</strong> Penyaring berbasis gaya investasi (misal gaya Lo Kheng Hong, Fear & Greed Index, dan breakout volume).</li>
                <li><strong className="text-purple-400">Integrasi Eksternal & MCP (Model Context Protocol):</strong> Menghubungkan data bursa ke LLM via bot Telegram dan klien AI modern.</li>
              </ul>

              <h3 className="text-base font-bold text-white pt-4 border-t border-slate-800/80">
                Keunggulan Halfy AI Terminal:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800">
                  <span className="text-amber-400 font-bold block mb-1.5 text-sm">24/7 Global Crypto Intelligence</span>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Halfy AI beroperasi non-stop 365 hari terhubung langsung dengan Binance Public 24hr API, memantau likuiditas global lintas sesi Tokyo, London, dan New York tanpa batas jam tutup bursa.
                  </p>
                </div>
                <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800">
                  <span className="text-sky-400 font-bold block mb-1.5 text-sm">TradingView & Binance Live Data Streaming</span>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Streaming chart interaktif, konsensus teknikal real-time, dan harga aktual sub-second langsung dari order book Binance dan TradingView engine presisi tinggi.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'roadmap' && (
        <div className="bg-[#0b101e] border border-slate-800 rounded-lg p-5 space-y-4">
          <h2 className="text-base font-bold text-white font-mono">
            2. Roadmap Pengembangan (Fase Riset Hingga Perilisan MVP)
          </h2>
          <div className="space-y-4 text-xs">
            <div className="border border-slate-800 rounded-lg p-4 bg-slate-900/40">
              <div className="flex items-center justify-between font-mono mb-2">
                <span className="font-bold text-sky-400">FASE 1: RISET & BENCHMARKING (Minggu 1 - 2)</span>
                <span className="text-slate-500 text-[11px]">Milestone: Spesifikasi Fungsional</span>
              </div>
              <ul className="space-y-1 text-slate-300 list-disc list-inside leading-relaxed">
                <li>Studi komparasi API data market: IDX Data Feed (IDXC), Yahoo Finance, Alpha Vantage, Finnhub.</li>
                <li>Pemetaan kode broker bursa Indonesia (Foreign: AK, BK, CS, ZP vs Retail Domestic: YP, CC, XC, PD).</li>
                <li>Evaluasi model LLM (Gemini 3.8 Flash vs Gemini 4 Argon) untuk kalkulasi sentimen pasar berbiaya rendah dan latensi cepat.</li>
              </ul>
            </div>

            <div className="border border-slate-800 rounded-lg p-4 bg-slate-900/40">
              <div className="flex items-center justify-between font-mono mb-2">
                <span className="font-bold text-emerald-400">FASE 2: ARSITEKTUR CORE & INGESTI DATA (Minggu 3 - 4)</span>
                <span className="text-slate-500 text-[11px]">Milestone: Data Pipeline Stabil</span>
              </div>
              <ul className="space-y-1 text-slate-300 list-disc list-inside leading-relaxed">
                <li>Pembangunan server backend Node.js Express terisolasi dengan rate limiting dan caching Redis.</li>
                <li>Normalisasi data OHLCV historis dan kalkulasi indikator teknikal (RSI, Moving Average ribbons, Bollinger Bands).</li>
                <li>Integrasi endpoint Google Gemini API (`@google/genai`) di sisi server untuk ekstraksi sentimen berita.</li>
              </ul>
            </div>

            <div className="border border-slate-800 rounded-lg p-4 bg-slate-900/40">
              <div className="flex items-center justify-between font-mono mb-2">
                <span className="font-bold text-amber-400">FASE 3: ALGORITMA STOCKPICK & BANDARMOLOGI (Minggu 5 - 6)</span>
                <span className="text-slate-500 text-[11px]">Milestone: Algoritma Sinyal Akurat</span>
              </div>
              <ul className="space-y-1 text-slate-300 list-disc list-inside leading-relaxed">
                <li>Pengembangan formula Bandarmologi: rasio akumulasi Top 3/Top 5 broker dan pelacakan arus asing (NFB/NFS).</li>
                <li>Penyusunan scoring engine 4 pilar kuantitatif dengan penetapan target take profit dan cut loss otomatis.</li>
                <li>Pengujian backtest akurasi sinyal pada pergerakan pasar saham siklikal dan defensif.</li>
              </ul>
            </div>

            <div className="border border-slate-800 rounded-lg p-4 bg-slate-900/40">
              <div className="flex items-center justify-between font-mono mb-2">
                <span className="font-bold text-purple-400">FASE 4: DASHBOARD TERMINAL & NOTIFIKASI PUSH (Minggu 7 - 8)</span>
                <span className="text-slate-500 text-[11px]">Milestone: Interactive Frontend MVP</span>
              </div>
              <ul className="space-y-1 text-slate-300 list-disc list-inside leading-relaxed">
                <li>Implementasi visualisasi candlestick interaktif dan sub-chart RSI dengan angka tabular anti-jitter.</li>
                <li>Pusat notifikasi instan berbasis Browser Web Push Notifications API dan audio alert chime.</li>
                <li>Modul manajemen portofolio pengguna dengan perhitungan otomatis konversi lot IDX (x100) dan saham US.</li>
              </ul>
            </div>

            <div className="border border-slate-800 rounded-lg p-4 bg-slate-900/40">
              <div className="flex items-center justify-between font-mono mb-2">
                <span className="font-bold text-rose-400">FASE 5: PENGUJIAN KEAMANAN & PELUNCURAN MVP (Minggu 9 - 10)</span>
                <span className="text-slate-500 text-[11px]">Milestone: Public Beta Launch</span>
              </div>
              <ul className="space-y-1 text-slate-300 list-disc list-inside leading-relaxed">
                <li>Audit kerentanan keamanan OWASP Top 10, sanitasi input ticker, dan proteksi DoS.</li>
                <li>Uji performa latensi render UI di bawah 100ms dan evaluasi feedback komunitas trader.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'architecture' && (
        <div className="bg-[#0b101e] border border-slate-800 rounded-lg p-5 space-y-4">
          <h2 className="text-base font-bold text-white font-mono">
            3. Arsitektur Backend & Integrasi API Data Real-Time
          </h2>
          <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
            <p>
              Arsitektur sistem dibangun dengan pendekatan <strong>Decoupled Microservice & Event-Driven Proxy</strong> untuk menjamin latensi rendah dan ketersediaan data tinggi.
            </p>

            <div className="bg-slate-950 p-4 rounded-lg font-mono text-[11px] text-sky-300 border border-slate-800 overflow-x-auto">
              <pre>{`[CLIENT: React 19 SPA (TradingView UI)]
       │
       ▼ (HTTPS / WSS Sub-second)
[GATEWAY & RATE LIMITER (Node.js Express)]
  ├── /api/market/quote (Cache: 5s In-Memory)
  ├── /api/market/chart (Cache: 60s)
  ├── /api/market/bandar (Broker Aggregate)
  ├── /api/gemini/analyze (LLM Reasoning Pipeline)
  └── /api/alerts/live (Server Push Dispatcher)
       │
       ├─────────────────────────┬─────────────────────────┐
       ▼                         ▼                         ▼
[IDX Data Provider]      [US Market Feed]       [Google Gemini 3.8 Flash]
(Broker Summary + NFB)  (Finnhub / Yahoo)      (API Key on Server Only)`}</pre>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="bg-slate-900/60 p-3 rounded border border-slate-800">
                <span className="font-bold text-white block mb-1">Caching Layer Tier-2</span>
                <p className="text-[11px] text-slate-400">
                  Data harga intraday disimpan dalam in-memory cache dengan TTL 5 detik untuk menghindari rate-limit vendor data finansial, sedangkan data laporan keuangan historis di-cache selama 24 jam.
                </p>
              </div>

              <div className="bg-slate-900/60 p-3 rounded border border-slate-800">
                <span className="font-bold text-white block mb-1">Simbologi Pasar Terpadu</span>
                <p className="text-[11px] text-slate-400">
                  Normalisasi otomatis kode emiten IDX (misal `BBCA` dinormalisasi ke format kliring `BBCA.JK` jika menghubungi upstream feed) dan simbol US standar (misal `NVDA`, `AAPL`).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'algorithm' && (
        <div className="bg-[#0b101e] border border-slate-800 rounded-lg p-5 space-y-4">
          <h2 className="text-base font-bold text-white font-mono">
            4. Algoritma Analisis Sentimen NLP Finansial & Machine Learning
          </h2>
          <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
            <p>
              Untuk mencapai tingkat akurasi tinggi pada data finansial dan menghindari halusinasi generik LLM, model menggunakan pendekatan <strong>Hybrid Multi-Factor Scoring Matrix</strong>:
            </p>

            <div className="bg-slate-950 p-4 rounded-lg font-mono text-emerald-400 text-xs border border-slate-800">
              <code>Composite_Score = (0.35 × Technical) + (0.25 × Fundamental) + (0.25 × Bandarmology) + (0.15 × AI_Sentiment)</code>
            </div>

            <div className="space-y-2 pt-1">
              <div className="bg-slate-900/60 p-3 rounded border border-slate-800">
                <strong className="text-sky-400 block mb-0.5">A. Algoritma Sentimen Berita Gemini NLP:</strong>
                <p className="text-[11px] text-slate-400">
                  Gemini 3.8 Flash mengevaluasi 5-10 berita dan pengumuman keterbukaan informasi emiten terakhir, lalu mengkuantifikasikan sentimen ke rentang -100 s/d +100 menggunakan schema JSON terstruktur.
                </p>
              </div>

              <div className="bg-slate-900/60 p-3 rounded border border-slate-800">
                <strong className="text-amber-400 block mb-0.5">B. Formula Akumulasi Bandarmologi:</strong>
                <p className="text-[11px] text-slate-400">
                  Menghitung rasio konsentrasi: <code>Volume(Top 3 Buyer) / Total Volume Harian</code>. Bila rasio &gt; 0.65 dan Net Foreign Flow positif 3 hari berturut-turut, sinyal ditandai sebagai <em>Big Accumulation</em>.
                </p>
              </div>

              <div className="bg-slate-900/60 p-3 rounded border border-slate-800">
                <strong className="text-purple-400 block mb-0.5">C. Dynamic Target & Risk-Reward Ratio (R:R):</strong>
                <p className="text-[11px] text-slate-400">
                  Target Price 1 dipatok pada resistance terdekat atau +6% dari entry, Target 2 pada +12%, dan Stop Loss dipatok ketat pada level support breakdown (-4%). Hanya rekomendasi dengan rasio R:R &gt; 2.0 yang diklasifikasikan sebagai <em>Buy / Strong Buy</em>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'security' && (
        <div className="bg-[#0b101e] border border-slate-800 rounded-lg p-5 space-y-4">
          <h2 className="text-base font-bold text-white font-mono">
            5. Strategi Keamanan Finansial & Perlindungan Data
          </h2>
          <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
            <p>
              Mengingat sensitivitas data finansial dan integritas transaksi, arsitektur menerapkan prinsip <strong>Zero-Trust & Defense-in-Depth</strong>:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-slate-900/60 p-3.5 rounded border border-slate-800">
                <span className="font-bold text-rose-400 block mb-1">Isolasi Kunci API Sisi Server</span>
                <p className="text-[11px] text-slate-400">
                  <code>GEMINI_API_KEY</code> dan kredensial data provider disimpan secara eksklusif di environment backend Node.js (`process.env`). Tidak ada kunci rahasia yang pernah terekspos ke bundle JavaScript browser.
                </p>
              </div>

              <div className="bg-slate-900/60 p-3.5 rounded border border-slate-800">
                <span className="font-bold text-sky-400 block mb-1">Sanitasi Input & Anti-SSRF</span>
                <p className="text-[11px] text-slate-400">
                  Semua input ticker divalidasi menggunakan ekspresi reguler ketat <code>^[A-Z0-9.]{'{1,10}'}$</code> untuk mencegah path traversal, command injection, dan serangan Server-Side Request Forgery.
                </p>
              </div>

              <div className="bg-slate-900/60 p-3.5 rounded border border-slate-800">
                <span className="font-bold text-emerald-400 block mb-1">Rate Limiting & Anti-DoS</span>
                <p className="text-[11px] text-slate-400">
                  Batasan 60 request/menit untuk endpoint analitik intensif mencegah eksploitasi kuota API dan scraping agresif dari bot pihak ketiga.
                </p>
              </div>

              <div className="bg-slate-900/60 p-3.5 rounded border border-slate-800">
                <span className="font-bold text-amber-400 block mb-1">Data Privacy Portofolio</span>
                <p className="text-[11px] text-slate-400">
                  Pencatatan portofolio klien dienkripsi secara lokal di storage peramban pengguna (*Client-Side Local Storage Encrypted*), sehingga nilai nominal modal pengguna tidak tersimpan di server pihak ketiga tanpa otentikasi.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
