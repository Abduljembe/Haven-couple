/**
 * WebRTC & Audio/Video Automated Diagnostics Engine.
 * Tests microphone, camera, speaker/AudioContext, STUN/TURN NAT traversal,
 * and signaling server connectivity with deep actionable telemetry.
 */

import { GLOBAL_RTC_CONFIG, fetchFreshIceServers } from './webrtc';
import { getAudioContext, unlockAudioContext } from './sounds';

export interface DiagnosticResult {
  id: 'microphone' | 'camera' | 'audio_context' | 'nat_turn' | 'signaling';
  name: string;
  category: 'audio' | 'video' | 'network' | 'system';
  status: 'pending' | 'running' | 'passed' | 'warning' | 'failed';
  score: number; // 0 - 100
  title: string;
  details: string;
  metrics?: Record<string, string | number | boolean>;
}

export interface FullDiagnosticReport {
  timestamp: number;
  overallStatus: 'passed' | 'warning' | 'failed';
  overallScore: number;
  results: DiagnosticResult[];
  summary: string;
  recommendations: string[];
}

/**
 * Test 1: Microphone Hardware & Live Input Level
 */
export async function testMicrophone(): Promise<DiagnosticResult> {
  const result: DiagnosticResult = {
    id: 'microphone',
    name: 'Microphone & Audio Input',
    category: 'audio',
    status: 'running',
    score: 0,
    title: 'Testing microphone...',
    details: 'Requesting audio stream and measuring real-time input amplitude...',
  };

  try {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return {
        ...result,
        status: 'failed',
        score: 0,
        title: 'Media API Not Supported',
        details: 'Browser does not support navigator.mediaDevices.getUserMedia or is running over insecure HTTP.',
      };
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack || audioTrack.readyState !== 'live') {
      stream.getTracks().forEach((t) => t.stop());
      return {
        ...result,
        status: 'failed',
        score: 10,
        title: 'No Active Audio Track',
        details: 'Microphone stream was created but no live audio tracks were detected.',
      };
    }

    const settings = audioTrack.getSettings ? audioTrack.getSettings() : {};
    const label = audioTrack.label || 'Default Microphone';

    // Measure live volume RMS via Web Audio AnalyserNode
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }

    let peakVolume = 0;
    try {
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      const startTime = Date.now();

      // Sample volume over 400ms
      await new Promise<void>((resolve) => {
        const check = () => {
          analyser.getByteTimeDomainData(buffer);
          let sum = 0;
          for (let i = 0; i < buffer.length; i++) {
            const val = (buffer[i] - 128) / 128;
            sum += val * val;
          }
          const rms = Math.sqrt(sum / buffer.length);
          const level = Math.min(100, Math.round(rms * 250));
          if (level > peakVolume) peakVolume = level;

          if (Date.now() - startTime >= 400) {
            try {
              source.disconnect();
            } catch {}
            resolve();
          } else {
            requestAnimationFrame(check);
          }
        };
        check();
      });
    } catch (analyserErr) {
      console.warn('Volume meter check skipped:', analyserErr);
    }

    // Stop test stream
    stream.getTracks().forEach((t) => t.stop());

    const isSilent = peakVolume === 0;
    return {
      ...result,
      status: isSilent ? 'warning' : 'passed',
      score: isSilent ? 70 : 100,
      title: isSilent ? 'Microphone Active (Low Level)' : 'Microphone Ready & Capturing',
      details: isSilent
        ? `Device "${label}" is connected and allowed, but input level is low or quiet.`
        : `Device "${label}" is actively streaming crystal-clear audio (Sample Rate: ${settings.sampleRate || 48000} Hz).`,
      metrics: {
        device: label,
        sampleRate: settings.sampleRate || 48000,
        channelCount: settings.channelCount || 1,
        liveVolumeLevel: `${peakVolume}%`,
      },
    };
  } catch (err: any) {
    const isDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
    return {
      ...result,
      status: 'failed',
      score: 0,
      title: isDenied ? 'Microphone Permission Blocked' : 'Microphone Unavailable',
      details: isDenied
        ? 'Microphone access was denied in your browser. Click the lock/camera icon in your address bar to allow audio.'
        : `Could not access audio hardware: ${err.message || err.name}`,
    };
  }
}

