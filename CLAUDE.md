# Geminize This — Project Notes

Chrome MV3 extension (vanilla JS, zero-build) that sends YouTube videos to
Gemini. The extension lives in `SOURCE/`; load that folder unpacked.

## Release process

When cutting a new release, do **all** of these together:

1. Add a new entry at the **top** of `SOURCE/changelog.json`:
   `{ "version", "codename", "date", "changes": [...] }`.
   The popup version link and the "Novità" page (`changelog.html`) read from
   this file; the entry whose `version` matches the manifest gets the
   "attuale" badge.
2. Bump the version in **both** `SOURCE/manifest.json` and `package.json`
   (keep them identical). The popup shows the version via
   `chrome.runtime.getManifest().version`, so the manifest is the source of truth.
3. Run `npm test` (Node built-in runner) — pure helpers in `SOURCE/prompts.js`
   are covered by `tests/prompts.test.js`.
4. Merge the feature branch into `master`, then repackage the zip:
   `(cd SOURCE && zip -r -X ../_releases/youtube2gemini-vX.Y.zip . -x "*.DS_Store")`.
5. Tag (`vX.Y`) and publish a GitHub Release named after the codename via `gh`.

Each release has a codename (e.g. "Delicate Roar", "Gamma Orchid",
"Luxury Delights") — ask the user for it; don't invent one.

## Conventions

- The user-facing name is **"Geminize This"**. The repo/zip identifier remains
  `youtube2gemini` / `Geminizethis` — don't rename those.
- Keep it zero-build: plain JS/CSS, no bundler or framework (WXT/side panel are
  parked for a possible v2.0).
- Shared prompt logic is centralized in `SOURCE/prompts.js` (UMD-style so it
  works under `importScripts`, `<script>`, and Node `require`). Add pure,
  testable helpers there rather than duplicating logic in the UI files.
