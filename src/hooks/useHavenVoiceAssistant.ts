import { useState, useEffect, useRef, useCallback } from 'react';
import { playVoiceWakeChime, playVoiceSuccessChime } from '../utils/sounds';

export interface VoiceCommandAction {
  type: 'play_music' | 'play_video' | 'pause' | 'resume' | 'next' | 'previous' | 'volume_up' | 'volume_down' | 'mute' | 'unmute' | 'search';
  query?: string;
  rawText: string;
}

export interface UseHavenVoiceAssistantOptions {
  context: 'music' | 'watch' | 'global';
  onPlayQuery?: (query: string, rawText: string) => void | Promise<void>;
  onPlayVideoQuery?: (query: string, rawText: string) => void | Promise<void>;
  onPause?: () => void;
  onResume?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onVolumeUp?: () => void;
  onVolumeDown?: () => void;
  onMute?: () => void;
  onUnmute?: () => void;
  enableSpeechFeedback?: boolean;
}

/**
 * Text-to-speech assistant feedback helper (Alexa/Siri style voice)
 */
export function speakAssistantFeedback(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.02;
    utterance.pitch = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const friendlyVoice = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Natural') ||
          v.name.includes('Google') ||
          v.name.includes('Samantha') ||
          v.name.includes('Siri') ||
          v.name.includes('Karen') ||
          v.name.includes('Alex'))
    );
    if (friendlyVoice) {
      utterance.voice = friendlyVoice;
    }
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
  }
}

