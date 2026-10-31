import React, { useState } from 'react';
import { Bot, Zap, RefreshCw, Radar, Sparkles, Target, Compass, Activity } from 'lucide-react';
import { Stock } from '../types/stock';
import { Language } from '../utils/translations';

interface RobotScoutRadarProps {
  stocks: Stock[];
  lang?: Language;
  onRefreshScan?: () => void;
  isScanningProp?: boolean;
}

export const RobotScoutRadar: React.FC<RobotScoutRadarProps> = ({
  stocks,
  lang = 'ID',
  onRefreshScan,
  isScanningProp = false,
}) => {
  const isEn = lang === 'EN';
  const [internalScanning, setInternalScanning] = useState(false);
  const [lastScoutedCount, setLastScoutedCount] = useState<number>(() => {
    return stocks.filter((s) => s.aiSignal.action === 'Strong Long' || s.aiSignal.action === 'Long (Buy on Dip)').length;
  });

  const isScanning = isScanningProp || internalScanning;

  // Compute key quantitative metrics for the scout
  const longSetups = stocks.filter(
    (s) => s.aiSignal.action === 'Strong Long' || s.aiSignal.action === 'Long (Buy on Dip)' || s.aiSignal.action === 'Strong Buy'
  );
  const avgScore = stocks.length > 0 
    ? Math.round(stocks.reduce((acc, s) => acc + s.aiSignal.confidenceScore, 0) / stocks.length) 
    : 84;
  const topPick = [...stocks].sort((a, b) => b.aiSignal.confidenceScore - a.aiSignal.confidenceScore)[0];

  const handleTriggerScout = () => {
    setInternalScanning(true);
    if (onRefreshScan) onRefreshScan();
    
    // Simulate high-speed radar sweep
    setTimeout(() => {
      setInternalScanning(false);
      setLastScoutedCount(longSetups.length);
    }, 3800);
  };

  return (
    <div className="relative overflow-hidden bg-radial-[at_top_right] from-orange-950/25 via-[#090f1e] to-[#070b14] border border-orange-500/40 rounded-2xl p-5 sm:p-6 shadow-[0_0_35px_rgba(249,115,22,0.12)] transition-all">
      {/* Dynamic Background Scanbeam Sweep Layer */}
      <div 
        className={`absolute inset-0 pointer-events-none overflow-hidden ${
          isScanning ? 'opacity-100' : 'opacity-40 hover:opacity-70'
        } transition-opacity duration-500`}
      >
        {/* Animated Scanbeam Sweeping Left-to-Right Across Card Background */}
        <div className="absolute inset-y-0 w-44 bg-gradient-to-r from-transparent via-orange-500/20 to-transparent blur-md animate-robot-scanbeam pointer-events-none" />
        <div className="absolute inset-y-0 w-1 bg-gradient-to-b from-orange-400/10 via-orange-400/60 to-orange-400/10 animate-robot-scanbeam pointer-events-none" />
        
        {/* Holographic Radar Radial Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.07] bg-[linear-gradient(to_right,#f97316_1px,transparent_1px),linear-gradient(to_bottom,#f97316_1px,transparent_1px)] bg-[size:28px_28px]" 
        />
      </div>

      {/* Header Deck: Robot Title, Badges & Scout Action Button */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-orange-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/50 flex items-center justify-center text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.35)] shrink-0">
            <Radar className={`w-5 h-5 ${isScanning ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-white font-mono tracking-tight flex items-center gap-2">
                ARGUS SCOUT ROVER
                <span className="text-[10px] font-bold font-mono tracking-wider px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/50 shadow-xs uppercase">
                  {isEn ? 'CRYPTO ALPHA RADAR' : 'RADAR ALPHA OREN'}
                </span>
              </h2>
            </div>
            <p className="text-xs text-orange-200/80 font-mono mt-0.5 flex items-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-full ${isScanning ? 'bg-orange-400 animate-ping' : 'bg-emerald-400'}`} />
              <span>
                {isScanning 
                  ? (isEn ? 'Active Deep Radar Sweep · Scanning CEX Outflows & Orderbooks...' : 'Penyisiran Radar Mendalam · Memindai Outflow CEX & Orderbook...') 
                  : (isEn ? 'Patrolling Sector Alpha · Quantitative Surveillance Active' : 'Patroli Sektor Alpha · Pengawasan Kuantitatif Siaga')}
              </span>
            </p>
          </div>
        </div>

        {/* Scout Now Quick Action & Highlights */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleTriggerScout}
            disabled={isScanning}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer shadow-md ${
              isScanning
                ? 'bg-orange-500/30 text-orange-200 border border-orange-500/50 cursor-wait'
                : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:shadow-[0_0_25px_rgba(249,115,22,0.6)] active:scale-95'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>
              {isScanning 
                ? (isEn ? 'Scouting Market...' : 'Memindai Pasar...') 
                : (isEn ? 'Scout Alpha Signals' : 'Pindai Sinyal Pasar')}
            </span>
          </button>
        </div>
      </div>

      {/* Main Stage: Large Orange Robot Scout Patrol Track ("Jalan Kanan Kiri Mencari Cari") */}
      <div className="relative z-10 my-4 pt-1">
        {/* Holographic Runway Track & Telemetry HUD */}
        <div className="relative h-44 sm:h-48 w-full bg-slate-950/70 border border-orange-500/30 rounded-xl overflow-hidden shadow-inner flex flex-col justify-between p-3">
          
          {/* Background Runway Grid & Laser Lines */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Horizontal Runway Guidance Lasers */}
            <div className="absolute top-1/2 left-0 right-0 h-px bg-orange-500/20 border-t border-dashed border-orange-500/40" />
            <div className="absolute bottom-6 left-0 right-0 h-px bg-gradient-to-r from-orange-500/10 via-orange-500/60 to-orange-500/10" />
            
            {/* Radar Coordinates Watermark */}
            <div className="absolute top-2 right-3 text-[9px] font-mono text-orange-400/40 uppercase tracking-widest">
              HUD-03 // SCOUT LAT: 0x4B // FREQ: 2.40 GHz
            </div>
            
            {/* Live Detected Target Floating Pins */}
            {topPick && (
              <div className="absolute top-4 left-6 hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-950/60 border border-orange-500/40 text-[11px] font-mono text-orange-300">
                <Target className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                <span className="font-bold">{topPick.symbol}</span>
                <span className="text-orange-400/80">({topPick.aiSignal.confidenceScore}% Alpha)</span>
              </div>
            )}
          </div>

          {/* PATROLLING ORANGE ROBOT SCOUT MASCOT ("Jalan Kanan-Kiri Mencari Sinyal") */}
          <div 
            className={`absolute bottom-3 select-none pointer-events-none transition-transform will-change-transform ${
              isScanning ? 'animate-robot-scout-patrol-fast' : 'animate-robot-scout-patrol'
            }`}
          >
            {/* Vertical Bobbing Motion */}
            <div className="animate-robot-scout-bob relative flex flex-col items-center">
              
              {/* Rotating Holographic Searchlight Cone Projection */}
              <div className="absolute top-14 left-1/2 -translate-x-1/2 pointer-events-none z-0">
                <svg
                  width="180"
                  height="120"
                  viewBox="0 0 180 120"
                  className="animate-robot-radar-cone opacity-75 overflow-visible"
                >
                  <defs>
                    <linearGradient id="scoutBeamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#f97316" stopOpacity="0.8" />
                      <stop offset="35%" stopColor="#fb923c" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#ea580c" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {/* Searchlight Cone Beam */}
                  <polygon points="90,0 15,115 165,115" fill="url(#scoutBeamGrad)" />
                  {/* Targeted Ground Radar Ellipse */}
                  <ellipse cx="90" cy="115" rx="75" ry="10" fill="#f97316" fillOpacity="0.25" stroke="#fdba74" strokeWidth="1" strokeDasharray="3 3" />
                </svg>
              </div>

              {/* High-Fidelity SVG Orange Robot Scout Mascot (Larger & More Detailed) */}
              <svg
                width="140"
                height="135"
                viewBox="0 0 140 135"
                className="relative z-10 drop-shadow-[0_0_16px_rgba(249,115,22,0.65)]"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  {/* Chassis Metallic Gradient */}
                  <linearGradient id="scoutChassis" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#1e293b" />
                    <stop offset="50%" stopColor="#0f172a" />
                    <stop offset="100%" stopColor="#020617" />
                  </linearGradient>
                  
                  {/* Orange Armor Gradient */}
                  <linearGradient id="scoutOrangeArmor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb923c" />
                    <stop offset="50%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#c2410c" />
                  </linearGradient>

                  {/* Visor Glow Gradient */}
                  <linearGradient id="scoutVisor" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#fdba74" />
                    <stop offset="50%" stopColor="#fed7aa" />
                    <stop offset="100%" stopColor="#ea580c" />
                  </linearGradient>

                  {/* Filter Glow */}
                  <filter id="orangeGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* 1. TOP RADAR DISH & SENSOR ANTENNA */}
                <g className="origin-[70px_20px]">
                  {/* Antenna Mast */}
                  <line x1="70" y1="28" x2="70" y2="12" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="70" cy="12" r="3.5" fill="#fdba74" filter="url(#orangeGlow)" />
                  
                  {/* Radar Dish & Emitter */}
                  <path
                    d="M 52 14 Q 70 4 88 14"
                    stroke="#ea580c"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <line x1="70" y1="9" x2="70" y2="5" stroke="#ffedd5" strokeWidth="2" strokeLinecap="round" />
                  
                  {/* Emitted Radar Waves when searching */}
                  <g className="animate-robot-radar-spin origin-[70px_8px]">
                    <circle cx="70" cy="8" r="7" stroke="#fdba74" strokeWidth="1" strokeDasharray="2 3" opacity="0.8" />
                    <circle cx="70" cy="8" r="13" stroke="#f97316" strokeWidth="1" strokeDasharray="3 4" opacity="0.5" />
                  </g>
                </g>

                {/* 2. ROBOT HEAD & BINOCULAR SEARCH VISOR */}
                {/* Neck Joint */}
                <rect x="62" y="27" width="16" height="5" rx="2" fill="#334155" />

                {/* Head Module */}
                <rect
                  x="40"
                  y="30"
                  width="60"
                  height="34"
                  rx="9"
                  fill="url(#scoutChassis)"
                  stroke="url(#scoutOrangeArmor)"
                  strokeWidth="2.5"
                />

                {/* Head Armor Accent Plates */}
                <path d="M 46 30 L 58 30 L 54 35 L 44 35 Z" fill="#f97316" />
                <path d="M 94 30 L 82 30 L 86 35 L 96 35 Z" fill="#f97316" />
                <circle cx="45" cy="38" r="1.5" fill="#fed7aa" />
                <circle cx="95" cy="38" r="1.5" fill="#fed7aa" />

                {/* Visor Display Screen */}
                <rect
                  x="46"
                  y="37"
                  width="48"
                  height="21"
                  rx="6"
                  fill="#030712"
                  stroke="#ea580c"
                  strokeWidth="1.5"
                />

                {/* SEARCHING EYES / RADAR OPTICS ("Terus mencari-cari") */}
                <g className="animate-robot-scout-eyes">
                  {/* Left Eye / Lens */}
                  <rect x="52" y="42" width="14" height="11" rx="3.5" fill="url(#scoutVisor)" filter="url(#orangeGlow)" />
                  <circle cx="59" cy="47.5" r="2.5" fill="#ffffff" />
                  <circle cx="61" cy="46" r="1" fill="#fff" />

                  {/* Right Eye / Lens */}
                  <rect x="74" y="42" width="14" height="11" rx="3.5" fill="url(#scoutVisor)" filter="url(#orangeGlow)" />
                  <circle cx="81" cy="47.5" r="2.5" fill="#ffffff" />
                  <circle cx="83" cy="46" r="1" fill="#fff" />
                  
                  {/* Tactical Crosshair / HUD Glint */}
                  <line x1="50" y1="47.5" x2="90" y2="47.5" stroke="#fed7aa" strokeWidth="0.75" strokeDasharray="1 3" opacity="0.6" />
                </g>

                {/* 3. ROBOT CHEST & QUANTUM SCANNER CORE */}
                {/* Chest Body */}
                <rect
                  x="36"
                  y="67"
                  width="68"
                  height="36"
                  rx="8"
                  fill="url(#scoutChassis)"
                  stroke="url(#scoutOrangeArmor)"
                  strokeWidth="2.5"
                />

                {/* Shoulder Armor Plates */}
                <rect x="30" y="69" width="8" height="16" rx="3" fill="#ea580c" stroke="#fed7aa" strokeWidth="1" />
                <rect x="102" y="69" width="8" height="16" rx="3" fill="#ea580c" stroke="#fed7aa" strokeWidth="1" />

                {/* Central Radar Heart / Quantum Reactor Core */}
                <circle cx="70" cy="85" r="10" fill="#030712" stroke="#ea580c" strokeWidth="2" />
                <circle cx="70" cy="85" r="6" fill="#f97316" filter="url(#orangeGlow)" className="animate-pulse" />
                <circle cx="70" cy="85" r="2.5" fill="#fff" />
                <path d="M 64 85 L 76 85" stroke="#fff" strokeWidth="1" opacity="0.8" />
                <path d="M 70 79 L 70 91" stroke="#fff" strokeWidth="1" opacity="0.8" />

                {/* Tactical Chest Details & Vent Bars */}
                <rect x="42" y="74" width="14" height="2" rx="1" fill="#f97316" />
                <rect x="42" y="79" width="10" height="2" rx="1" fill="#ea580c" />
                <rect x="84" y="74" width="14" height="2" rx="1" fill="#f97316" />
                <rect x="88" y="79" width="10" height="2" rx="1" fill="#ea580c" />

                {/* Robotic Arms with Signal Scanner Wand */}
                <g>
                  {/* Left Arm & Sensor Pointer */}
                  <path d="M 31 77 L 22 84 L 20 95" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="20" cy="95" r="3" fill="#f97316" filter="url(#orangeGlow)" />
                  <line x1="20" y1="95" x2="16" y2="102" stroke="#fdba74" strokeWidth="1.5" strokeLinecap="round" />

                  {/* Right Arm & Data Transceiver */}
                  <path d="M 109 77 L 118 84 L 120 95" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="120" cy="95" r="3" fill="#f97316" filter="url(#orangeGlow)" />
                  <line x1="120" y1="95" x2="124" y2="102" stroke="#fdba74" strokeWidth="1.5" strokeLinecap="round" />
                </g>

                {/* 4. ROVER TREADS & GROUND MOBILITY (Walking/Rolling Back & Forth) */}
                {/* Suspension Struts */}
                <rect x="48" y="103" width="7" height="6" fill="#334155" />
                <rect x="85" y="103" width="7" height="6" fill="#334155" />

                {/* Left Tread Unit */}
                <rect
                  x="26"
                  y="108"
                  width="38"
                  height="16"
                  rx="7"
                  fill="#090d16"
                  stroke="#ea580c"
                  strokeWidth="2"
                />
                {/* Tread Rolling Wheels & Teeth */}
                <circle cx="34" cy="116" r="4.5" fill="#1e293b" stroke="#f97316" strokeWidth="1" />
                <circle cx="45" cy="116" r="4.5" fill="#1e293b" stroke="#f97316" strokeWidth="1" />
                <circle cx="56" cy="116" r="4.5" fill="#1e293b" stroke="#f97316" strokeWidth="1" />
                <path
                  d="M 28 109 L 62 109 M 28 123 L 62 123"
                  stroke="#f97316"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  className="animate-robot-tread"
                />

                {/* Right Tread Unit */}
                <rect
                  x="76"
                  y="108"
                  width="38"
                  height="16"
                  rx="7"
                  fill="#090d16"
                  stroke="#ea580c"
                  strokeWidth="2"
                />
                <circle cx="84" cy="116" r="4.5" fill="#1e293b" stroke="#f97316" strokeWidth="1" />
                <circle cx="95" cy="116" r="4.5" fill="#1e293b" stroke="#f97316" strokeWidth="1" />
                <circle cx="106" cy="116" r="4.5" fill="#1e293b" stroke="#f97316" strokeWidth="1" />
                <path
                  d="M 78 109 L 112 109 M 78 123 L 112 123"
                  stroke="#f97316"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  className="animate-robot-tread"
                />

                {/* Ground Shadow & Laser Track Glow */}
                <ellipse cx="70" cy="128" rx="55" ry="4" fill="#f97316" opacity="0.3" filter="url(#orangeGlow)" />
              </svg>
            </div>
          </div>

          {/* Bottom Runway Status Readout Bar */}
          <div className="relative z-10 flex items-center justify-between text-[11px] font-mono text-orange-200/90 pt-2 border-t border-orange-500/20 bg-slate-950/80 -mx-3 -mb-3 px-3 py-1.5">
            <div className="flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-orange-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span className="font-semibold text-white">
                {isEn ? 'Patrol Vector:' : 'Vektor Patroli:'}
              </span>
              <span className="text-orange-400">
                {isScanning 
                  ? (isEn ? 'SWEEPING (0.00s - 4.50s Fast Sweep)' : 'MENYISIR CEPAT (0.00s - 4.50s Sweep)') 
                  : (isEn ? 'Continuous Lateral Surveillance (10s Cycle)' : 'Pengawasan Lateral Kontinu (Siklus 10s)')}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-[10px] text-slate-400">
              <span>SCANBEAM: <strong className="text-orange-400">ACTIVE</strong></span>
              <span>ORANGE MASCOT: <strong className="text-orange-400">PRIMARY ALPHA SCOUT</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Scout Telemetry Cards Grid */}
      <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
        {/* Metric 1: Scanned Pairs */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
            {isEn ? 'Scouted Tokens' : 'Koin Terdeteksi'}
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-white font-mono tabular-nums">
              {stocks.length}
            </span>
            <span className="text-[10px] font-mono text-orange-400">
              Binance USDT
            </span>
          </div>
        </div>

        {/* Metric 2: Alpha Setups */}
        <div className="bg-orange-950/30 border border-orange-500/40 rounded-xl p-3 flex flex-col justify-between shadow-xs">
          <span className="text-[10px] font-mono text-orange-300 uppercase tracking-wider block">
            {isEn ? 'High Conviction Longs' : 'Setup Long Alpha'}
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-orange-400 font-mono tabular-nums">
              {longSetups.length}
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">
              +100% Verified
            </span>
          </div>
        </div>

        {/* Metric 3: Average Alpha Score */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
            {isEn ? 'Avg Conviction Score' : 'Rata-rata Skor Alpha'}
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-white font-mono tabular-nums">
              {avgScore} / 100
            </span>
            <span className="text-[10px] font-mono text-amber-400">
              Quant 4-Factor
            </span>
          </div>
        </div>

        {/* Metric 4: Top Scouted Pick */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
            {isEn ? 'Prime Radar Pick' : 'Pilihan Utama Radar'}
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-amber-400 font-mono tabular-nums">
              {topPick ? topPick.symbol.replace('USDT', '') : 'BTC'}
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">
              {topPick ? `${topPick.aiSignal.confidenceScore}% Score` : '95% Score'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
