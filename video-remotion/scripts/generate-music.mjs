// Génère une musique d'ambiance originale (libre de droits, car synthétisée ici)
// 120 s, 84 BPM, progression Am - F - C - G, pad doux + arpège.
import { writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const SR = 44100;
const DUR = 121;
const N = SR * DUR;
const L = new Float32Array(N);
const R = new Float32Array(N);
const BPM = 84;
const beat = 60 / BPM;
const bar = beat * 4;

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
// accords (notes MIDI)
const chords = [
  [57, 60, 64, 69], // Am
  [53, 57, 60, 65], // F
  [48, 55, 60, 64], // C
  [55, 59, 62, 67], // G
];

function add(buf, i, v) { if (i >= 0 && i < N) buf[i] += v; }

// Pad : chaque accord dure 2 mesures
const chordLen = bar * 2;
for (let t0 = 0, k = 0; t0 < DUR; t0 += chordLen, k++) {
  const ch = chords[k % 4];
  const start = Math.floor(t0 * SR);
  const len = Math.floor((chordLen + 1.2) * SR);
  ch.forEach((m, idx) => {
    const f = midi(m);
    const det = 1 + (idx % 2 ? 0.0015 : -0.0015);
    for (let j = 0; j < len; j++) {
      const t = j / SR;
      const att = Math.min(1, t / 1.2);
      const rel = Math.min(1, Math.max(0, (chordLen + 1.2 - t) / 1.2));
      const env = att * rel * 0.045;
      const s = Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * det * t);
      const pan = idx / (ch.length - 1);
      add(L, start + j, s * env * (1 - pan * 0.5));
      add(R, start + j, s * env * (0.5 + pan * 0.5));
    }
  });
  // basse
  const fb = midi(ch[0] - 12);
  for (let j = 0; j < len; j++) {
    const t = j / SR;
    const env = Math.min(1, t / 0.05) * Math.min(1, Math.max(0, (chordLen + 0.5 - t) / 0.8)) * 0.09;
    const s = Math.sin(2 * Math.PI * fb * t);
    add(L, start + j, s * env); add(R, start + j, s * env);
  }
}

// Arpège en croches, entre à partir de 8 s
const eighth = beat / 2;
const pattern = [0, 1, 2, 3, 2, 1, 3, 2];
for (let t0 = 8 * bar / 4; t0 < DUR - 2; t0 += eighth) {
  const step = Math.round(t0 / eighth);
  const ch = chords[Math.floor(t0 / chordLen) % 4];
  const f = midi(ch[pattern[step % 8]] + 12);
  const start = Math.floor(t0 * SR);
  const len = Math.floor(0.9 * SR);
  const vel = step % 2 === 0 ? 0.05 : 0.035;
  const pan = 0.5 + 0.35 * Math.sin(step * 0.7);
  for (let j = 0; j < len; j++) {
    const t = j / SR;
    const env = Math.min(1, t / 0.004) * Math.exp(-t * 5) * vel;
    const s = Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(6 * Math.PI * f * t) * Math.exp(-t * 12);
    add(L, start + j, s * env * (1.2 - pan));
    add(R, start + j, s * env * (0.2 + pan));
  }
}

// Petit écho stéréo
const d = Math.floor(eighth * 3 * SR);
for (let i = d; i < N; i++) { L[i] += R[i - d] * 0.22; R[i] += L[i - d] * 0.22; }

// Normalisation
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const g = 0.89 / peak;
const buf = Buffer.alloc(44 + N * 4);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write("WAVE", 8);
buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write("data", 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.round(L[i] * g * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(R[i] * g * 32767), 46 + i * 4);
}
writeFileSync("out-music.wav", buf);
execSync("ffmpeg -y -loglevel error -i out-music.wav -b:a 160k public/musique.mp3 && rm out-music.wav");
console.log("public/musique.mp3 générée");
