// Musique originale de 5 min (synthétisée ici, donc libre de droits).
// Ambiance cinématographique douce : nappes de cordes, piano, basse, en ré majeur.
import { writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const SR = 44100, DUR = 302, N = SR * DUR;
const L = new Float32Array(N), R = new Float32Array(N);
const BPM = 70, beat = 60 / BPM, bar = beat * 4;
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
// D - A - Bm - G | D - A - G - A
const prog = [
  [50, 57, 62, 66], [45, 57, 61, 64], [47, 54, 62, 66], [43, 55, 59, 62],
  [50, 57, 62, 66], [45, 57, 61, 64], [43, 55, 59, 62], [45, 57, 61, 64],
];
const add = (b, i, v) => { if (i >= 0 && i < N) b[i] += v; };
// intensité globale par section (secondes)
const energy = (t) => {
  const pts = [[0, 0.35], [20, 0.55], [35, 0.75], [120, 0.85], [185, 0.7], [230, 0.8], [265, 1], [290, 0.6], [302, 0.4]];
  for (let k = 0; k < pts.length - 1; k++) {
    const [a, va] = pts[k], [b, vb] = pts[k + 1];
    if (t >= a && t <= b) return va + (vb - va) * ((t - a) / (b - a));
  }
  return 0.4;
};

// Nappe de cordes (ensemble désaccordé, attaque lente)
for (let c = 0; c * bar < DUR; c++) {
  const ch = prog[c % prog.length], t0 = c * bar, start = Math.floor(t0 * SR), len = Math.floor((bar + 2) * SR);
  const e = energy(t0);
  ch.forEach((m, idx) => {
    for (const det of [-0.003, 0, 0.0035]) {
      const f = midi(m + 12) * (1 + det);
      const ph = Math.random() * 6.28;
      for (let j = 0; j < len; j += 1) {
        const t = j / SR;
        const env = Math.min(1, t / 1.8) * Math.min(1, Math.max(0, (bar + 2 - t) / 2)) * 0.018 * e;
        const vib = 1 + 0.002 * Math.sin(2 * Math.PI * 5 * t + idx);
        const x = 2 * Math.PI * f * vib * t + ph;
        const sgl = Math.sin(x) + 0.35 * Math.sin(2 * x) + 0.15 * Math.sin(3 * x);
        const pan = (idx + det * 100) / 4;
        add(L, start + j, sgl * env * (1 - pan * 0.6));
        add(R, start + j, sgl * env * (0.4 + pan * 0.6));
      }
    }
  });
  // basse
  const fb = midi(ch[0] - 12);
  for (let j = 0; j < len; j++) {
    const t = j / SR;
    const env = Math.min(1, t / 0.08) * Math.min(1, Math.max(0, (bar + 0.6 - t) / 1)) * 0.11 * e;
    const v = Math.sin(2 * Math.PI * fb * t) + 0.2 * Math.sin(4 * Math.PI * fb * t);
    add(L, start + j, v * env); add(R, start + j, v * env);
  }
}

// Piano : arpège + mélodie simple, entre à 20 s
const piano = (f, t0, vel, pan) => {
  const start = Math.floor(t0 * SR), len = Math.floor(3.2 * SR);
  for (let j = 0; j < len; j++) {
    const t = j / SR;
    const env = Math.min(1, t / 0.003) * (Math.exp(-t * 1.6) * 0.8 + Math.exp(-t * 7) * 0.2) * vel;
    const x = 2 * Math.PI * f * t;
    const v = Math.sin(x) + 0.45 * Math.sin(2 * x) * Math.exp(-t * 3) + 0.2 * Math.sin(3.01 * x) * Math.exp(-t * 5) + 0.08 * Math.sin(4.02 * x) * Math.exp(-t * 8);
    add(L, start + j, v * env * (1 - pan)); add(R, start + j, v * env * pan);
  }
};
const arp = [0, 2, 1, 3, 2, 1, 3, 2];
const melody = [74, 73, 71, 69, 74, 76, 74, 69, 71, 69, 67, 66, 67, 69, 66, 64]; // 2 notes par mesure
for (let t0 = 20; t0 < DUR - 6; t0 += beat / 2) {
  const step = Math.round(t0 / (beat / 2));
  const c = Math.floor(t0 / bar) % prog.length;
  const ch = prog[c];
  const e = energy(t0);
  piano(midi(ch[arp[step % 8]] + 12), t0, 0.03 * e, 0.35 + 0.3 * ((step % 8) / 8));
  const inMel = (t0 > 35 && t0 < 118) || (t0 > 232 && t0 < 288);
  if (inMel && step % 4 === 0) {
    const k = Math.floor(t0 / (bar / 2)) % melody.length;
    piano(midi(melody[k] + 12), t0, 0.06 * e, 0.55);
  }
}

// Réverbération simple (échos multiples)
const taps = [[0.031, 0.35], [0.053, 0.3], [0.089, 0.25], [0.137, 0.2], [0.211, 0.15], [0.317, 0.1]];
const Lc = L.slice(), Rc = R.slice();
for (const [d, g] of taps) {
  const k = Math.floor(d * SR);
  for (let i = k; i < N; i++) { L[i] += Rc[i - k] * g; R[i] += Lc[i - k] * g; }
}

let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const g = 0.89 / peak;
const buf = Buffer.alloc(44 + N * 4);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write("WAVE", 8); buf.write("fmt ", 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.round(L[i] * g * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(R[i] * g * 32767), 46 + i * 4);
}
writeFileSync("out-music.wav", buf);
execSync("ffmpeg -y -loglevel error -i out-music.wav -b:a 256k public/musique.mp3 && rm out-music.wav");
console.log("public/musique.mp3 générée");
