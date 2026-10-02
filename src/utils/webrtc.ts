/**
 * WebRTC Calling Engine for Audio and Video calls.
 * Provides international peer-to-peer media streaming with DTLS-SRTP encryption,
 * global multi-region STUN/TURN relays for cross-country calling, and auto ICE restart.
 */

import {
  getStudioAudioConstraints,
  getStudioVideoConstraints,
  StudioNoiseFilterPipeline,
  enhanceCallSDP,
  applyHDQualityToRTCSenders,
} from './audioProcessor';

export const DEFAULT_RTC_ICE_SERVERS: RTCIceServer[] = [
  // Google Global Anycast STUN fleet (Ports 19302 & 3478)
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  // Cloudflare Worldwide Anycast Edge STUN (Port 3478)
  { urls: 'stun:stun.cloudflare.com:3478' },
  // Twilio Global STUN (Anycast Port 3478)
  { urls: 'stun:global.stun.twilio.com:3478' },
  // Mozilla Global STUN
  { urls: 'stun:stun.services.mozilla.com:3478' },
  // Sipgate Anycast STUN
  { urls: 'stun:stun.sipgate.net:3478' },
];

export const DEFAULT_STUN_SERVERS = DEFAULT_RTC_ICE_SERVERS;

export const GLOBAL_RTC_CONFIG: RTCConfiguration = {
  iceServers: DEFAULT_RTC_ICE_SERVERS,
  iceTransportPolicy: 'all',
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
  iceCandidatePoolSize: 0, // No pre-pooling: ensures clean SDP ufrag binding without mobile candidate mismatch
};

// Cached dynamic ICE servers if fetched from backend
let dynamicIceServers: RTCIceServer[] | null = null;

// Helper to get custom user-configured TURN server if present in localStorage
export function getCustomUserIceServers(): RTCIceServer[] {
  try {
    const raw = localStorage.getItem('haven_custom_turn_config');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return [];
}

export async function fetchFreshIceServers(roomId?: string, forceRefresh = false): Promise<RTCIceServer[]> {
  const custom = getCustomUserIceServers();
  if (!forceRefresh && dynamicIceServers && dynamicIceServers.length > 0) {
    return [...custom, ...dynamicIceServers];
  }
  try {
    const url = roomId ? `/api/webrtc/ice-servers?roomId=${encodeURIComponent(roomId)}` : '/api/webrtc/ice-servers';
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.iceServers) && data.iceServers.length > 0) {
        dynamicIceServers = data.iceServers;
        return [...custom, ...dynamicIceServers];
      }
    }
  } catch (err) {
    console.warn('Using built-in global ICE servers fallback:', err);
  }
  return [...custom, ...(dynamicIceServers || GLOBAL_RTC_CONFIG.iceServers || DEFAULT_RTC_ICE_SERVERS)];
}

// Immediately trigger pre-fetch on module load so ICE servers are cached before call initiates
if (typeof window !== 'undefined') {
  fetchFreshIceServers().catch(() => {});
}

export interface WebRTCCallbackHandlers {
  onRemoteStream: (stream: MediaStream) => void;
  onSignalData: (signal: RTCSessionDescriptionInit | RTCIceCandidateInit) => void;
  onConnectionStateChange: (state: RTCPeerConnectionState) => void;
  onError?: (err: Error) => void;
  onReconnecting?: () => void;
}

export interface NetworkQualityStats {
  rttMs: number | null;
  packetLossPercent: number;
  jitterMs: number | null;
  quality: 'excellent' | 'good' | 'fair' | 'poor' | 'measuring';
  bitrateKbps?: number;
  packetsReceived?: number;
  packetsLost?: number;
  protocol?: string;
}