export function useHavenVoiceAssistant(options: UseHavenVoiceAssistantOptions) {
  const {
    context,
    onPlayQuery,
    onPlayVideoQuery,
    onPause,
    onResume,
    onNext,
    onPrevious,
    onVolumeUp,
    onVolumeDown,
    onMute,
    onUnmute,
    enableSpeechFeedback = true,
  } = options;

  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isHandsFree, setIsHandsFree] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [lastActionMessage, setLastActionMessage] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const recognitionRef = useRef<any>(null);
  const restartTimerRef = useRef<any>(null);
  const clearNoticeTimerRef = useRef<any>(null);
  const actionCooldownRef = useRef<number>(0);

  // Check speech recognition support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setIsSupported(Boolean(SpeechClass));
    }
  }, []);

  const announce = useCallback(
    (msg: string) => {
      setLastActionMessage(msg);
      if (clearNoticeTimerRef.current) clearTimeout(clearNoticeTimerRef.current);
      clearNoticeTimerRef.current = setTimeout(() => {
        setLastActionMessage(null);
      }, 5000);

      if (enableSpeechFeedback) {
        setIsSpeaking(true);
        speakAssistantFeedback(msg);
        setTimeout(() => setIsSpeaking(false), 2500);
      }
    },
    [enableSpeechFeedback]
  );

  // Command parser
  const parseAndExecuteCommand = useCallback(
    async (text: string) => {
      const clean = text.toLowerCase().trim();
      if (!clean) return false;

      const now = Date.now();
      if (now - actionCooldownRef.current < 800) {
        return false;
      }

      // Wake words: "haven", "hey haven", "ok haven", "alexa"
      // Also match direct command if mic was manually tapped
      const hasWakeWord =
        clean.startsWith('haven') ||
        clean.startsWith('hey haven') ||
        clean.startsWith('ok haven') ||
        clean.startsWith('okay haven') ||
        clean.startsWith('hi haven') ||
        clean.startsWith('alexa');

      // Strip wake word prefix to inspect command
      let command = clean
        .replace(/^(hey|ok|okay|hi)\s+haven[,.\s]*/i, '')
        .replace(/^haven[,.\s]*/i, '')
        .replace(/^alexa[,.\s]*/i, '')
        .trim();

      // If neither wake word nor standard command prefix is present, allow direct query if currently in push-to-talk mode
      if (!hasWakeWord && !command.startsWith('play') && !command.startsWith('watch') && !command.startsWith('pause') && !command.startsWith('stop') && !command.startsWith('next')) {
        // If it's a direct song name said when clicking mic (e.g. "bien")
        if (!isHandsFree && command.length > 1) {
          command = `play ${command}`;
        } else {
          return false;
        }
      }

      actionCooldownRef.current = now;
      playVoiceWakeChime();

      // 1. Play Video commands (e.g. "Haven watch bien", "Haven play video bien")
      const watchMatch = command.match(/^(?:watch|play\s+video|stream)\s+(.+)/i);
      if (watchMatch) {
        const query = watchMatch[1].replace(/^(the\s+video|song|movie)\s+/i, '').trim();
        if (query) {
          playVoiceSuccessChime();
          announce(`Playing ${query} on Watch Party`);
          if (onPlayVideoQuery) {
            await onPlayVideoQuery(query, clean);
          } else if (onPlayQuery) {
            await onPlayQuery(query, clean);
          }
          return true;
        }
      }

      // 2. Play Music commands (e.g. "Haven play bien", "Haven play song bien", "Play bien")
      const playMatch = command.match(/^play\s+(.+)/i);
      if (playMatch) {
        const query = playMatch[1].replace(/^(the\s+song|track|music|artist|video)\s+/i, '').trim();
        if (query) {
          playVoiceSuccessChime();
          if (context === 'watch') {
            announce(`Playing ${query} on Watch Party`);
            if (onPlayVideoQuery) {
              await onPlayVideoQuery(query, clean);
            } else if (onPlayQuery) {
              await onPlayQuery(query, clean);
            }
          } else {
            announce(`Playing ${query} on Music Lounge`);
            if (onPlayQuery) {
              await onPlayQuery(query, clean);
            }
          }
          return true;
        }
      }

      // 3. Pause / Stop
      if (/^(pause|stop|halt|freeze|quiet)$/i.test(command) || command.includes('pause the music') || command.includes('pause movie')) {
        playVoiceSuccessChime();
        announce('Playback paused');
        onPause?.();
        return true;
      }

      // 4. Resume / Play / Continue
      if (/^(resume|continue|unpause)$/i.test(command) || /^play$/i.test(command)) {
        playVoiceSuccessChime();
        announce('Resuming playback');
        onResume?.();
        return true;
      }

      // 5. Next track / Skip
      if (/^(next|skip|next\s+track|next\s+song|next\s+video)$/i.test(command)) {
        playVoiceSuccessChime();
        announce('Skipping to next');
        onNext?.();
        return true;
      }

      // 6. Previous
      if (/^(previous|back|prev|prev\s+song|previous\s+song)$/i.test(command)) {
        playVoiceSuccessChime();
        announce('Going back');
        onPrevious?.();
        return true;
      }

      // 7. Volume Up / Louder
      if (/^(volume\s+up|louder|turn\s+it\s+up|turn\s+up)$/i.test(command)) {
        playVoiceSuccessChime();
        announce('Volume up');
        onVolumeUp?.();
        return true;
      }

      // 8. Volume Down / Softer
      if (/^(volume\s+down|quieter|softer|turn\s+it\s+down|turn\s+down)$/i.test(command)) {
        playVoiceSuccessChime();
        announce('Volume down');
        onVolumeDown?.();
        return true;
      }

      // 9. Mute
      if (/^(mute|silence)$/i.test(command)) {
        playVoiceSuccessChime();
        announce('Muted');
        onMute?.();
        return true;
      }

      // 10. Unmute
      if (/^(unmute|sound\s+on)$/i.test(command)) {
        playVoiceSuccessChime();
        announce('Unmuted');
        onUnmute?.();
        return true;
      }

      return false;
    },
    [
      isHandsFree,
      announce,
      context,
      onPlayQuery,
      onPlayVideoQuery,
      onPause,
      onResume,
      onNext,
      onPrevious,
      onVolumeUp,
      onVolumeDown,
      onMute,
      onUnmute,
    ]
  );

  // Initialize Speech Recognition instance
  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SpeechClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechClass) {
      setErrorNotice('Voice recognition is not supported in this browser. Try Chrome, Edge, or Safari.');
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 3;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorNotice(null);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let currentInterim = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            finalTranscript += res[0].transcript;
          } else {
            currentInterim += res[0].transcript;
          }
        }

        if (currentInterim) {
          setInterimTranscript(currentInterim);
        }

        if (finalTranscript) {
          const trimmed = finalTranscript.trim();
          setTranscript(trimmed);
          setInterimTranscript('');
          parseAndExecuteCommand(trimmed);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') {
          // Normal timeout waiting for speech
          return;
        }
        if (event.error === 'not-allowed') {
          setErrorNotice('Microphone access denied. Please allow microphone permission in browser settings.');
          setIsListening(false);
          setIsHandsFree(false);
          return;
        }
        console.warn('Speech recognition warning:', event.error);
      };

      recognition.onend = () => {
        setIsListening(false);
        // If hands-free mode is active, restart listener smoothly
        if (isHandsFree) {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            try {
              recognition.start();
            } catch {}
          }, 400);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn('Error starting speech recognition:', err);
      setErrorNotice('Could not start microphone listener. Tap mic to retry.');
      setIsListening(false);
    }
  }, [isHandsFree, parseAndExecuteCommand]);

  const stopListening = useCallback(() => {
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    setIsHandsFree(false);
    setInterimTranscript('');
  }, []);

  const toggleHandsFree = useCallback(() => {
    if (isHandsFree) {
      setIsHandsFree(false);
      stopListening();
    } else {
      setIsHandsFree(true);
      startListening();
      playVoiceWakeChime();
      announce("Haven Voice active. Try saying: 'Haven play Bien'");
    }
  }, [isHandsFree, startListening, stopListening, announce]);

  const triggerPushToTalk = useCallback(() => {
    if (isListening && !isHandsFree) {
      stopListening();
    } else {
      startListening();
      playVoiceWakeChime();
    }
  }, [isListening, isHandsFree, startListening, stopListening]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (clearNoticeTimerRef.current) clearTimeout(clearNoticeTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    isHandsFree,
    transcript,
    interimTranscript,
    lastActionMessage,
    errorNotice,
    isSpeaking,
    startListening,
    stopListening,
    toggleHandsFree,
    triggerPushToTalk,
    parseAndExecuteCommand,
    clearNotice: () => setLastActionMessage(null),
  };
}
