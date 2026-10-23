// Web Audio API sound generator for scanner beep
// Works 100% offline, zero network requests, zero audio asset latency

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioContext || audioContext.state === 'closed') {
      audioContext = new AudioCtx();
    }
    return audioContext;
  } catch (e) {
    console.warn('AudioContext not available:', e);
    return null;
  }
}

/**
 * Plays a clean, professional barcode scanner beep (1850Hz sine wave for ~100ms)
 */
export function playScanBeep(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // 1850 Hz is the standard high-pitch confirmation tone of commercial optical scanners
    osc.frequency.setValueAtTime(1850, ctx.currentTime);

    // Smooth envelope to prevent audio clicking
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  } catch (e) {
    console.warn('Failed to play scan beep:', e);
  }
}
