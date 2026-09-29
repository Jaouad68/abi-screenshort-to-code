# Four Frames

Single page site for Four Frames, a hire company with three restored 1970s photo booths.

React, Vite, TypeScript, Tailwind CSS 4 and Motion. No component libraries, no booking calendar: every enquiry button opens an email or a phone call.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
```

## Photographs

Every photograph is listed in `src/photos.ts`. Until real photography is supplied, each one is drawn as a stand in scene (`src/components/Scene.tsx`). To use a real photograph, put the file in `public/photos/` and set its path in `photos.ts`. Real photo strips go in the `strips` array, four frames per strip.

## Structure

- `src/sections/`: one file per section, in page order in `src/App.tsx`
- `src/components/DevelopingStrip.tsx`: the signature strip, frames develop one after another, 400ms apart, once
- `src/content.ts`: email and telephone
- `src/index.css`: design tokens (`--paper`, `--ink`, `--accent`, ...) and type classes (`.display`, `.meta`)
