import React, { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Send,
  Image as ImageIcon,
  Camera,
  Mic,
  MicOff,
  Square,
  Smile,
  Clock,
  Heart,
  Lock,
  Play,
  Pause,
  Check,
  CheckCheck,
  Sparkles,
  ShieldCheck,
  Phone,
  Video,
  Film,
  X,
  Download,
  Flame,
  Maximize2,
  UploadCloud,
  Zap,
  Volume2,
  Palette,
  PartyPopper,
  Music,
  Radio,
  Wallpaper,
  Pencil,
  Trash2,
  Copy,
  ChevronDown,
  Ban,
  CheckCircle2,
  User,
  Users,
  Plus,
  Tv,
} from 'lucide-react';
import { DecryptedMessage, UserProfile, ActiveSquadCallState } from '../types';
import { CameraCaptureModal } from './CameraCaptureModal';
import { ColorMode, ThemeConfig } from '../utils/theme';
import { playSoundboardById, SOUNDBOARD_PRESETS, playHeartbeatSound, playMessageChime } from '../utils/sounds';
import { WallpaperSettings, DEFAULT_WALLPAPER_SETTINGS } from '../utils/wallpaper';
import { InteractiveWallpaper } from './InteractiveWallpaper';

interface ChatAreaProps {
  messages: DecryptedMessage[];
  currentUserId: string;
  currentUserAvatar?: string;
  partner: UserProfile | null;
  partnerName: string;
  partnerAvatar: string;
  isPartnerTyping: boolean;
  onSendMessage: (text: string, type?: 'text' | 'image' | 'video' | 'audio', fileData?: { buffer: ArrayBuffer; mimeType: string; fileName?: string; duration?: number; fileSize?: number }) => void;
  onSendReaction: (messageId: string, emoji: string) => void;
  onTyping: (isTyping: boolean) => void;
  autoDeleteTimer: number;
  onChangeAutoDeleteTimer: (seconds: number) => void;
  onSendLoveBurst: (emoji: string) => void;
  themeConfig?: ThemeConfig;
  colorMode?: ColorMode;
  onTriggerLoveBuzz?: () => void;
  onOpenThemePicker?: () => void;
  onOpenMusicLounge?: () => void;
  onOpenSoundboard?: () => void;
  isMusicPlaying?: boolean;
  currentMusicTitle?: string;
  onToggleMusicPlayPause?: () => void;
  wallpaperSettings?: WallpaperSettings;
  onOpenWallpaperPicker?: () => void;
  spaceType?: 'couple' | 'friends';
  roomMembers?: UserProfile[];
  activeSquadCall?: ActiveSquadCallState | null;
  onJoinSquadCall?: () => void;
  onDeleteMessage?: (messageId: string, deleteForEveryone: boolean) => void;
  onEditMessage?: (messageId: string, newText: string) => void;
  onOpenWatchTogether?: () => void;
}

// Categorized Emojis for Couples & Romantic Chat
const EMOJI_CATEGORIES = [
  {
    name: 'Love & Romance',
    icon: '❤️',
    emojis: [
      '❤️', '💖', '💕', '💞', '💓', '💗', '💘', '💝', '💟', '💌',
      '🥰', '😍', '😘', '😚', '😙', '😋', '💋', '👄', '🫂', '👩‍❤️‍👨',
      '👩‍❤️‍👩', '👨‍❤️‍👨', '💍', '💐', '🌹', '🥀', '🌷', '🌸', '🌺', '🕯️'
    ],
  },
  {
    name: 'Flirty & Cute',
    icon: '😉',
    emojis: [
      '😉', '😏', '🤭', '🤫', '🥺', '🤤', '🫠', '😻', '😽', '🙈',
      '👀', '✨', '🔥', '💫', '⭐', '🌟', '💥', '💯', '🥂', '🍾'
    ],
  },
  {
    name: 'Moods & Sweet',
    icon: '😊',
    emojis: [
      '😊', '😇', '😌', '🤗', '😍', '🤩', '🥳', '😎', '😴', '🥱',
      '😭', '😢', '🥹', '🥺', '😳', '🫣', '🫶', '👐', '🙌', '👏',
      '🤝', '✌️', '🤞', '🤌', '🤙', '🫰', '👋', '🙏', '👑', '🕊️'
    ],
  },
  {
    name: 'Cute & Fun',
    icon: '🧸',
    emojis: [
      '🧸', '🐱', '🐶', '🐰', '🐼', '🐨', '🦊', '🦋', '🐥', '🐧',
      '🍓', '🍒', '🍫', '🍬', '🍭', '🧁', '🍰', '🎂', '🍿', '☕'
    ],
  },
];

const QUICK_EMOJIS = ['❤️', '💖', '💕', '🥰', '😘', '💋', '🥺', '🌹', '✨', '🔥', '💍', '🧸', '🫶', '🌙'];

