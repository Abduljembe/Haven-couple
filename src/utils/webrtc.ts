/**
 * WebRTC Calling Engine for Audio and Video calls.
 * Provides peer-to-peer media streaming with DTLS-SRTP encryption.
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

export interface WebRTCCallbackHandlers {
  onRemoteStream: (stream: MediaStream) => void;
  onSignalData: (signal: RTCSessionDescriptionInit | RTCIceCandidateInit) => void;
  onConnectionStateChange: (state: RTCPeerConnectionState) => void;
  onError?: (err: Error) => void;
}

export class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private handlers: WebRTCCallbackHandlers;
  private isScreenSharing = false;
  private originalVideoTrack: MediaStreamTrack | null = null;
  private candidateQueue: RTCIceCandidateInit[] = [];

  constructor(handlers: WebRTCCallbackHandlers) {
    this.handlers = handlers;
  }

  public async initLocalMedia(callType: 'audio' | 'video'): Promise<MediaStream> {
    this.cleanup();

    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: callType === 'video' ? {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user',
      } : false,
    };

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      return this.localStream;
    } catch (err) {
      console.warn('getUserMedia failed with ideal constraints, trying standard fallback:', err);
      // Fallback with basic constraints
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video',
      });
      return this.localStream;
    }
  }

  public createPeerConnection(): RTCPeerConnection {
    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch {
        // ignore
      }
    }

    this.peerConnection = new RTCPeerConnection(RTC_CONFIG);
    this.remoteStream = new MediaStream();
    this.candidateQueue = [];

    // ICE Candidate handler
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.handlers.onSignalData(event.candidate.toJSON());
      }
    };

    // Remote Track handler
    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        event.streams[0].getTracks().forEach((track) => {
          if (this.remoteStream && !this.remoteStream.getTracks().includes(track)) {
            this.remoteStream.addTrack(track);
          }
        });
      } else if (event.track) {
        if (this.remoteStream && !this.remoteStream.getTracks().includes(event.track)) {
          this.remoteStream.addTrack(event.track);
        }
      }

      if (this.remoteStream) {
        this.handlers.onRemoteStream(new MediaStream(this.remoteStream.getTracks()));
        this.handlers.onConnectionStateChange('connected');
      }
    };

    // Connection state handler
    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection) {
        this.handlers.onConnectionStateChange(this.peerConnection.connectionState);
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      if (this.peerConnection) {
        const iceState = this.peerConnection.iceConnectionState;
        if (iceState === 'connected' || iceState === 'completed') {
          this.handlers.onConnectionStateChange('connected');
        }
      }
    };

    // Add local tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        if (this.localStream && this.peerConnection) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });
    }

    return this.peerConnection;
  }

  public async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      this.createPeerConnection();
    }
    const pc = this.peerConnection!;
    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await pc.setLocalDescription(offer);
    return offer;
  }

  public async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      this.createPeerConnection();
    }
    const pc = this.peerConnection!;
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    await this.flushCandidateQueue();
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer;
  }

  public async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (this.peerConnection) {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      await this.flushCandidateQueue();
    }
  }

  public async handleCandidate(candidateInit: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) {
      this.candidateQueue.push(candidateInit);
      return;
    }
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateInit));
    } catch (err) {
      console.warn('Error adding ICE candidate:', err);
    }
  }

  private async flushCandidateQueue(): Promise<void> {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) return;
    while (this.candidateQueue.length > 0) {
      const candidateInit = this.candidateQueue.shift();
      if (candidateInit) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateInit));
        } catch (err) {
          console.warn('Error applying queued ICE candidate:', err);
        }
      }
    }
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
      currentVideoTrack.stop();
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing },
      });
      const newVideoTrack = newStream.getVideoTracks()[0];

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

  public cleanup() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.remoteStream = null;
    this.isScreenSharing = false;
    this.originalVideoTrack = null;
  }
}
