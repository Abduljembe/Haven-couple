import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  Radio,
  Music,
  Tv,
  X,
  HelpCircle,
  CheckCircle2,
  Command,
} from 'lucide-react';

interface HavenVoiceControlProps {
  isListening: boolean;
  isHandsFree: boolean;
  transcript: string;
  interimTranscript: string;
  lastActionMessage: string | null;
  errorNotice: string | null;
  isSpeaking: boolean;
  isSupported: boolean;
  onToggleHandsFree: () => void;
  onTriggerPushToTalk: () => void;
  onQuickCommand?: (cmd: string) => void;
  context: 'music' | 'watch' | 'global';
  className?: string;
  variant?: 'banner' | 'pill' | 'embedded';
}

export const HavenVoiceControl: React.FC<HavenVoiceControlProps> = ({
  isListening,
  isHandsFree,
  transcript,
  interimTranscript,
  lastActionMessage,
  errorNotice,
  isSpeaking,
  isSupported,
  onToggleHandsFree,
  onTriggerPushToTalk,
  onQuickCommand,
  context,
  className = '',
  variant = 'banner',
}) => {
  const [showHelp, setShowHelp] = useState(false);

  const sampleCommands =
    context === 'watch'
      ? [
          'Haven play Bien',
          'Haven watch Bien',
          'Haven pause',
          'Haven resume',
          'Haven next video',
          'Haven volume up',
        ]
      : [
          'Haven play Bien',
          'Haven play Sunflower',
          'Haven pause',
          'Haven resume',
          'Haven next track',
          'Haven volume up',
        ];

  if (!isSupported) {
    return (
      <div className={`p-2.5 rounded-xl bg-stone-900/60 border border-stone-800 text-xs text-stone-400 flex items-center justify-between gap-2 ${className}`}>
        <div className="flex items-center gap-2">
          <MicOff className="w-4 h-4 text-stone-500" />
          <span>Voice recognition requires Chrome, Edge, or Safari.</span>
        </div>
      </div>
    );
  }

  // Pill variant (compact button for headers)
  if (variant === 'pill') {
    return (
      <div className={`relative inline-flex items-center gap-1.5 ${className}`}>
        <button
          type="button"
          onClick={onTriggerPushToTalk}
          className={`relative px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 border shadow-sm active:scale-95 ${
            isListening
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-rose-500/20 animate-pulse'
              : 'bg-stone-900/90 text-stone-300 border-stone-800 hover:border-stone-700 hover:text-white'
          }`}
          title={isListening ? 'Listening... Tap to mute mic' : "Tap to speak: 'Haven play Bien'"}
        >
          {isListening ? (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
          ) : (
            <Mic className="w-3.5 h-3.5 text-rose-400" />
          )}
          <span>{isListening ? 'Haven Listening...' : 'Voice: Haven'}</span>
        </button>

        {lastActionMessage && (
          <div className="absolute top-full mt-1.5 left-0 z-50 bg-stone-900/95 border border-emerald-500/40 text-emerald-300 px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shadow-xl flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>{lastActionMessage}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${
        isListening
          ? 'bg-gradient-to-r from-stone-950 via-rose-950/20 to-stone-950 border-rose-500/40 shadow-lg shadow-rose-950/30'
          : 'bg-stone-900/60 border-stone-800/80 hover:border-stone-700/80'
      } ${className}`}
    >
      {/* Alexa Glow Accent Line on Top */}
      <div
        className={`h-1 w-full transition-all duration-500 ${
          isListening
            ? 'bg-gradient-to-r from-cyan-400 via-rose-500 to-amber-400 animate-pulse'
            : isHandsFree
            ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600'
            : 'bg-stone-800'
        }`}
      />

      <div className="p-3.5 sm:p-4 space-y-3">
        {/* Header Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                isListening
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40 scale-105'
                  : 'bg-stone-800 text-rose-400 border border-stone-700'
              }`}
            >
              <Mic className={`w-4 h-4 ${isListening ? 'animate-bounce' : ''}`} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
                  <span>Haven Alexa Voice</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Live
                  </span>
                </span>
                {isHandsFree && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Hands-Free Always
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-400">
                {isListening
                  ? "Listening... Speak naturally (e.g. 'Haven play Bien')"
                  : isHandsFree
                  ? "Listening for wake word 'Haven...'"
                  : "Say 'Haven play Bien' or tap mic to command"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Hands-Free Toggle */}
            <button
              type="button"
              onClick={onToggleHandsFree}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition border flex items-center gap-1.5 ${
                isHandsFree
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-700'
              }`}
              title={
                isHandsFree
                  ? "Hands-free is ON. Say 'Haven play Bien' anytime!"
                  : "Turn on hands-free wake word listening"
              }
            >
              <Radio className={`w-3.5 h-3.5 ${isHandsFree ? 'text-emerald-400 animate-pulse' : 'text-stone-400'}`} />
              <span className="hidden sm:inline">{isHandsFree ? 'Wake Word ON' : 'Hands-Free'}</span>
            </button>

            {/* Mic Push-to-Talk Button */}
            <button
              type="button"
              onClick={onTriggerPushToTalk}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md active:scale-95 ${
                isListening
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                  : 'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-amber-900/20'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>{isListening ? 'Stop' : 'Tap to Speak'}</span>
            </button>

            {/* Help Toggle */}
            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className="p-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-stone-200 transition"
              title="View voice commands"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Real-time Voice Transcript & Feedback HUD */}
        {(isListening || transcript || interimTranscript || lastActionMessage || isSpeaking) && (
          <div className="p-3 rounded-xl bg-stone-950/80 border border-stone-800 space-y-2 animate-in fade-in">
            {/* Live Audio Visualizer Bars */}
            {isListening && (
              <div className="flex items-center justify-center gap-1 py-1">
                {[40, 75, 100, 60, 90, 45, 80, 100, 50, 70, 95, 30].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 bg-gradient-to-t from-rose-500 to-amber-400 rounded-full animate-pulse"
                    style={{
                      height: `${Math.max(6, (h / 100) * 20)}px`,
                      animationDelay: `${i * 70}ms`,
                      animationDuration: '650ms',
                    }}
                  />
                ))}
              </div>
            )}

            {/* Live Transcript */}
            {(transcript || interimTranscript) && (
              <div className="flex items-start gap-2 text-xs">
                <span className="text-stone-500 font-semibold shrink-0">Heard:</span>
                <span className="text-white font-medium italic">
                  "{transcript || interimTranscript}"
                </span>
              </div>
            )}

            {/* Action Confirmation Banner */}
            {lastActionMessage && (
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{lastActionMessage}</span>
              </div>
            )}

            {/* Alexa Voice Reply Indicator */}
            {isSpeaking && (
              <div className="flex items-center gap-2 text-[11px] text-amber-300">
                <Volume2 className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>Haven is speaking...</span>
              </div>
            )}
          </div>
        )}

        {/* Error Notice */}
        {errorNotice && (
          <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-800/50 text-xs text-rose-300 flex items-center justify-between gap-2">
            <span>{errorNotice}</span>
            <button
              onClick={() => onTriggerPushToTalk()}
              className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[11px]"
            >
              Retry
            </button>
          </div>
        )}

        {/* Quick Command Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Try Saying:
          </span>
          {sampleCommands.map((cmd) => (
            <button
              key={cmd}
              type="button"
              onClick={() => onQuickCommand?.(cmd)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-800/80 hover:bg-stone-700/90 text-stone-300 hover:text-white border border-stone-700/60 transition active:scale-95 flex items-center gap-1.5"
            >
              <Command className="w-2.5 h-2.5 text-rose-400" />
              <span>"{cmd}"</span>
            </button>
          ))}
        </div>

        {/* Help Expanded Box */}
        {showHelp && (
          <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 space-y-2.5 text-xs text-stone-300 animate-in slide-in-from-top-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Command className="w-4 h-4 text-amber-400" />
                Voice Recognition Guide (Alexa Style)
              </span>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="text-stone-500 hover:text-stone-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-stone-400 text-[11px] leading-relaxed">
              Just like Amazon Alexa, say <strong>"Haven"</strong> followed by your command from anywhere across the room.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-lg bg-stone-900 border border-stone-800 space-y-1">
                <div className="font-semibold text-rose-300">Play Any Song or Video</div>
                <div className="text-stone-400">• "Haven play Bien"</div>
                <div className="text-stone-400">• "Haven watch Bien"</div>
                <div className="text-stone-400">• "Haven play lofi chill beats"</div>
              </div>
              <div className="p-2 rounded-lg bg-stone-900 border border-stone-800 space-y-1">
                <div className="font-semibold text-amber-300">Playback Controls</div>
                <div className="text-stone-400">• "Haven pause" / "Haven resume"</div>
                <div className="text-stone-400">• "Haven next" / "Haven skip"</div>
                <div className="text-stone-400">• "Haven volume up" / "Haven mute"</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
