/**
 * Multi-Peer WebRTC Engine for Friends & Squad Group Calling (up to 5 participants).
 * Manages peer connections in full-mesh topology with audio/video streaming,
 * active speaker detection, and automatic ICE candidate negotiation.
 */

import {
  GLOBAL_RTC_CONFIG,
  fetchFreshIceServers,
  getCustomUserIceServers,
  DEFAULT_RTC_ICE_SERVERS,
} from './webrtc';
import {
  getStudioAudioConstraints,
  getStudioVideoConstraints,
  StudioNoiseFilterPipeline,
  enhanceCallSDP,
  applyHDQualityToRTCSenders,
} from './audioProcessor';

export interface SquadCallHandlers {
  onStreamsUpdated: (streams: Map<string, MediaStream>) => void;
  onSignalData: (targetSocketId: string, signal: unknown) => void;
  onSpeakingChange?: (speakingMap: Record<string, boolean>) => void;
  onError?: (err: Error) => void;
}

interface PeerEntry {
  pc: RTCPeerConnection;
  remoteStream: MediaStream;
}

export class SquadCallManager {
  private peers = new Map<string, PeerEntry>();
  private localStream: MediaStream | null = null;
  private handlers: SquadCallHandlers;
  private isScreenSharing = false;
  private originalVideoTrack: MediaStreamTrack | null = null;
  private audioContext: AudioContext | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private remoteAnalysers = new Map<string, AnalyserNode>();
  private volumeCheckInterval: number | null = null;
  private speakingState: Record<string, boolean> = {};
  private candidateQueues = new Map<string, RTCIceCandidateInit[]>();
  private noiseFilterPipeline: StudioNoiseFilterPipeline | null = null;
  private isNoiseCancellationActive = true;
  private isEchoSuppressionActive = true;
  private isAudioMuted = false;
  private isVideoMuted = false;

  constructor(handlers: SquadCallHandlers) {
    this.handlers = handlers;
  }

