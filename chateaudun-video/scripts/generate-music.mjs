// Musique originale joyeuse de 5 min (synthétisée ici, donc libre de droits).
// Sol majeur, 112 BPM : guitare en arpèges, glockenspiel, basse bondissante,
// percussions légères (grosse caisse, claps, shaker). Sections calées sur le film.
import { writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const SR = 44100, DUR = 302, N = SR * DUR;
const L = new Float32Array(N), R = new Float32Array(N);
const BPM = 112, beat = 60 / BPM, bar = beat * 4, s16 = beat / 4;
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const add = (i, l, r) => { if (i >= 0 && i < N) { L[i] += l; R[i] += r; } };

// Sections (secondes) : intro, montée, plein, respiration (histoire), plein + mélodie, final
const sec = (t) => (t < 20 ? "intro" : t < 45 ? "build" : t < 196 ? "full" : t < 240 ? "calm" : t < 286 ? "full2" : "outro");
const END = 297; // dernier accord

// I - V - vi - IV en sol majeur
const chords = [
  { root: 43, notes: [55, 59, 62, 67] }, // G
  { root: 38, notes: [50, 54, 57, 62] }, // D
  { root: 40, notes: [52, 55, 59, 64] }, // Em
  { root: 36, notes: [48, 52, 55, 60] }, // C
];
const chordAt = (t) => chords[Math.floor(t / bar) % 4];

// Corde pincée (Karplus-Strong)
function pluck(f, t0, vel, pan, len = 1.6) {
  const p = Math.max(2, Math.round(SR / f));
  const buf = new Float32Array(p);
  for (let i = 0; i < p; i++) buf[i] = rnd();
  const start = Math.floor(t0 * SR), n = Math.floor(len * SR);
  let idx = 0, prev = 0;
  for (let j = 0; j < n; j++) {
    const v = buf[idx];
    const nv = 0.5 * (v + buf[(idx + 1) % p]) * 0.996;
    buf[idx] = nv; idx = (idx + 1) % p;
    const out = (v + prev) * 0.5; prev = v;
    const env = Math.min(1, j / 40) * vel;
    add(start + j, out * env * (1 - pan), out * env * pan);
  }
}
// Glockenspiel
function bell(f, t0, vel, pan) {
  const start = Math.floor(t0 * SR), n = Math.floor(1.8 * SR);
  for (let j = 0; j < n; j++) {
    const t = j / SR;
    const v = (Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 2.5) + 0.35 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t * 6) + 0.15 * Math.sin(2 * Math.PI * f * 5.4 * t) * Math.exp(-t * 12)) * Math.min(1, j / 30) * vel;
    add(start + j, v * (1 - pan), v * pan);
  }
}
// Basse ronde
function bass(f, t0, len, vel) {
  const start = Math.floor(t0 * SR), n = Math.floor(len * SR);
  for (let j = 0; j < n; j++) {
    const t = j / SR;
    const env = Math.min(1, j / 200) * Math.min(1, (n - j) / 800) * vel;
    const v = (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t) + 0.1 * Math.sin(6 * Math.PI * f * t)) * env;
    add(start + j, v, v);
  }
}
function kick(t0, vel) {
  const start = Math.floor(t0 * SR), n = Math.floor(0.35 * SR);
  let ph = 0;
  for (let j = 0; j < n; j++) {
    const t = j / SR;
    ph += (2 * Math.PI * (48 + 110 * Math.exp(-t * 30))) / SR;
    const v = Math.sin(ph) * Math.exp(-t * 9) * vel;
    add(start + j, v, v);
  }
}
function noiseHit(t0, len, decay, vel, pan, hp = 0.92) {
  const start = Math.floor(t0 * SR), n = Math.floor(len * SR);
  let lp = 0;
  for (let j = 0; j < n; j++) {
    const t = j / SR;
    const x = rnd();
    lp = hp * lp + (1 - hp) * x;
    const v = (x - lp) * Math.exp(-t * decay) * vel;
    add(start + j, v * (1 - pan), v * pan);
  }
}
const clap = (t0, vel) => { for (const d of [0, 0.011, 0.023]) noiseHit(t0 + d, 0.18, 22, vel, 0.5, 0.8); };
// Nappe douce
function pad(notes, t0, len, vel) {
  const start = Math.floor(t0 * SR), n = Math.floor((len + 0.6) * SR);
  notes.forEach((m, k) => {
    const f = midi(m);
    for (let j = 0; j < n; j++) {
      const t = j / SR;
      const env = Math.min(1, t / 0.5) * Math.min(1, Math.max(0, (len + 0.6 - t) / 0.6)) * vel;
      const v = (Math.sin(2 * Math.PI * f * t) + 0.2 * Math.sin(4 * Math.PI * f * 1.002 * t)) * env;
      add(start + j, v * (0.7 - k * 0.1), v * (0.4 + k * 0.1));
    }
  });
}

