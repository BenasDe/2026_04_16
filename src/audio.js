/**
 * @file audio.js
 * @description Procedural Web Audio API Synthesizer for 8-bit / Chiptune SFX and Audio Feedback.
 * Completely self-contained: no external audio files required.
 */

class SoundFX {
  constructor() {
    this.ctx = null;
  }

  /**
   * Lazy-initializes the Web Audio Context upon the first user interaction.
   */
  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Plays a single synthetic oscillator tone.
   * @param {number} freq - Frequency in Hz.
   * @param {OscillatorType} type - 'sine' | 'square' | 'sawtooth' | 'triangle'.
   * @param {number} duration - Duration in seconds.
   * @param {number} gainVal - Volume level (0.0 to 1.0).
   */
  playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.1) {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // AudioContext fallback handling
    }
  }

  /**
   * Player movement / grid step sound effect.
   */
  step() {
    this.init();
    this.playTone(180, 'triangle', 0.05, 0.04);
  }

  /**
   * Arpeggiated chime for correct PySpark function execution.
   */
  correct() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.15);
    });
  }

  /**
   * Low buzz / dissonance sound for runtime error / wrong PySpark choice.
   */
  wrong() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [220, 180, 130].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.1 + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.18);
    });
  }

  /**
   * Coffee sip sound for restoring Sanity and Health.
   */
  coffee() {
    this.init();
    this.playTone(880, 'sine', 0.15, 0.1);
    setTimeout(() => this.playTone(1320, 'sine', 0.2, 0.1), 120);
  }

  /**
   * Battle encounter trigger sound.
   */
  encounter() {
    this.init();
    this.playTone(300, 'sawtooth', 0.3, 0.15);
  }

  /**
   * Victory fanfare & celebratory confetti.
   */
  victory() {
    this.init();
    if (window.confetti) {
      window.confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
    }
  }
}

// Export a singleton sound manager instance
window.sfx = new SoundFX();
