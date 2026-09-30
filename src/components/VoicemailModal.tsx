import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Video,
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  Send,
  Heart,
  Sparkles,
  PhoneCall,
  Download,
  Trash2,
  CheckCircle2,
  Clock,
  Volume2,
  VolumeX,
  SwitchCamera,
  Film,
  Inbox,
  AlertCircle
} from 'lucide-react';
import { VoicemailGreeting, CallType } from '../types';

interface VoicemailModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar: string;
  partnerName: string;
  partnerAvatar: string;
  voicemails: VoicemailGreeting[];
  onSendVoicemail: (voicemail: Omit<VoicemailGreeting, 'id' | 'createdAt' | 'listened'>) => Promise<void>;
  onMarkListened: (voicemailId: string) => void;
  onDeleteVoicemail: (voicemailId: string) => void;
  onInitiateCall: (type: CallType) => void;
  initialMode?: 'record' | 'inbox';
  missedCallType?: 'video' | 'audio';
}

export const VoicemailModal: React.FC<VoicemailModalProps> = ({
  isOpen,
  onClose,
  roomId,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  partnerName,
  partnerAvatar,
  voicemails,
  onSendVoicemail,
  onMarkListened,
  onDeleteVoicemail,
  onInitiateCall,
  initialMode = 'inbox',
  missedCallType,
}) => {
  const [activeTab, setActiveTab] = useState<'record' | 'inbox'>(initialMode);
  const [mediaType, setMediaType] = useState<'video' | 'audio'>(missedCallType || 'video');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Inbox & Playing State
  const [selectedVoicemail, setSelectedVoicemail] = useState<VoicemailGreeting | null>(null);
  const [deletingVoicemailId, setDeletingVoicemailId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Refs
  const videoLiveRef = useRef<HTMLVideoElement | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Sync initialMode when opened
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      if (missedCallType) {
        setMediaType(missedCallType);
      }
    }
  }, [isOpen, initialMode, missedCallType]);

  // Clean up streams when modal closes or unmounts
  useEffect(() => {
    if (!isOpen) {
      stopCameraAndMic();
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setPreviewBlob(null);
      setIsRecording(false);
      setRecordingDuration(0);
      clearInterval(timerRef.current);
    }
  }, [isOpen]);

  // Initialize camera/mic preview when in recording tab
  useEffect(() => {
    if (isOpen && activeTab === 'record' && !previewBlob) {
      startMediaPreview();
    } else if (activeTab === 'inbox') {
      stopCameraAndMic();
    }
    return () => {
      stopCameraAndMic();
    };
  }, [isOpen, activeTab, mediaType, facingMode, previewBlob]);

  // Discard active in-progress recording
  const handleDiscardRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    setIsRecording(false);
    clearInterval(timerRef.current);
    recordedChunksRef.current = [];
    setRecordingDuration(0);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPreviewBlob(null);
    startMediaPreview();
  };

  // Delete/discard recorded preview
  const handleDeleteRecordedPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPreviewBlob(null);
    setRecordingDuration(0);
    setCaption('');
    startMediaPreview();
  };

  // Start live viewfinder with resilient fallback
  const startMediaPreview = async () => {
    stopCameraAndMic();
    setCameraError(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera and microphone API not supported in this environment.');
      return;
    }

    try {
      let stream: MediaStream;
      try {
        const constraints: MediaStreamConstraints = {
          audio: true,
          video: mediaType === 'video' ? {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          } : false,
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr) {
        console.warn('Initial camera constraints failed, attempting basic fallback:', firstErr);
        try {
          // Fallback 1: basic video + audio without resolution constraint
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: mediaType === 'video' ? true : false,
          });
        } catch (secondErr) {
          // Fallback 2: video only if audio failed/unavailable
          if (mediaType === 'video') {
            console.warn('Audio+Video failed, attempting video-only stream:', secondErr);
            stream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: true,
            });
          } else {
            throw secondErr;
          }
        }
      }

      mediaStreamRef.current = stream;

      if (videoLiveRef.current && mediaType === 'video') {
        videoLiveRef.current.muted = true;
        videoLiveRef.current.defaultMuted = true;
        (videoLiveRef.current as any).playsInline = true;
        videoLiveRef.current.srcObject = stream;
        videoLiveRef.current.play().catch((e) => console.log('Live video play catch:', e));
      }
    } catch (err: any) {
      console.error('Error accessing camera/mic for voicemail:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera / microphone permission was blocked. Please tap the lock/camera icon in your browser address bar to allow camera access.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device. You can switch to Voice Note to leave an audio greeting.');
      } else {
        setCameraError('Could not start camera. Please ensure another app or call is not using it and tap retry below.');
      }
    }
  };

  const stopCameraAndMic = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoLiveRef.current) {
      videoLiveRef.current.srcObject = null;
    }
  };

  // Switch front/back camera
  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Start Recording
  const startRecording = () => {
    if (!mediaStreamRef.current) {
      alert('Camera / microphone is not active.');
      return;
    }

    recordedChunksRef.current = [];
    setPreviewBlob(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    try {
      const mimeType = mediaType === 'video'
        ? (MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm')
        : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg');

      const recorder = new MediaRecorder(mediaStreamRef.current, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const fullBlob = new Blob(recordedChunksRef.current, { type: mimeType });
        setPreviewBlob(fullBlob);
        const url = URL.createObjectURL(fullBlob);
        setPreviewUrl(url);
        stopCameraAndMic();
      };

      recorder.start(500); // 500ms chunk interval
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev >= 180) { // Max 3 minutes
            stopRecording();
            return 180;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      alert('Could not start recording. Please try again.');
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  // Discard and re-record
  const handleReRecord = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPreviewBlob(null);
    setRecordingDuration(0);
    startMediaPreview();
  };

  // Convert blob to base64 data URL
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Send Voicemail Greeting
  const handleSendVoicemail = async () => {
    if (!previewBlob) return;
    setIsSubmitting(true);

    try {
      const mediaBase64 = await blobToBase64(previewBlob);

      await onSendVoicemail({
        roomId,
        senderId: currentUserId,
        senderName: currentUserName,
        senderAvatar: currentUserAvatar,
        type: mediaType,
        mediaUrl: mediaBase64,
        durationSeconds: recordingDuration,
        caption: caption.trim() || undefined,
        missedCallType,
      });

      // Reset recording form
      handleReRecord();
      setCaption('');
      setActiveTab('inbox');
    } catch (err) {
      console.error('Failed to send voicemail:', err);
      alert('Failed to send voicemail. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Quick romantic caption presets
  const captionPresets = [
    'Missed you so much! Call me back when you wake up 💕',
    'Just wanted to leave you a sweet smile today 🥰',
    'Thinking about you non-stop right now ✨',
    'Goodnight my love, dream of me 🌙',
  ];

  if (!isOpen) return null;

  const roomVoicemails = [...voicemails].sort((a, b) => b.createdAt - a.createdAt);
  const unreadCount = roomVoicemails.filter((v) => !v.listened && v.senderId !== currentUserId).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        id="voicemail-modal-container"
        className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-white overflow-hidden relative max-h-[92vh] flex flex-col"
      >
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-500/20 via-pink-500/15 to-purple-600/20 border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/25">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-1.5">
                  Private Voicemails & Greetings
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                </h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500 text-white shadow-sm">
                    {unreadCount} New
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Leave offline video & voice messages for {partnerName}
              </p>
            </div>
          </div>

          <button
            id="btn-close-voicemail-modal"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 p-2 bg-slate-950/40 border-b border-slate-800/50 shrink-0">
          <button
            id="tab-voicemail-record"
            onClick={() => setActiveTab('record')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'record'
                ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Record Greeting</span>
          </button>

          <button
            id="tab-voicemail-inbox"
            onClick={() => setActiveTab('inbox')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer relative ${
              activeTab === 'inbox'
                ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Voicemail Inbox ({roomVoicemails.length})</span>
            {unreadCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping absolute top-2 right-4" />
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {activeTab === 'record' ? (
            <div className="space-y-4">
              {/* Mode Toggle: Video vs Voice */}
              {!previewBlob && !isRecording && (
                <div className="flex items-center justify-center gap-2 p-1 bg-slate-950/60 rounded-2xl border border-slate-800 max-w-xs mx-auto">
                  <button
                    id="btn-voicemail-mode-video"
                    onClick={() => setMediaType('video')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      mediaType === 'video'
                        ? 'bg-rose-500 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Video Message</span>
                  </button>
                  <button
                    id="btn-voicemail-mode-audio"
                    onClick={() => setMediaType('audio')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      mediaType === 'audio'
                        ? 'bg-rose-500 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>Voice Note</span>
                  </button>
                </div>
              )}

              {/* Viewfinder / Recording Stage */}
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center shadow-inner">
                {cameraError ? (
                  <div className="text-center p-6 space-y-3">
                    <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
                    <p className="text-sm text-slate-300 max-w-sm">{cameraError}</p>
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={startMediaPreview}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 cursor-pointer transition"
                      >
                        Retry Camera
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCameraError(null);
                          setMediaType('audio');
                        }}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white cursor-pointer transition"
                      >
                        Switch to Voice Note
                      </button>
                    </div>
                  </div>
                ) : mediaType === 'video' ? (
                  <>
                    {/* Live Viewfinder (when not previewing recorded video) */}
                    {!previewBlob && (
                      <video
                        ref={(el) => {
                          videoLiveRef.current = el;
                          if (el) {
                            el.muted = true;
                            el.defaultMuted = true;
                            (el as any).playsInline = true;
                            if (mediaStreamRef.current && el.srcObject !== mediaStreamRef.current) {
                              el.srcObject = mediaStreamRef.current;
                              el.play().catch(() => {});
                            }
                          }
                        }}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover transform -scale-x-100"
                      />
                    )}

                    {/* Recorded Video Playback Preview */}
                    {previewBlob && previewUrl && (
                      <video
                        ref={videoPreviewRef}
                        src={previewUrl}
                        controls
                        playsInline
                        className="w-full h-full object-contain"
                      />
                    )}

                    {/* Camera switch button */}
                    {!previewBlob && !isRecording && (
                      <button
                        onClick={toggleCamera}
                        title="Flip Camera"
                        className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur-sm border border-white/10 transition cursor-pointer"
                      >
                        <SwitchCamera className="w-4 h-4" />
                      </button>
                    )}
                  </>
                ) : (
                  /* Audio Mode Visualization */
                  <div className="flex flex-col items-center justify-center space-y-4 p-6 text-center">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                      isRecording
                        ? 'bg-rose-500/20 text-rose-500 animate-pulse ring-8 ring-rose-500/10'
                        : 'bg-slate-800 text-rose-400'
                    }`}>
                      <Mic className="w-10 h-10" />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-200">
                        {isRecording ? 'Listening and recording...' : previewBlob ? 'Voice greeting ready!' : `Record a voice greeting for ${partnerName}`}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        High-fidelity stereo audio with ambient romance filter
                      </p>
                    </div>

                    {/* Audio Player Preview */}
                    {previewBlob && previewUrl && (
                      <audio ref={audioPreviewRef} src={previewUrl} controls className="w-full max-w-sm mt-2" />
                    )}
                  </div>
                )}

                {/* Live Recording Badge & Timer */}
                {isRecording && (
                  <div className="absolute top-3 left-3 flex items-center gap-2 bg-slate-900/85 backdrop-blur-sm border border-rose-500/30 px-3 py-1.5 rounded-full">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    <span className="text-xs font-mono font-bold text-rose-400">
                      REC {formatTime(recordingDuration)}
                    </span>
                    <span className="text-[10px] text-slate-400">/ 3:00 max</span>
                  </div>
                )}
              </div>

              {/* Controls Bar */}
              <div className="flex items-center justify-center gap-3">
                {!isRecording && !previewBlob && (
                  <button
                    id="btn-start-record-voicemail"
                    onClick={startRecording}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold text-sm shadow-lg shadow-rose-500/25 active:scale-95 transition-all cursor-pointer"
                  >
                    <span className="w-3 h-3 rounded-full bg-white animate-pulse" />
                    <span>Start Recording ({mediaType === 'video' ? 'Video' : 'Voice'})</span>
                  </button>
                )}

                {isRecording && (
                  <div className="flex items-center gap-2">
                    <button
                      id="btn-cancel-recording-voicemail"
                      type="button"
                      onClick={handleDiscardRecording}
                      className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-slate-800/90 hover:bg-red-950/80 hover:text-red-300 text-slate-300 font-semibold text-xs border border-slate-700 hover:border-red-700/60 transition-all cursor-pointer"
                      title="Discard and delete current recording"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                      <span>Delete Recording</span>
                    </button>

                    <button
                      id="btn-stop-record-voicemail"
                      type="button"
                      onClick={stopRecording}
                      className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm shadow-lg shadow-red-600/30 active:scale-95 transition-all cursor-pointer animate-pulse"
                    >
                      <Square className="w-4 h-4 fill-white" />
                      <span>Finish Recording</span>
                    </button>
                  </div>
                )}

                {previewBlob && (
                  <div className="flex flex-wrap items-center justify-center gap-2 w-full">
                    <button
                      id="btn-delete-recording-preview"
                      type="button"
                      onClick={handleDeleteRecordedPreview}
                      disabled={isSubmitting}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 font-medium text-xs border border-red-800/60 hover:border-red-600 transition cursor-pointer"
                      title="Delete recording and start over"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      <span>Delete</span>
                    </button>

                    <button
                      id="btn-rerecord-voicemail"
                      type="button"
                      onClick={handleReRecord}
                      disabled={isSubmitting}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs border border-slate-700 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retake</span>
                    </button>

                    <button
                      id="btn-send-voicemail"
                      type="button"
                      onClick={handleSendVoicemail}
                      disabled={isSubmitting}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold text-xs shadow-lg shadow-rose-500/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSubmitting ? 'Sending to Haven...' : `Send Voicemail to ${partnerName}`}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Caption and Prompt Presets (when previewing) */}
              {previewBlob && (
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    Sweet Note / Caption (Optional)
                  </label>
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder={`Leave a sweet caption for ${partnerName}...`}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-rose-500 focus:outline-none text-xs text-white placeholder-slate-500"
                    maxLength={150}
                  />

                  {/* Preset chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {captionPresets.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCaption(preset)}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Voicemail Inbox / History View */
            <div className="space-y-4">
              {roomVoicemails.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-slate-500">
                    <Inbox className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-300">No Voicemails Yet</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                      Record a sweet video greeting or voice note to surprise {partnerName} when they open Haven!
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('record')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 text-xs font-semibold transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Record First Greeting</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {roomVoicemails.map((vm) => {
                    const isFromMe = vm.senderId === currentUserId;
                    const isSelected = selectedVoicemail?.id === vm.id;

                    return (
                      <div
                        key={vm.id}
                        id={`voicemail-item-${vm.id}`}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isSelected
                            ? 'bg-slate-800/90 border-rose-500/50 shadow-md ring-1 ring-rose-500/30'
                            : !vm.listened && !isFromMe
                            ? 'bg-rose-950/20 border-rose-500/40 shadow-sm'
                            : 'bg-slate-950/50 border-slate-800/80 hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-lg shrink-0 border border-slate-700">
                              {vm.senderAvatar || '👤'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-white">
                                  {isFromMe ? 'You' : vm.senderName}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 flex items-center gap-1">
                                  {vm.type === 'video' ? <Video className="w-2.5 h-2.5" /> : <Mic className="w-2.5 h-2.5" />}
                                  {vm.type === 'video' ? 'Video Voicemail' : 'Voice Note'}
                                </span>
                                {!vm.listened && !isFromMe && (
                                  <span className="w-2 h-2 rounded-full bg-rose-500" title="Unread" />
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <Clock className="w-3 h-3" />
                                {new Date(vm.createdAt).toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                                <span>•</span>
                                <span>{formatTime(vm.durationSeconds)}</span>
                              </p>
                            </div>
                          </div>

                          {/* Quick Actions */}
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedVoicemail(null);
                                } else {
                                  setSelectedVoicemail(vm);
                                  if (!vm.listened && !isFromMe) {
                                    onMarkListened(vm.id);
                                  }
                                }
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                                isSelected
                                  ? 'bg-rose-500 text-white'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                              }`}
                            >
                              <Play className="w-3 h-3" />
                              <span>{isSelected ? 'Close Player' : 'Play'}</span>
                            </button>

                            {deletingVoicemailId === vm.id ? (
                              <div className="flex items-center gap-1 bg-red-950/80 px-2 py-1 rounded-xl border border-red-700/80 animate-in fade-in">
                                <span className="text-[10px] text-red-200 font-semibold">Delete?</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteVoicemail(vm.id);
                                    if (selectedVoicemail?.id === vm.id) setSelectedVoicemail(null);
                                    setDeletingVoicemailId(null);
                                  }}
                                  className="px-2 py-0.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold cursor-pointer transition"
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingVoicemailId(null)}
                                  className="px-1.5 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer transition"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeletingVoicemailId(vm.id)}
                                title="Delete voicemail"
                                className="px-2 py-1.5 rounded-xl hover:bg-red-500/20 text-slate-400 hover:text-red-400 flex items-center gap-1 text-xs transition cursor-pointer border border-transparent hover:border-red-500/30"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="text-[11px] hidden sm:inline">Delete</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Caption if provided */}
                        {vm.caption && (
                          <p className="mt-2 text-xs italic text-rose-300/90 pl-1 border-l-2 border-rose-500/40">
                            "{vm.caption}"
                          </p>
                        )}

                        {/* Expanded In-line Player when Selected */}
                        {isSelected && (
                          <div className="mt-3 pt-3 border-t border-slate-700/60 space-y-3 animate-in fade-in duration-200">
                            <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video flex items-center justify-center">
                              {vm.type === 'video' ? (
                                <video
                                  src={vm.mediaUrl}
                                  controls
                                  autoPlay
                                  playsInline
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <div className="p-6 text-center space-y-3 w-full">
                                  <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                                    <Volume2 className="w-7 h-7" />
                                  </div>
                                  <audio src={vm.mediaUrl} controls autoPlay className="w-full max-w-sm mx-auto" />
                                </div>
                              )}
                            </div>

                            {/* Response Options */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    onClose();
                                    onInitiateCall(vm.type === 'video' ? 'video' : 'audio');
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer shadow-sm"
                                >
                                  <PhoneCall className="w-3 h-3" />
                                  <span>Call Back ({vm.type === 'video' ? 'Video' : 'Audio'})</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setActiveTab('record');
                                    setMediaType(vm.type);
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Reply with Voicemail</span>
                                </button>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteVoicemail(vm.id);
                                    setSelectedVoicemail(null);
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-red-200 text-xs font-semibold border border-red-800/60 hover:border-red-600 transition cursor-pointer"
                                  title="Delete this voicemail"
                                >
                                  <Trash2 className="w-3 h-3 text-red-400" />
                                  <span>Delete Voicemail</span>
                                </button>

                                <a
                                  href={vm.mediaUrl}
                                  download={`haven-voicemail-${vm.senderName}-${new Date(vm.createdAt).toISOString().slice(0, 10)}.${vm.type === 'video' ? 'webm' : 'ogg'}`}
                                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 hover:underline"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>Save Memory</span>
                                </a>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800/80 text-center shrink-0">
          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
            <Heart className="w-3 h-3 text-rose-500 inline fill-rose-500" />
            Voicemails stay permanently encrypted in your couple sanctuary until deleted
          </p>
        </div>
      </div>
    </div>
  );
};