  public async setNoiseCancellation(enabled: boolean): Promise<void> {
    this.isNoiseCancellationActive = enabled;
    if (this.noiseFilterPipeline) {
      await this.noiseFilterPipeline.setNoiseCancellation(enabled);
    }
    // Refresh audio sender track across all mesh peer connections respecting mute state
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !this.isAudioMuted;
        this.peers.forEach((peer) => {
          const senders = peer.pc.getSenders();
          const audioSender = senders.find((s) => s.track?.kind === 'audio');
          if (audioSender) {
            audioSender.replaceTrack(audioTrack).catch(() => {});
          }
        });
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
    // Refresh audio sender track across all mesh peer connections
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = true;
        this.peers.forEach((peer) => {
          const senders = peer.pc.getSenders();
          const audioSender = senders.find((s) => s.track?.kind === 'audio');
          if (audioSender) {
            audioSender.replaceTrack(audioTrack).catch(() => {});
          }
        });
      }
    }
  }

  public isEchoSuppressionEnabled(): boolean {
    return this.isEchoSuppressionActive;
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  public getRemoteStreams(): Map<string, MediaStream> {
    const map = new Map<string, MediaStream>();
    this.peers.forEach((entry, socketId) => {
      map.set(socketId, new MediaStream(entry.remoteStream.getTracks()));
    });
    return map;
  }

  /**
   * Start or join a squad call with local camera/microphone
   */
  public async startCall(callType: 'audio' | 'video'): Promise<MediaStream> {
    return this.initLocalMedia(callType);
  }

  /**
   * Leave call and release all peer connections and media
   */
  public leaveCall(): void {
    this.cleanup();
  }

  /**
   * Connect to a specific peer in the mesh
   */
  public async connectToPeer(targetSocketId: string, isInitiator: boolean): Promise<void> {
    return this.addPeer(targetSocketId, isInitiator);
  }

  /**
   * Acquire local camera and microphone stream
   */
  public async initLocalMedia(callType: 'audio' | 'video'): Promise<MediaStream> {
    this.cleanup();

    const constraints: MediaStreamConstraints = {
      audio: getStudioAudioConstraints(this.isNoiseCancellationActive, this.isEchoSuppressionActive),
      video: callType === 'video' ? getStudioVideoConstraints() : false,
    };

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Camera and microphone are not supported on this browser or connection is not secure (HTTPS required).');
    }

    try {
      const rawStream = await navigator.mediaDevices.getUserMedia(constraints);
      rawStream.getTracks().forEach((track) => {
        track.enabled = true;
      });
      this.noiseFilterPipeline = new StudioNoiseFilterPipeline(
        rawStream,
        this.isNoiseCancellationActive,
        this.isEchoSuppressionActive
      );
      this.localStream = this.noiseFilterPipeline.getStream();
    } catch (err) {
      console.warn('getUserMedia ideal constraints failed, trying basic fallback:', err);
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
      } catch (fallbackErr) {
        if (callType === 'video') {
          console.warn('Camera failed or permission denied, falling back to audio-only for squad call:', fallbackErr);
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
        } else {
          throw fallbackErr;
        }
      }
    }

    this.setupAudioAnalysis();
    return this.localStream;
  }

  /**
   * Setup Web Audio API volume analyser for active speaker detection
   */
  private setupAudioAnalysis() {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.audioContext = new AudioCtx();

      if (this.localStream && this.localStream.getAudioTracks().length > 0) {
        const source = this.audioContext.createMediaStreamSource(this.localStream);
        this.localAnalyser = this.audioContext.createAnalyser();
        this.localAnalyser.fftSize = 256;
        source.connect(this.localAnalyser);
      }

      this.startVolumeMonitoring();
    } catch (err) {
      console.warn('Could not initialize audio analyser:', err);
    }
  }

  private startVolumeMonitoring() {
    if (this.volumeCheckInterval) return;

    this.volumeCheckInterval = window.setInterval(() => {
      let stateChanged = false;

      // Local speaking detection
      if (this.localAnalyser && this.localStream) {
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack && audioTrack.enabled) {
          const buffer = new Uint8Array(this.localAnalyser.frequencyBinCount);
          this.localAnalyser.getByteFrequencyData(buffer);
          let sum = 0;
          for (let i = 0; i < buffer.length; i++) sum += buffer[i];
          const average = sum / buffer.length;
          const isSpeaking = average > 14;

          if (this.speakingState['local'] !== isSpeaking) {
            this.speakingState['local'] = isSpeaking;
            stateChanged = true;
          }
        } else if (this.speakingState['local']) {
          this.speakingState['local'] = false;
          stateChanged = true;
        }
      }

      // Remote speaking detection
      this.remoteAnalysers.forEach((analyser, socketId) => {
        const buffer = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) sum += buffer[i];
        const average = sum / buffer.length;
        const isSpeaking = average > 14;

        if (this.speakingState[socketId] !== isSpeaking) {
          this.speakingState[socketId] = isSpeaking;
          stateChanged = true;
        }
      });

      if (stateChanged && this.handlers.onSpeakingChange) {
        this.handlers.onSpeakingChange({ ...this.speakingState });
      }
    }, 120);
  }

  /**
   * Connect with a remote peer in the squad
   */
  public async addPeer(targetSocketId: string, isInitiator: boolean): Promise<void> {
    if (this.peers.has(targetSocketId)) return;

    const customIce = getCustomUserIceServers();
    let iceServers = [...customIce, ...(GLOBAL_RTC_CONFIG.iceServers || DEFAULT_RTC_ICE_SERVERS)];
    try {
      const fresh = await fetchFreshIceServers();
      if (fresh && fresh.length > 0) {
        iceServers = fresh;
      }
    } catch {}

    const pc = new RTCPeerConnection({
      ...GLOBAL_RTC_CONFIG,
      iceServers,
    });
    const remoteStream = new MediaStream();

    this.peers.set(targetSocketId, { pc, remoteStream });

    // Handle incoming remote tracks
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        event.streams[0].getTracks().forEach((track) => {
          track.enabled = true;
          if (!remoteStream.getTracks().includes(track)) {
            remoteStream.addTrack(track);
          }
        });
      }
      if (event.track) {
        event.track.enabled = true;
        if (!remoteStream.getTracks().includes(event.track)) {
          remoteStream.addTrack(event.track);
        }
      }

      // Hook up remote audio to analyser and hardware speakers
      if (this.audioContext && remoteStream.getAudioTracks().length > 0 && !this.remoteAnalysers.has(targetSocketId)) {
        try {
          if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(() => {});
          }
          const source = this.audioContext.createMediaStreamSource(remoteStream);
          const analyser = this.audioContext.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);

          const gainNode = this.audioContext.createGain();
          gainNode.gain.value = 1.0;
          source.connect(gainNode);
          gainNode.connect(this.audioContext.destination);

          this.remoteAnalysers.set(targetSocketId, analyser);
        } catch (err) {
          console.warn('Could not route remote peer audio:', err);
        }
      }

      this.notifyStreams();
    };

    // Connection state handler
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        this.notifyStreams();
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        this.notifyStreams();
      }
    };

    // Forward ICE candidates to the specific target socket
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.handlers.onSignalData(targetSocketId, {
          candidate: event.candidate.toJSON ? event.candidate.toJSON() : {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
          },
        });
      }
    };

    // Add local tracks to this peer connection respecting mute state
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        if (track.kind === 'audio') {
          track.enabled = !this.isAudioMuted;
        } else if (track.kind === 'video') {
          track.enabled = !this.isVideoMuted;
        }
        pc.addTrack(track, this.localStream!);
      });
    }

    // If initiator, generate offer
    if (isInitiator) {
      try {
        const rawOffer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        const offer: RTCSessionDescriptionInit = {
          type: rawOffer.type,
          sdp: enhanceCallSDP(rawOffer.sdp || ''),
        };
        await pc.setLocalDescription(offer);
        applyHDQualityToRTCSenders(pc).catch(() => {});
        this.handlers.onSignalData(targetSocketId, { offer });
      } catch (err) {
        console.error(`Error creating offer for ${targetSocketId}:`, err);
      }
    }
  }

  /**
   * Process targeted signal data (offer, answer, ICE candidate) from a peer
   */
  public async handleSignal(senderSocketId: string, signalData: any): Promise<void> {
    if (!this.peers.has(senderSocketId)) {
      await this.addPeer(senderSocketId, false);
    }

    const peer = this.peers.get(senderSocketId);
    if (!peer) return;

    const { pc } = peer;

    try {
      if (signalData.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(signalData.offer));
        await this.flushQueuedCandidates(senderSocketId, pc);
        const rawAnswer = await pc.createAnswer();
        const answer: RTCSessionDescriptionInit = {
          type: rawAnswer.type,
          sdp: enhanceCallSDP(rawAnswer.sdp || ''),
        };
        await pc.setLocalDescription(answer);
        applyHDQualityToRTCSenders(pc).catch(() => {});
        this.handlers.onSignalData(senderSocketId, { answer });
      } else if (signalData.answer) {
        await pc.setRemoteDescription(new RTCSessionDescription(signalData.answer));
        await this.flushQueuedCandidates(senderSocketId, pc);
      } else if (signalData.candidate) {
        if (!pc.remoteDescription) {
          if (!this.candidateQueues.has(senderSocketId)) {
            this.candidateQueues.set(senderSocketId, []);
          }
          this.candidateQueues.get(senderSocketId)!.push(signalData.candidate);
        } else {
          await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
        }
      }
    } catch (err) {
      console.warn(`Error handling signal from ${senderSocketId}:`, err);
    }
  }

  private async flushQueuedCandidates(socketId: string, pc: RTCPeerConnection): Promise<void> {
    const queue = this.candidateQueues.get(socketId);
    if (!queue || queue.length === 0) return;
    while (queue.length > 0) {
      const cand = queue.shift();
      if (cand) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (err) {
          console.warn(`Error applying queued candidate for ${socketId}:`, err);
        }
      }
    }
  }

  public removePeer(socketId: string): void {
    const peer = this.peers.get(socketId);
    if (peer) {
      try {
        peer.pc.close();
      } catch {
        // ignore
      }
      this.peers.delete(socketId);
    }

    this.remoteAnalysers.delete(socketId);
    delete this.speakingState[socketId];

    this.notifyStreams();
  }

  private notifyStreams() {
    this.handlers.onStreamsUpdated(this.getRemoteStreams());
  }

  public setAudioMuted(muted: boolean): boolean {
    this.isAudioMuted = muted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
    if (this.noiseFilterPipeline) {
      this.noiseFilterPipeline.getStream().getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
    this.peers.forEach((peer) => {
      peer.pc.getSenders().forEach((sender) => {
        if (sender.track && sender.track.kind === 'audio') {
          sender.track.enabled = !muted;
        }
      });
      peer.pc.getTransceivers().forEach((transceiver) => {
        if (transceiver.sender.track && transceiver.sender.track.kind === 'audio') {
          transceiver.sender.track.enabled = !muted;
        }
      });
    });
    return this.isAudioMuted;
  }

  public toggleMuteAudio(): boolean {
    return this.setAudioMuted(!this.isAudioMuted);
  }

  public setVideoMuted(off: boolean): boolean {
    this.isVideoMuted = off;
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = !off;
      });
    }
    this.peers.forEach((peer) => {
      peer.pc.getSenders().forEach((sender) => {
        if (sender.track && sender.track.kind === 'video') {
          sender.track.enabled = !off;
        }
      });
      peer.pc.getTransceivers().forEach((transceiver) => {
        if (transceiver.sender.track && transceiver.sender.track.kind === 'video') {
          transceiver.sender.track.enabled = !off;
        }
      });
    });
    return this.isVideoMuted;
  }

  public toggleMuteVideo(): boolean {
    return this.setVideoMuted(!this.isVideoMuted);
  }

  public async toggleScreenShare(): Promise<boolean> {
    if (!this.localStream) return false;

    if (!this.isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        const screenTrack = screenStream.getVideoTracks()[0];

        this.originalVideoTrack = this.localStream.getVideoTracks()[0] || null;

        // Replace track across all peer connections
        this.peers.forEach((peer) => {
          const sender = peer.pc.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        });

        screenTrack.onended = () => {
          this.revertScreenShare();
        };

        this.isScreenSharing = true;
        return true;
      } catch (err) {
        console.error('Error starting squad screen share:', err);
        return false;
      }
    } else {
      await this.revertScreenShare();
      return false;
    }
  }

  private async revertScreenShare(): Promise<void> {
    if (!this.isScreenSharing) return;

    if (this.originalVideoTrack) {
      this.peers.forEach((peer) => {
        const sender = peer.pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender && this.originalVideoTrack) {
          sender.replaceTrack(this.originalVideoTrack);
        }
      });
    }

    this.isScreenSharing = false;
    this.originalVideoTrack = null;
  }

  public cleanup(): void {
    if (this.noiseFilterPipeline) {
      this.noiseFilterPipeline.destroy();
      this.noiseFilterPipeline = null;
    }

    if (this.volumeCheckInterval) {
      clearInterval(this.volumeCheckInterval);
      this.volumeCheckInterval = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {
        // ignore
      }
      this.audioContext = null;
    }

    this.remoteAnalysers.clear();
    this.speakingState = {};

    this.peers.forEach((peer) => {
      try {
        peer.pc.close();
      } catch {
        // ignore
      }
    });
    this.peers.clear();

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
  }
}