const DISAPPEARING_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '30s', value: 30 },
  { label: '5m', value: 300 },
  { label: '1h', value: 3600 },
  { label: '24h', value: 86400 },
];

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  currentUserId,
  currentUserAvatar,
  partner,
  partnerName,
  partnerAvatar,
  isPartnerTyping,
  onSendMessage,
  onSendReaction,
  onTyping,
  autoDeleteTimer,
  onChangeAutoDeleteTimer,
  onSendLoveBurst,
  themeConfig,
  onTriggerLoveBuzz,
  onOpenThemePicker,
  onOpenMusicLounge,
  onOpenSoundboard,
  isMusicPlaying,
  currentMusicTitle,
  onToggleMusicPlayPause,
  wallpaperSettings,
  onOpenWallpaperPicker,
  spaceType = 'couple',
  roomMembers = [],
  activeSquadCall = null,
  onJoinSquadCall,
  onDeleteMessage,
  onEditMessage,
  onOpenWatchTogether,
  colorMode = 'light',
}) => {
  const isDark = colorMode === 'dark';
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState(0);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [showSoundMenu, setShowSoundMenu] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const attachmentMenuRef = useRef<HTMLDivElement | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [selectedVideoName, setSelectedVideoName] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // WhatsApp-style Highlighting, Edit & Delete State
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [deleteModalMsg, setDeleteModalMsg] = useState<DecryptedMessage | null>(null);
  const [activeDropdownMsgId, setActiveDropdownMsgId] = useState<string | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);
  const textInputRef = useRef<HTMLTextAreaElement | null>(null);
  
  // Voice Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);

  // Audio Playback state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPartnerTyping]);

  // Dismiss attachment menu on outside click or Esc
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(e.target as Node)) {
        setShowAttachmentMenu(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAttachmentMenu(false);
      }
    };
    if (showAttachmentMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showAttachmentMenu]);

  // Handle typing debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    onTyping(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = window.setTimeout(() => {
      onTyping(false);
    }, 1500);
  };

  // WhatsApp Actions: Start Editing
  const startEditingMessage = (msg: DecryptedMessage) => {
    if (msg.type !== 'text' || msg.senderId !== currentUserId || msg.isDeleted) return;
    setEditingMessageId(msg.id);
    setInputText(msg.content);
    setHighlightedMessageId(msg.id);
    setActiveDropdownMsgId(null);
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 60);
  };

  // WhatsApp Actions: Cancel Editing
  const cancelEditing = () => {
    setEditingMessageId(null);
    setInputText('');
  };

  // WhatsApp Actions: Open Delete Confirmation Modal
  const openDeleteModal = (msg: DecryptedMessage) => {
    setDeleteModalMsg(msg);
    setActiveDropdownMsgId(null);
  };

  // WhatsApp Actions: Confirm Delete
  const confirmDelete = (messageId: string, deleteForEveryone: boolean) => {
    onDeleteMessage?.(messageId, deleteForEveryone);
    setDeleteModalMsg(null);
    if (highlightedMessageId === messageId) {
      setHighlightedMessageId(null);
    }
    if (editingMessageId === messageId) {
      setEditingMessageId(null);
      setInputText('');
    }
  };

  // WhatsApp Actions: Copy Message Content
  const handleCopyMessage = (text: string) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2000);
    setActiveDropdownMsgId(null);
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    // If in WhatsApp editing mode, save edit
    if (editingMessageId) {
      onEditMessage?.(editingMessageId, inputText.trim());
      setEditingMessageId(null);
      setInputText('');
      setHighlightedMessageId(null);
      return;
    }

    onSendMessage(inputText.trim(), 'text');
    setInputText('');
    onTyping(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      if (editingMessageId) {
        cancelEditing();
      } else if (highlightedMessageId) {
        setHighlightedMessageId(null);
      }
      setActiveDropdownMsgId(null);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Generic Media Upload processor (Photos & Videos)
  const processMediaFile = (file: File) => {
    if (!file) return;

    const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v|mkv|avi)$/i.test(file.name);
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name);

    if (!isVideo && !isImage) {
      alert('Please select a valid photo or video file to send.');
      return;
    }

    if (file.size > 80 * 1024 * 1024) {
      alert('File size exceeds 80MB. Please choose a shorter or compressed video for instant end-to-end encryption.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const buffer = reader.result as ArrayBuffer;
      const msgType = isVideo ? 'video' : 'image';
      const mimeType = file.type || (isVideo ? 'video/mp4' : 'image/png');

      onSendMessage('', msgType, {
        buffer,
        mimeType,
        fileName: file.name,
        fileSize: file.size,
      });
    };
    reader.readAsArrayBuffer(file);
  };

  // Image Upload handler
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processMediaFile(file);
    }
    e.target.value = '';
  };

  // Video Upload handler
  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processMediaFile(file);
    }
    e.target.value = '';
  };

  // Drag and Drop handling
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processMediaFile(file);
    }
  };

  // Voice Note Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const arrayBuffer = await audioBlob.arrayBuffer();
        onSendMessage('', 'audio', {
          buffer: arrayBuffer,
          mimeType: 'audio/webm',
          duration: recordDuration,
        });

        // Cleanup
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        setRecordDuration(0);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordDuration(0);

      recordTimerRef.current = window.setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error starting audio recording:', err);
      alert('Microphone access is required to record voice notes.');
    }
  };

  const stopRecording = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordDuration(0);
  };

  // Audio Playback
  const togglePlayAudio = (msgId: string, audioUrl: string) => {
    if (playingAudioId === msgId) {
      activeAudioRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
      const audio = new Audio(audioUrl);
      activeAudioRef.current = audio;
      audio.onended = () => setPlayingAudioId(null);
      audio.play();
      setPlayingAudioId(msgId);
    }
  };

  const formatRecordTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatMsgTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const highlightedMessage = messages.find((m) => m.id === highlightedMessageId);
  const editingMessage = messages.find((m) => m.id === editingMessageId);

  return (
    <div 
      className="relative flex-1 flex flex-col h-[calc(100vh-65px)] max-w-5xl mx-auto w-full overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <InteractiveWallpaper settings={wallpaperSettings || DEFAULT_WALLPAPER_SETTINGS}>
        {/* Ambient Living Theme Atmosphere Orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-30">
          <div className={`absolute -top-16 -left-16 w-80 h-80 rounded-full blur-3xl ${themeConfig?.ambientOrbs[0] || 'bg-rose-300/20'} animate-ambient-1`} />
          <div className={`absolute top-1/2 -right-20 w-96 h-96 rounded-full blur-3xl ${themeConfig?.ambientOrbs[1] || 'bg-pink-300/20'} animate-ambient-2`} />
          <div className={`absolute -bottom-20 left-1/4 w-80 h-80 rounded-full blur-3xl ${themeConfig?.ambientOrbs[2] || 'bg-amber-300/15'} animate-ambient-3`} />
        </div>

      {/* Drag and Drop Overlay */}
      {isDraggingFile && (
        <div className="absolute inset-0 z-40 bg-rose-500/85 backdrop-blur-xs flex flex-col items-center justify-center text-white border-4 border-dashed border-white/80 rounded-2xl m-2 animate-in fade-in zoom-in-95 pointer-events-none">
          <UploadCloud className="w-14 h-14 animate-bounce mb-3" />
          <p className="text-lg font-bold">Drop Encrypted Photo or Video Here</p>
          <p className="text-xs text-rose-100 mt-1">256-bit AES-GCM encryption will be applied instantly</p>
        </div>
      )}

      {/* Disappearing Messages Active Banner */}
      {autoDeleteTimer > 0 && (
        <div className="bg-rose-50/80 border-b border-rose-100 px-4 py-1.5 flex items-center justify-between text-xs text-rose-700">
          <div className="flex items-center gap-1.5 font-medium">
            <Flame className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
            <span>
              Disappearing messages active ({DISAPPEARING_OPTIONS.find((o) => o.value === autoDeleteTimer)?.label})
            </span>
          </div>
          <button
            onClick={() => onChangeAutoDeleteTimer(0)}
            className="text-[11px] underline hover:text-rose-900 font-semibold"
          >
            Turn off
          </button>
        </div>
      )}

      {/* WhatsApp Message Selection Action Bar */}
      {highlightedMessage && (
        <div className="z-30 flex items-center justify-between px-3 sm:px-5 py-2.5 bg-slate-900 text-white shadow-lg border-b border-slate-800 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="btn-close-message-selection"
              onClick={() => setHighlightedMessageId(null)}
              className="p-1.5 rounded-full hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Deselect message (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-sm tracking-wide">1 selected</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Quick Emojis Reaction shortcuts in Action Bar */}
            {!highlightedMessage.isDeleted && (
              <div className="hidden sm:flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full border border-white/10 mr-1">
                {['❤️', '🥰', '😂', '🔥', '👍'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => onSendReaction(highlightedMessage.id, emoji)}
                    className="hover:scale-125 text-xs transition-transform cursor-pointer p-0.5"
                    title={`React with ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Edit Button - Enabled for own text messages that are not deleted */}
            {highlightedMessage.senderId === currentUserId && highlightedMessage.type === 'text' && !highlightedMessage.isDeleted && (
              <button
                type="button"
                id="btn-edit-selected-message"
                onClick={() => startEditingMessage(highlightedMessage)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                title="Edit message (WhatsApp style)"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}

            {/* Copy Button */}
            {highlightedMessage.type === 'text' && !highlightedMessage.isDeleted && (
              <button
                type="button"
                id="btn-copy-selected-message"
                onClick={() => handleCopyMessage(highlightedMessage.content)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-white/15 active:scale-95 text-slate-200 text-xs font-medium transition-all cursor-pointer"
                title="Copy message text"
              >
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Copy</span>
              </button>
            )}

            {/* Delete Button */}
            <button
              type="button"
              id="btn-delete-selected-message"
              onClick={() => openDeleteModal(highlightedMessage)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              title="Delete message (WhatsApp style)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* Messages Stream */}
      <div 
        id="chat-messages-container"
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
      >
        {/* Active Squad Call Banner */}
        {activeSquadCall && (
          <div className="sticky top-0 z-30 mx-auto max-w-lg mb-4 p-3 bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950/95 backdrop-blur-md rounded-2xl border border-indigo-500/50 shadow-xl text-white flex items-center justify-between gap-3 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400 shrink-0">
                {activeSquadCall.callType === 'video' ? (
                  <Video className="w-5 h-5 animate-pulse text-indigo-300" />
                ) : (
                  <Phone className="w-5 h-5 animate-bounce text-emerald-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold truncate flex items-center gap-1.5">
                  <span>Active Squad {activeSquadCall.callType === 'video' ? 'Video' : 'Audio'} Call</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold border border-emerald-400/30">
                    {activeSquadCall.participants.length}/5 talking
                  </span>
                </p>
                <p className="text-[11px] text-slate-300 truncate">
                  Started by {activeSquadCall.startedBy.name} • Tap to join your friends!
                </p>
              </div>
            </div>
            {onJoinSquadCall && (
              <button
                type="button"
                id="btn-join-active-squad-call"
                onClick={onJoinSquadCall}
                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-xs font-bold text-white shadow-md transition-all shrink-0 cursor-pointer flex items-center gap-1"
              >
                <span>Join Call</span>
              </button>
            )}
          </div>
        )}

        {/* Welcome E2EE Note */}
        <div className="text-center py-5">
          <div className="inline-flex flex-col items-center gap-2 max-w-md px-5 py-3.5 bg-white/95 rounded-2xl border border-rose-100 shadow-xs">
            <div className="flex items-center gap-2 text-rose-500">
              <div className="w-7 h-7 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-slate-800">
                {spaceType === 'friends' ? 'Encrypted Friends & Squad Space (Max 5 Members)' : 'End-to-End Encrypted Couple Space'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-normal text-center">
              {spaceType === 'friends'
                ? 'All messages, group calls, watch parties, and photos are 256-bit AES-GCM encrypted and synchronized live with your squad.'
                : 'All messages, calls, photos, videos, and voice notes are 256-bit AES-GCM encrypted and continuously saved in your private sanctuary history.'}
            </p>
            <div className="flex items-center gap-2 pt-1 text-[10px] font-medium text-emerald-600 bg-emerald-50/80 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Full Message & Media History Always Saved & Synchronized</span>
            </div>

            {onOpenWallpaperPicker && (
              <button
                type="button"
                id="btn-welcome-wallpaper"
                onClick={onOpenWallpaperPicker}
                className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300/60 transition-colors cursor-pointer"
              >
                <Wallpaper className="w-3.5 h-3.5 text-emerald-600" />
                <span>Change WhatsApp Chat Wallpaper</span>
              </button>
            )}
          </div>
        </div>

        {/* Message List */}
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserId;
          const senderMember = roomMembers.find((m) => m.id === msg.senderId);
          const senderDisplayName = isMe ? 'You' : (senderMember?.name || msg.senderName || partnerName || 'Friend');
          const senderAvatarUrl = isMe
            ? (currentUserAvatar || '')
            : (senderMember?.avatar || partner?.avatar || partnerAvatar);

          if (msg.type === 'love_ping') {
            return (
              <div key={msg.id} className="flex justify-center my-3 animate-in fade-in zoom-in-95">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full shadow-md text-xs font-semibold">
                  <Heart className="w-4 h-4 fill-white animate-bounce" />
                  <span>{isMe ? 'You sent a Heartbeat Nudge 💕' : `${msg.senderName} sent you a Heartbeat Nudge 💕`}</span>
                </div>
              </div>
            );
          }

          if (msg.type === 'love_buzz' || msg.content?.includes('Love Buzz & Screen Rumble')) {
            return (
              <div key={msg.id} className="flex justify-center my-3 animate-in fade-in zoom-in-95">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 text-white rounded-full shadow-md text-xs font-semibold">
                  <Zap className="w-4 h-4 fill-white animate-bounce" />
                  <span>{isMe ? 'You triggered a Love Buzz & Screen Rumble! ⚡' : `${msg.senderName || 'Partner'} triggered a Love Buzz & Screen Rumble! ⚡`}</span>
                </div>
              </div>
            );
          }

          if (msg.type === 'call_log') {
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs border border-slate-200">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{msg.content}</span>
                  <span className="text-[10px] text-slate-400 font-mono ml-1">{formatMsgTime(msg.timestamp)}</span>
                </div>
              </div>
            );
          }

          const isHighlighted = highlightedMessageId === msg.id;
          const isEditingThis = editingMessageId === msg.id;
          const isDropdownOpen = activeDropdownMsgId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex gap-2.5 max-w-[85%] sm:max-w-[70%] group ${
                isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              {/* Avatar Icon */}
              {!isMe ? (
                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 mt-auto border border-rose-200">
                  <img src={senderAvatarUrl} alt={senderDisplayName} className="w-full h-full object-cover" />
                </div>
              ) : (
                currentUserAvatar ? (
                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 mt-auto border border-rose-300">
                    <img src={currentUserAvatar} alt="You" className="w-full h-full object-cover" />
                  </div>
                ) : null
              )}

              {/* Message Bubble Content */}
              <div className="relative">
                {spaceType === 'friends' && !isMe && (
                  <p className="text-[11px] font-bold text-indigo-600 mb-0.5 ml-1">
                    {senderDisplayName}
                  </p>
                )}

                {/* Highlight Checkmark Badge */}
                {isHighlighted && (
                  <div className={`absolute -top-2 ${isMe ? '-left-2' : '-right-2'} z-20 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md animate-in zoom-in`}>
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}

                {/* WhatsApp Dropdown Chevron Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDropdownMsgId(isDropdownOpen ? null : msg.id);
                    setHighlightedMessageId(msg.id);
                  }}
                  className={`absolute top-1.5 ${isMe ? 'left-1.5' : 'right-1.5'} p-1 rounded-full bg-black/25 hover:bg-black/45 text-white/90 opacity-0 group-hover:opacity-100 ${
                    isDropdownOpen || isHighlighted ? '!opacity-100' : ''
                  } transition-opacity cursor-pointer z-10`}
                  title="Message options"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {/* WhatsApp Dropdown Popover Menu */}
                {isDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdownMsgId(null);
                      }}
                    />
                    <div
                      className={`absolute top-7 ${isMe ? 'right-0' : 'left-0'} z-40 w-44 py-1.5 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 text-xs select-none`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Edit Option (if sent by me, text, and not deleted) */}
                      {isMe && msg.type === 'text' && !msg.isDeleted && (
                        <button
                          type="button"
                          onClick={() => startEditingMessage(msg)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer text-left"
                        >
                          <Pencil className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="font-medium">Edit message</span>
                        </button>
                      )}

                      {/* Copy Option (if text) */}
                      {msg.type === 'text' && !msg.isDeleted && (
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg.content)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer text-left"
                        >
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span className="font-medium">Copy text</span>
                        </button>
                      )}

                      {/* Highlight / Deselect Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setHighlightedMessageId(isHighlighted ? null : msg.id);
                          setActiveDropdownMsgId(null);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer text-left"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-medium">{isHighlighted ? 'Deselect message' : 'Highlight message'}</span>
                      </button>

                      <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

                      {/* Delete Option */}
                      <button
                        type="button"
                        onClick={() => openDeleteModal(msg)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer text-left font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span>Delete message</span>
                      </button>
                    </div>
                  </>
                )}

                <div
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest('button') || target.closest('video') || target.closest('input') || target.closest('a')) return;
                    setHighlightedMessageId(isHighlighted ? null : msg.id);
                    setActiveDropdownMsgId(null);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setHighlightedMessageId(msg.id);
                    setActiveDropdownMsgId(msg.id);
                  }}
                  className={`rounded-2xl p-3.5 shadow-xs transition-all relative cursor-pointer ${
                    isHighlighted
                      ? 'ring-3 ring-emerald-500 ring-offset-2 ring-offset-slate-900/10 shadow-lg scale-[1.01]'
                      : ''
                  } ${
                    isEditingThis
                      ? 'ring-3 ring-amber-400 dark:ring-amber-300'
                      : ''
                  } ${
                    isMe
                      ? `${themeConfig?.userBubble || 'bg-gradient-to-br from-rose-500 via-rose-500 to-pink-500 text-white shadow-rose-500/20'} rounded-br-xs`
                      : (isDark
                          ? 'bg-slate-800 border border-slate-700 text-slate-100 rounded-bl-xs shadow-slate-900/30'
                          : 'bg-white border border-slate-200/80 text-slate-900 rounded-bl-xs')
                  }`}
                >
                  {/* WhatsApp Deleted Message Placeholder */}
                  {msg.isDeleted ? (
                    <div className={`flex items-center gap-2 italic py-1 text-xs select-none ${
                      isMe ? 'text-rose-100' : (isDark ? 'text-slate-400' : 'text-slate-500')
                    }`}>
                      <Ban className="w-3.5 h-3.5 opacity-75 shrink-0" />
                      <span>{isMe ? 'You deleted this message' : 'This message was deleted'}</span>
                    </div>
                  ) : (
                    <>
                      {/* Decryption Error Fallback */}
                      {msg.decryptionError && (
                        <div className="text-xs text-amber-200 flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Encrypted with another key</span>
                        </div>
                      )}

                      {/* Text Message */}
                      {msg.type === 'text' && !msg.decryptionError && (
                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                          {msg.content}
                        </p>
                      )}

                      {/* Image Message */}
                      {msg.type === 'image' && !msg.decryptionError && (
                        <div className="space-y-1">
                          <div
                            onClick={() => setSelectedImage(msg.content)}
                            className="rounded-xl overflow-hidden cursor-pointer max-h-72 max-w-sm bg-black/5"
                          >
                            <img
                              src={msg.content}
                              alt="Encrypted attachment"
                              className="w-full h-auto object-cover hover:scale-102 transition-transform"
                            />
                          </div>
                        </div>
                      )}

                      {/* Video Message */}
                      {msg.type === 'video' && !msg.decryptionError && (
                        <div className="space-y-1.5 max-w-sm sm:max-w-md">
                          <div className="relative rounded-2xl overflow-hidden bg-black/95 shadow-md group/vid">
                            <video
                              src={msg.content}
                              controls
                              playsInline
                              preload="metadata"
                              className="w-full max-h-72 object-contain rounded-2xl bg-black"
                            />
                            <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                              <button
                                onClick={() => {
                                  setSelectedVideo(msg.content);
                                  setSelectedVideoName(msg.fileMetadata?.fileName || 'encrypted-video.mp4');
                                }}
                                className="p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-white backdrop-blur-xs transition-colors cursor-pointer"
                                title="Expand Full Screen"
                              >
                                <Maximize2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className={`flex items-center justify-between text-[11px] px-1 ${isMe ? 'text-rose-100' : 'text-slate-500'}`}>
                            <span className="truncate max-w-[200px] flex items-center gap-1">
                              <Film className="w-3.5 h-3.5 shrink-0 text-rose-300" />
                              <span>{msg.fileMetadata?.fileName || 'Encrypted Video'}</span>
                            </span>
                            {msg.fileMetadata?.fileSize && (
                              <span className="font-mono text-[10px] opacity-80">
                                {(msg.fileMetadata.fileSize / (1024 * 1024)).toFixed(1)} MB
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Voice Note Audio Message */}
                      {msg.type === 'audio' && !msg.decryptionError && (
                        <div className="flex items-center gap-3 py-1 min-w-[200px]">
                          <button
                            onClick={() => togglePlayAudio(msg.id, msg.content)}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-95 cursor-pointer ${
                              isMe
                                ? 'bg-white text-rose-600 shadow-sm'
                                : 'bg-rose-500 text-white shadow-sm'
                            }`}
                          >
                            {playingAudioId === msg.id ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                          </button>
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5 h-6">
                              {/* Animated Colorful Equalizer Bars */}
                              {[14, 26, 18, 30, 22, 16, 28, 20, 12, 24].map((height, i) => (
                                <div
                                  key={i}
                                  style={{ height: playingAudioId === msg.id ? undefined : `${height}px` }}
                                  className={`w-1 rounded-full transition-all ${
                                    playingAudioId === msg.id
                                      ? `animate-eq-${(i % 5) + 1} ${isMe ? 'bg-white' : 'bg-gradient-to-t from-rose-500 to-amber-400'}`
                                      : isMe ? 'bg-white/60' : 'bg-rose-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <div className={`text-[10px] mt-1 font-mono ${isMe ? 'text-white/90' : 'text-slate-500'}`}>
                              Voice Note {msg.fileMetadata?.duration ? `(${msg.fileMetadata.duration}s)` : ''}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Meta info: Time + Lock Icon */}
                  <div
                    className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                      isMe ? 'text-rose-100' : 'text-slate-400'
                    }`}
                  >
                    <Lock className="w-2.5 h-2.5 opacity-70" title="End-to-End Encrypted" />
                    <span>{formatMsgTime(msg.timestamp)}</span>
                    {msg.isEdited && !msg.isDeleted && (
                      <span className="text-[9px] italic font-medium opacity-90 ml-0.5">• Edited</span>
                    )}
                    {isMe && !msg.isDeleted && <CheckCheck className="w-3 h-3 text-rose-200" />}
                  </div>
                </div>

                {/* Reactions below bubble */}
                {!msg.isDeleted && msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {Object.entries(msg.reactions).map(([emoji, rawUserIds]) => {
                      const userIds = Array.isArray(rawUserIds) ? (rawUserIds as string[]) : [];
                      return (
                        <button
                          key={emoji}
                          onClick={() => onSendReaction(msg.id, emoji)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border shadow-xs transition-colors ${
                            userIds.includes(currentUserId)
                              ? 'bg-rose-100 border-rose-300 text-rose-700 font-bold'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <span>{emoji}</span>
                          <span className="text-[10px]">{userIds.length}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Quick Hover Reaction Bar */}
                <div
                  className={`absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md rounded-full px-2 py-0.5 flex items-center gap-1 z-10 ${
                    isMe ? 'right-0' : 'left-0'
                  }`}
                >
                  {!msg.isDeleted && ['❤️', '🥰', '💋', '🔥', '🥺', '😂'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => onSendReaction(msg.id, emoji)}
                      className="hover:scale-125 text-sm transition-transform cursor-pointer p-0.5"
                    >
                      {emoji}
                    </button>
                  ))}
                  <div className="w-[1px] h-3.5 bg-slate-200 dark:bg-slate-700 mx-0.5" />
                  {/* Highlight Shortcut */}
                  <button
                    type="button"
                    onClick={() => setHighlightedMessageId(isHighlighted ? null : msg.id)}
                    className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-emerald-600 transition-colors cursor-pointer"
                    title={isHighlighted ? "Deselect" : "Highlight message"}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                  {/* Edit Shortcut */}
                  {isMe && msg.type === 'text' && !msg.isDeleted && (
                    <button
                      type="button"
                      onClick={() => startEditingMessage(msg)}
                      className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-emerald-600 transition-colors cursor-pointer"
                      title="Edit message (WhatsApp style)"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {/* Delete Shortcut */}
                  <button
                    type="button"
                    onClick={() => openDeleteModal(msg)}
                    className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Delete message (WhatsApp style)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Partner Typing Indicator */}
        {isPartnerTyping && (
          <div className="flex items-center gap-2 text-xs text-rose-500 animate-pulse pl-2">
            <div className="w-6 h-6 rounded-full overflow-hidden border border-rose-200">
              <img src={partner?.avatar || partnerAvatar} alt={partnerName} className="w-full h-full object-cover" />
            </div>
            <span>{partnerName} is typing a love note... 💕</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Rich Multi-Category Couple Emoji Picker Popup */}
      {showEmojiPicker && (
        <div className="bg-white/95 backdrop-blur-md border-t border-rose-100 shadow-xl p-3 z-30 animate-in fade-in slide-in-from-bottom-2">
          {/* Category Tabs & Close */}
          <div className="flex items-center justify-between border-b border-rose-100/80 pb-2 mb-2">
            <div className="flex items-center gap-1 overflow-x-auto">
              {EMOJI_CATEGORIES.map((cat, idx) => (
                <button
                  key={cat.name}
                  onClick={() => setActiveEmojiCategory(idx)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeEmojiCategory === idx
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-rose-50 hover:text-rose-600'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span className="hidden sm:inline">{cat.name}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowEmojiPicker(false)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              title="Close emoji picker"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Emoji Grid */}
          <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-1.5 max-h-48 overflow-y-auto p-1">
            {EMOJI_CATEGORIES[activeEmojiCategory].emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  setInputText((prev) => prev + emoji);
                }}
                className="text-2xl p-2 hover:bg-rose-50 rounded-xl transition-transform hover:scale-130 active:scale-95 cursor-pointer flex items-center justify-center"
                title={`Add ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Quick 1-Click Send Floating Emoji */}
          <div className="mt-2 pt-2 border-t border-rose-100/70 flex items-center justify-between text-[11px] text-slate-500 px-1">
            <span className="font-medium text-rose-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Quick Tap-to-Send:
            </span>
            <div className="flex items-center gap-1.5">
              {['❤️', '💖', '🥰', '💋', '🔥', '🥺', '🌹', '🫶'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onSendMessage(emoji, 'text');
                    onSendLoveBurst(emoji);
                  }}
                  className="text-base hover:scale-135 transition-transform p-1 hover:bg-rose-50 rounded-lg cursor-pointer"
                  title={`Direct send ${emoji} to partner`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Interactive Spark & Celebration Dock */}
      <div className="px-2.5 sm:px-4 py-1.5 flex items-center justify-between gap-1.5 sm:gap-2 text-xs border-t border-slate-100/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs overflow-x-auto no-scrollbar whitespace-nowrap">
        {/* Left: Quick Sparks, Reactions, Confetti, Love Buzz & Sound Bites */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl px-1.5 sm:px-2 py-0.5 border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">Spark:</span>
            {['❤️', '💖', '🥰', '🔥', '✨', '🎉', '🌹', '⚡'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onSendLoveBurst(emoji);
                  playMessageChime();
                }}
                className="p-0.5 sm:p-1 hover:scale-135 active:scale-95 transition-transform text-xs sm:text-sm cursor-pointer"
                title={`Send floating spark ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Quick Confetti Cannon */}
          <button
            onClick={() => {
              confetti({
                particleCount: 50,
                spread: 75,
                origin: { y: 0.8 },
                colors: ['#f43f5e', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'],
              });
              onSendLoveBurst('🎉');
              playHeartbeatSound();
            }}
            className="px-2 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/80 text-[11px] font-semibold flex items-center gap-1 transition-transform active:scale-95 cursor-pointer"
            title="Launch Celebration Confetti! 🎉"
          >
            <PartyPopper className="w-3.5 h-3.5 text-amber-500 animate-bounce" />
            <span className="hidden sm:inline">Confetti</span>
          </button>

          {/* Quick Love Buzz / Screen Rumble */}
          {onTriggerLoveBuzz && (
            <button
              onClick={onTriggerLoveBuzz}
              className="px-2 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 text-[11px] font-semibold flex items-center gap-1 transition-transform active:scale-95 cursor-pointer"
              title="Trigger Love Buzz & Screen Shake! ⚡"
            >
              <Zap className="w-3.5 h-3.5 text-rose-500 animate-pulse fill-rose-500" />
              <span className="hidden sm:inline">Love Buzz</span>
            </button>
          )}

          {/* Quick Sound Bites Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSoundMenu(!showSoundMenu)}
              className="px-2 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/80 text-[11px] font-semibold flex items-center gap-1 transition-transform active:scale-95 cursor-pointer"
              title="Trigger Squad Soundboard Soundbite"
            >
              <Volume2 className="w-3.5 h-3.5 text-purple-500" />
              <span className="hidden md:inline">Sound Bite</span>
            </button>

            {showSoundMenu && (
              <div className="absolute left-0 bottom-8 w-44 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-40 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Instant Sound Bites
                </div>
                {SOUNDBOARD_PRESETS.slice(0, 6).map((sound) => (
                  <button
                    key={sound.id}
                    onClick={() => {
                      playSoundboardById(sound.id);
                      onSendLoveBurst(sound.emoji);
                      setShowSoundMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-purple-50 text-slate-700 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <span>{sound.emoji}</span>
                      <span>{sound.name}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Theme button + Disappearing Messages */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Soundboard Quick Access Button 📢 */}
          {onOpenSoundboard && (
            <button
              id="btn-chat-soundboard"
              type="button"
              onClick={onOpenSoundboard}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/60 transition-colors cursor-pointer"
              title="Open Squad Soundboard"
            >
              <Radio className="w-3 h-3 text-amber-600" />
              <span className="hidden sm:inline">Soundboard</span>
            </button>
          )}

          {onOpenThemePicker && (
            <button
              onClick={onOpenThemePicker}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100/70 hover:bg-slate-200/60 border border-slate-200/60 transition-colors cursor-pointer"
              title="Change Atmosphere Theme"
            >
              <Palette className="w-3 h-3 text-pink-500" />
              <span className="hidden sm:inline">Theme</span>
            </button>
          )}

          {/* Disappearing Messages Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowTimerMenu(!showTimerMenu)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] font-medium transition-colors ${
                autoDeleteTimer > 0
                  ? 'bg-rose-100 text-rose-700 font-semibold border border-rose-200'
                  : 'text-slate-500 hover:bg-slate-100 border border-transparent'
              }`}
            >
              <Clock className="w-3 h-3 text-rose-500" />
              <span className="hidden sm:inline">Disappearing: </span>
              <span>{DISAPPEARING_OPTIONS.find((o) => o.value === autoDeleteTimer)?.label}</span>
            </button>

            {showTimerMenu && (
              <div className="absolute right-0 bottom-8 w-36 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-40 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Self-Destruct
                </div>
                {DISAPPEARING_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onChangeAutoDeleteTimer(opt.value);
                      setShowTimerMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-rose-50 transition-colors ${
                      autoDeleteTimer === opt.value ? 'text-rose-600 font-bold bg-rose-50/50' : 'text-slate-700'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {autoDeleteTimer === opt.value && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Input Bar */}
      <div className={`p-3 sm:p-4 border-t transition-colors duration-200 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-rose-100'
      }`}>
        {/* Hidden File Inputs */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageFileChange}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleVideoFileChange}
        />

        {isRecording ? (
          /* Live Voice Recording UI */
          <div className="flex items-center justify-between p-3 bg-rose-50 border border-rose-200 rounded-2xl animate-pulse">
            <div className="flex items-center gap-3">
              <span className="w-3.5 h-3.5 rounded-full bg-rose-600 animate-ping" />
              <span className="text-sm font-bold text-rose-800">
                Recording encrypted audio... {formatRecordTime(recordDuration)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={cancelRecording}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white rounded-xl border border-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={stopRecording}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Note</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* WhatsApp Editing Message Indicator Banner */}
            {editingMessage && (
              <div className="mb-2 flex items-center justify-between px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 animate-in slide-in-from-bottom-2 duration-150">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Pencil className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex items-center gap-1.5">
                    <span className="font-bold shrink-0">Editing message:</span>
                    <span className="truncate italic opacity-85">"{editingMessage.content}"</span>
                  </div>
                </div>
                <button
                  type="button"
                  id="btn-cancel-edit-banner"
                  onClick={cancelEditing}
                  className="p-1 hover:bg-emerald-200/60 dark:hover:bg-emerald-900/60 rounded-full transition-colors cursor-pointer text-emerald-700 dark:text-emerald-300 ml-2 shrink-0"
                  title="Cancel editing (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Normal Message Input */}
            <form onSubmit={handleSend} className="flex items-end gap-1.5 sm:gap-2">
              {/* Consolidated Media Attachment (+) Menu Button */}
              <div className="relative shrink-0" ref={attachmentMenuRef}>
                <button
                  id="btn-attachment-menu"
                  type="button"
                  onClick={() => {
                    setShowAttachmentMenu(!showAttachmentMenu);
                    setShowEmojiPicker(false);
                  }}
                  className={`p-2 sm:p-2.5 rounded-xl transition-all cursor-pointer ${
                    showAttachmentMenu
                      ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 rotate-45 scale-105'
                      : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800'
                  }`}
                  title="Attach Photo, Camera Snap, Video, or Wallpaper"
                >
                  <Plus className="w-5 h-5 transition-transform duration-200" />
                </button>

                {/* WhatsApp-style Consolidated Attachment Tray Popup */}
                {showAttachmentMenu && (
                  <div className="absolute bottom-12 left-0 w-64 sm:w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2.5 z-40 animate-in fade-in zoom-in-95 slide-in-from-bottom-2">
                    <div className="px-2.5 py-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
                      <span>Add to Chat</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> 256-bit
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {/* Camera Snap */}
                      <button
                        type="button"
                        id="btn-attach-camera-menu"
                        onClick={() => {
                          setShowCameraModal(true);
                          setShowAttachmentMenu(false);
                        }}
                        className="flex flex-col items-center justify-center p-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/50 transition-all cursor-pointer group active:scale-95"
                      >
                        <div className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                          <Camera className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold mt-1.5">Camera</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">Snap & encrypt</span>
                      </button>

                      {/* Photo Upload */}
                      <button
                        type="button"
                        id="btn-attach-photo-menu"
                        onClick={() => {
                          imageInputRef.current?.click();
                          setShowAttachmentMenu(false);
                        }}
                        className="flex flex-col items-center justify-center p-3 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-900/50 transition-all cursor-pointer group active:scale-95"
                      >
                        <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold mt-1.5">Photos</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">Gallery & images</span>
                      </button>

                      {/* Video Upload */}
                      <button
                        type="button"
                        id="btn-attach-video-menu"
                        onClick={() => {
                          videoInputRef.current?.click();
                          setShowAttachmentMenu(false);
                        }}
                        className="flex flex-col items-center justify-center p-3 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/50 transition-all cursor-pointer group active:scale-95"
                      >
                        <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                          <Film className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold mt-1.5">Video</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">Encrypted clip</span>
                      </button>

                      {/* Wallpaper Picker */}
                      {onOpenWallpaperPicker && (
                        <button
                          type="button"
                          id="btn-attach-wallpaper-menu"
                          onClick={() => {
                            onOpenWallpaperPicker();
                            setShowAttachmentMenu(false);
                          }}
                          className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/50 transition-all cursor-pointer group active:scale-95"
                        >
                          <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                            <Wallpaper className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-bold mt-1.5">Wallpaper</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">Doodles & theme</span>
                        </button>
                      )}

                      {/* Watch Together & YouTube Direct Search */}
                      {onOpenWatchTogether && (
                        <button
                          type="button"
                          id="btn-attach-watch-together-menu"
                          onClick={() => {
                            onOpenWatchTogether();
                            setShowAttachmentMenu(false);
                          }}
                          className="flex flex-col items-center justify-center p-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/50 transition-all cursor-pointer group active:scale-95"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-600 via-pink-600 to-red-500 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform relative">
                            <Tv className="w-5 h-5" />
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-600 text-[8px] font-bold text-white rounded-full flex items-center justify-center border border-white dark:border-slate-900 animate-pulse">
                              YT
                            </span>
                          </div>
                          <span className="text-xs font-bold mt-1.5">
                            {spaceType === 'friends' ? 'Squad Watch' : 'Watch Party'}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">YouTube & Cinema</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Emoji Trigger */}
              <button
                id="btn-toggle-emoji"
                type="button"
                onClick={() => {
                  setShowEmojiPicker(!showEmojiPicker);
                  setShowAttachmentMenu(false);
                }}
                className="p-2 sm:p-2.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
                title="Love Emojis"
              >
                <Smile className="w-5 h-5" />
              </button>

              {/* Textarea */}
              <div className="flex-1 relative">
                <textarea
                  id="input-chat-message"
                  ref={textInputRef}
                  rows={1}
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    editingMessageId
                      ? 'Edit your message...'
                      : `Send a private encrypted note or video to ${partnerName}...`
                  }
                  className={`w-full py-2.5 px-4 rounded-2xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 resize-none max-h-32 transition-colors leading-relaxed ${
                    editingMessageId
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-400 text-slate-900 dark:text-slate-100 focus:ring-emerald-500/30'
                      : isDark
                      ? 'bg-slate-800/90 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:ring-rose-500/30 focus:border-rose-400'
                      : 'bg-slate-50 border border-slate-200 text-slate-900 focus:ring-rose-500/20 focus:border-rose-500'
                  }`}
                />
              </div>

              {/* Action Buttons: Editing Save/Cancel OR Send / Record */}
              {editingMessageId ? (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    id="btn-cancel-edit-composer"
                    type="button"
                    onClick={cancelEditing}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-colors cursor-pointer"
                    title="Cancel edit (Esc)"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <button
                    id="btn-save-edited-message"
                    type="submit"
                    className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 font-semibold text-xs shrink-0"
                    title="Save changes (Enter)"
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Save</span>
                  </button>
                </div>
              ) : inputText.trim() ? (
                <button
                  id="btn-send-message"
                  type="submit"
                  className={`p-2.5 ${
                    themeConfig?.buttonGradient || 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 shadow-rose-500/25'
                  } text-white rounded-xl shadow-md active:scale-95 transition-all cursor-pointer`}
                >
                  <Send className="w-5 h-5" />
                </button>
              ) : (
                <button
                  id="btn-record-audio"
                  type="button"
                  onClick={startRecording}
                  className="p-2.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl transition-colors cursor-pointer"
                  title="Hold or click to record encrypted voice note"
                >
                  <Mic className="w-5 h-5" />
                </button>
              )}
            </form>
          </div>
        )}
      </div>

      {/* Lightbox Modal for Encrypted Photo preview */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img src={selectedImage} alt="Encrypted Photo Full" className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl" />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black"
            >
              <X className="w-5 h-5" />
            </button>
            <a
              href={selectedImage}
              download="haven-photo.png"
              className="absolute bottom-4 right-4 px-4 py-2 rounded-xl bg-white/20 backdrop-blur-md text-white text-xs font-semibold hover:bg-white/30 flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Save Photo</span>
            </a>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Encrypted Video Player */}
      {selectedVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in"
          onClick={() => setSelectedVideo(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <video
              src={selectedVideo}
              controls
              autoPlay
              playsInline
              className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl bg-black"
            />
            <button
              onClick={() => setSelectedVideo(null)}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 p-2.5 rounded-full bg-black/70 text-white hover:bg-black border border-white/10 transition-colors cursor-pointer"
              title="Close Player"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="mt-3 flex items-center gap-3">
              <a
                href={selectedVideo}
                download={selectedVideoName || 'haven-video.mp4'}
                className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Save Video</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* In-App Encrypted Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onCapture={({ buffer, mimeType, fileName, caption }) => {
          onSendMessage('', 'image', {
            buffer,
            mimeType,
            fileName,
          });
          if (caption) {
            setTimeout(() => {
              onSendMessage(caption, 'text');
            }, 100);
          }
        }}
      />

      {/* WhatsApp Delete Message Confirmation Modal */}
      {deleteModalMsg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setDeleteModalMsg(null)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 text-slate-800 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">Delete message?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {deleteModalMsg.senderId === currentUserId
                    ? 'You can delete this message for everyone in the room or only for yourself.'
                    : 'Delete this message from your device view.'}
                </p>
              </div>
            </div>

            {/* Message snippet preview */}
            <div className="mb-4 px-3 py-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/70 dark:border-slate-700 text-xs italic text-slate-600 dark:text-slate-300 truncate">
              "{deleteModalMsg.type === 'text' ? deleteModalMsg.content : `[${deleteModalMsg.type.toUpperCase()} file]`}"
            </div>

            <div className="flex flex-col gap-2">
              {deleteModalMsg.senderId === currentUserId && (
                <button
                  type="button"
                  id="btn-delete-for-everyone"
                  onClick={() => confirmDelete(deleteModalMsg.id, true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  <span>Delete for everyone</span>
                </button>
              )}

              <button
                type="button"
                id="btn-delete-for-me"
                onClick={() => confirmDelete(deleteModalMsg.id, false)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-98 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <User className="w-4 h-4" />
                <span>Delete for me</span>
              </button>

              <button
                type="button"
                id="btn-cancel-delete"
                onClick={() => setDeleteModalMsg(null)}
                className="w-full py-2 px-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium text-xs transition-colors cursor-pointer mt-0.5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copied to clipboard Toast */}
      {copiedToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 bg-slate-900/90 backdrop-blur-md text-white rounded-full text-xs font-medium shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          Message copied to clipboard!
        </div>
      )}
      </InteractiveWallpaper>
    </div>
  );
};
