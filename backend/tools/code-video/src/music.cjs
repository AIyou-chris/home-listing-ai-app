/**
 * A background music bed made in code, so there is nothing to license.
 *
 * A soft pad on a four-chord loop, a light plucked arpeggio, a quiet kick and
 * a faint hat, with a little echo. It is meant to sit under a voice, not to be
 * a song. Same seed, same tune, so a video can be re-made identically.
 *
 * Returns a 16-bit stereo WAV as a Buffer.
 */
const RATE = 44100;

// Chords as MIDI note numbers: Am, F, C, G (a warm, hopeful loop).
const PROGRESSIONS = {
  warm: { bpm: 92, chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]] },
  bright: { bpm: 104, chords: [[48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60]] }
};

const midi = n => 440 * Math.pow(2, (n - 69) / 12);

/** A tiny seeded random generator, so the hats are the same every time. */
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function makeMusicWav({ duration = 20, mood = 'warm', seed = 7, gain = 0.8 } = {}) {
  if (!(duration > 0 && duration <= 180)) throw new Error('duration must be between 0 and 180 seconds');
  const { bpm, chords } = PROGRESSIONS[mood] || PROGRESSIONS.warm;
  const total = Math.round(duration * RATE);
  const left = new Float32Array(total);
  const right = new Float32Array(total);
  const beat = 60 / bpm;
  const bar = beat * 4;
  const chordLen = bar * 2;
  const random = rng(seed);

  // Pad: three detuned sines per note, each chord swelling in and out.
  for (let c = 0; c * chordLen < duration + chordLen; c += 1) {
    const notes = chords[c % chords.length];
    const start = c * chordLen;
    for (const [ni, n] of notes.entries()) {
      for (const detune of [-0.0018, 0, 0.0018]) {
        const f = midi(n + 12) * (1 + detune);
        const from = Math.max(0, Math.floor(start * RATE));
        const to = Math.min(total, Math.floor((start + chordLen + 0.9) * RATE));
        const pan = 0.35 + ni * 0.15;
        for (let i = from; i < to; i += 1) {
          const t = i / RATE - start;
          const env = Math.min(1, t / 0.7) * Math.min(1, Math.max(0, (chordLen + 0.9 - t) / 0.9));
          const s = Math.sin(2 * Math.PI * f * (i / RATE)) * env * 0.035;
          left[i] += s * (1 - pan); right[i] += s * pan;
        }
      }
    }
    // Bass: the root, an octave down, long and soft.
    const bf = midi(notes[0] - 12);
    const from = Math.max(0, Math.floor(start * RATE));
    const to = Math.min(total, Math.floor((start + chordLen) * RATE));
    for (let i = from; i < to; i += 1) {
      const t = i / RATE - start;
      const env = Math.min(1, t / 0.2) * Math.min(1, (chordLen - t) / 0.4);
      const s = Math.sin(2 * Math.PI * bf * (i / RATE)) * env * 0.11;
      left[i] += s; right[i] += s;
    }
  }

  // Arpeggio: eighth-note plucks through the chord, each decaying quickly.
  const eighth = beat / 2;
  for (let k = 0; k * eighth < duration; k += 1) {
    const t0 = k * eighth;
    const chord = chords[Math.floor(t0 / chordLen) % chords.length];
    const pattern = [0, 1, 2, 1, 2, 1, 0, 2];
    const note = chord[pattern[k % pattern.length]] + 24;
    const f = midi(note);
    const from = Math.floor(t0 * RATE);
    const to = Math.min(total, from + Math.floor(0.7 * RATE));
    const pan = 0.3 + 0.4 * ((k % 4) / 3);
    for (let i = from; i < to; i += 1) {
      const t = (i - from) / RATE;
      const env = Math.exp(-t / 0.16) * Math.min(1, t / 0.004);
      const x = (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(4 * Math.PI * f * t)) * env * 0.05;
      left[i] += x * (1 - pan); right[i] += x * pan;
    }
  }

  // Kick on beats 1 and 3, a faint hat on the off beats.
  for (let b = 0; b * beat < duration; b += 1) {
    const t0 = b * beat;
    const from = Math.floor(t0 * RATE);
    if (b % 2 === 0) {
      const to = Math.min(total, from + Math.floor(0.3 * RATE));
      for (let i = from; i < to; i += 1) {
        const t = (i - from) / RATE;
        const f = 48 + 60 * Math.exp(-t / 0.045);
        const s = Math.sin(2 * Math.PI * f * t) * Math.exp(-t / 0.11) * 0.22;
        left[i] += s; right[i] += s;
      }
    } else {
      const hatFrom = Math.floor((t0 + beat / 2) * RATE);
      const to = Math.min(total, hatFrom + Math.floor(0.05 * RATE));
      for (let i = hatFrom; i < to; i += 1) {
        const t = (i - hatFrom) / RATE;
        const s = (random() * 2 - 1) * Math.exp(-t / 0.012) * 0.018;
        left[i] += s; right[i] += s;
      }
    }
  }

  // A little echo for space.
  const delay = Math.round(beat * 0.75 * RATE);
  for (let i = delay; i < total; i += 1) { left[i] += right[i - delay] * 0.22; right[i] += left[i - delay] * 0.22; }

  // Fade in and out, then normalise.
  const fadeIn = Math.floor(0.6 * RATE); const fadeOut = Math.floor(Math.min(1.6, duration / 3) * RATE);
  let peak = 0.0001;
  for (let i = 0; i < total; i += 1) {
    const env = Math.min(1, i / fadeIn) * Math.min(1, (total - i) / fadeOut);
    left[i] *= env; right[i] *= env;
    peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  }
  const scale = Math.min(gain, 0.85) / peak;

  const data = Buffer.alloc(44 + total * 4);
  data.write('RIFF', 0); data.writeUInt32LE(36 + total * 4, 4); data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(2, 22);
  data.writeUInt32LE(RATE, 24); data.writeUInt32LE(RATE * 4, 28); data.writeUInt16LE(4, 32); data.writeUInt16LE(16, 34);
  data.write('data', 36); data.writeUInt32LE(total * 4, 40);
  for (let i = 0; i < total; i += 1) {
    data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(left[i] * scale * 32767))), 44 + i * 4);
    data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(right[i] * scale * 32767))), 46 + i * 4);
  }
  return data;
}

module.exports = { makeMusicWav, PROGRESSIONS };
