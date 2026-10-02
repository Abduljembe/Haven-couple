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
  Globe2,
  Key,
  ExternalLink,
  Server,
  Lock,
  Eye,
  EyeOff,
  HelpCircle,
} from 'lucide-react';
import {
  runFullDiagnostics,
  testNatTraversal,
  FullDiagnosticReport,
  DiagnosticResult,
} from '../utils/callDiagnostics';
import { fetchFreshIceServers } from '../utils/webrtc';
import { unlockAudioContext } from '../utils/sounds';

interface CallDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  callType: 'audio' | 'video';
  roomId?: string;
  onAutoFixAndReconnect?: () => Promise<void> | void;
}

export const CallDiagnosticsModal: React.FC<CallDiagnosticsModalProps> = ({
  isOpen,
  onClose,
  callType,
  roomId,
  onAutoFixAndReconnect,
}) => {
  const [activeTab, setActiveTab] = useState<'health' | 'relay'>('health');
  const [report, setReport] = useState<FullDiagnosticReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [fixSuccess, setFixSuccess] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Relay Configuration Form State
  const [relayProvider, setRelayProvider] = useState<'metered' | 'custom'>('metered');
  const [meteredDomain, setMeteredDomain] = useState('');
  const [meteredApiKey, setMeteredApiKey] = useState('');
  const [turnUrl, setTurnUrl] = useState('');
  const [turnUsername, setTurnUsername] = useState('');
  const [turnCredential, setTurnCredential] = useState('');
  const [isSavingRelay, setIsSavingRelay] = useState(false);
  const [relayStatus, setRelayStatus] = useState<{ configured: boolean; type?: string; domain?: string } | null>(null);
  const [relaySuccessMsg, setRelaySuccessMsg] = useState<string | null>(null);
  const [relayErrorMsg, setRelayErrorMsg] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  // Load existing room relay status on mount
  useEffect(() => {
    if (!isOpen || !roomId) return;
    fetch(`/api/webrtc/turn-config?roomId=${encodeURIComponent(roomId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.configured) {
          setRelayStatus(data);
          if (data.meteredDomain) setMeteredDomain(data.meteredDomain);
          if (data.turnUrl) setTurnUrl(data.turnUrl);
          if (data.turnUsername) setTurnUsername(data.turnUsername);
        }
      })
      .catch(() => {});
  }, [isOpen, roomId]);

  const startDiagnostics = useCallback(async () => {
    setIsRunning(true);
    setFixSuccess(false);
    try {
      const rep = await runFullDiagnostics(callType, roomId);
      setReport(rep);
    } catch (err) {
      console.error('Diagnostic error:', err);
    } finally {
      setIsRunning(false);
    }
  }, [callType, roomId]);

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
      if (roomId) {
        await fetchFreshIceServers(roomId, true);
      }
      if (onAutoFixAndReconnect) {
        await onAutoFixAndReconnect();
      }
      setFixSuccess(true);
      setTimeout(() => {
        startDiagnostics();
      }, 600);
    } catch (err) {
      console.error('Auto fix error:', err);
    } finally {
      setIsFixing(false);
    }
  };

  const handleSaveRelayConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId) {
      setRelayErrorMsg('Room ID is missing. Please join your Sanctuary first.');
      return;
    }

    setIsSavingRelay(true);
    setRelaySuccessMsg(null);
    setRelayErrorMsg(null);

    try {
      const payload: any = { roomId };
      if (relayProvider === 'metered') {
        let dom = meteredDomain.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim();
        if (dom && !dom.includes('.')) {
          dom = `${dom}.metered.live`;
        } else if (dom.endsWith('.metered.ca')) {
          dom = dom.replace(/\.metered\.ca$/i, '.metered.live');
        }
        const key = meteredApiKey.trim().replace(/^apiKey=/i, '').replace(/^["']|["']$/g, '').trim();

        if (!dom || !key) {
          setRelayErrorMsg('Please enter both your Metered domain and Secret API key.');
          setIsSavingRelay(false);
          return;
        }
        payload.meteredDomain = dom;
        payload.meteredApiKey = key;
        setMeteredDomain(dom);
        setMeteredApiKey(key);
      } else {
        if (!turnUrl.trim()) {
          setRelayErrorMsg('Please enter your TURN server URL (e.g., turn:relay.example.com:3478).');
          setIsSavingRelay(false);
          return;
        }
        payload.turnUrl = turnUrl.trim();
        payload.turnUsername = turnUsername.trim();
        payload.turnCredential = turnCredential.trim();
      }

      const res = await fetch('/api/webrtc/turn-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to verify and save TURN relay.');
      }

      // Also save in localStorage for client persistence
      if (payload.turnUrl) {
        const localIce = [
          {
            urls: [payload.turnUrl],
            username: payload.turnUsername,
            credential: payload.turnCredential,
          },
        ];
        localStorage.setItem('haven_custom_turn_config', JSON.stringify(localIce));
      }

      // Force refresh client ICE servers
      await fetchFreshIceServers(roomId, true);

      setRelaySuccessMsg(data.message || 'TURN relay active! Both you and your partner can now call over 4G/5G and any Wi-Fi.');
      setRelayStatus({
        configured: true,
        type: relayProvider,
        domain: meteredDomain || turnUrl,
      });

      // Automatically re-run diagnostics to verify
      setTimeout(() => {
        startDiagnostics();
      }, 1000);
    } catch (err: any) {
      setRelayErrorMsg(err.message || 'Failed to save configuration');
    } finally {
      setIsSavingRelay(false);
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
        <div className="px-6 pt-4 pb-0 border-b border-[#222e35] bg-[#202c33]/50">
          <div className="flex items-center justify-between pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#00a884]/20 border border-[#00a884]/30 flex items-center justify-center">
                <Activity className="w-5 h-5 text-[#00a884]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-wide">
                  Call & Network Diagnostics
                </h3>
                <p className="text-xs text-[#8696a0]">
                  Cross-network traversal, STUN/TURN relays, audio & camera health
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

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setActiveTab('health')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'health'
                  ? 'border-[#00a884] text-[#00a884]'
                  : 'border-transparent text-[#8696a0] hover:text-[#e9edef]'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Subsystems & Traversal</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('relay')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'relay'
                  ? 'border-[#00a884] text-[#00a884]'
                  : 'border-transparent text-[#8696a0] hover:text-[#e9edef]'
              }`}
            >
              <Globe2 className="w-3.5 h-3.5" />
              <span>Cross-Network Relay (TURN)</span>
              {relayStatus?.configured && (
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
          {activeTab === 'health' ? (
            <>
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
                      <span className="text-xl font-mono font-extrabold text-white">
                        {report.overallScore}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Subsystems Diagnostic Check List */}
              <div className="space-y-2.5">
                {report?.results.map((res) => {
                  const isExpanded = expandedId === res.id;
                  return (
                    <div
                      key={res.id}
                      className="rounded-2xl border border-[#222e35] bg-[#202c33]/40 overflow-hidden transition-all"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : res.id)}
                        className="w-full p-3.5 flex items-center justify-between text-left hover:bg-[#202c33]/60 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-xl bg-[#111b21] border border-[#222e35] shrink-0">
                            {getCategoryIcon(res.id)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">{res.name}</h4>
                            <p className="text-[11px] text-[#8696a0] truncate mt-0.5">
                              {res.title}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 ml-2">
                          <span className="text-xs font-mono font-semibold text-[#8696a0]">
                            {res.score}%
                          </span>
                          {getStatusIcon(res.status)}
                          <ChevronRight
                            className={`w-4 h-4 text-[#8696a0] transition-transform ${
                              isExpanded ? 'rotate-90' : ''
                            }`}
                          />
                        </div>
                      </button>

                      {/* Expandable Technical Details Panel */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-[#222e35] bg-[#111b21]/40 space-y-2.5 text-xs text-[#8696a0]">
                          <p className="leading-relaxed text-white/80">{res.details}</p>

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
                    <span>Cross-Network Calling Advice</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-[#8696a0]">
                    {report.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00a884] shrink-0 mt-1.5" />
                        <span className="text-white/90">{rec}</span>
                      </li>
                    ))}
                    <li className="flex items-start gap-2 pt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 mt-1.5" />
                      <span className="text-white/90">
                        Calling from phone to laptop or mobile data (4G/5G)? Click the{' '}
                        <button
                          type="button"
                          onClick={() => setActiveTab('relay')}
                          className="text-[#00a884] font-bold underline cursor-pointer"
                        >
                          Cross-Network Relay (TURN) tab
                        </button>{' '}
                        above to configure a free TURN relay in under 1 minute.
                      </span>
                    </li>
                  </ul>
                </div>
              )}

              {/* Fix Success Toast */}
              {fixSuccess && (
                <div className="p-3 rounded-xl bg-[#00a884]/20 border border-[#00a884]/40 flex items-center gap-2 text-xs text-[#25d366] animate-in fade-in">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>
                    AudioContext unlocked, fresh ICE routes fetched, and candidate routes re-established!
                  </span>
                </div>
              )}
            </>
          ) : (
            /* Tab 2: Cross-Network & Cellular (TURN Relay) Setup */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>Permanent Built-in Cloud Media Relay (Active)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Haven now includes a permanent, <strong>Built-in Cloud Media Relay</strong> that runs directly through our secure WebSocket server bridge. When direct peer-to-peer is blocked by mobile carriers (4G/5G symmetric NAT) or firewalls, Haven automatically bridges your audio and video so calls connect 100% of the time.
                </p>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 pt-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Permanent Solution Active: No Metered account or API key needed!</span>
                </div>
              </div>

              {/* Current Status Badge */}
              <div className="p-3.5 rounded-2xl bg-[#202c33]/60 border border-[#222e35] flex items-center justify-between text-xs">
                <div>
                  <span className="text-[#8696a0] block text-[10px] uppercase font-bold">Relay Architecture</span>
                  <span className="font-semibold text-white">
                    Built-in Cloud Media Relay & Global Anycast STUN
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Ready & Active
                </span>
              </div>

              <div className="pt-2">
                <h4 className="text-xs font-bold text-white mb-1">Optional External Relays (Advanced)</h4>
                <p className="text-[11px] text-[#8696a0] leading-relaxed">
                  The built-in cloud relay already handles all calls automatically. If you wish to attach an external third-party TURN provider, you can optionally configure it below:
                </p>
              </div>

              {/* Provider Selection */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRelayProvider('metered')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    relayProvider === 'metered'
                      ? 'bg-[#00a884]/20 border-[#00a884] text-white shadow-sm'
                      : 'bg-[#202c33] border-[#2a3942] text-[#8696a0] hover:text-white'
                  }`}
                >
                  Metered.ca (Free 50GB/mo)
                </button>
                <button
                  type="button"
                  onClick={() => setRelayProvider('custom')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    relayProvider === 'custom'
                      ? 'bg-[#00a884]/20 border-[#00a884] text-white shadow-sm'
                      : 'bg-[#202c33] border-[#2a3942] text-[#8696a0] hover:text-white'
                  }`}
                >
                  Custom Standard TURN
                </button>
              </div>

              {/* Setup Form */}
              <form onSubmit={handleSaveRelayConfig} className="space-y-3.5">
                {relayProvider === 'metered' ? (
                  <>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-white">
                        Metered Account Setup (Free Tier)
                      </label>
                      <a
                        href="https://metered.ca"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-[#00a884] hover:underline flex items-center gap-1 font-semibold"
                      >
                        <span>Open Metered.ca (Free Account)</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <span className="text-[11px] text-[#8696a0] block mb-1">
                          Metered Domain (e.g. <code className="text-emerald-400">your-app.metered.live</code>)
                        </span>
                        <input
                          type="text"
                          value={meteredDomain}
                          onChange={(e) => setMeteredDomain(e.target.value)}
                          onBlur={() => {
                            let dom = meteredDomain.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim();
                            if (dom && !dom.includes('.')) {
                              dom = `${dom}.metered.live`;
                            } else if (dom.endsWith('.metered.ca')) {
                              dom = dom.replace(/\.metered\.ca$/i, '.metered.live');
                            }
                            setMeteredDomain(dom);
                          }}
                          placeholder="e.g. your-app.metered.live"
                          className="w-full px-3.5 py-2 rounded-xl bg-[#202c33] border border-[#2a3942] text-white text-xs placeholder:text-slate-500 focus:outline-hidden focus:border-[#00a884]"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] text-[#8696a0]">
                            TURN API Key (From your TURN Server app dashboard)
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="text-[11px] text-[#00a884] hover:text-[#25d366] flex items-center gap-1 cursor-pointer"
                          >
                            {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            <span>{showApiKey ? 'Hide' : 'Show Key'}</span>
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            type={showApiKey ? 'text' : 'password'}
                            value={meteredApiKey}
                            onChange={(e) => setMeteredApiKey(e.target.value)}
                            onBlur={() => {
                              const clean = meteredApiKey.trim().replace(/^apiKey=/i, '').replace(/^["']|["']$/g, '').trim();
                              setMeteredApiKey(clean);
                            }}
                            placeholder="Paste your Metered TURN API key"
                            className="w-full px-3.5 py-2 rounded-xl bg-[#202c33] border border-[#2a3942] text-white text-xs placeholder:text-slate-500 focus:outline-hidden focus:border-[#00a884]"
                          />
                        </div>
                      </div>

                      {/* 401 Helper Callout */}
                      <div className="p-3 rounded-xl bg-[#202c33]/70 border border-[#2a3942] text-[11px] text-slate-300 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>How to avoid Error 401 (Invalid API Key):</span>
                        </div>
                        <ol className="list-decimal list-inside space-y-1 text-[#8696a0] pl-0.5 leading-relaxed">
                          <li>
                            On <strong className="text-white">Metered.ca</strong>, click on your <strong className="text-emerald-400">TURN Server</strong> app (not a Video Room app).
                          </li>
                          <li>
                            Copy the domain listed under Server Info (e.g. <strong className="text-white">&lt;app-name&gt;.metered.live</strong>).
                          </li>
                          <li>
                            In the same page under <strong className="text-white">API Keys</strong> or <strong className="text-white">Credentials</strong>, copy the generated API Key. (Do not paste your Metered account login password or a video room key).
                          </li>
                        </ol>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <div>
                        <span className="text-[11px] text-[#8696a0] block mb-1">
                          TURN URL (e.g. <code className="text-rose-400">turn:turn.myhost.com:3478</code>)
                        </span>
                        <input
                          type="text"
                          value={turnUrl}
                          onChange={(e) => setTurnUrl(e.target.value)}
                          placeholder="turn:turn.yourhost.com:3478"
                          className="w-full px-3.5 py-2 rounded-xl bg-[#202c33] border border-[#2a3942] text-white text-xs placeholder:text-slate-500 focus:outline-hidden focus:border-[#00a884]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[11px] text-[#8696a0] block mb-1">Username</span>
                          <input
                            type="text"
                            value={turnUsername}
                            onChange={(e) => setTurnUsername(e.target.value)}
                            placeholder="Username"
                            className="w-full px-3.5 py-2 rounded-xl bg-[#202c33] border border-[#2a3942] text-white text-xs placeholder:text-slate-500 focus:outline-hidden focus:border-[#00a884]"
                          />
                        </div>
                        <div>
                          <span className="text-[11px] text-[#8696a0] block mb-1">Password / Credential</span>
                          <input
                            type="password"
                            value={turnCredential}
                            onChange={(e) => setTurnCredential(e.target.value)}
                            placeholder="Password"
                            className="w-full px-3.5 py-2 rounded-xl bg-[#202c33] border border-[#2a3942] text-white text-xs placeholder:text-slate-500 focus:outline-hidden focus:border-[#00a884]"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {relayErrorMsg && (
                  <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-xs text-rose-300">
                    {relayErrorMsg}
                  </div>
                )}

                {relaySuccessMsg && (
                  <div className="p-3 rounded-xl bg-[#00a884]/20 border border-[#00a884]/40 text-xs text-[#25d366] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{relaySuccessMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSavingRelay}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#00a884] hover:bg-[#02906f] active:bg-[#007a5e] text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-[#00a884]/20"
                >
                  <Key className={`w-3.5 h-3.5 ${isSavingRelay ? 'animate-spin' : ''}`} />
                  <span>
                    {isSavingRelay ? 'Verifying & Activating Relay...' : 'Verify & Activate for Sanctuary'}
                  </span>
                </button>
              </form>
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
