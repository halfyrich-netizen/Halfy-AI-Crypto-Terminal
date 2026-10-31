import React, { useState } from 'react';
import { Zap, Play, Pause, SlidersHorizontal, RefreshCw } from 'lucide-react';

export type RobotVariant = 'pure_ai' | 'hybrid';
export type RobotState = 'idle' | 'scanning' | 'trading';

export interface RobotTradeEvent {
  symbol: string;
  action: 'BUY' | 'SELL' | 'CLOSE' | 'TP' | 'SL';
  price: number;
  timestamp?: number;
}

interface TradingRobotMascotProps {
  variant: RobotVariant;
  state?: RobotState;
  size?: 'icon' | 'banner';
  lastTrade?: RobotTradeEvent | null;
  // Bot Operational Controls
  isBotActive?: boolean;
  onToggleActive?: () => void;
  onTriggerScan?: () => void;
  onOpenSettings?: () => void;
  showSettings?: boolean;
  isPausedEntries?: boolean;
  onTriggerDemoTrade?: () => void;
  isEn?: boolean;
}

export const TradingRobotMascot: React.FC<TradingRobotMascotProps> = ({
  variant,
  state: externalState,
  size = 'banner',
  lastTrade,
  isBotActive = true,
  onToggleActive,
  onTriggerScan,
  onOpenSettings,
  showSettings = false,
  isPausedEntries = false,
  onTriggerDemoTrade,
  isEn = false,
}) => {
  // Local state for demo trade override
  const [internalState, setInternalState] = useState<RobotState>('idle');
  const [demoTradeSymbol, setDemoTradeSymbol] = useState<string>('BTCUSDT');

  // Synchronize state
  const activeState = externalState || internalState;
  const isPureAi = variant === 'pure_ai';

  // Theme styling configurations
  const theme = isPureAi
    ? {
        name: isEn ? 'NEXUS PURE AI BOT' : 'BOT PURE AI NEXUS',
        roleBadge: 'PURE AI',
        primary: '#10b981', // emerald-500
        secondary: '#059669',
        accent: '#34d399',
        bright: '#6ee7b7',
        bgGradient: 'from-emerald-950/40 via-slate-900/90 to-slate-950',
        borderColor: 'border-emerald-500/40',
        badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
        visorColor: '#10b981',
        buttonPrimary: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold',
        shadowGlow: 'shadow-[0_0_25px_rgba(16,185,129,0.2)]',
      }
    : {
        name: isEn ? 'SYNAPSE HYBRID BOT' : 'BOT HYBRID SYNAPSE',
        roleBadge: 'HYBRID AI',
        primary: '#a855f7', // purple-500
        secondary: '#7e22ce',
        accent: '#c084fc',
        bright: '#e9d5ff',
        bgGradient: 'from-purple-950/40 via-slate-900/90 to-slate-950',
        borderColor: 'border-purple-500/40',
        badgeBg: 'bg-purple-500/15 text-purple-300 border-purple-500/40',
        visorColor: '#c084fc',
        buttonPrimary: 'bg-purple-600 hover:bg-purple-500 text-white font-bold',
        shadowGlow: 'shadow-[0_0_25px_rgba(168,85,247,0.2)]',
      };

  // Demo trade simulator handler
  const handleSimulateTrade = () => {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'AVAXUSDT', 'BNBUSDT'];
    const randomSym = symbols[Math.floor(Math.random() * symbols.length)];
    setDemoTradeSymbol(randomSym);
    setInternalState('trading');
    if (onTriggerDemoTrade) onTriggerDemoTrade();

    setTimeout(() => {
      setInternalState('idle');
    }, 4500);
  };

  // Status text readout (concise, no AI slop)
  const getStatusText = () => {
    if (activeState === 'scanning') {
      return isEn
        ? 'Scanning live crypto pairs & executing Gemini neural evaluation...'
        : 'Memindai live crypto pairs & menjalankan evaluasi neural Gemini...';
    }
    if (activeState === 'trading') {
      const sym = lastTrade?.symbol || demoTradeSymbol;
      const act = lastTrade?.action || 'BUY';
      return isEn
        ? `Order Dispatched! Executing ${act} on ${sym}...`
        : `Order Terkirim! Mengeksekusi ${act} pada ${sym}...`;
    }
    return isEn
      ? 'Standby · Active market surveillance & TP/SL guardrails active'
      : 'Standby · Pengawasan pasar aktif & guardrail TP/SL siaga';
  };

  // =========================================================================
  // VECTOR ROBOT SVG GRAPHIC
  // =========================================================================
  const renderRobotSvg = (svgSize = 100) => {
    const isScanning = activeState === 'scanning';
    const isTrading = activeState === 'trading';

    return (
      <div className="relative inline-flex items-center justify-center select-none">
        {/* Ambient Halo Glow */}
        <div
          className={`absolute rounded-full transition-all duration-700 pointer-events-none ${
            isTrading
              ? 'w-40 h-40 opacity-75 blur-2xl scale-125'
              : isScanning
              ? 'w-36 h-36 opacity-60 blur-xl scale-110'
              : 'w-28 h-28 opacity-35 blur-xl scale-100'
          }`}
          style={{
            backgroundColor: isTrading ? (isPureAi ? '#34d399' : '#d946ef') : theme.primary,
          }}
        />

        {/* Radar Waves (Only when SCANNING) */}
        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span
              className="absolute w-20 h-20 rounded-full border border-current animate-robot-radar pointer-events-none"
              style={{ color: theme.primary }}
            />
            <span
              className="absolute w-32 h-32 rounded-full border border-current animate-robot-radar pointer-events-none"
              style={{ color: theme.accent, animationDelay: '0.6s' }}
            />
          </div>
        )}

        {/* Trade Execution Spark Rings (Only when TRADING) */}
        {isTrading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="absolute w-32 h-32 rounded-2xl border-2 border-amber-300 animate-ping opacity-75"
              style={{ animationDuration: '1.2s' }}
            />
          </div>
        )}

        {/* Robot Main SVG Character */}
        <svg
          width={svgSize}
          height={svgSize}
          viewBox="0 0 160 160"
          className={`relative z-10 transition-transform duration-500 ${
            isTrading ? 'animate-robot-float-fast' : isScanning ? 'animate-robot-float-fast' : 'animate-robot-float'
          }`}
        >
          <defs>
            <linearGradient id={`chassisGrad-${variant}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isPureAi ? '#064e3b' : '#3b0764'} />
              <stop offset="50%" stopColor={isPureAi ? '#047857' : '#581c87'} />
              <stop offset="100%" stopColor={isPureAi ? '#022c22' : '#240046'} />
            </linearGradient>

            <linearGradient id={`faceGrad-${variant}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            <linearGradient id={`laserVisor-${variant}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={theme.primary} stopOpacity="0.1" />
              <stop offset="50%" stopColor={theme.bright} stopOpacity="1" />
              <stop offset="100%" stopColor={theme.primary} stopOpacity="0.1" />
            </linearGradient>

            <radialGradient id={`coreGlow-${variant}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="40%" stopColor={theme.bright} />
              <stop offset="80%" stopColor={theme.primary} />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>

          {/* Pedestal / Shadow */}
          <ellipse cx="80" cy="150" rx="36" ry="7" fill="#020617" opacity="0.6" />
          <ellipse
            cx="80"
            cy="150"
            rx={isTrading ? 44 : 32}
            ry="5"
            fill={theme.primary}
            opacity={isScanning ? 0.5 : 0.25}
          />

          {/* Torso */}
          <rect
            x="48"
            y="94"
            width="64"
            height="46"
            rx="12"
            fill={`url(#chassisGrad-${variant})`}
            stroke={theme.primary}
            strokeWidth="2"
          />

          {/* Shoulder Pads */}
          <path
            d="M 38 102 L 48 96 L 48 114 L 38 110 Z"
            fill={isPureAi ? '#065f46' : '#6b21a8'}
            stroke={theme.primary}
            strokeWidth="1.5"
          />
          <path
            d="M 122 102 L 112 96 L 112 114 L 122 110 Z"
            fill={isPureAi ? '#065f46' : '#6b21a8'}
            stroke={theme.primary}
            strokeWidth="1.5"
          />

          {/* Chest Circuit Lines */}
          <path
            d="M 54 116 L 68 116 L 74 122"
            stroke={theme.bright}
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.8"
          />
          <path
            d="M 106 116 L 92 116 L 86 122"
            stroke={theme.bright}
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.8"
          />

          {/* Chest Core Reactor */}
          <circle
            cx="80"
            cy="120"
            r="10"
            fill={`url(#coreGlow-${variant})`}
            className={isTrading ? 'animate-ping' : 'animate-robot-glow'}
          />
          <circle cx="80" cy="120" r="6" fill="#ffffff" stroke={theme.primary} strokeWidth="1.5" />

          {/* Neck */}
          <rect x="72" y="86" width="16" height="8" rx="2" fill="#1e293b" stroke={theme.secondary} strokeWidth="1" />

          {/* Antenna */}
          <line x1="80" y1="22" x2="80" y2="34" stroke={theme.bright} strokeWidth="3" strokeLinecap="round" />
          <circle
            cx="80"
            cy="20"
            r={isScanning || isTrading ? 5.5 : 4}
            fill={isTrading ? '#facc15' : theme.bright}
            className={isScanning ? 'animate-robot-glow' : ''}
          />
          {(isScanning || isTrading) && (
            <path d="M 72 16 C 76 13, 84 13, 88 16" stroke={theme.accent} strokeWidth="2" fill="none" strokeLinecap="round" />
          )}

          {/* Head Chassis */}
          <rect
            x="42"
            y="34"
            width="76"
            height="54"
            rx="14"
            fill={`url(#chassisGrad-${variant})`}
            stroke={theme.primary}
            strokeWidth="2.5"
          />

          {/* Ear Nodes */}
          <rect x="36" y="48" width="6" height="18" rx="3" fill={theme.secondary} stroke={theme.primary} strokeWidth="1.5" />
          <rect x="118" y="48" width="6" height="18" rx="3" fill={theme.secondary} stroke={theme.primary} strokeWidth="1.5" />
          <circle cx="39" cy="57" r="1.5" fill={isTrading ? '#facc15' : theme.accent} />
          <circle cx="121" cy="57" r="1.5" fill={isTrading ? '#facc15' : theme.accent} />

          {/* Visor Screen */}
          <rect
            x="48"
            y="40"
            width="64"
            height="32"
            rx="8"
            fill={`url(#faceGrad-${variant})`}
            stroke={theme.bright}
            strokeWidth="1.5"
          />

          {/* Visor Display Content */}
          {isScanning ? (
            <g>
              <line x1="50" y1="48" x2="110" y2="48" stroke={theme.secondary} strokeWidth="0.5" opacity="0.4" />
              <line x1="50" y1="56" x2="110" y2="56" stroke={theme.secondary} strokeWidth="0.5" opacity="0.4" />
              <rect
                x="50"
                y="42"
                width="16"
                height="28"
                rx="4"
                fill={`url(#laserVisor-${variant})`}
                className="animate-robot-scanbeam"
              />
              <circle cx="66" cy="56" r="4.5" fill={theme.bright} className="animate-pulse" />
              <circle cx="94" cy="56" r="4.5" fill={theme.bright} className="animate-pulse" />
              <circle cx="66" cy="56" r="2" fill="#ffffff" />
              <circle cx="94" cy="56" r="2" fill="#ffffff" />
            </g>
          ) : isTrading ? (
            <g>
              <path d="M 58 48 L 54 48 L 54 64 L 58 64" stroke="#facc15" strokeWidth="2" fill="none" />
              <path d="M 102 48 L 106 48 L 106 64 L 102 64" stroke="#facc15" strokeWidth="2" fill="none" />
              <circle cx="80" cy="56" r="8" stroke="#facc15" strokeWidth="1.5" fill="none" />
              <line x1="74" y1="56" x2="86" y2="56" stroke="#facc15" strokeWidth="1.5" />
              <line x1="80" y1="50" x2="80" y2="62" stroke="#facc15" strokeWidth="1.5" />
              <circle cx="80" cy="56" r="2.5" fill="#ffffff" />
            </g>
          ) : (
            <g>
              <rect
                x="60"
                y="50"
                width="12"
                height="12"
                rx="3"
                fill={theme.visorColor}
                stroke={theme.bright}
                strokeWidth="1.5"
                className="animate-robot-glow"
              />
              <circle cx="66" cy="56" r="2" fill="#ffffff" />

              <rect
                x="88"
                y="50"
                width="12"
                height="12"
                rx="3"
                fill={theme.visorColor}
                stroke={theme.bright}
                strokeWidth="1.5"
                className="animate-robot-glow"
              />
              <circle cx="94" cy="56" r="2" fill="#ffffff" />

              <line x1="70" y1="67" x2="74" y2="67" stroke={theme.bright} strokeWidth="1.5" strokeLinecap="round" />
              <line x1="77" y1="67" x2="83" y2="67" stroke={theme.bright} strokeWidth="1.5" strokeLinecap="round" />
              <line x1="86" y1="67" x2="90" y2="67" stroke={theme.bright} strokeWidth="1.5" strokeLinecap="round" />
            </g>
          )}

          <rect x="70" y="78" width="20" height="3" rx="1.5" fill="#0f172a" />
        </svg>

        {/* Floating Trading Action Badge */}
        {isTrading && (
          <div className="absolute -top-3 -right-2 z-20 animate-bounce">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black font-mono tracking-wider bg-amber-400 text-slate-950 shadow-lg border border-amber-300 flex items-center gap-1">
              <Zap className="w-3 h-3 fill-slate-950" />
              <span>{lastTrade?.action || 'BUY'} {lastTrade?.symbol || demoTradeSymbol}</span>
            </span>
          </div>
        )}
      </div>
    );
  };

  // Icon only
  if (size === 'icon') {
    return (
      <div className="relative group inline-flex items-center">
        {renderRobotSvg(46)}
      </div>
    );
  }

  // =========================================================================
  // VIEW MODE: UNIFIED CLEAN COMMAND BANNER
  // =========================================================================
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${theme.borderColor} ${theme.shadowGlow} bg-gradient-to-r ${theme.bgGradient} p-4 sm:p-5 transition-all duration-300`}
    >
      {/* Background Cyber Texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, ${theme.primary} 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Main Flex Layout */}
      <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-5">
        {/* Left Side: Robot Mascot + Title + Status Line */}
        <div className="flex items-center gap-4">
          <div className="shrink-0">{renderRobotSvg(100)}</div>

          <div className="space-y-1.5 min-w-0">
            {/* Bot Mascot Name & Clean Tag */}
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black font-mono text-white tracking-tight">
                {theme.name}
              </h3>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${theme.badgeBg}`}>
                {theme.roleBadge}
              </span>
            </div>

            {/* Dynamic Status Readout Line */}
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  activeState === 'scanning'
                    ? 'bg-amber-400 animate-ping'
                    : activeState === 'trading'
                    ? 'bg-emerald-400 animate-bounce'
                    : 'bg-emerald-400 animate-pulse'
                }`}
                style={{
                  backgroundColor:
                    activeState === 'scanning'
                      ? '#f59e0b'
                      : activeState === 'trading'
                      ? '#22c55e'
                      : theme.accent,
                }}
              />
              <p className="text-xs sm:text-sm font-mono text-slate-200">
                {getStatusText()}
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Operational Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 justify-start xl:justify-end">
          {/* Button 1: Scan & Auto-Execute */}
          {onTriggerScan && (
            <button
              onClick={onTriggerScan}
              disabled={activeState === 'scanning'}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md ${theme.buttonPrimary} disabled:opacity-50`}
              title={isEn ? 'Scan Binance live pairs & auto-execute' : 'Pindai live pairs Binance & eksekusi otomatis'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${activeState === 'scanning' ? 'animate-spin' : ''}`} />
              <span>
                {activeState === 'scanning'
                  ? (isEn ? 'Scanning...' : 'Memindai...')
                  : (isEn ? 'Scan & Auto-Execute' : 'Pindai & Eksekusi')}
              </span>
            </button>
          )}

          {/* Button 2: Pause / Activate Bot */}
          {onToggleActive && (
            <button
              onClick={onToggleActive}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                isBotActive
                  ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}
            >
              {isBotActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>
                {isBotActive
                  ? (isEn ? 'Pause Bot' : 'Jeda Bot')
                  : (isEn ? 'Activate Bot' : 'Aktifkan Bot')}
              </span>
            </button>
          )}

          {/* Button 3: Strategy & Settings */}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                showSettings
                  ? isPureAi
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md font-bold'
                    : 'bg-purple-600 text-white border-purple-400 shadow-md font-bold'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{isEn ? 'Strategy & Settings' : 'Strategi & Pengaturan'}</span>
              {isPausedEntries && (
                <span className="text-[10px] text-amber-300 font-bold ml-0.5">· Paused</span>
              )}
            </button>
          )}

          {/* Button 4: Simulate Trade Animation */}
          <button
            onClick={handleSimulateTrade}
            disabled={activeState === 'trading'}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
              activeState === 'trading'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-700/80 hover:text-white'
            }`}
            title={isEn ? 'Simulate Trade Execution Animation' : 'Simulasi Animasi Eksekusi Trade Robot'}
          >
            <Zap className={`w-3.5 h-3.5 ${activeState === 'trading' ? 'text-amber-400 animate-spin' : 'text-amber-400'}`} />
            <span>
              {activeState === 'trading'
                ? (isEn ? 'Trade Active!' : 'Trade Berjalan!')
                : (isEn ? 'Simulate Trade' : 'Tes Trade')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
