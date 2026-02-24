/**
 * AudioService — Tasbih Click Sound Engine
 * ─────────────────────────────────────────
 * Primary  : Web Audio API (decodeAudioData)
 *   → Buffer is decoded once and reused on every tap.
 *   → Each tap creates a new BufferSourceNode, so rapid
 *     clicks NEVER cut each other off (zero-latency).
 *   → AudioContext is resumed on first user interaction
 *     to comply with browser autoplay policy.
 *
 * Fallback : HTMLAudioElement.cloneNode()
 *   → Used only when Web Audio API is unavailable.
 *   → clone() gives each tap its own audio element,
 *     preventing taps from interrupting each other.
 */

const SOUND_URL =
  'https://ufxjvugkmiorxlogvcmx.supabase.co/storage/v1/object/' +
  'sign/FILE%20WEB/tasbih%20klik.wav?token=eyJraWQiOiJzdG9yYWdl' +
  'LXVybC1zaWduaW5nLWtleV8xZTU4ZTM4Yi1jZjFhLTRhZTktOWIyNC00YzBh' +
  'MmE4ZjYxNmEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJGSUxFIFdFQi90YXNi' +
  'aWgga2xpay53YXYiLCJpYXQiOjE3NzE1OTUwMjIsImV4cCI6MTgwMzEzMTAy' +
  'Mn0._q7wbD99S55nQdTZeKi79AoYkvfxtTOOAIAMWBKS-ak';

class AudioService {
  // ── Web Audio API ──────────────────────────────────────────────
  private ctx: AudioContext | null = null;
  private buffer: AudioBuffer | null = null;
  private bufferReady = false;

  // ── Fallback ──────────────────────────────────────────────────
  private fallbackAudio: HTMLAudioElement | null = null;
  private useWebAudio = false;

  constructor() {
    if (typeof window === 'undefined') return;

    // Detect Web Audio API support
    const AudioCtx =
      window.AudioContext || (window as any).webkitAudioContext;

    if (AudioCtx) {
      this.useWebAudio = true;
      this.ctx = new AudioCtx();
      this._loadBuffer();
    } else {
      // Pre-create fallback element (will be cloned on each tap)
      this.fallbackAudio = new Audio(SOUND_URL);
      this.fallbackAudio.volume = 0.2;
      this.fallbackAudio.load();
    }
  }

  /** Fetch and decode the WAV file into an AudioBuffer (once). */
  private async _loadBuffer() {
    try {
      const response = await fetch(SOUND_URL);
      const arrayBuffer = await response.arrayBuffer();
      this.buffer = await this.ctx!.decodeAudioData(arrayBuffer);
      this.bufferReady = true;
    } catch (err) {
      console.warn('[AudioService] Web Audio decode failed, will use synth fallback.', err);
      this.useWebAudio = false;
      // Prepare HTMLAudio fallback
      this.fallbackAudio = new Audio(SOUND_URL);
      this.fallbackAudio.volume = 0.2;
      this.fallbackAudio.load();
    }
  }

  /**
   * Call this on every user interaction (tap, click, keydown).
   * Ensures AudioContext is resumed after browser autoplay gate.
   */
  public async resumeContext() {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  /** Play the click sound (zero-latency, concurrent-safe). */
  public playClickSound() {
    // ── Primary: Web Audio API ──
    if (this.useWebAudio && this.ctx && this.bufferReady && this.buffer) {
      try {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const source = this.ctx.createBufferSource();
        source.buffer = this.buffer;
        const gain = this.ctx.createGain();
        gain.gain.value = 0.2;
        source.connect(gain);
        gain.connect(this.ctx.destination);
        source.start(0);
        return;
      } catch (e) {
        console.warn('[AudioService] Web Audio playback error:', e);
      }
    }

    // ── Fallback: cloneNode() so rapid taps don't get cut off ──
    if (this.fallbackAudio) {
      try {
        const clone = this.fallbackAudio.cloneNode() as HTMLAudioElement;
        clone.volume = 0.2;
        clone.play().catch(() => {/* silent — autoplay blocked */ });
        return;
      } catch (e) {
        console.warn('[AudioService] cloneNode fallback failed:', e);
      }
    }

    // ── Last resort: synthesized click via Web Audio ──
    this._playSynthClick();
  }

  /** Web Audio synthesis click (woodblock-like). */
  private _playSynthClick() {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) {
      // Completely silent fallback — nothing to do
    }
  }
}

export const audioService = new AudioService();