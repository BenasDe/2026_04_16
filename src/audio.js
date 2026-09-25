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
   * Red Bull can pickup sound.
   */
  redBull() {
    this.init();
    this.playTone(880, 'sine', 0.12, 0.12);
    setTimeout(() => this.playTone(1320, 'sine', 0.18, 0.12), 100);
  }

  /**
   * Task encounter sound.
   */
  encounter() {
    this.init();
    this.playTone(320, 'sawtooth', 0.22, 0.12);
  }

  /**
   * Staging confirmation chime (neutral, does not reveal if answer is right or wrong).
   */
  stageTask() {
    this.init();
    this.playTone(587.33, 'sine', 0.08, 0.08); // D5
    setTimeout(() => this.playTone(880, 'sine', 0.14, 0.08), 80); // A5
  }

  /**
   * Diagnostic tick / test passed sound during pipeline run.
   */
  pipelineBeep(pitch = 600) {
    this.init();
    this.playTone(pitch, 'square', 0.06, 0.06);
  }

  /**
   * Hotfix sound when a mistake consumes a Red Bull.
   */
  pipelineHotfix() {
    this.init();
    this.playTone(440, 'sawtooth', 0.08, 0.1);
    setTimeout(() => this.playTone(880, 'square', 0.15, 0.1), 80);
  }

  /**
   * Pipeline success / level clear fanfare.
   */
  levelClear() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [440, 554.37, 659.25, 880].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, now + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.09 + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.2);
    });
  }

  /**
   * Pipeline crash / game over buzzer.
   */
  pipelineCrash() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [260, 220, 164, 110].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.24);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.24);
    });
  }

  /**
   * Final Victory fanfare & confetti.
   */
  victory() {
    this.init();
    if (window.confetti) {
      window.confetti({ particleCount: 120, spread: 85, origin: { y: 0.6 } });
    }
  }
}

// Export singleton sound instance
window.sfx = new SoundFX();
