import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Wifi,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { NetworkQualityStats } from '../utils/webrtc';

interface NetworkHealthOverlayProps {
  callStatus: 'idle' | 'calling' | 'connecting' | 'connected' | 'ended';
  getNetworkStats?: () => Promise<NetworkQualityStats>;
  onReconnect?: () => void;
  onOpenDiagnostics?: () => void;
  className?: string;
  compact?: boolean;
}

export const NetworkHealthOverlay: React.FC<NetworkHealthOverlayProps> = ({
  callStatus,
  getNetworkStats,
  onReconnect,
  onOpenDiagnostics,
  className = '',
  compact = false,
}) => {
  const [stats, setStats] = useState<NetworkQualityStats>({
    rttMs: null,
    packetLossPercent: 0,
    jitterMs: null,
    quality: callStatus === 'connected' ? 'good' : 'measuring',
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Poll network stats every 1.5s while call is connected
  useEffect(() => {
    if (callStatus !== 'connected' || !getNetworkStats) {
      if (callStatus === 'connecting') {
        setStats({
          rttMs: null,
          packetLossPercent: 0,
          jitterMs: null,
          quality: 'measuring',
        });
      }
      return;
    }

    let isMounted = true;

    const pollStats = async () => {
      try {
        const currentStats = await getNetworkStats();
        if (isMounted) {
          setStats(currentStats);
          setLastUpdated(new Date());
        }
      } catch {
        // ignore polling errors
      }
    };

    // Initial query
    pollStats();
    const interval = setInterval(pollStats, 1500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [callStatus, getNetworkStats]);

  // Click outside to close expanded popover
  useEffect(() => {
    if (!isExpanded) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isExpanded]);

  const handleRefreshRoute = () => {
    if (onReconnect) {
      setIsRefreshing(true);
      onReconnect();
      setTimeout(() => setIsRefreshing(false), 2000);
    }
  };

  // Determine visual styling based on quality
  const getQualityConfig = () => {
    if (callStatus !== 'connected') {
      return {
        label: 'Connecting...',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        dotColor: 'bg-amber-400',
        barsFilled: 1,
        barsColor: 'bg-amber-400',
        statusDesc: 'Negotiating direct peer connection...',
      };
    }

    switch (stats.quality) {
      case 'excellent':
        return {
          label: 'Excellent',
          badgeColor: 'bg-[#00a884]/20 text-[#00a884] border-[#00a884]/40',
          dotColor: 'bg-[#00a884]',
          barsFilled: 4,
          barsColor: 'bg-[#00a884]',
          statusDesc: 'Ultra-low latency HD stream. Crystal clear stability.',
        };
      case 'good':
        return {
          label: 'Good',
          badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
          dotColor: 'bg-emerald-400',
          barsFilled: 3,
          barsColor: 'bg-emerald-400',
          statusDesc: 'Stable connection. Voice & video syncing cleanly.',
        };
      case 'fair':
        return {
          label: 'Fair',
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          dotColor: 'bg-amber-400',
          barsFilled: 2,
          barsColor: 'bg-amber-400',
          statusDesc: 'Moderate latency. Bandwidth adjusted for continuity.',
        };
      case 'poor':
        return {
          label: 'Poor',
          badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          dotColor: 'bg-rose-400',
          barsFilled: 1,
          barsColor: 'bg-rose-400',
          statusDesc: 'High latency or packet drop detected across route.',
        };
      default:
        return {
          label: 'Measuring...',
          badgeColor: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
          dotColor: 'bg-slate-400',
          barsFilled: 2,
          barsColor: 'bg-slate-400',
          statusDesc: 'Analyzing stream metrics and route latency...',
        };
    }
  };

  const config = getQualityConfig();

  // Render 4 signal strength bars
  const renderSignalBars = (size: 'sm' | 'md' = 'sm') => {
    const heights = size === 'sm' ? ['h-1.5', 'h-2.5', 'h-3.5', 'h-4.5'] : ['h-2', 'h-3', 'h-4', 'h-5'];
    const width = size === 'sm' ? 'w-1' : 'w-1.5';

    return (
      <div className="flex items-end gap-0.5 h-5 px-0.5" aria-label={`Signal strength ${config.barsFilled} of 4`}>
        {[0, 1, 2, 3].map((barIndex) => {
          const isFilled = barIndex < config.barsFilled;
          return (
            <span
              key={barIndex}
              className={`${width} ${heights[barIndex]} rounded-full transition-all duration-300 ${
                isFilled ? config.barsColor : 'bg-white/20'
              }`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className={`relative inline-block select-none ${className}`} ref={popoverRef}>
      {/* Interactive Trigger Button */}
      <button
        id="btn-network-health-trigger"
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        title="View network latency and stream stability metrics"
        className={`inline-flex items-center gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-[#202c33]/90 hover:bg-[#2a3942] border border-[#2a3942] text-xs transition-all duration-200 cursor-pointer shadow-md backdrop-blur-md ${
          isExpanded ? 'ring-2 ring-[#00a884]/60 bg-[#2a3942]' : ''
        }`}
      >
        {/* Signal Bars */}
        {renderSignalBars('sm')}

        {/* Live Latency or State Tag */}
        <div className="flex items-center gap-1.5">
          {callStatus === 'connected' && stats.rttMs !== null ? (
            <span className="font-mono text-[11px] sm:text-xs font-medium text-[#e9edef]">
              {stats.rttMs} ms
            </span>
          ) : (
            <span className="text-[11px] sm:text-xs font-medium text-[#8696a0]">
              {callStatus === 'connected' ? 'Optimized' : 'Testing'}
            </span>
          )}

          {/* Quality Indicator Dot */}
          <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor} animate-pulse`} />
        </div>

        {/* Expand/Collapse Chevron */}
        {isExpanded ? (
          <ChevronUp className="w-3 h-3 text-[#8696a0]" />
        ) : (
          <ChevronDown className="w-3 h-3 text-[#8696a0]" />
        )}
      </button>

      {/* Detailed Diagnostic Popover Overlay */}
      {isExpanded && (
        <div
          id="network-health-popover"
          className="absolute top-full mt-2 left-0 sm:right-0 sm:left-auto w-72 sm:w-80 bg-[#111b21] border border-[#2a3942] rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150 text-[#e9edef] backdrop-blur-xl"
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#222e35]">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#00a884]" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#e9edef]">
                Network Diagnostics
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="p-1 text-[#8696a0] hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Connection Status Banner */}
          <div className={`mt-3 p-2.5 rounded-xl border flex items-center justify-between ${config.badgeColor}`}>
            <div className="flex items-center gap-2">
              {stats.quality === 'poor' ? (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-[#00a884] shrink-0" />
              )}
              <div>
                <span className="text-xs font-bold">{config.label} Connection</span>
                <p className="text-[10px] text-[#8696a0] leading-tight mt-0.5">{config.statusDesc}</p>
              </div>
            </div>
            {renderSignalBars('md')}
          </div>

          {/* Live Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            {/* Metric: Round Trip Latency (RTT) */}
            <div className="p-2.5 rounded-xl bg-[#202c33]/70 border border-[#222e35]">
              <div className="flex items-center justify-between text-[11px] text-[#8696a0]">
                <span>Latency (RTT)</span>
                <Gauge className="w-3 h-3 text-[#00a884]" />
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-base font-bold font-mono text-white">
                  {stats.rttMs !== null ? stats.rttMs : '—'}
                </span>
                <span className="text-[10px] text-[#8696a0]">ms</span>
              </div>
              <p className="text-[9px] text-[#8696a0] mt-0.5">
                {stats.rttMs !== null
                  ? stats.rttMs < 100
                    ? 'Excellent response'
                    : stats.rttMs < 200
                    ? 'Normal delay'
                    : 'Noticeable delay'
                  : 'Measuring...'}
              </p>
            </div>

            {/* Metric: Packet Loss */}
            <div className="p-2.5 rounded-xl bg-[#202c33]/70 border border-[#222e35]">
              <div className="flex items-center justify-between text-[11px] text-[#8696a0]">
                <span>Packet Loss</span>
                <Wifi className="w-3 h-3 text-[#00a884]" />
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span
                  className={`text-base font-bold font-mono ${
                    stats.packetLossPercent > 5 ? 'text-rose-400' : 'text-white'
                  }`}
                >
                  {stats.packetLossPercent}%
                </span>
              </div>
              <p className="text-[9px] text-[#8696a0] mt-0.5">
                {stats.packetLossPercent === 0 ? 'Zero dropouts' : 'Recovering dropouts'}
              </p>
            </div>

            {/* Metric: Jitter */}
            <div className="p-2.5 rounded-xl bg-[#202c33]/70 border border-[#222e35]">
              <div className="flex items-center justify-between text-[11px] text-[#8696a0]">
                <span>Jitter Buffer</span>
                <Activity className="w-3 h-3 text-[#00a884]" />
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-base font-bold font-mono text-white">
                  {stats.jitterMs !== null ? stats.jitterMs : '—'}
                </span>
                <span className="text-[10px] text-[#8696a0]">ms</span>
              </div>
              <p className="text-[9px] text-[#8696a0] mt-0.5">
                {stats.jitterMs !== null && stats.jitterMs < 15 ? 'Smooth playback' : 'Buffer active'}
              </p>
            </div>

            {/* Metric: Bitrate */}
            <div className="p-2.5 rounded-xl bg-[#202c33]/70 border border-[#222e35]">
              <div className="flex items-center justify-between text-[11px] text-[#8696a0]">
                <span>Bitrate</span>
                <Activity className="w-3 h-3 text-[#00a884]" />
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-base font-bold font-mono text-white">
                  {stats.bitrateKbps ? `${stats.bitrateKbps}` : 'Adaptive'}
                </span>
                {stats.bitrateKbps ? <span className="text-[10px] text-[#8696a0]">kbps</span> : null}
              </div>
              <p className="text-[9px] text-[#8696a0] mt-0.5">Dynamic HD codec</p>
            </div>
          </div>

          {/* Security & Protocol Footer */}
          <div className="mt-3 pt-2.5 border-t border-[#222e35] flex items-center justify-between text-[11px] text-[#8696a0]">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00a884]" />
              <span className="truncate max-w-[140px] sm:max-w-[170px]">{stats.protocol || 'DTLS-SRTP P2P'}</span>
            </div>

            <div className="flex items-center gap-2">
              {onOpenDiagnostics && (
                <button
                  type="button"
                  onClick={() => {
                    setIsExpanded(false);
                    onOpenDiagnostics();
                  }}
                  className="inline-flex items-center gap-1 text-[#25d366] hover:text-[#00a884] font-medium text-[11px] transition-colors cursor-pointer"
                  title="Run audio, video, microphone, and ICE diagnosis"
                >
                  <Activity className="w-3 h-3" />
                  <span>Diagnose</span>
                </button>
              )}

              {onReconnect && (
                <button
                  type="button"
                  onClick={handleRefreshRoute}
                  disabled={isRefreshing}
                  className="inline-flex items-center gap-1 text-[#00a884] hover:text-[#25d366] font-medium text-[11px] transition-colors cursor-pointer"
                  title="Restart ICE candidate negotiation to find fastest route"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isRefreshing ? 'Rerouting...' : 'Reroute'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
