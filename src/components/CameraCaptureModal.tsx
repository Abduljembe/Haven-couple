import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  RotateCcw,
  FlipHorizontal,
  X,
  Send,
  Sparkles,
  AlertCircle,
  Timer,
  CheckCircle2,
} from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (fileData: { buffer: ArrayBuffer; mimeType: string; fileName: string; caption?: string }) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [caption, setCaption] = useState('');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [timerSetting, setTimerSetting] = useState<0 | 3>(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturingAnimation, setIsCapturingAnimation] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const activeFacingModeRef = useRef<'user' | 'environment'>(facingMode);
  activeFacingModeRef.current = facingMode;

  // Stop camera tracks cleanly
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  // Start Camera stream cleanly without triggering re-render loops
  const startCameraStream = useCallback(async (facing: 'user' | 'environment') => {
    setCameraError(null);
    setIsCameraReady(false);

    // Stop existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera device is not supported on this browser/platform.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = mediaStream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current
            ?.play()
            .then(() => setIsCameraReady(true))
            .catch(() => setIsCameraReady(true));
        };
      }
    } catch (err: unknown) {
      console.error('Camera stream access error:', err);
      // Try relaxed constraint fallback if facingMode is not supported
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        streamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current
              ?.play()
              .then(() => setIsCameraReady(true))
              .catch(() => setIsCameraReady(true));
          };
        }
      } catch (fallbackErr: unknown) {
        const errMsg = fallbackErr instanceof Error ? fallbackErr.message : 'Could not access camera';
        setCameraError(errMsg);
        setIsCameraReady(false);
      }
    }
  }, []);

  // Open/Close and Switch Facing Mode lifecycle
  useEffect(() => {
    if (isOpen) {
      setCapturedPhotoUrl(null);
      setCapturedBlob(null);
      setCaption('');
      setCountdown(null);
      startCameraStream(facingMode);
    } else {
      stopCameraStream();
    }

    return () => {
      stopCameraStream();
    };
  }, [isOpen, facingMode, startCameraStream, stopCameraStream]);

  // Trigger Snapshot smoothly without frame tear or camera flicker
  const takeSnapshot = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    // Smooth soft shutter animation (shutter aperture pulse)
    setIsCapturingAnimation(true);
    setTimeout(() => setIsCapturingAnimation(false), 240);

    const canvas = canvasRef.current || document.createElement('canvas');
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Flip horizontal if front-facing camera for natural mirrored preview
    if (activeFacingModeRef.current === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);

    // Instant smooth freeze into Data URL/Blob to eliminate black screen flicker
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedPhotoUrl(dataUrl);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
          // Safely stop stream tracks in background now that photo is frozen
          stopCameraStream();
        }
      },
      'image/jpeg',
      0.92
    );
  }, [stopCameraStream]);

  // Handle Shutter click (with optional countdown)
  const handleShutterClick = () => {
    if (timerSetting === 0) {
      takeSnapshot();
    } else {
      setCountdown(timerSetting);
      let count = timerSetting;
      countdownIntervalRef.current = window.setInterval(() => {
        count -= 1;
        if (count <= 0) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          setCountdown(null);
          takeSnapshot();
        } else {
          setCountdown(count);
        }
      }, 1000);
    }
  };

  // Flip between front and rear cameras smoothly
  const handleFlipCamera = () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
  };

  // Retake photo smoothly
  const handleRetake = () => {
    setCapturedPhotoUrl(null);
    setCapturedBlob(null);
    setCaption('');
    setCountdown(null);
    startCameraStream(facingMode);
  };

  // Send Encrypted Photo
  const handleSendPhoto = async () => {
    if (!capturedBlob) return;

    try {
      const buffer = await capturedBlob.arrayBuffer();
      onCapture({
        buffer,
        mimeType: 'image/jpeg',
        fileName: `camera-snap-${Date.now()}.jpg`,
        caption: caption.trim() || undefined,
      });

      stopCameraStream();
      onClose();
    } catch (err) {
      console.error('Error processing captured photo buffer:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in">
      <div
        id="camera-capture-modal"
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
      >
        {/* Hidden Canvas for capture rendering */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-900/95 border-b border-slate-800/80 z-20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Camera Snap</h3>
              <p className="text-[11px] text-slate-400">Encrypted binary capture</p>
            </div>
          </div>

          <button
            id="btn-close-camera-modal"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder / Preview Stage */}
        <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center min-h-[340px] sm:min-h-[420px]">
          {/* Smooth Shutter Snap Animation */}
          {isCapturingAnimation && (
            <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center">
              <div className="absolute inset-0 bg-white/40 backdrop-blur-xs animate-out fade-out duration-200" />
              <div className="w-24 h-24 rounded-full border-4 border-white/80 animate-ping" />
            </div>
          )}

          {/* Countdown Indicator */}
          {countdown !== null && (
            <div className="absolute z-30 flex items-center justify-center inset-0 bg-black/40 backdrop-blur-xs">
              <span className="text-7xl sm:text-8xl font-black text-white drop-shadow-lg animate-scale-in">
                {countdown}
              </span>
            </div>
          )}

          {cameraError ? (
            /* Error Fallback */
            <div className="p-6 text-center text-slate-300 max-w-xs">
              <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
              <p className="text-sm font-semibold mb-1">Camera Unavailable</p>
              <p className="text-xs text-slate-400 mb-4">{cameraError}</p>
              <button
                onClick={() => startCameraStream(facingMode)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                Retry Camera
              </button>
            </div>
          ) : capturedPhotoUrl ? (
            /* Captured Snapshot Preview (Instant Smooth Freeze) */
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <img
                src={capturedPhotoUrl}
                alt="Captured Snapshot"
                className="max-h-[60vh] w-full object-contain"
              />
              <div className="absolute top-3 left-3 px-2.5 py-1 bg-rose-500/90 backdrop-blur-md rounded-lg text-white text-[11px] font-medium flex items-center gap-1.5 shadow-md">
                <Sparkles className="w-3 h-3" />
                <span>Captured Snapshot</span>
              </div>
            </div>
          ) : (
            /* Live Camera Feed */
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover max-h-[60vh] transition-opacity duration-300 ${
                  isCameraReady ? 'opacity-100' : 'opacity-0'
                } ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />

              {!isCameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                  <div className="flex flex-col items-center gap-2 text-slate-400 text-xs">
                    <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                    <span>Starting camera...</span>
                  </div>
                </div>
              )}

              {/* Viewfinder corner guidelines */}
              <div className="absolute inset-6 border border-white/20 rounded-2xl pointer-events-none flex flex-col justify-between p-2">
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-t-2 border-l-2 border-rose-400 rounded-tl" />
                  <div className="w-4 h-4 border-t-2 border-r-2 border-rose-400 rounded-tr" />
                </div>
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-b-2 border-l-2 border-rose-400 rounded-bl" />
                  <div className="w-4 h-4 border-b-2 border-r-2 border-rose-400 rounded-br" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Controls / Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 z-20">
          {capturedPhotoUrl ? (
            /* Controls for Captured Photo */
            <div className="space-y-3">
              <input
                id="input-camera-caption"
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a loving note (optional)..."
                className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              />

              <div className="flex items-center gap-3">
                <button
                  id="btn-retake-photo"
                  type="button"
                  onClick={handleRetake}
                  className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Retake</span>
                </button>

                <button
                  id="btn-send-captured-photo"
                  type="button"
                  onClick={handleSendPhoto}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-rose-500/20 active:scale-98 transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Encrypted Photo</span>
                </button>
              </div>
            </div>
          ) : (
            /* Live Camera Controls */
            <div className="flex items-center justify-between px-4 sm:px-8">
              {/* Timer Toggle */}
              <button
                id="btn-toggle-camera-timer"
                type="button"
                onClick={() => setTimerSetting((prev) => (prev === 0 ? 3 : 0))}
                className={`p-3 rounded-full transition-colors cursor-pointer ${
                  timerSetting === 3
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title={timerSetting === 3 ? '3s Timer active' : 'Timer off'}
              >
                <div className="relative">
                  <Timer className="w-5 h-5" />
                  {timerSetting === 3 && (
                    <span className="absolute -top-1 -right-1 text-[9px] font-black bg-rose-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center">
                      3
                    </span>
                  )}
                </div>
              </button>

              {/* Shutter Button */}
              <button
                id="btn-shutter-capture"
                type="button"
                onClick={handleShutterClick}
                disabled={!!cameraError || countdown !== null || !isCameraReady}
                className="w-16 h-16 rounded-full border-4 border-white p-1 flex items-center justify-center group active:scale-95 transition-transform disabled:opacity-50 cursor-pointer shadow-lg shadow-rose-500/10"
                title="Capture Photo"
              >
                <div className="w-full h-full rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 group-hover:from-rose-400 group-hover:to-pink-400 transition-colors" />
              </button>

              {/* Flip Camera Button */}
              <button
                id="btn-flip-camera"
                type="button"
                onClick={handleFlipCamera}
                disabled={!!cameraError || !isCameraReady}
                className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer disabled:opacity-50"
                title="Switch Camera (Front/Rear)"
              >
                <FlipHorizontal className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
