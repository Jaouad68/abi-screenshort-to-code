# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A single-page, static marketing website for tourism in Morocco ("Maroc — Royaume d'Or & de Lumière"). All user-facing copy is in **French** (with some Arabic accents), so new content and labels should be written in French to match.

There is **no build system, package manager, framework, or dependency install** — the site is plain HTML/CSS/vanilla JS. The only external dependencies are loaded from CDNs at runtime: Google Fonts (Cormorant Garamond, Inter, Noto Naskh Arabic) and all imagery (Unsplash hotlinks).

## Running & Developing

Open `index.html` directly in a browser, or serve the directory to avoid any same-origin quirks:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

There are no tests, linters, or build steps. "Building" = editing the source files; changes are live on reload.

## Structure

The entire site is three files:

- `index.html` — all markup, one `<section id="...">` per page section.
- `assets/css/style.css` — all styling.
- `assets/js/script.js` — all interactivity.

`index.html` loads the stylesheet in `<head>` and `script.js` as the **last element before `</body>`** (no `defer`), so the DOM is available when the script runs and top-level `addEventListener`/`init*()` calls execute immediately.

## Architecture & Conventions

**Section-driven page.** The page is a vertical stack of sections, each marked with an HTML comment banner (`<!-- ========== HERO ========== -->`) and an `id`: `hero`, `about`, `destinations`, `culture`, `cuisine`, `histoire`, `galerie`, `conseils`, `contact`. The same ids drive nav anchors, smooth scrolling (`scrollToSection(id)`), and active-link highlighting on scroll. When adding/renaming a section, update the nav links (both desktop `.nav-links` and the `.mobile-menu`) to keep them in sync.

**`script.js` is organized into self-contained feature blocks**, each under a `// ─── Name ───` comment. Each block wires up one widget by querying elements by id/class and attaching listeners. The notable patterns:

- **Loader gate**: on `window load`, a 1800ms timeout hides `#loader` and *then* starts the hero slider and stat counters — so anything that should wait for the intro is kicked off from inside that handler.
- **Hero slider**: auto-advances every 6s over exactly 4 `.hero-slide`s; the count `4` is hardcoded in `startHeroSlider`/dot handlers, so changing slide count means updating those literals and the `#heroDots` markup.
- **`IntersectionObserver`** powers two things: scroll-triggered animations (any element with a `data-aos` attribute gets `.aos-animate` added — see `initAOS`) and the stat counters (`.stat-num` with `data-target`). Use `data-aos` to opt an element into entrance animation.
- **Filters/tabs/carousel** follow a toggle-active-class convention driven by `data-*` attributes: destination filter buttons use `data-filter` matched against card `data-cat`; culture tabs use `data-tab` mapped to `#tab-<name>`; the cuisine carousel computes visible cards from viewport width and re-inits on resize.

**Content-as-data.** Two large JS objects/arrays hold structured content that is rendered into modals/lightbox at runtime rather than living in the HTML:
- `destData` (keyed by destination id) — drives `openDestModal(id)`. To add a destination, add an entry here *and* an HTML card whose button calls `openDestModal('<id>')`.
- `galleryImages` (array) — drives `openLightbox(index)`; gallery thumbnails call it by index, so order must match.

**Inline `onclick` handlers.** Buttons/cards call global functions directly via `onclick="..."` in the HTML (e.g. `scrollToSection`, `openDestModal`, `openLightbox`, `closeLightbox`, `handleSubmit`). These functions must stay as top-level (global) declarations in `script.js`.

**Forms are front-end only.** `handleSubmit` calls `preventDefault()` and just swaps the form for a success message — there is no backend, submission endpoint, or data persistence anywhere in the project.

**Styling via CSS custom properties.** Colors, radii, shadows, transitions, and fonts are defined as variables in `:root` at the top of `style.css` (e.g. `--red`, `--gold`, `--sand`, `--font-serif`). Reuse these tokens instead of hardcoding values to keep the Moroccan red/gold/sand palette consistent.
