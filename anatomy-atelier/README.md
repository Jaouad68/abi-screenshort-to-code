# Anatomy Atelier

Interactive 3D anatomy education app: students explore organs, see where each
one sits in the body, and learn through clickable hotspots on the model.
Built from a creator's brief — "students explore organs, see where they're
located in the body, and learn via clickable zones" — as a full, working
application rather than a mockup.

Stack: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 +
React Three Fiber / drei (Three.js) for the 3D scene + Zustand for state.

## Features

- **Explore** (`/`) — the core 3D viewer.
  - Organ library sidebar with live search (by name or body system).
  - Procedurally modeled 3D organs (heart, brain, lungs, liver, kidneys, eye,
    intestine, pancreas, skin) rendered with Three.js primitives — drag to
    orbit, scroll to zoom, reset/zoom/auto-rotate/wireframe controls.
  - Clickable hotspots on each model surface a focused description of that
    anatomical region in the info panel.
  - Info panel: description, key facts (size, weight, daily activity,
    location, blood supply, function), medical importance, and a "did you
    know" fact.
  - Bottom toolbar: **Microscopic view** (tissue type, cell types, a fun
    fact), **Compare organs** (side-by-side key-fact comparison of any two
    organs), **Function animation** (a physiological pulse/beat animation on
    the 3D model), **Clinical notes** (common related conditions), and
    **Where it works** (an animated marker on a body silhouette).
- **Systems** (`/systems`) — organs grouped by the body system they belong to.
- **Library** (`/library`) — a searchable reference card for every organ.
- **Lessons** (`/lessons`) — a short lesson with learning objectives and a
  scored quiz for every organ; completion is tracked and persisted.
- **Notes** (`/notes`) — free-text notes per organ, saved to `localStorage`.

## Development

```bash
npm install
npm run dev     # http://localhost:3000
```

```bash
npm test        # Vitest — organ/lesson data integrity, notes & progress stores
npm run lint     # ESLint
npm run build    # production build + TypeScript check
```

## Structure

- `src/data/organs.ts` — anatomical content for every organ (facts, hotspots,
  microscopic detail, clinical notes, body position), plus search/group
  helpers and their tests.
- `src/data/lessons.ts` — lesson objectives and quiz questions per organ.
- `src/lib/store.ts` — Explore screen state (selected organ/hotspot, viewer
  toggles, compare drawer).
- `src/lib/notesStore.ts`, `src/lib/progressStore.ts` — `localStorage`-backed
  Zustand stores for notes and lesson completion.
- `src/components/three/` — the 3D scene: `Viewer3D` (canvas + toolbar),
  `Scene` (lights, platform, camera rig), `OrganModel` (maps an organ to its
  mesh), `organs/*Mesh.tsx` (one procedural model per organ), `HotspotMarker`.
- `src/components/` — page-level UI: sidebar, info panel, bottom toolbar,
  compare drawer, and the boards for Systems/Library/Lessons/Notes.
- `src/app/` — routes: `/`, `/systems`, `/library`, `/lessons`, `/notes`.

## Notes on the 3D models

There are no licensed anatomical assets involved: every organ is built from
Three.js primitives (spheres, cones, capsules, tubes) composed and colored to
read clearly at a glance, in the spirit of the "atelier" — stylized,
educational shapes rather than photorealistic scans.
