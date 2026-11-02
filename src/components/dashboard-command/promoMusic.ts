// Background music made in code (Web Audio). No audio files, no licensing, no cost per video.

export type Mood = 'none' | 'calm' | 'upbeat' | 'warm';
export const MOOD_LABEL: Record<Mood, string> = { none: 'No music', calm: 'Calm', upbeat: 'Upbeat', warm: 'Warm' };

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

// Each mood: tempo, chord roots (MIDI), minor/major, and whether it has a beat.
const MOODS: Record<Exclude<Mood, 'none'>, { bpm: number; roots: number[]; minor: boolean; beat: boolean; wave: OscillatorType }> = {
  calm: { bpm: 72, roots: [57, 53, 48, 55], minor: true, beat: false, wave: 'sine' },
  upbeat: { bpm: 112, roots: [60, 67, 69, 65], minor: false, beat: true, wave: 'triangle' },
  warm: { bpm: 88, roots: [53, 60, 62, 57], minor: false, beat: false, wave: 'sine' },
};

const noteAt = (ac: AudioContext, out: AudioNode, wave: OscillatorType, freq: number, t: number, dur: number, vol: number) => {
  const o = ac.createOscillator(); const g = ac.createGain();
  o.type = wave; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
};

/** Schedules `seconds` of music starting now. Returns a function that stops it early. */
export const playMusic = (ac: AudioContext, dest: AudioNode, mood: Exclude<Mood, 'none'>, seconds: number): (() => void) => {
  const m = MOODS[mood];
  const master = ac.createGain(); const now = ac.currentTime + 0.05;
  master.gain.setValueAtTime(0.0001, now); master.gain.exponentialRampToValueAtTime(0.22, now + 0.8);
  master.gain.setValueAtTime(0.22, now + Math.max(1, seconds - 1.5)); master.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
  master.connect(dest);
  const beat = 60 / m.bpm; const bar = beat * 4;
  const third = m.minor ? 3 : 4;
  for (let b = 0; b * bar < seconds; b++) {
    const root = m.roots[b % m.roots.length]; const t0 = now + b * bar;
    [0, third, 7].forEach((iv) => noteAt(ac, master, m.wave, hz(root + iv), t0, bar * 1.05, 0.12)); // pad chord
    noteAt(ac, master, 'sine', hz(root - 12), t0, bar * 0.95, 0.2); // bass
    for (let i = 0; i < 8; i++) { // gentle arpeggio
      const iv = [0, third, 7, 12][i % 4] + (i > 3 ? 12 : 0);
      noteAt(ac, master, 'triangle', hz(root + 12 + iv), t0 + i * (beat / 2), beat * 0.6, m.beat ? 0.08 : 0.05);
    }
    if (m.beat) {
      for (let i = 0; i < 4; i++) {
        const tk = t0 + i * beat; const o = ac.createOscillator(); const g = ac.createGain(); // soft kick
        o.frequency.setValueAtTime(130, tk); o.frequency.exponentialRampToValueAtTime(45, tk + 0.12);
        g.gain.setValueAtTime(0.5, tk); g.gain.exponentialRampToValueAtTime(0.0001, tk + 0.18);
        o.connect(g); g.connect(master); o.start(tk); o.stop(tk + 0.2);
      }
    }
  }
  return () => { try { master.gain.cancelScheduledValues(ac.currentTime); master.gain.setTargetAtTime(0.0001, ac.currentTime, 0.05); } catch { /* already stopped */ } };
};