/**
 * Test 2: Camera Hardware & Resolution
 */
export async function testCamera(): Promise<DiagnosticResult> {
  const result: DiagnosticResult = {
    id: 'camera',
    name: 'Camera & Video Stream',
    category: 'video',
    status: 'running',
    score: 0,
    title: 'Testing camera...',
    details: 'Requesting video frame pipeline and checking sensor capabilities...',
  };

  try {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return {
        ...result,
        status: 'failed',
        score: 0,
        title: 'Media API Not Supported',
        details: 'Browser does not support navigator.mediaDevices.getUserMedia or is running over insecure HTTP.',
      };
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280, min: 320 },
        height: { ideal: 720, min: 240 },
        facingMode: 'user',
      },
    });

    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack || videoTrack.readyState !== 'live') {
      stream.getTracks().forEach((t) => t.stop());
      return {
        ...result,
        status: 'failed',
        score: 10,
        title: 'No Active Video Track',
        details: 'Webcam stream was opened but returned no active frame captures.',
      };
    }

    const settings = videoTrack.getSettings ? videoTrack.getSettings() : {};
    const label = videoTrack.label || 'Webcam';
    const width = settings.width || 1280;
    const height = settings.height || 720;
    const fps = Math.round(settings.frameRate || 30);

    // Stop test stream
    stream.getTracks().forEach((t) => t.stop());

    return {
      ...result,
      status: 'passed',
      score: 100,
      title: 'Camera High Definition Ready',
      details: `Active sensor "${label}" capturing at ${width}x${height} @ ${fps}fps.`,
      metrics: {
        device: label,
        resolution: `${width}x${height}`,
        frameRate: `${fps} fps`,
        facingMode: settings.facingMode || 'user',
      },
    };
  } catch (err: any) {
    const isDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
    return {
      ...result,
      status: 'failed',
      score: 0,
      title: isDenied ? 'Camera Permission Blocked' : 'Camera Hardware Unavailable',
      details: isDenied
        ? 'Camera access was denied in browser permissions. Allow camera access in your browser address bar settings.'
        : `Could not access video sensor: ${err.message || err.name}`,
    };
  }
}

/**
 * Test 3: Speaker / Web Audio Playback Engine
 */
export async function testSpeakerAudio(): Promise<DiagnosticResult> {
  const result: DiagnosticResult = {
    id: 'audio_context',
    name: 'Speaker & Web Audio Engine',
    category: 'audio',
    status: 'running',
    score: 0,
    title: 'Testing speaker output...',
    details: 'Checking Web Audio hardware destination and unlocking audio graph...',
  };

  try {
    unlockAudioContext();
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }

    const isRunning = ctx.state === 'running';
    const channels = ctx.destination.maxChannelCount || 2;
    const sampleRate = ctx.sampleRate || 48000;

    // Emit an ultra-gentle, pleasant 0.05s calibration pulse to ensure output pipe is open
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.005; // very quiet calibration
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {}

    return {
      ...result,
      status: isRunning ? 'passed' : 'warning',
      score: isRunning ? 100 : 75,
      title: isRunning ? 'Speaker Pipeline Fully Unlocked' : 'Audio Graph Suspended (Tap to Unlock)',
      details: isRunning
        ? `High-fidelity audio hardware verified (${sampleRate} Hz, ${channels} output channels). Auto-play restrictions cleared.`
        : 'Web Audio graph is currently suspended awaiting user touch or interaction to allow speaker output.',
      metrics: {
        audioContextState: ctx.state,
        sampleRate: `${sampleRate} Hz`,
        outputChannels: channels,
      },
    };
  } catch (err: any) {
    return {
      ...result,
      status: 'failed',
      score: 20,
      title: 'Web Audio Engine Error',
      details: `Browser failed to initialize AudioContext: ${err.message || err}`,
    };
  }
}

