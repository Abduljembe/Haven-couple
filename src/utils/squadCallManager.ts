/**
 * Multi-Peer WebRTC Engine for Friends & Squad Group Calling (up to 5 participants).
 * Manages peer connections in full-mesh topology with audio/video streaming,
 * active speaker detection, and automatic ICE candidate negotiation.
 */

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

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

  constructor(handlers: SquadCallHandlers) {
    this.handlers = handlers;
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
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video:
        callType === 'video'
          ? {
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
              facingMode: 'user',
            }
          : false,
    };

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      console.warn('getUserMedia ideal constraints failed, trying basic fallback:', err);
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video',
      });
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

    const pc = new RTCPeerConnection(RTC_CONFIG);
    const remoteStream = new MediaStream();

    this.peers.set(targetSocketId, { pc, remoteStream });

    // Handle incoming remote tracks
    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        if (!remoteStream.getTracks().includes(track)) {
          remoteStream.addTrack(track);
        }
      });

      // Hook up remote audio to analyser for speaker highlight
      if (this.audioContext && remoteStream.getAudioTracks().length > 0 && !this.remoteAnalysers.has(targetSocketId)) {
        try {
          const source = this.audioContext.createMediaStreamSource(remoteStream);
          const analyser = this.audioContext.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          this.remoteAnalysers.set(targetSocketId, analyser);
        } catch {
          // ignore
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
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // Add local tracks to this peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        if (this.localStream) {
          pc.addTrack(track, this.localStream);
        }
      });
    }

    // If initiator, generate offer
    if (isInitiator) {
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);
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
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
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

  public toggleMuteAudio(): boolean {
    if (!this.localStream) return false;
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      return !audioTrack.enabled; // returns isMuted
    }
    return false;
  }

  public toggleMuteVideo(): boolean {
    if (!this.localStream) return false;
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      return !videoTrack.enabled; // returns isVideoOff
    }
    return false;
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
