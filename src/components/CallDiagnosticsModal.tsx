import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Mic,
  Video,
  Volume2,
  Wifi,
  Radio,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  X,
  Zap,
  ShieldCheck,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  runFullDiagnostics,
  FullDiagnosticReport,
  DiagnosticResult,
} from '../utils/callDiagnostics';
import { unlockAudioContext } from '../utils/sounds';

interface CallDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  callType: 'audio' | 'video';
  onAutoFixAndReconnect?: () => Promise<void> | void;
}

export const CallDiagnosticsModal: React.FC<CallDiagnosticsModalProps> = ({
  isOpen,
  onClose,
  callType,
  onAutoFixAndReconnect,
}) => {
  const [report, setReport] = useState<FullDiagnosticReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [fixSuccess, setFixSuccess] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const startDiagnostics = useCallback(async () => {
    setIsRunning(true);
    setFixSuccess(false);
    try {
      const rep = await runFullDiagnostics(callType);
      setReport(rep);
    } catch (err) {
      console.error('Diagnostic error:', err);
    } finally {
      setIsRunning(false);
    }
  }, [callType]);

  // Run automatically when modal opens if no report exists
  useEffect(() => {
    if (isOpen && !report && !isRunning) {
      startDiagnostics();
    }
  }, [isOpen, report, isRunning, startDiagnostics]);

  if (!isOpen) return null;

  const handleAutoFix = async () => {
    setIsFixing(true);
    try {
      unlockAudioContext();
      if (onAutoFixAndReconnect) {
        await onAutoFixAndReconnect();
      }
      setFixSuccess(true);
      // Re-run diagnostics to reflect updated state
      setTimeout(() => {
        startDiagnostics();
      }, 600);
    } catch (err) {
      console.error('Auto fix error:', err);
    } finally {
      setIsFixing(false);
    }
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="w-5 h-5 text-[#00a884] shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-rose-500 shrink-0" />;
      default:
        return <RefreshCw className="w-5 h-5 text-[#8696a0] animate-spin shrink-0" />;
    }
  };

  const getCategoryIcon = (id: string) => {
    switch (id) {
      case 'microphone':
        return <Mic className="w-4 h-4 text-[#00a884]" />;
      case 'camera':
        return <Video className="w-4 h-4 text-emerald-400" />;
      case 'audio_context':
        return <Volume2 className="w-4 h-4 text-teal-400" />;
      case 'nat_turn':
        return <Wifi className="w-4 h-4 text-cyan-400" />;
      case 'signaling':
        return <Radio className="w-4 h-4 text-emerald-300" />;
      default:
        return <Activity className="w-4 h-4 text-[#00a884]" />;
    }
  };

  return (
    <div
      id="call-diagnostics-backdrop"
      className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="call-diagnostics-modal"
        className="relative w-full max-w-xl bg-[#111b21] border border-[#2a3942] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[#e9edef] animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222e35] bg-[#202c33]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00a884]/20 border border-[#00a884]/30 flex items-center justify-center">
              <Activity className="w-5 h-5 text-[#00a884]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Audio & Video Call Diagnostics
              </h3>
              <p className="text-xs text-[#8696a0]">
                Hardware, Web Audio, ICE, STUN/TURN traversal telemetry
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#8696a0] hover:text-white rounded-xl hover:bg-[#202c33] transition-colors cursor-pointer"
            title="Close diagnostics"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar">
          {/* Diagnostic Status Card / Banner */}
          {report && (
            <div
              className={`p-4 rounded-2xl border transition-all ${
                report.overallStatus === 'passed'
                  ? 'bg-[#00a884]/10 border-[#00a884]/30'
                  : report.overallStatus === 'warning'
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-rose-500/10 border-rose-500/30'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  {getStatusIcon(report.overallStatus)}
                  <div>
                    <span className="text-sm font-bold text-white">
                      {report.overallStatus === 'passed'
                        ? 'All Media Subsystems Operational'
                        : report.overallStatus === 'warning'
                        ? 'Operational with Recommendations'
                        : 'Attention Needed for Media Stream'}
                    </span>
                    <p className="text-xs text-[#8696a0] mt-0.5">{report.summary}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xl font-bold font-mono text-white">
                    {report.overallScore}%
                  </span>
                  <span className="block text-[10px] uppercase font-semibold text-[#8696a0]">
                    Health Score
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Running Progress State */}
          {isRunning && (
            <div className="p-4 rounded-2xl bg-[#202c33]/70 border border-[#2a3942] flex items-center justify-center gap-3 text-sm text-[#8696a0]">
              <RefreshCw className="w-5 h-5 text-[#00a884] animate-spin" />
              <span>Analyzing microphone, camera, AudioContext, and TURN relays...</span>
            </div>
          )}

          {/* Test Items List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-[#8696a0] uppercase tracking-wider px-1">
              <span>Diagnostic Checks</span>
              <span>Status</span>
            </div>

            {report?.results.map((res) => {
              const isExpanded = expandedId === res.id;
              return (
                <div
                  key={res.id}
                  className="rounded-2xl border border-[#222e35] bg-[#202c33]/60 hover:bg-[#202c33] transition-colors overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : res.id)}
                    className="w-full flex items-center justify-between p-3.5 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-[#111b21] border border-[#2a3942]">
                        {getCategoryIcon(res.id)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-semibold text-white truncate">
                            {res.name}
                          </h4>
                        </div>
                        <p className="text-[11px] text-[#8696a0] truncate mt-0.5">
                          {res.title}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {getStatusIcon(res.status)}
                      <ChevronRight
                        className={`w-4 h-4 text-[#8696a0] transition-transform duration-200 ${
                          isExpanded ? 'rotate-90' : ''
                        }`}
                      />
                    </div>
                  </button>

                  {/* Expanded Details Panel */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-[#222e35]/60 bg-[#111b21]/50 space-y-3 text-xs">
                      <p className="text-xs text-[#8696a0] leading-relaxed">{res.details}</p>

                      {res.metrics && Object.keys(res.metrics).length > 0 && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {Object.entries(res.metrics).map(([key, val]) => (
                            <div
                              key={key}
                              className="p-2 rounded-xl bg-[#202c33]/70 border border-[#222e35]"
                            >
                              <span className="text-[10px] text-[#8696a0] capitalize block">
                                {key.replace(/([A-Z])/g, ' $1')}
                              </span>
                              <span className="text-xs font-mono font-bold text-white truncate block mt-0.5">
                                {String(val)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Recommendations Card */}
          {report && report.recommendations.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#202c33]/40 border border-[#222e35] space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8696a0]">
                <Info className="w-3.5 h-3.5 text-[#00a884]" />
                <span>Recommendations</span>
              </div>
              <ul className="space-y-1.5 text-xs text-[#8696a0]">
                {report.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00a884] shrink-0 mt-1.5" />
                    <span className="text-white/90">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Fix Success Toast */}
          {fixSuccess && (
            <div className="p-3 rounded-xl bg-[#00a884]/20 border border-[#00a884]/40 flex items-center gap-2 text-xs text-[#25d366] animate-in fade-in">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>
                AudioContext unlocked, ICE route refreshed, and media streams re-attached!
              </span>
            </div>
          )}
        </div>

        {/* Modal Footer with Actions */}
        <div className="p-4 border-t border-[#222e35] bg-[#202c33]/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={startDiagnostics}
            disabled={isRunning}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#202c33] hover:bg-[#2a3942] border border-[#2a3942] text-xs font-semibold text-[#e9edef] transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            <span>Re-Run Diagnostics</span>
          </button>

          <div className="w-full sm:w-auto flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutoFix}
              disabled={isFixing || isRunning}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#00a884] hover:bg-[#02906f] active:bg-[#007a5e] text-white text-xs font-bold transition-all shadow-lg shadow-[#00a884]/20 cursor-pointer disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 ${isFixing ? 'animate-spin' : ''}`} />
              <span>{isFixing ? 'Applying Auto-Fix...' : 'Apply Auto-Fix & Reconnect'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
