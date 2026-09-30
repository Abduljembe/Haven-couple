import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  QrCode,
  Camera,
  Copy,
  Check,
  Share2,
  Download,
  Key,
  ShieldCheck,
  Sparkles,
  Zap,
  RefreshCw,
  Eye,
  EyeOff,
  Upload,
  AlertCircle,
} from 'lucide-react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { SpaceType } from '../types';

interface QRCodePairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  passkey: string;
  spaceType?: SpaceType;
  spaceName?: string;
  onJoinScannedSpace?: (scannedRoomId: string, scannedPasskey: string, spaceType?: SpaceType) => void;
  initialMode?: 'show' | 'scan';
}

export const QRCodePairingModal: React.FC<QRCodePairingModalProps> = ({
  isOpen,
  onClose,
  roomId,
  passkey,
  spaceType = 'couple',
  spaceName,
  onJoinScannedSpace,
  initialMode = 'show',
}) => {
  const [activeTab, setActiveTab] = useState<'show' | 'scan'>(initialMode);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [showPasskey, setShowPasskey] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanAnimationRef = useRef<number | null>(null);

  // Generate 1-Click Magic Pairing URL
  const magicPairingUrl = (() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const params = new URLSearchParams();
    params.set('room', roomId);
    params.set('key', passkey);
    params.set('type', spaceType);
    if (spaceName) params.set('name', spaceName);
    return `${origin}/?${params.toString()}`;
  })();

  // Generate high-resolution QR Code data URL
  useEffect(() => {
    if (!isOpen) return;
    QRCode.toDataURL(magicPairingUrl, {
      width: 480,
      margin: 2,
      color: {
        dark: spaceType === 'friends' ? '#0f172a' : '#881337',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate pairing QR code:', err));
  }, [isOpen, magicPairingUrl, spaceType]);

  // Copy Magic URL
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(magicPairingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Download QR Code Image
  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `haven-${roomId}-qr-pairing.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Native Web Share
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${spaceName || 'Haven Private Space'}`,
          text: `Scan or click this magic link to join our private encrypted space on Haven!`,
          url: magicPairingUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      handleCopy();
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (scanAnimationRef.current) {
      cancelAnimationFrame(scanAnimationRef.current);
      scanAnimationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  // Process scanned text (URL or JSON)
  const handleDecodedText = (text: string) => {
    try {
      let targetRoom = '';
      let targetKey = '';
      let targetType: SpaceType = 'couple';

      if (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('/')) {
        const url = new URL(text, window.location.origin);
        targetRoom = url.searchParams.get('room') || url.searchParams.get('join') || '';
        targetKey = url.searchParams.get('key') || url.searchParams.get('passkey') || '';
        const t = url.searchParams.get('type');
        if (t === 'friends' || t === 'couple') targetType = t;
      } else if (text.startsWith('{')) {
        const parsed = JSON.parse(text);
        targetRoom = parsed.roomId || parsed.room || '';
        targetKey = parsed.passkey || parsed.key || '';
        if (parsed.spaceType) targetType = parsed.spaceType;
      } else {
        // Formatted as room:passkey
        const parts = text.split(':');
        if (parts.length >= 2) {
          targetRoom = parts[0].trim();
          targetKey = parts[1].trim();
        }
      }

      if (targetRoom && targetKey) {
        setScanSuccess(`Found Space "${targetRoom}"! Connecting...`);
        stopCamera();

        // Haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate([60, 100, 60]);
        }

        setTimeout(() => {
          if (onJoinScannedSpace) {
            onJoinScannedSpace(targetRoom, targetKey, targetType);
          } else {
            // Default: replace URL and reload or navigate
            const redirectUrl = `/?room=${encodeURIComponent(targetRoom)}&key=${encodeURIComponent(targetKey)}&type=${targetType}`;
            window.location.href = redirectUrl;
          }
          onClose();
        }, 600);
      } else {
        setCameraError('Scanned QR code does not contain a valid Haven space link.');
      }
    } catch {
      setCameraError('Could not parse scanned QR code format.');
    }
  };

  // Start Camera Scanning
  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    setScanSuccess(null);

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsScanning(true);
        requestAnimationFrame(tickScan);
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Camera access denied or unavailable. You can also upload a QR screenshot.');
      setIsScanning(false);
    }
  };

  // QR Scanning Loop using jsQR
  const tickScan = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          handleDecodedText(code.data);
          return;
        }
      }
    }

    scanAnimationRef.current = requestAnimationFrame(tickScan);
  };

  // Handle uploaded image file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            handleDecodedText(code.data);
          } else {
            setCameraError('No valid QR code detected in this uploaded image.');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (isOpen && activeTab === 'scan') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, facingMode]);

  if (!isOpen) return null;

  return (
    <div
      id="modal-qr-pairing"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${spaceType === 'friends' ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600' : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600'}`}>
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Instant QR Pairing</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50">
                  1-Tap Connect
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeTab === 'show' ? 'Pair your partner by showing this code' : 'Point camera to join space instantly'}
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-qr-pairing"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="p-3 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <button
              type="button"
              id="tab-qr-show"
              onClick={() => setActiveTab('show')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'show'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Show My QR</span>
            </button>
            <button
              type="button"
              id="tab-qr-scan"
              onClick={() => setActiveTab('scan')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'scan'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Scan to Join</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Show QR Code */}
        {activeTab === 'show' && (
          <div className="p-5 overflow-y-auto space-y-4 text-center">
            {/* QR Card Container */}
            <div className="relative mx-auto w-64 h-64 bg-white p-3 rounded-3xl border-2 border-dashed border-rose-200 dark:border-rose-900/50 shadow-md flex items-center justify-center group">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Haven Pairing QR Code"
                  className="w-full h-full object-contain rounded-2xl"
                />
              ) : (
                <div className="animate-pulse text-xs text-slate-400">Generating secure pairing code...</div>
              )}
              <div className="absolute inset-0 rounded-3xl border-2 border-rose-400 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Room & Passkey quick pills */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-left space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Space ID:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{roomId}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-rose-500" />
                  <span>Passkey:</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {showPasskey ? passkey : '••••••••'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPasskey(!showPasskey)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title={showPasskey ? 'Hide passkey' : 'Show passkey'}
                  >
                    {showPasskey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions: Copy Link, Share, Download */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                id="btn-qr-copy-link"
                onClick={handleCopy}
                className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-750 flex flex-col items-center gap-1 transition-all cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-rose-500" />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>

              <button
                type="button"
                id="btn-qr-share"
                onClick={handleShare}
                className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-750 flex flex-col items-center gap-1 transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-indigo-500" />
                <span>Share</span>
              </button>

              <button
                type="button"
                id="btn-qr-download"
                onClick={handleDownload}
                className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-750 flex flex-col items-center gap-1 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-500" />
                <span>Save Image</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              When your partner scans this code from their phone or laptop, they will connect instantly to your private space without typing!
            </p>
          </div>
        )}

        {/* Tab 2: Scan QR Code with Camera */}
        {activeTab === 'scan' && (
          <div className="p-5 overflow-y-auto space-y-4">
            <div className="relative w-full aspect-square max-w-[280px] mx-auto bg-black rounded-3xl overflow-hidden border border-slate-700 shadow-inner flex items-center justify-center">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Viewfinder Target Overlay */}
              <div className="absolute inset-8 border-2 border-rose-500/80 rounded-2xl pointer-events-none flex items-center justify-center">
                <div className="w-full h-0.5 bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-pulse" />
              </div>

              {/* Camera status badge */}
              {isScanning && !scanSuccess && (
                <div className="absolute bottom-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] text-white font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Scanning for partner's QR...</span>
                </div>
              )}

              {/* Success Banner */}
              {scanSuccess && (
                <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center text-white space-y-2 animate-in fade-in">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
                    <Check className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm font-bold">{scanSuccess}</p>
                </div>
              )}
            </div>

            {/* Camera error message */}
            {cameraError && (
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">{cameraError}</p>
                </div>
              </div>
            )}

            {/* Scan Controls */}
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                id="btn-flip-camera"
                onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Flip Camera</span>
              </button>

              <label
                htmlFor="input-upload-qr"
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Image</span>
                <input
                  id="input-upload-qr"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>End-to-End Encrypted Handshake</span>
          </div>
          <button
            type="button"
            id="btn-qr-done"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
