import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, RefreshCw, Clock, Radio, Activity, Info } from 'lucide-react';
import { getCryptoMarketTime, getUSMarketTime } from '../utils/marketHours';
import { MarketType } from '../types/stock';

interface TradingViewChartProps {
  tvSymbol: string; // e.g. "BINANCE:BTCUSDT", "NASDAQ:NVDA"
  market?: MarketType;
  currentPrice?: number;
  change?: number;
  changePercent?: number;
  height?: number | string;
  initialInterval?: string;
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({
  tvSymbol,
  market = 'CRYPTO',
  currentPrice,
  change,
  changePercent,
  height = 580,
  initialInterval = '15',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [interval, setInterval] = useState<string>(initialInterval);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const isUS = market === 'US';
  const marketTime = isUS ? getUSMarketTime() : getCryptoMarketTime();
  const isMarketOpen = marketTime.isOpen;

  const intervals = [
    { label: '1m', value: '1' },
    { label: '5m', value: '5' },
    { label: '15m', value: '15' },
    { label: '1j', value: '60' },
    { label: '4j', value: '240' },
    { label: '1H', value: 'D' },
    { label: '1M', value: 'W' },
  ];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey((prev) => prev + 1);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 700);
  };

  const formatPrice = (p: number) => {
    if (p < 0.0001) return `$${p.toFixed(8)}`;
    if (p < 1) return `$${p.toFixed(4)}`;
    return `$${p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  useEffect(() => {
    const currentContainer = containerRef.current;
    if (!currentContainer) return;

    currentContainer.innerHTML = '';

    const containerId = `tv_chart_${tvSymbol.replace(/[^a-zA-Z0-9]/g, '_')}_${interval}_${refreshKey}`;

    const widgetWrapper = document.createElement('div');
    widgetWrapper.id = containerId;
    widgetWrapper.className = 'tradingview-widget-container';
    widgetWrapper.style.height = '100%';
    widgetWrapper.style.width = '100%';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = '100%';
    widgetDiv.style.width = '100%';
    widgetWrapper.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: interval,
      timezone: isUS ? 'America/New_York' : 'Asia/Jakarta',
      theme: 'dark',
      style: '1',
      locale: 'id',
      toolbar_bg: '#090e1a',
      backgroundColor: '#090e1a',
      gridColor: 'rgba(255, 255, 255, 0.05)',
      enable_publishing: false,
      allow_symbol_change: true,
      withdateranges: true,
      hide_side_toolbar: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: true,
      calendar: false,
      show_popup_button: true,
      popup_width: '1000',
      popup_height: '650',
      studies: [
        'MASimple@tv-basicstudies',
        'RSI@tv-basicstudies'
      ],
      support_host: 'https://www.tradingview.com',
    });

    widgetWrapper.appendChild(script);
    currentContainer.appendChild(widgetWrapper);

    return () => {
      if (currentContainer) {
        currentContainer.innerHTML = '';
      }
    };
  }, [tvSymbol, interval, refreshKey, isUS]);

  const tvDirectUrl = `https://id.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}`;

  return (
    <div className="flex flex-col w-full bg-[#090e1a] rounded-lg border border-slate-800 overflow-hidden">
      {/* Top Interactive Controls & Market Feed Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 bg-slate-900/95 border-b border-slate-800 text-xs">
        {/* Left: Feed Status & Session Indicator */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 font-mono">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isMarketOpen
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-amber-400'
              }`}
            />
            <span className="font-bold text-slate-200">
              TradingView Live Stream (Aktual)
            </span>
          </div>

          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
            {marketTime.sessionStatus}
          </span>

          {currentPrice !== undefined && (
            <span className="text-slate-400 font-mono text-[11px] hidden sm:inline-block">
              Harga Terakhir: <strong className="text-white">{formatPrice(currentPrice)}</strong>
              {changePercent !== undefined && (
                <span className={`ml-1.5 font-bold ${changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
                </span>
              )}
            </span>
          )}
        </div>

        {/* Right: Timeframe Quick Buttons & Actions */}
        <div className="flex items-center gap-2">
          {/* Timeframe selector */}
          <div className="flex items-center bg-slate-950/80 rounded border border-slate-800 p-0.5 font-mono text-[11px]">
            {intervals.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setInterval(tf.value)}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  interval === tf.value
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={`Ganti timeframe chart ke ${tf.label}`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Refresh Widget Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
            title="Reload widget TradingView jika terputus"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
          </button>

          {/* Direct TradingView Link */}
          <a
            href={tvDirectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors flex items-center"
            title="Buka chart penuh langsung di situs TradingView"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Widget Container Viewport */}
      <div 
        ref={containerRef} 
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
        className="w-full relative bg-[#090e1a]"
      >
        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs font-mono space-y-2">
          <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
          <span>Memuat TradingView Advanced Real-Time Engine ({tvSymbol})...</span>
        </div>
      </div>
    </div>
  );
};

export const TradingViewTechnicalGauge: React.FC<{ tvSymbol: string; height?: number }> = ({
  tvSymbol,
  height = 420,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentContainer = containerRef.current;
    if (!currentContainer) return;

    currentContainer.innerHTML = '';

    const widgetWrapper = document.createElement('div');
    widgetWrapper.className = 'tradingview-widget-container';
    widgetWrapper.style.height = '100%';
    widgetWrapper.style.width = '100%';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = '100%';
    widgetDiv.style.width = '100%';
    widgetWrapper.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      interval: '1D',
      width: '100%',
      isTransparent: true,
      height: '100%',
      symbol: tvSymbol,
      showIntervalTabs: true,
      displayMode: 'single',
      locale: 'id',
      colorTheme: 'dark',
    });

    widgetWrapper.appendChild(script);
    currentContainer.appendChild(widgetWrapper);

    return () => {
      if (currentContainer) {
        currentContainer.innerHTML = '';
      }
    };
  }, [tvSymbol]);

  return (
    <div 
      ref={containerRef} 
      style={{ height: `${height}px` }} 
      className="w-full bg-[#090e1a] rounded-lg border border-slate-800/80 overflow-hidden p-2"
    />
  );
};
