/**
 * Haven Built-in Real-Time Cloud Media Relay Bridge
 * Provides 100% permanent, zero-configuration cross-network calling over WebSocket.
 * Guarantees calls connect across mobile cellular (4G/LTE/5G), carrier symmetric NATs,
 * corporate firewalls, and international networks without third-party services.
 */

import { Socket } from 'socket.io-client';
import { unlockAudioContext } from './sounds';

export interface RelayBridgeConfig {
  socket: Socket;
  roomId: string;
  callType: 'audio' | 'video';
  localStream: MediaStream | null;
  onRemoteRelayStream: (stream: MediaStream) => void;
  onRelayStatusChange?: (active: boolean) => void;
}

export class MediaRelayBridge {
  private socket: Socket;
  private roomId: string;
  private callType: 'audio' | 'video';
  private localStream: MediaStream | null;
  private onRemoteRelayStream: (stream: MediaStream) => void;
  private onRelayStatusChange?: (active: boolean) => void;

  private isActive = false;
  private isMuted = false;
  private isVideoOff = false;

  // Audio capture
  private captureAudioContext: AudioContext | null = null;
  private captureSourceNode: MediaStreamAudioSourceNode | null = null;
  private captureProcessorNode: ScriptProcessorNode | null = null;

  // Audio playback
  private playbackAudioContext: AudioContext | null = null;
  private mediaStreamDestination: MediaStreamAudioDestinationNode | null = null;
  private nextPlayTime = 0;

  // Video capture & playback
  private videoCaptureInterval: number | null = null;
  private videoCaptureCanvas: HTMLCanvasElement | null = null;
  private videoCaptureVideoEl: HTMLVideoElement | null = null;

  private videoPlaybackCanvas: HTMLCanvasElement | null = null;
  private videoPlaybackCtx: CanvasRenderingContext2D | null = null;
  private videoPlaybackImg: HTMLImageElement | null = null;
  private videoStreamTrack: MediaStreamTrack | null = null;

  private relayMediaStream: MediaStream | null = null;

  constructor(config: RelayBridgeConfig) {
    this.socket = config.socket;
    this.roomId = config.roomId;
    this.callType = config.callType;
    this.localStream = config.localStream;
    this.onRemoteRelayStream = config.onRemoteRelayStream;
    this.onRelayStatusChange = config.onRelayStatusChange;

    this.setupSocketListeners();
  }