export class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private handlers: WebRTCCallbackHandlers;
  private isScreenSharing = false;
  private originalVideoTrack: MediaStreamTrack | null = null;
  private candidateQueue: RTCIceCandidateInit[] = [];
  private isNegotiating = false;
  private lastBytesReceived = 0;
  private lastStatsTimestamp = 0;
  private callType: 'audio' | 'video' = 'audio';
  private isReady = false;
  private isInitiator = false;
  private isAudioMuted = false;
  private isVideoMuted = false;
  private noiseFilterPipeline: StudioNoiseFilterPipeline | null = null;
  private isNoiseCancellationActive = true;
  private isEchoSuppressionActive = true;

  constructor(handlers: WebRTCCallbackHandlers) {
    this.handlers = handlers;
    fetchFreshIceServers().then((servers) => {
      if (servers && servers.length > 0) {
        dynamicIceServers = servers;
      }
    }).catch(() => {});
  }

  public getIsReady(): boolean {
    return this.isReady;
  }

  public setReady(ready: boolean) {
    this.isReady = ready;
  }

  public getCallType(): 'audio' | 'video' {
    return this.callType;
  }

  public getPeerConnection(): RTCPeerConnection | null {
    return this.peerConnection;
  }

  public getIsAudioMuted(): boolean {
    return this.isAudioMuted;
  }

  public getIsVideoMuted(): boolean {
    return this.isVideoMuted;
  }

  public setAudioMuted(muted: boolean): boolean {
    this.isAudioMuted = muted;
    // 1. Direct local media stream tracks
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
    // 2. Underlying hardware microphone track in pipeline
    if (this.noiseFilterPipeline) {
      const raw = this.noiseFilterPipeline.getStream();
      raw.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
    // 3. Active RTCRtpSender tracks & transceivers
    if (this.peerConnection) {
      this.peerConnection.getSenders().forEach((sender) => {
        if (sender.track && sender.track.kind === 'audio') {
          sender.track.enabled = !muted;
        }
      });
      this.peerConnection.getTransceivers().forEach((transceiver) => {
        if (transceiver.sender.track && transceiver.sender.track.kind === 'audio') {
          transceiver.sender.track.enabled = !muted;
        }
      });
    }
    console.log('[WebRTC] Microphone mute updated:', muted ? 'MUTED' : 'UNMUTED');
    return this.isAudioMuted;
  }

  public setVideoMuted(off: boolean): boolean {
    this.isVideoMuted = off;
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = !off;
      });
    }
    if (this.peerConnection) {
      this.peerConnection.getSenders().forEach((sender) => {
        if (sender.track && sender.track.kind === 'video') {
          sender.track.enabled = !off;
        }
      });
      this.peerConnection.getTransceivers().forEach((transceiver) => {
        if (transceiver.sender.track && transceiver.sender.track.kind === 'video') {
          transceiver.sender.track.enabled = !off;
        }
      });
    }
    console.log('[WebRTC] Video track updated:', off ? 'DISABLED' : 'ACTIVE');
    return this.isVideoMuted;
  }

  public toggleMuteAudio(): boolean {
    return this.setAudioMuted(!this.isAudioMuted);
  }

  public toggleMuteVideo(): boolean {
    return this.setVideoMuted(!this.isVideoMuted);
  }

  public async setNoiseCancellation(enabled: boolean): Promise<void> {
    this.isNoiseCancellationActive = enabled;
    if (this.noiseFilterPipeline) {
      await this.noiseFilterPipeline.setNoiseCancellation(enabled);
    }
    // Critical: Ensure the audio track respects current mute status
    if (this.peerConnection && this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !this.isAudioMuted;
        const senders = this.peerConnection.getSenders();
        const audioSender = senders.find((s) => s.track?.kind === 'audio');
        if (audioSender) {
          try {
            await audioSender.replaceTrack(audioTrack);
          } catch (err) {
            console.debug('[WebRTC] Error refreshing audio sender track:', err);
          }
        }
      }
    }
  }

  public isNoiseCancellationEnabled(): boolean {
    return this.isNoiseCancellationActive;
  }

  public async setEchoSuppression(enabled: boolean): Promise<void> {
    this.isEchoSuppressionActive = enabled;
    if (this.noiseFilterPipeline) {
      await this.noiseFilterPipeline.setEchoCancellation(enabled);
    }
    if (this.peerConnection && this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !this.isAudioMuted;
        const senders = this.peerConnection.getSenders();
        const audioSender = senders.find((s) => s.track?.kind === 'audio');
        if (audioSender) {
          try {
            await audioSender.replaceTrack(audioTrack);
          } catch (err) {
            console.debug('[WebRTC] Error refreshing audio sender track for echo suppression:', err);
          }
        }
      }
    }
  }

  public isEchoSuppressionEnabled(): boolean {
    return this.isEchoSuppressionActive;
  }

  public async initLocalMedia(callType: 'audio' | 'video'): Promise<MediaStream> {
    this.cleanup();
    this.callType = callType;

    const constraints: MediaStreamConstraints = {
      audio: getStudioAudioConstraints(this.isNoiseCancellationActive, this.isEchoSuppressionActive),
      video: callType === 'video' ? getStudioVideoConstraints() : false,
    };

    if (!navigator?.mediaDevices?.getUserMedia) {
      throw new Error('Camera and microphone access are not supported or blocked in this browser context (HTTPS required).');
    }

    try {
      const rawStream = await navigator.mediaDevices.getUserMedia(constraints);
      rawStream.getTracks().forEach((track) => {
        track.enabled = true;
      });
      // Process through Studio Web Audio DSP noise cancellation, echo suppression, and voice enhancement
      this.noiseFilterPipeline = new StudioNoiseFilterPipeline(
        rawStream,
        this.isNoiseCancellationActive,
        this.isEchoSuppressionActive
      );
      this.localStream = this.noiseFilterPipeline.getStream();
      return this.localStream;
    } catch (err) {
      console.warn('getUserMedia studio constraints failed, trying basic fallback:', err);
      try {
        const rawStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callType === 'video' ? { facingMode: 'user' } : false,
        });
        rawStream.getTracks().forEach((track) => {
          track.enabled = true;
        });
        this.noiseFilterPipeline = new StudioNoiseFilterPipeline(
          rawStream,
          this.isNoiseCancellationActive,
          this.isEchoSuppressionActive
        );
        this.localStream = this.noiseFilterPipeline.getStream();
        return this.localStream;
      } catch (err2) {
        if (callType === 'video') {
          console.warn('Webcam not available, falling back to audio only:', err2);
          const rawStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
          rawStream.getTracks().forEach((track) => {
            track.enabled = true;
          });
          this.noiseFilterPipeline = new StudioNoiseFilterPipeline(
            rawStream,
            this.isNoiseCancellationActive,
            this.isEchoSuppressionActive
          );
          this.localStream = this.noiseFilterPipeline.getStream();
          return this.localStream;
        }
        throw err2;
      }
    }
  }

  private ensureLocalTracksAttached() {
    if (!this.peerConnection || !this.localStream) return;
    const transceivers = this.peerConnection.getTransceivers();
    const senders = this.peerConnection.getSenders();

    this.localStream.getTracks().forEach((track) => {
      // Respect current user mute state
      if (track.kind === 'audio') {
        track.enabled = !this.isAudioMuted;
      } else if (track.kind === 'video') {
        track.enabled = !this.isVideoMuted;
      }

      // 1. First look for an existing transceiver matching this kind (from offer/answer negotiation)
      const matchingTransceiver = transceivers.find(
        (t) =>
          (t.sender.track && t.sender.track.kind === track.kind) ||
          (t.receiver.track && t.receiver.track.kind === track.kind)
      );

      if (matchingTransceiver) {
        if (matchingTransceiver.sender.track !== track) {
          try {
            matchingTransceiver.sender.replaceTrack(track);
          } catch (err) {
            console.debug('Error replacing track on matching transceiver:', err);
          }
        }
        if (matchingTransceiver.direction !== 'sendrecv' && matchingTransceiver.direction !== 'stopped') {
          try {
            matchingTransceiver.direction = 'sendrecv';
          } catch {}
        }
      } else {
        // 2. Fallback to existing sender or add track to create transceiver
        const senderForKind = senders.find((s) => s.track?.kind === track.kind);
        if (senderForKind) {
          if (senderForKind.track !== track) {
            try {
              senderForKind.replaceTrack(track);
            } catch (err) {
              console.debug('Error replacing track on sender:', err);
            }
          }
        } else {
          try {
            this.peerConnection!.addTrack(track, this.localStream!);
          } catch (err) {
            console.warn('Error adding track to peer connection:', err);
          }
        }
      }
    });
  }

  public createPeerConnection(): RTCPeerConnection {
    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch {
        // ignore
      }
    }

    const customIce = getCustomUserIceServers();
    const config: RTCConfiguration = {
      ...GLOBAL_RTC_CONFIG,
      iceServers: [...customIce, ...(dynamicIceServers || GLOBAL_RTC_CONFIG.iceServers || DEFAULT_RTC_ICE_SERVERS)],
    };

    this.peerConnection = new RTCPeerConnection(config);
    this.remoteStream = new MediaStream();
    this.candidateQueue = [];
    this.isNegotiating = false;

    // ICE Candidate handler (Trickle ICE)
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[WebRTC] Local ICE candidate generated:', event.candidate.type, event.candidate.protocol, event.candidate.address || '');
        const candidateData = event.candidate.toJSON ? event.candidate.toJSON() : {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          usernameFragment: event.candidate.usernameFragment,
        };
        this.handlers.onSignalData(candidateData);
      }
    };

    this.peerConnection.onicecandidateerror = (event: any) => {
      if (event && event.errorCode !== 701) {
        console.debug('ICE candidate diagnostic:', event.errorText || event.errorCode);
      }
    };

    // Remote Track handler (Handles both audio & video tracks reliably)
    this.peerConnection.ontrack = (event) => {
      console.log('[WebRTC] ontrack received track:', event.track.kind, event.track.id, 'readyState:', event.track.readyState);
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
      }

      const addTrackSafe = (track: MediaStreamTrack) => {
        track.enabled = true;
        if (!this.remoteStream!.getTracks().some((t) => t.id === track.id)) {
          this.remoteStream!.addTrack(track);
          console.log('[WebRTC] Attached track to remote stream:', track.kind, track.id);
        }
      };

      if (event.streams && event.streams[0]) {
        event.streams[0].getTracks().forEach(addTrackSafe);
      }
      if (event.track) {
        addTrackSafe(event.track);
        const handleUnmute = () => {
          console.log('[WebRTC] Track unmuted:', event.track.kind);
          if (this.remoteStream) {
            const updatedStream = new MediaStream(this.remoteStream.getTracks());
            this.handlers.onRemoteStream(updatedStream);
          }
        };
        event.track.addEventListener('unmute', handleUnmute);
      }

      if (this.remoteStream) {
        // Dispatch a fresh MediaStream clone so React triggers re-render
        const freshStream = new MediaStream(this.remoteStream.getTracks());
        this.handlers.onRemoteStream(freshStream);
      }
    };

    // Connection state handler (Only real peer connection state drives UI 'connected')
    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection) {
        const state = this.peerConnection.connectionState;
        console.log('[WebRTC] connectionState changed:', state);
        this.handlers.onConnectionStateChange(state);

        if (state === 'connected') {
          console.log('[WebRTC] Peer connection established successfully! Cross-network media live.');
          if (this.remoteStream) {
            this.remoteStream.getTracks().forEach((t) => { t.enabled = true; });
            this.handlers.onRemoteStream(new MediaStream(this.remoteStream.getTracks()));
          }
        } else if (state === 'failed' || state === 'disconnected') {
          if (this.handlers.onReconnecting) {
            this.handlers.onReconnecting();
          }
          setTimeout(() => {
            if (this.peerConnection && (this.peerConnection.connectionState === 'failed' || this.peerConnection.connectionState === 'disconnected')) {
              if (this.isInitiator) {
                console.warn('[WebRTC] Connection failed, initiator attempting automatic ICE restart...');
                this.restartIce().catch(() => {});
              } else {
                console.warn('[WebRTC] Connection failed, waiting for initiator ICE restart...');
              }
            }
          }, 1500);
        }
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      if (this.peerConnection) {
        const iceState = this.peerConnection.iceConnectionState;
        console.log('[WebRTC] iceConnectionState changed:', iceState);
        if (iceState === 'connected' || iceState === 'completed') {
          this.handlers.onConnectionStateChange('connected');
        } else if (iceState === 'disconnected' || iceState === 'failed') {
          if (this.handlers.onReconnecting) {
            this.handlers.onReconnecting();
          }
          if (iceState === 'failed' && this.isInitiator) {
            console.warn('[WebRTC] ICE state failed, initiator restarting ICE...');
            this.restartIce().catch(() => {});
          }
        }
      }
    };

    // Add local tracks to peer connection
    this.ensureLocalTracksAttached();
    this.isReady = true;

    return this.peerConnection;
  }

  public async createOffer(): Promise<RTCSessionDescriptionInit> {
    this.isInitiator = true;
    if (!this.peerConnection) {
      this.createPeerConnection();
    }
    this.ensureLocalTracksAttached();
    const pc = this.peerConnection!;

    // Ensure transceivers are configured to send and receive based on callType
    try {
      const transceivers = pc.getTransceivers();
      if (!transceivers.some((t) => t.receiver.track?.kind === 'audio' || t.sender.track?.kind === 'audio')) {
        pc.addTransceiver('audio', { direction: 'sendrecv' });
      }
      if (this.callType === 'video') {
        const videoTransceiver = transceivers.find((t) => t.receiver.track?.kind === 'video' || t.sender.track?.kind === 'video');
        if (!videoTransceiver) {
          pc.addTransceiver('video', { direction: 'sendrecv' });
        } else if (videoTransceiver.direction !== 'sendrecv') {
          videoTransceiver.direction = 'sendrecv';
        }
      }
    } catch {
      // ignore
    }

    this.isNegotiating = true;
    const rawOffer = await pc.createOffer();
    const offer: RTCSessionDescriptionInit = {
      type: rawOffer.type,
      sdp: enhanceCallSDP(rawOffer.sdp || ''),
    };
    await pc.setLocalDescription(offer);
    this.isNegotiating = false;
    applyHDQualityToRTCSenders(pc).catch(() => {});
    return offer;
  }

  public async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    this.isInitiator = false;
    if (!this.peerConnection) {
      this.createPeerConnection();
    }
    this.ensureLocalTracksAttached();
    const pc = this.peerConnection!;
    this.isNegotiating = true;
    try {
      if (pc.signalingState !== 'stable') {
        if (pc.signalingState === 'have-local-offer') {
          await pc.setLocalDescription({ type: 'rollback' });
        }
      }
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      // Ensure all transceivers are actively sending and receiving media
      const transceivers = pc.getTransceivers();
      for (const t of transceivers) {
        if (t.direction !== 'sendrecv' && t.direction !== 'stopped') {
          try {
            t.direction = 'sendrecv';
          } catch {}
        }
      }
      this.ensureLocalTracksAttached();
      const rawAnswer = await pc.createAnswer();
      const answer: RTCSessionDescriptionInit = {
        type: rawAnswer.type,
        sdp: enhanceCallSDP(rawAnswer.sdp || ''),
      };
      await pc.setLocalDescription(answer);
      await this.flushCandidateQueue();
      this.isNegotiating = false;
      applyHDQualityToRTCSenders(pc).catch(() => {});
      return answer;
    } catch (err) {
      this.isNegotiating = false;
      console.warn('Error handling remote offer description:', err);
      throw err;
    }
  }

  public async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (this.peerConnection) {
      try {
        if (this.peerConnection.signalingState !== 'stable') {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
          await this.flushCandidateQueue();
          this.ensureLocalTracksAttached();
          applyHDQualityToRTCSenders(this.peerConnection).catch(() => {});
        }
      } catch (err) {
        console.warn('Error setting remote answer description:', err);
      }
    }
  }

  public async handleCandidate(candidateInit: RTCIceCandidateInit | { candidate?: any }): Promise<void> {
    if (!candidateInit) return;
    let cand: any = candidateInit;
    if (cand && typeof cand.candidate === 'object' && cand.candidate !== null) {
      cand = cand.candidate;
    }
    if (!cand || (cand.candidate === undefined && !cand.sdpMid && cand.sdpMLineIndex === undefined)) {
      return;
    }

    if (!this.peerConnection || !this.peerConnection.remoteDescription || !this.peerConnection.remoteDescription.type) {
      this.candidateQueue.push(cand as RTCIceCandidateInit);
      return;
    }
    try {
      await this.peerConnection.addIceCandidate(cand as RTCIceCandidateInit);
    } catch (err) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand as RTCIceCandidateInit));
      } catch (err2) {
        console.debug('Error adding ICE candidate (safe ignore):', err2);
      }
    }
  }

  private async flushCandidateQueue(): Promise<void> {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) return;
    while (this.candidateQueue.length > 0) {
      const candidateInit = this.candidateQueue.shift();
      if (candidateInit) {
        try {
          await this.peerConnection.addIceCandidate(candidateInit);
        } catch (err) {
          try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateInit));
          } catch (err2) {
            console.debug('Error applying queued ICE candidate:', err2);
          }
        }
      }
    }
  }

  public async restartIce(): Promise<RTCSessionDescriptionInit | null> {
    if (!this.peerConnection) return null;
    try {
      console.log('Initiating WebRTC ICE restart for cross-country reconnection...');
      const offer = await this.peerConnection.createOffer({ iceRestart: true });
      await this.peerConnection.setLocalDescription(offer);
      this.handlers.onSignalData(offer);
      return offer;
    } catch (err) {
      console.warn('ICE restart failed:', err);
      return null;
    }
  }

  public async toggleScreenShare(): Promise<boolean> {
    if (!this.peerConnection || !this.localStream) return false;

    if (!this.isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        const screenTrack = screenStream.getVideoTracks()[0];

        const senders = this.peerConnection.getSenders();
        const videoSender = senders.find((s) => s.track?.kind === 'video');

        if (videoSender) {
          this.originalVideoTrack = this.localStream.getVideoTracks()[0] || null;
          await videoSender.replaceTrack(screenTrack);

          screenTrack.onended = () => {
            this.revertScreenShare();
          };

          this.isScreenSharing = true;
          return true;
        }
      } catch (err) {
        console.error('Error starting screen share:', err);
        return false;
      }
    } else {
      await this.revertScreenShare();
      return false;
    }
    return false;
  }

  private async revertScreenShare() {
    if (this.peerConnection && this.originalVideoTrack) {
      const senders = this.peerConnection.getSenders();
      const videoSender = senders.find((s) => s.track?.kind === 'video');
      if (videoSender) {
        await videoSender.replaceTrack(this.originalVideoTrack);
      }
    }
    this.isScreenSharing = false;
  }

  public async switchCamera(): Promise<void> {
    if (!this.localStream || !this.peerConnection) return;
    const currentVideoTrack = this.localStream.getVideoTracks()[0];
    if (!currentVideoTrack) return;

    const currentFacing = currentVideoTrack.getSettings().facingMode;
    const newFacing = currentFacing === 'environment' ? 'user' : 'environment';

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: newFacing } },
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      if (!newVideoTrack) return;

      currentVideoTrack.stop();
      this.localStream.removeTrack(currentVideoTrack);
      this.localStream.addTrack(newVideoTrack);

      const senders = this.peerConnection.getSenders();
      const videoSender = senders.find((s) => s.track?.kind === 'video');
      if (videoSender) {
        await videoSender.replaceTrack(newVideoTrack);
      }
    } catch (err) {
      console.warn('Could not switch camera:', err);
    }
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  public getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  public async getNetworkStats(): Promise<NetworkQualityStats> {
    if (!this.peerConnection) {
      return {
        rttMs: null,
        packetLossPercent: 0,
        jitterMs: null,
        quality: 'measuring',
      };
    }

    try {
      const stats = await this.peerConnection.getStats();
      let rttMs: number | null = null;
      let totalPacketsLost = 0;
      let totalPacketsReceived = 0;
      let jitterMs: number | null = null;
      let currentBytes = 0;
      let currentTimestamp = 0;
      let protocol = 'P2P Direct (STUN)';

      stats.forEach((report) => {
        // Active candidate pair provides current round trip time
        if (report.type === 'candidate-pair' && (report.nominated || report.state === 'succeeded')) {
          if (typeof report.currentRoundTripTime === 'number') {
            rttMs = Math.round(report.currentRoundTripTime * 1000);
          } else if (typeof report.totalRoundTripTime === 'number' && report.responsesReceived > 0) {
            rttMs = Math.round((report.totalRoundTripTime / report.responsesReceived) * 1000);
          }
          if (report.protocol) {
            protocol = `P2P Direct (${report.protocol.toUpperCase()})`;
          }
        }

        // Inbound RTP streams provide packet loss, jitter, bytes received
        if (report.type === 'inbound-rtp') {
          if (typeof report.packetsLost === 'number') {
            totalPacketsLost += report.packetsLost;
          }
          if (typeof report.packetsReceived === 'number') {
            totalPacketsReceived += report.packetsReceived;
          }
          if (typeof report.jitter === 'number') {
            jitterMs = Math.round(report.jitter * 1000);
          }
          if (typeof report.bytesReceived === 'number') {
            currentBytes += report.bytesReceived;
            currentTimestamp = report.timestamp || Date.now();
          }
        }
      });

      // Calculate bitrate if we have previous values
      let bitrateKbps: number | undefined;
      if (this.lastBytesReceived > 0 && currentTimestamp > this.lastStatsTimestamp) {
        const timeDiffSec = (currentTimestamp - this.lastStatsTimestamp) / 1000;
        if (timeDiffSec > 0) {
          const bytesDiff = Math.max(0, currentBytes - this.lastBytesReceived);
          bitrateKbps = Math.round((bytesDiff * 8) / (timeDiffSec * 1000));
        }
      }
      this.lastBytesReceived = currentBytes;
      this.lastStatsTimestamp = currentTimestamp;

      const totalPackets = totalPacketsReceived + totalPacketsLost;
      const packetLossPercent = totalPackets > 0
        ? Math.min(100, Math.max(0, Math.round((totalPacketsLost / totalPackets) * 1000) / 10))
        : 0;

      // Determine quality rating
      let quality: NetworkQualityStats['quality'] = 'measuring';
      if (rttMs !== null) {
        if (rttMs < 90 && packetLossPercent < 1.5) {
          quality = 'excellent';
        } else if (rttMs < 180 && packetLossPercent < 4) {
          quality = 'good';
        } else if (rttMs < 350 && packetLossPercent < 10) {
          quality = 'fair';
        } else {
          quality = 'poor';
        }
      } else if (totalPacketsReceived > 0) {
        if (packetLossPercent < 2) quality = 'good';
        else if (packetLossPercent < 8) quality = 'fair';
        else quality = 'poor';
      }

      return {
        rttMs,
        packetLossPercent,
        jitterMs,
        quality,
        bitrateKbps,
        packetsReceived: totalPacketsReceived,
        packetsLost: totalPacketsLost,
        protocol,
      };
    } catch {
      return {
        rttMs: null,
        packetLossPercent: 0,
        jitterMs: null,
        quality: 'measuring',
      };
    }
  }

  public cleanup() {
    if (this.noiseFilterPipeline) {
      this.noiseFilterPipeline.destroy();
      this.noiseFilterPipeline = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch {}
      this.peerConnection = null;
    }
    this.remoteStream = null;
    this.isScreenSharing = false;
    this.originalVideoTrack = null;
    this.candidateQueue = [];
    this.isReady = false;
  }
}