// Mélodie pentatonique (2 mesures = 16 croches), -1 = silence
const melA = [74, -1, 71, 74, 76, -1, 74, 71, 69, -1, 71, 74, 71, -1, 67, -1];
const melB = [76, -1, 79, 76, 74, -1, 71, 74, 76, 74, 71, -1, 69, 71, 67, -1];

for (let b = 0; b * bar < END; b++) {
  const t0 = b * bar;
  const S = sec(t0);
  const ch = chordAt(t0);
  // nappe
  pad(ch.notes.slice(0, 3), t0, bar, S === "intro" ? 0.03 : S === "calm" ? 0.022 : 0.014);
  // guitare : croches, motif bondissant
  const pat = [0, 2, 1, 3, 2, 1, 3, 2];
  for (let i = 0; i < 8; i++) {
    const t = t0 + i * (beat / 2);
    if (t >= END) break;
    const acc = i % 2 === 0 ? 1 : 0.7;
    const v = (S === "intro" ? 0.3 : 0.28) * acc;
    pluck(midi(ch.notes[pat[i]] + 12), t, v, 0.3 + 0.4 * (i % 2));
  }
  // basse
  if (S !== "intro") {
    const fb = midi(ch.root);
    bass(fb, t0, beat * 1.4, 0.16);
    bass(fb * 2, t0 + beat * 1.5, beat * 0.45, 0.1);
    bass(fb, t0 + beat * 2, beat * 1.4, 0.16);
    bass(midi(ch.root + 7), t0 + beat * 3.5, beat * 0.45, 0.11);
  }
  // percussions
  if (S !== "intro" || t0 > 10) {
    for (let i = 0; i < 16; i++) {
      const v = S === "calm" || S === "intro" ? 0.03 : 0.045;
      noiseHit(t0 + i * s16, 0.06, 60, i % 4 === 2 ? v * 1.6 : v, 0.65);
    }
  }
  if (S === "full" || S === "full2") {
    kick(t0, 0.5); kick(t0 + beat * 2, 0.5); kick(t0 + beat * 2.5, 0.3);
    clap(t0 + beat, 0.22); clap(t0 + beat * 3, 0.22);
  }
  if (S === "build" && t0 > 33) { kick(t0, 0.35); kick(t0 + beat * 2, 0.35); }
  // glockenspiel : mélodie dans les sections pleines
  if (S === "full" || S === "full2" || (S === "calm" && b % 4 < 2)) {
    const mel = Math.floor(b / 2) % 2 === 0 ? melA : melB;
    const half = b % 2;
    for (let i = 0; i < 8; i++) {
      const m = mel[half * 8 + i];
      if (m > 0) bell(midi(m + 12), t0 + i * (beat / 2), S === "calm" ? 0.05 : 0.07, 0.6);
    }
  }
}
// Final : accord tenu et petite cascade
const fin = END;
pad([55, 59, 62, 67], fin, 3.5, 0.03);
bass(midi(43), fin, 3, 0.18);
kick(fin, 0.5);
[67, 71, 74, 79, 83].forEach((m, i) => bell(midi(m + 12), fin + i * 0.09, 0.07, 0.3 + i * 0.1));
[55, 59, 62, 67].forEach((m, i) => pluck(midi(m + 12), fin + i * 0.03, 0.18, 0.5, 3));

// Petite réverbération
const taps = [[0.029, 0.22], [0.047, 0.18], [0.083, 0.14], [0.131, 0.1], [0.197, 0.07]];
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
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g)) * 32767), 46 + i * 4);
}
writeFileSync("out-music.wav", buf);
execSync("ffmpeg -y -loglevel error -i out-music.wav -af acompressor=threshold=0.125:ratio=3:attack=5:release=150,loudnorm=I=-16:TP=-1.5:LRA=9 -ar 44100 -b:a 256k public/musique.mp3 && rm out-music.wav");
console.log("public/musique.mp3 générée");
