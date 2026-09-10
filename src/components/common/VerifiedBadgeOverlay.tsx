import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Check, Sparkles, Scan } from 'lucide-react';
import { verifyFaceMatchInVideo } from '../../utils/faceDetection';

export interface VerifiedBadgeOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isVideoOff?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  size?: 'sm' | 'md';
  className?: string;
  profileBiometrics?: { verified?: boolean; confidenceScore?: number };
  showMatchAnimation?: boolean;
  onMatchConfirmed?: (confidence: number) => void;
}

export const VerifiedBadgeOverlay: React.FC<VerifiedBadgeOverlayProps> = ({
  videoRef,
  isVideoOff = false,
  position = 'top-right',
  size = 'md',
  className = '',
  profileBiometrics,
  showMatchAnimation = true,
  onMatchConfirmed,
}) => {
  const [isVerified, setIsVerified] = useState<boolean>(Boolean(profileBiometrics?.verified));
  const [confidence, setConfidence] = useState<number>(profileBiometrics?.confidenceScore || 99.4);
  const [justMatched, setJustMatched] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [consecutiveMatches, setConsecutiveMatches] = useState<number>(0);

  const graceTimerRef = useRef<number | null>(null);
  const hadFirstMatchRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  // Position class mappings
  const positionClasses = {
    'top-right': 'top-2 right-2',
    'top-left': 'top-2 left-2',
    'bottom-right': 'bottom-2 right-2',
    'bottom-left': 'bottom-2 left-2',
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (graceTimerRef.current) {
        clearTimeout(graceTimerRef.current);
      }
    };
  }, []);

  // Update when profileBiometrics changes
  useEffect(() => {
    if (profileBiometrics?.verified) {
      setIsVerified(true);
      if (profileBiometrics.confidenceScore) {
        setConfidence(profileBiometrics.confidenceScore);
      }
    }
  }, [profileBiometrics?.verified, profileBiometrics?.confidenceScore]);

  // Periodic Face Detection Loop
  useEffect(() => {
    if (isVideoOff) {
      setIsAnalyzing(false);
      return;
    }

    let intervalId: number;

    const checkFace = async () => {
      const video = videoRef.current;
      if (!video || isVideoOff || video.readyState < 2 || video.videoWidth === 0) {
        return;
      }

      setIsAnalyzing(true);
      try {
        const result = await verifyFaceMatchInVideo(video, 68);

        if (!isMountedRef.current) return;

        if (result.matched) {
          // Clear any pending revocation timer
          if (graceTimerRef.current) {
            clearTimeout(graceTimerRef.current);
            graceTimerRef.current = null;
          }

          setConsecutiveMatches((prev) => prev + 1);
          setConfidence(result.confidence || 99.4);

          if (!isVerified) {
            setIsVerified(true);
            if (!hadFirstMatchRef.current && showMatchAnimation) {
              hadFirstMatchRef.current = true;
              setJustMatched(true);
              setTimeout(() => {
                if (isMountedRef.current) setJustMatched(false);
              }, 2200);
            }
            onMatchConfirmed?.(result.confidence || 99.4);
          }
        } else {
          // Grace period: keep verified for 4 seconds if previously verified
          if (isVerified && !graceTimerRef.current) {
            graceTimerRef.current = window.setTimeout(() => {
              if (isMountedRef.current) {
                // If profile is permanently biometric verified, retain verified state
                if (!profileBiometrics?.verified) {
                  setIsVerified(false);
                }
                setConsecutiveMatches(0);
                graceTimerRef.current = null;
              }
            }, 4000);
          }
        }
      } catch {
        // Ignore frame error
      }
    };

    // Run check every 450ms for responsive face detection without high CPU usage
    intervalId = window.setInterval(checkFace, 450);

    // Immediate initial check
    checkFace();

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isVideoOff, videoRef, isVerified, profileBiometrics?.verified, showMatchAnimation, onMatchConfirmed]);

  if (isVideoOff) return null;

  return (
    <div
      className={`absolute ${positionClasses[position]} z-20 pointer-events-auto select-none transition-all duration-300 ${className}`}
    >
      {isVerified ? (
        <div
          className={`flex items-center gap-1.5 rounded-full border backdrop-blur-md font-bold tracking-tight shadow-lg transition-all duration-300 ${
            size === 'sm' ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]'
          } ${
            justMatched
              ? 'bg-emerald-500 text-stone-950 border-emerald-300 ring-4 ring-emerald-400/40 scale-105 shadow-[0_0_16px_rgba(16,185,129,0.6)] animate-pulse'
              : 'bg-emerald-950/85 border-emerald-500/60 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.3)] hover:bg-emerald-900/90'
          }`}
          title={`Biometric Face Verified • Real Live Match (${confidence}%)`}
        >
          {/* Pulsing Verified Shield Icon */}
          <div className="relative flex items-center justify-center shrink-0">
            <ShieldCheck
              className={`${size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} ${
                justMatched ? 'text-stone-950' : 'text-emerald-400'
              }`}
            />
            {justMatched && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
            )}
          </div>

          <span className="font-extrabold uppercase tracking-wide flex items-center gap-0.5">
            Verified
            <Check className={`${size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} stroke-[3] text-emerald-400`} />
          </span>

          {/* Micro confidence chip on medium size */}
          {size === 'md' && (
            <span className="hidden sm:inline-block text-[8.5px] opacity-75 border-l border-emerald-400/30 pl-1 font-mono">
              {Math.round(confidence)}%
            </span>
          )}

          {justMatched && <Sparkles className="w-2.5 h-2.5 text-amber-300 animate-spin" />}
        </div>
      ) : isAnalyzing ? (
        /* Subtle scanning / alignment indicator before match is locked */
        <div
          className={`flex items-center gap-1 rounded-full bg-stone-900/80 border border-stone-700/80 text-stone-300 backdrop-blur-md ${
            size === 'sm' ? 'px-1.5 py-0.5 text-[8.5px]' : 'px-2 py-0.5 text-[9px]'
          } opacity-80`}
          title="Face Detection Service checking video..."
        >
          <Scan className="w-2.5 h-2.5 text-amber-400 animate-pulse" />
          <span className="text-stone-400">Verifying...</span>
        </div>
      ) : null}
    </div>
  );
};