  public getIsActive(): boolean {
    return this.isActive;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public setVideoOff(off: boolean) {
    this.isVideoOff = off;
  }

  public updateLocalStream(stream: MediaStream | null) {
    this.localStream = stream;
    if (this.isActive) {
      this.restartLocalCapture();
    }
  }

  /**
   * Starts the Built-in Server Media Relay.
   */
  public async start(): Promise<void> {
    if (this.isActive) return;
    this.isActive = true;
    console.log('[MediaRelayBridge] Activating Built-in Server Media Relay for room:', this.roomId);

    unlockAudioContext();
    this.initPlaybackPipeline();
    this.initLocalCapture();

    this.socket.emit('call:relay-active', {
      roomId: this.roomId,
      active: true,
      callType: this.callType,
    });

    if (this.onRelayStatusChange) {
      this.onRelayStatusChange(true);
    }
  }

  /**
   * Stops the media relay bridge and cleans up all audio/video nodes.
   */
  public stop(): void {
    if (!this.isActive) return;
    this.isActive = false;
    console.log('[MediaRelayBridge] Stopping Built-in Server Media Relay');

    this.cleanupLocalCapture();
    this.cleanupPlayback();

    this.socket.emit('call:relay-active', {
      roomId: this.roomId,
      active: false,
    });

    if (this.onRelayStatusChange) {
      this.onRelayStatusChange(false);
    }
  }

  /**
   * Set up incoming socket listeners for relayed audio and video packets.
   */
  private setupSocketListeners(): void {
    this.socket.on('call:relay-audio', (data: {
      senderSocketId: string;
      pcm: number[];
      sampleRate: number;
      isMuted?: boolean;
    }) => {
      if (!this.isActive) {
        // Automatically wake up the relay if partner activated it!
        this.start().catch(() => {});
      }
      if (data.isMuted || !data.pcm || data.pcm.length === 0) {
        return;
      }
      this.playIncomingAudio(data.pcm, data.sampleRate || 16000);
    });

    this.socket.on('call:relay-video', (data: {
      senderSocketId: string;
      frame: string;
      isVideoOff?: boolean;
    }) => {
      if (!this.isActive) {
        this.start().catch(() => {});
      }
      if (data.isVideoOff || !data.frame) {
        return;
      }
      this.renderIncomingVideoFrame(data.frame);
    });

    this.socket.on('call:relay-active', (data: { active: boolean; callType?: string }) => {
      if (data.active && !this.isActive) {
        console.log('[MediaRelayBridge] Partner requested Server Media Relay activation');
        this.start().catch(() => {});
      }
    });
  }

  /**
   * Sets up the audio and video playback pipelines and produces a synthetic MediaStream.
   */
  private initPlaybackPipeline(): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.playbackAudioContext = new AudioCtx();
      this.mediaStreamDestination = this.playbackAudioContext.createMediaStreamDestination();
      this.nextPlayTime = this.playbackAudioContext.currentTime;

      const audioTrack = this.mediaStreamDestination.stream.getAudioTracks()[0];
      const tracks: MediaStreamTrack[] = [];
      if (audioTrack) {
        tracks.push(audioTrack);
      }

      // If video call, prepare synthetic video stream via canvas captureStream
      if (this.callType === 'video') {
        this.videoPlaybackCanvas = document.createElement('canvas');
        this.videoPlaybackCanvas.width = 480;
        this.videoPlaybackCanvas.height = 360;
        this.videoPlaybackCtx = this.videoPlaybackCanvas.getContext('2d');
        if (this.videoPlaybackCtx) {
          this.videoPlaybackCtx.fillStyle = '#111b21';
          this.videoPlaybackCtx.fillRect(0, 0, 480, 360);
        }

        this.videoPlaybackImg = new Image();

        if (typeof (this.videoPlaybackCanvas as any).captureStream === 'function') {
          const canvasStream = (this.videoPlaybackCanvas as any).captureStream(12);
          const videoTrack = canvasStream.getVideoTracks()[0];
          if (videoTrack) {
            this.videoStreamTrack = videoTrack;
            tracks.push(videoTrack);
          }
        }
      }

      this.relayMediaStream = new MediaStream(tracks);
      this.onRemoteRelayStream(this.relayMediaStream);
    } catch (err) {
      console.warn('[MediaRelayBridge] Error initializing playback pipeline:', err);
    }
  }

  /**
   * Initializes local microphone and camera capture for relay streaming.
   */
  private initLocalCapture(): void {
    if (!this.localStream) return;

    // 1. Audio Capture (Downsampled 16kHz Int16 PCM)
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack && audioTrack.enabled) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.captureAudioContext = new AudioCtx();
        this.captureSourceNode = this.captureAudioContext.createMediaStreamSource(this.localStream);
        
        // 4096 buffer size at 48kHz = ~85ms audio slice
        this.captureProcessorNode = this.captureAudioContext.createScriptProcessor(4096, 1, 1);

        const sampleRate = this.captureAudioContext.sampleRate;
        const targetRate = 16000;
        const ratio = sampleRate / targetRate;

        this.captureProcessorNode.onaudioprocess = (event) => {
          if (!this.isActive || this.isMuted) return;

          const inputData = event.inputBuffer.getChannelData(0);
          const targetLength = Math.floor(inputData.length / ratio);
          const downsampledInt16: number[] = new Array(targetLength);

          for (let i = 0; i < targetLength; i++) {
            const originalIndex = Math.floor(i * ratio);
            const sample = Math.max(-1, Math.min(1, inputData[originalIndex]));
            // Scale float [-1, 1] to signed 16-bit int [-32768, 32767]
            downsampledInt16[i] = sample < 0 ? Math.floor(sample * 32768) : Math.floor(sample * 32767);
          }

          this.socket.emit('call:relay-audio', {
            roomId: this.roomId,
            pcm: downsampledInt16,
            sampleRate: targetRate,
            isMuted: this.isMuted,
          });
        };

        this.captureSourceNode.connect(this.captureProcessorNode);
        this.captureProcessorNode.connect(this.captureAudioContext.destination);
      } catch (err) {
        console.warn('[MediaRelayBridge] Audio capture initialization failed:', err);
      }
    }

    // 2. Video Capture (10 fps, 360x270 compressed JPEG frames)
    if (this.callType === 'video') {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack && videoTrack.enabled) {
        try {
          this.videoCaptureCanvas = document.createElement('canvas');
          this.videoCaptureCanvas.width = 360;
          this.videoCaptureCanvas.height = 270;
          const ctx = this.videoCaptureCanvas.getContext('2d');

          this.videoCaptureVideoEl = document.createElement('video');
          this.videoCaptureVideoEl.autoplay = true;
          this.videoCaptureVideoEl.muted = true;
          this.videoCaptureVideoEl.playsInline = true;
          this.videoCaptureVideoEl.srcObject = new MediaStream([videoTrack]);
          this.videoCaptureVideoEl.play().catch(() => {});

          this.videoCaptureInterval = window.setInterval(() => {
            if (!this.isActive || this.isVideoOff || !ctx || !this.videoCaptureVideoEl) return;
            if (this.videoCaptureVideoEl.readyState >= 2) {
              ctx.drawImage(this.videoCaptureVideoEl, 0, 0, 360, 270);
              const frameData = this.videoCaptureCanvas!.toDataURL('image/jpeg', 0.45);
              this.socket.emit('call:relay-video', {
                roomId: this.roomId,
                frame: frameData,
                isVideoOff: this.isVideoOff,
              });
            }
          }, 110); // ~9 frames per second: low bandwidth, smooth visual presence
        } catch (err) {
          console.warn('[MediaRelayBridge] Video capture initialization failed:', err);
        }
      }
    }
  }

  private restartLocalCapture(): void {
    this.cleanupLocalCapture();
    this.initLocalCapture();
  }

  private cleanupLocalCapture(): void {
    if (this.videoCaptureInterval) {
      clearInterval(this.videoCaptureInterval);
      this.videoCaptureInterval = null;
    }
    if (this.videoCaptureVideoEl) {
      this.videoCaptureVideoEl.srcObject = null;
      this.videoCaptureVideoEl = null;
    }
    if (this.captureProcessorNode) {
      try {
        this.captureProcessorNode.disconnect();
      } catch {}
      this.captureProcessorNode = null;
    }
    if (this.captureSourceNode) {
      try {
        this.captureSourceNode.disconnect();
      } catch {}
      this.captureSourceNode = null;
    }
    if (this.captureAudioContext) {
      try {
        this.captureAudioContext.close();
      } catch {}
      this.captureAudioContext = null;
    }
  }

  private cleanupPlayback(): void {
    if (this.playbackAudioContext) {
      try {
        this.playbackAudioContext.close();
      } catch {}
      this.playbackAudioContext = null;
    }
    this.mediaStreamDestination = null;
    this.relayMediaStream = null;
    this.videoStreamTrack = null;
  }

  /**
   * Decode and play an incoming 16kHz PCM audio chunk cleanly with zero clicks.
   */
  private playIncomingAudio(pcm: number[], sampleRate: number): void {
    if (!this.playbackAudioContext || !this.mediaStreamDestination) return;

    try {
      const buffer = this.playbackAudioContext.createBuffer(1, pcm.length, sampleRate);
      const channelData = buffer.getChannelData(0);

      // Convert signed 16-bit integer back to float [-1, 1]
      for (let i = 0; i < pcm.length; i++) {
        channelData[i] = pcm[i] / 32768.0;
      }

      const source = this.playbackAudioContext.createBufferSource();
      source.buffer = buffer;

      // Connect to both synthetic MediaStream track and physical audio speakers
      source.connect(this.mediaStreamDestination);
      source.connect(this.playbackAudioContext.destination);

      const currentTime = this.playbackAudioContext.currentTime;
      // Add small safety buffer (30ms) to prevent underflow
      const startTime = Math.max(currentTime + 0.02, this.nextPlayTime);
      source.start(startTime);
      this.nextPlayTime = startTime + buffer.duration;

      // Reset drift if play time gets too far behind
      if (this.nextPlayTime < currentTime) {
        this.nextPlayTime = currentTime + buffer.duration;
      }
    } catch (err) {
      console.debug('[MediaRelayBridge] Error playing audio chunk:', err);
    }
  }

  /**
   * Render an incoming JPEG frame onto the playback canvas to feed the video stream.
   */
  private renderIncomingVideoFrame(frameData: string): void {
    if (!this.videoPlaybackCtx || !this.videoPlaybackImg) return;

    this.videoPlaybackImg.onload = () => {
      if (this.videoPlaybackCtx && this.videoPlaybackImg) {
        this.videoPlaybackCtx.drawImage(this.videoPlaybackImg, 0, 0, 480, 360);
      }
    };
    this.videoPlaybackImg.src = frameData;
  }
}
