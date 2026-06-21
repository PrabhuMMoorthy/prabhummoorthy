# Release Notes — Mobile Hub Launcher & Expense Manager

Release date: 2026-06-21
PR: https://github.com/PrabhuMMoorthy/prabhummoorthy/pull/1

---

## Overview

This release refactors the repository homepage into a mobile-first, Material You "Mobile Hub — Launcher", consolidates legacy index pages, adds a full-featured Expense Manager web app, and updates navigation and app chrome across multiple HTML apps (chat, comparator, loan, My YouTube dashboard). It also expands the README into a comprehensive project portfolio overview.

Quick highlights

- New: Mobile Hub — Launcher (index.html) — a Material-you-inspired mobile launcher UI with app grid, dock, theme engine, and overlays.
- New: Expense Manager (expense.html) — Dexie-based browser DB, charts, import/export (XLSX), rule engine for categorization, and responsive UI.
- Updated: Chat app replaced (chat2.html → chat.html) — QR-based P2P sharing, chunked file streaming, camera QR scanning.
- Updated: My YouTube dashboard reorganized and split into separate CSS/JS assets (my-youtube.html).
- Cleanup: Removed legacy index versions and renamed loan-v3.html → loan.html.
- Docs: README.md rewritten as a portfolio README describing apps and usage.

---

## One-line changelog

Refactor HTML apps into Mobile Hub launcher; add Expense Manager; update chat P2P, README, and navigation.

---

## Detailed changelog

- Rework repository homepage into a Material-you style "Mobile Hub — Launcher" (index.html) with:
  - phone-frame UI, status bar, theme palette, app grid, dock, search, splash, and small system overlays.
  - App registry and theme engine implemented in JavaScript.
- Add Expense Manager (expense.html):
  - Dexie-based persistence, Chart.js visualizations, XLSX import/export, Tailwind CSS utilities, and a small rule engine for transaction categorization.
- Replace chat2.html with chat.html:
  - QR-based P2P share and chat, file chunking/streaming, and HTML5 QR code camera scanning.
- Rename and reorganize:
  - index.html (new launcher), old index moved to my-youtube.html.
  - loan-v3.html → loan.html.
  - chat2.html removed.
- Improve consistency: add a unified navigation bar (navigation.js) to multiple app pages (chat, comparator, etc.).
- README.md rewritten into a comprehensive project/portfolio README describing each app and usage instructions.
- Split large inline CSS/JS from my-youtube.html into separate assets for maintainability.

---

## Commits included (short list)

- b11ddf1 — Clean up old HTML versions; rename chat2.html → chat.html; rename loan-v3.html → loan.html; update index links.
- 5e443c2 — Create Android Material You mobile launcher dashboard; rename index.html → my-youtube.html; update nav links.
- a6e6948 — Refactored navigation bar (in-progress commit).
- 1162a6c — Added nav bar to chat and comparator.
- f9a2b22 — Refactored my-youtube.html and split CSS/JS out.
- 1b52f9f, f47df1b — Add files via upload (assets and app files).
- 06b8722 — Add comprehensive README for portfolio repository.
- e6d8368 — Add Expense app to launcher.
- 1099642 — Add Expense Tracker to side navigation.

(Full commits available in PR: https://github.com/PrabhuMMoorthy/prabhummoorthy/pull/1/commits)

---

## Files changed (high-level)

- README.md — rewritten; major additions.
- index.html — new Mobile Hub launcher (primary landing page).
- my-youtube.html — preserved YouTube dashboard from previous index.
- chat.html — refactored QR P2P chat (replaces chat2.html).
- expense.html — new Expense Manager app (large file, many features).
- navigation.js — shared navigation/dock logic used by multiple pages.
- comparator.html, loan.html, and several other HTML assets — updated to include unified navigation and link changes.
- Removed: index-v0.9.html, index-v1.html, chat2.html (legacy copies).

Total files changed in PR: 17

---

## Risk & compatibility notes

- Surface area: This release changes the repository's primary landing page and multiple app pages — review external links and GitHub Pages settings if you publish the site.
- CDN dependencies: New pages reference external CDNs (Dexie, Chart.js, XLSX, PeerJS, html5-qrcode, Tailwind). Ensure network access and acceptable CSP for your deployment environment.
- File renames: If you have bookmarks linking to the old filenames (index.html or chat2.html), update them to the new paths (index.html, chat.html, my-youtube.html).
- Inline assets: Several pages still contain large inline JS/CSS blocks; consider extracting them into separate files for caching and maintainability.
- P2P chat: The chat app uses PeerJS and camera access for QR scanning; ensure HTTPS deployment and inform users about camera permissions.

---

## QA checklist (recommended before merging)

- [ ] Preview index.html (Mobile Hub launcher) in a local server or GitHub Pages preview; verify the app grid, dock, and theme switching.
  - Local preview: run a lightweight static server (e.g., `python -m http.server 8000` in the repo root) and open `http://localhost:8000/index.html`.
- [ ] Open expense.html and create sample transactions; verify Dexie persistence (reload), charts update, and import/export works (XLSX).
- [ ] Open chat.html on two devices: test QR-based P2P session establishment and small file streaming.
- [ ] Verify navigation links from the launcher open the expected app pages (my-youtube.html, chat.html, comparator.html, loan.html, expense.html).
- [ ] Confirm README links and usage instructions are accurate.
- [ ] If you use GitHub Pages, verify the Pages settings point to the correct file/branch (index.html is now the new landing page).

---

## Suggested merge commit message (use as-is or edit):

Title: Refactor HTML apps into Mobile Hub launcher; add Expense Manager; update chat P2P, README, and navigation

Body:
- Rework repository homepage into a Material-you style "Mobile Hub — Launcher" (index.html).
- Add Expense Manager (expense.html) with Dexie DB, Chart.js, and XLSX import/export.
- Replace chat2.html with a refactored chat.html (QR P2P share, chunked file streaming, QR camera scanning).
- Rename loan-v3.html → loan.html and move old index → my-youtube.html.
- Rewrite README.md to a comprehensive portfolio README.
- Cleanup: remove legacy index copies and obsolete HTML files.

---

## Next steps & maintenance suggestions

1. Extract large inline scripts and styles into separate files (assets/js/, assets/css/) for caching and clearer commit diffs.
2. Replace CDN references with local vendor files or lock to specific versions to avoid supply-chain drift.
3. Add a small automated smoke-test (GitHub Action) that serves the built site and checks HTTP 200 for key pages (/, /index.html, /expense.html, /chat.html).
4. Consider adding a screenshot or GIF to the README and this release notes file to showcase the launcher and Expense Manager UI.

---

If you'd like any stylistic changes (simpler/shorter notes, HTML-based release page with screenshots, or a release tag creation), tell me which format you prefer and I can update the page or create an HTML release page instead.
