/** Quiet procedural synth loop, independent of gameplay sound effects. */
class BackgroundMusic {
  constructor() {
    this.enabled = true;
    try { this.enabled = localStorage.getItem('pipeline_music') !== 'off'; } catch (_) {}
    this.ctx = null;
    this.timer = null;
    this.started = false;
    this.nodes = new Set();
    this.onChange = () => {};
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.stop();
      else if (this.started) this.start();
    });
  }

  async start() {
    this.started = true;
    if (!this.enabled || document.hidden) return;
    try {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        this.output = this.ctx.createGain();
        this.output.gain.value = 0.16;
        this.output.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      if (!this.enabled || document.hidden || this.timer !== null) return;
      this.step = 0;
      this.nextNote = this.ctx.currentTime + 0.05;
      this.schedule();
      this.timer = setInterval(() => this.schedule(), 50);
    } catch (_) {
      this.enabled = false;
      this.stop();
      this.onChange();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    try { localStorage.setItem('pipeline_music', this.enabled ? 'on' : 'off'); } catch (_) {}
    if (this.enabled) this.start();
    else this.stop();
    this.onChange();
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
    // Stop already scheduled notes too, so mute takes effect immediately.
    for (const node of this.nodes) {
      node.osc.stop();
      node.osc.disconnect();
      node.gain.disconnect();
    }
    this.nodes.clear();
  }

  note(midi, time, duration, volume, type = 'triangle') {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(gain);
    gain.connect(this.output);
    const node = { osc, gain };
    this.nodes.add(node);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
      this.nodes.delete(node);
    };
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  schedule() {
    // A minor / F major / C major / G major, at 88 BPM.
    const chords = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 65]];
    const pattern = [0, 2, 1, 3, 2, 1, 3, 2];
    const eighth = 60 / 88 / 2;
    if (this.nextNote < this.ctx.currentTime) this.nextNote = this.ctx.currentTime + 0.05;
    while (this.nextNote < this.ctx.currentTime + 0.15) {
      const chord = chords[Math.floor(this.step / 16) % chords.length];
      this.note(chord[pattern[this.step % pattern.length]] + 12, this.nextNote, 0.55, 0.12);
      if (this.step % 4 === 0) this.note(chord[0] - 12, this.nextNote, 1.1, 0.22, 'sine');
      this.step++;
      this.nextNote += eighth;
    }
  }
}

window.music = new BackgroundMusic();
