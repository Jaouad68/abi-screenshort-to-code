---
name: notebooklm
description: Complete API for Google NotebookLM - full programmatic access including features not in the web UI. Create notebooks, add sources, generate all artifact types, download in multiple formats. Activates on explicit /notebooklm or intent like "create a podcast about X"
---

# NotebookLM Automation - Complete API Documentation

This document provides comprehensive programmatic access to Google NotebookLM, enabling creation of notebooks, source management, content generation, and multi-format downloads through CLI and Python integration.

## Installation & Setup

The recommended approach uses PyPI with browser support: `pip install "notebooklm-py[browser]"`. For Python 3.13+, the optional cookies extra skips installation to prevent build failures, though interactive login still works.

Authentication requires `notebooklm login`, which opens a browser for Google OAuth. Verification uses `notebooklm auth check --test --json`—the `--test` flag performs an actual network call, distinguishing it from a false-positive file parse check.

For headless environments like Claude Cowork, users can reuse a `storage_state.json` file generated on a machine with display access, either through the `--storage` flag or `NOTEBOOKLM_AUTH_JSON` environment variable.

## Key Commands & Workflows

**Notebook operations:** Create, list, and delete notebooks with `notebooklm create`, `notebooklm list`, and `notebooklm delete`.

**Source management:** Add URLs, PDFs, YouTube links, audio, video, and images via `notebooklm source add`. Sources support processing status tracking through `notebooklm source wait` and `notebooklm source list --json`.

**Content generation:** The tool generates podcasts, videos, slide decks, infographics, reports, quizzes, flashcards, mind maps, and data tables. Long-running operations (typically 5-45 minutes) return immediately with a task ID; use `notebooklm artifact wait` or check status later with `notebooklm artifact list`.

**Downloads:** Generated content exports to multiple formats—audio as .m4a, video as .mp4, slides as PDF or PPTX, quizzes and flashcards as JSON or Markdown, mind maps as JSON, and data tables as CSV.

## Advanced Features

**Chat with sources:** `notebooklm ask "question"` retrieves answers with citations from indexed content.

**Web research:** `notebooklm source add-research "query" --mode deep` performs comprehensive web searches, taking 15-30+ minutes but automatable through subagent patterns.

**Parallel workflows:** Use explicit notebook IDs (`-n/--notebook` flags) rather than context switching (`notebooklm use`) to avoid race conditions in concurrent agent scenarios.

**Multi-account & CI/CD:** Environment variables `NOTEBOOKLM_PROFILE`, `NOTEBOOKLM_HOME`, and `NOTEBOOKLM_AUTH_JSON` support profile switching, custom config directories, and inline authentication for automated pipelines.

## Beyond the Web UI

Notable programmatic-only capabilities include batch artifact downloads (`download <type> --all`), quiz/flashcard export as JSON/Markdown/HTML, slide revision via natural language (`generate revise-slide`), source fulltext extraction, and conversation history saving as notes.

## Source

Packaged from [teng-lin/notebooklm-py](https://github.com/teng-lin/notebooklm-py) (MIT licensed). See that repository for the full Python SDK, CLI implementation, and detailed docs (`docs/cli-reference.md`, `docs/python-api.md`, `docs/mcp-guide.md`, `docs/installation.md`).