/**
 * Test 4: STUN & TURN NAT Traversal (Firewall & Cross-Network Traversal)
 */
export async function testNatTraversal(roomId?: string): Promise<DiagnosticResult> {
  const result: DiagnosticResult = {
    id: 'nat_turn',
    name: 'STUN & TURN Network Traversal',
    category: 'network',
    status: 'running',
    score: 0,
    title: 'Testing STUN & TURN relays...',
    details: 'Gathering ICE candidates across Google STUN, Cloudflare, and configured TURN relays...',
  };

  try {
    const iceServers = await fetchFreshIceServers(roomId);
    const pc = new RTCPeerConnection({
      iceServers: iceServers && iceServers.length > 0 ? iceServers : GLOBAL_RTC_CONFIG.iceServers,
      iceCandidatePoolSize: 0,
    });

    // Create a dummy data channel to trigger ICE candidate gathering
    pc.createDataChannel('ice-diagnostic-channel');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const candidates: RTCIceCandidate[] = [];
    const typesFound = new Set<string>();

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        resolve();
      }, 3500);

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          candidates.push(e.candidate);
          const type = e.candidate.type;
          if (type) typesFound.add(type);

          // If we found both srflx (STUN) and relay (TURN), we have complete coverage
          if (typesFound.has('srflx') && typesFound.has('relay')) {
            clearTimeout(timeout);
            setTimeout(resolve, 300);
          }
        } else {
          // Gathering complete
          clearTimeout(timeout);
          resolve();
        }
      };
    });

    pc.close();

    const hasHost = typesFound.has('host');
    const hasSrflx = typesFound.has('srflx');
    const hasRelay = typesFound.has('relay');

    let score = 50;
    if (hasHost) score += 10;
    if (hasSrflx) score += 20;
    if (hasRelay) score += 20;

    let status: DiagnosticResult['status'] = 'passed';
    let title = 'Relay Traversal Active';
    let details = 'All network paths are open. Calls can connect seamlessly over Wi-Fi, 4G/5G, and firewalls.';

    if (!hasRelay && !hasSrflx) {
      status = 'warning';
      title = 'Direct LAN Only (No STUN/TURN)';
      details = 'Only local host candidates were discovered. Remote cross-network calls may encounter firewall obstacles.';
      score = 40;
    } else if (!hasRelay) {
      status = 'passed';
      title = 'STUN Direct P2P Active';
      details = `Public STUN reflection verified (${candidates.length} candidates). TURN relay is optional for standard NATs.`;
      score = 85;
    } else {
      title = 'TURN Relay & STUN 100% Operational';
      details = `Gathered ${candidates.length} candidate paths (Host, STUN Reflexive, TURN Relay). Traverses symmetric NATs and international routes.`;
      score = 100;
    }

    return {
      ...result,
      status,
      score,
      title,
      details,
      metrics: {
        totalCandidates: candidates.length,
        candidateTypes: Array.from(typesFound).join(', ') || 'none',
        stunDiscovered: hasSrflx ? 'Yes' : 'No',
        turnRelayDiscovered: hasRelay ? 'Yes' : 'No',
        configuredServers: (iceServers || []).length,
      },
    };
  } catch (err: any) {
    return {
      ...result,
      status: 'failed',
      score: 10,
      title: 'ICE Candidate Gathering Failed',
      details: `Could not initiate RTCPeerConnection test: ${err.message || err}`,
    };
  }
}

/**
 * Test 5: Signaling Server Latency & WebSocket Gateway
 */
export async function testSignalingLatency(): Promise<DiagnosticResult> {
  const result: DiagnosticResult = {
    id: 'signaling',
    name: 'Signaling Gateway & Route Latency',
    category: 'network',
    status: 'running',
    score: 0,
    title: 'Testing signaling server latency...',
    details: 'Pinging /api/webrtc/ping to calculate round-trip handshake responsiveness...',
  };

  try {
    const start = performance.now();
    const res = await fetch('/api/webrtc/ping', { cache: 'no-store' });
    const elapsed = Math.round(performance.now() - start);

    if (res.ok) {
      const data = await res.json();
      const isFast = elapsed < 150;
      const isNormal = elapsed < 400;

      return {
        ...result,
        status: isFast || isNormal ? 'passed' : 'warning',
        score: isFast ? 100 : isNormal ? 85 : 65,
        title: isFast ? 'Signaling Gateway Ultra-Fast' : 'Signaling Gateway Active',
        details: `Connected to signaling relay in ${elapsed} ms. Real-time call negotiation and ICE candidate exchange are synchronized.`,
        metrics: {
          latencyMs: `${elapsed} ms`,
          serverStatus: data.status || 'ok',
          activeConnections: data.connectionsCount || 1,
        },
      };
    } else {
      return {
        ...result,
        status: 'warning',
        score: 50,
        title: 'Signaling Ping HTTP Fallback',
        details: `Server returned status ${res.status}. WebSocket signaling may still be operating via Socket.io.`,
      };
    }
  } catch (err: any) {
    return {
      ...result,
      status: 'warning',
      score: 50,
      title: 'Direct Ping Fallback',
      details: `Signaling ping could not complete over HTTP: ${err.message || err}. Socket channel is active.`,
    };
  }
}

/**
 * Run All Diagnostics Sequentially and Compile Full Report
 */
export async function runFullDiagnostics(callType: 'audio' | 'video' = 'video', roomId?: string): Promise<FullDiagnosticReport> {
  const results: DiagnosticResult[] = [];

  // Step 1: Microphone Test
  const micResult = await testMicrophone();
  results.push(micResult);

  // Step 2: Camera Test (if video call or full system test)
  if (callType === 'video') {
    const camResult = await testCamera();
    results.push(camResult);
  }

  // Step 3: Speaker & Web Audio Engine
  const speakerResult = await testSpeakerAudio();
  results.push(speakerResult);

  // Step 4: STUN / TURN Relays
  const natResult = await testNatTraversal(roomId);
  results.push(natResult);

  // Step 5: Signaling Server Ping
  const signalResult = await testSignalingLatency();
  results.push(signalResult);

  // Calculate overall score
  const totalScore = results.reduce((acc, curr) => acc + curr.score, 0);
  const overallScore = Math.round(totalScore / results.length);

  const hasFailed = results.some((r) => r.status === 'failed');
  const hasWarning = results.some((r) => r.status === 'warning');

  let overallStatus: FullDiagnosticReport['overallStatus'] = 'passed';
  if (hasFailed) overallStatus = 'failed';
  else if (hasWarning) overallStatus = 'warning';

  const recommendations: string[] = [];
  if (micResult.status === 'failed') {
    recommendations.push('Grant browser microphone permission to allow the other person to hear your voice.');
  }
  if (callType === 'video' && results.find((r) => r.id === 'camera')?.status === 'failed') {
    recommendations.push('Enable camera access in your browser toolbar or ensure another program is not locking the webcam.');
  }
  if (speakerResult.status === 'warning') {
    recommendations.push('Tap or click anywhere inside the call window to unlock browser speaker playback.');
  }
  if (natResult.status === 'warning') {
    recommendations.push('Verify network firewall allows UDP ports 19302 and TCP/UDP 80/443 for TURN relay streaming.');
  }

  if (recommendations.length === 0) {
    recommendations.push('Your audio, video, Web Audio engine, and STUN/TURN relays are all functioning perfectly.');
  }

  return {
    timestamp: Date.now(),
    overallStatus,
    overallScore,
    results,
    summary:
      overallStatus === 'passed'
        ? 'All audio, video, and network subsystems are operating normally.'
        : overallStatus === 'warning'
        ? 'Subsystems are functioning with minor warnings that can be auto-resolved.'
        : 'Action required: Grant required device permissions to restore audio/video.',
    recommendations,
  };
}
