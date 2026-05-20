# youtube2gemini — Design Spec

Date: 2026-05-20

## Goal

A Chrome (Manifest V3) extension that lets the user send any YouTube video to
`gemini.google.com` for summarization, via a right-click context menu, without
any official URL-based integration.

## User flow

1. User right-clicks a link to a YouTube video (in the feed, search results,
   sidebar — anywhere a `watch?v=` / `youtu.be` link exists).
2. The context menu shows a **"Gemini this"** item.
3. On click, the extension opens a new tab on `https://gemini.google.com/app`.
4. A content script on the Gemini page fills the prompt textbox with the prompt
   text + the YouTube URL.
5. The user clicks send themselves (no auto-send).

## Architecture

Three components, no content script on YouTube.

### `manifest.json`
- `manifest_version: 3`
- `permissions`: `["contextMenus", "storage"]` — **no `tabs`** (`chrome.tabs.create`
  works without it).
- `host_permissions`: `["https://gemini.google.com/*"]`
- `background.service_worker`: `background.js`
- `content_scripts`: matches `https://gemini.google.com/*` → `gemini-content.js`

### `background.js` (service worker)
- On `runtime.onInstalled`, create the context menu item:
  - `id: "gemini-this"`, `title: "Gemini this"`
  - `contexts: ["link"]`
  - `targetUrlPatterns`: `["*://*.youtube.com/watch?v=*", "*://youtu.be/*"]`
- On `contextMenus.onClicked`:
  - Normalize the URL from `info.linkUrl` (keep only the `v=` video id; build a
    clean `https://www.youtube.com/watch?v=<id>` URL; handle `youtu.be/<id>`).
  - Save `{ url, prompt }` to `chrome.storage.local` under key `pendingVideo`.
  - `chrome.tabs.create({ url: "https://gemini.google.com/app" })`.

### `gemini-content.js` (content script on gemini.google.com)
- On load, read `chrome.storage.local.get("pendingVideo")`.
- If no payload → do nothing.
- If payload present:
  - Wait for the prompt textbox via a `MutationObserver` with a ~10s timeout.
  - Selector (isolated in a top-of-file constant, with fallbacks):
    `.ql-editor[contenteditable='true']` → `div[contenteditable='true']`.
  - `element.focus()` then `document.execCommand('insertText', false, text)`
    where `text = prompt + "\n" + url`. `execCommand` is used deliberately: it
    fires the `input` events Gemini's Quill editor needs to register the text.
  - Remove `pendingVideo` from storage immediately (so a refresh does not re-fill).
  - Do **not** press send.

## Data flow

```
right-click YouTube link
  -> background: normalize URL, storage.local.set(pendingVideo)
  -> tabs.create(gemini.google.com/app)
  -> gemini-content: storage.get -> wait for textbox -> insertText -> storage.remove
  -> user clicks send
```

## Prompt (v1, hardcoded)

`Riassumi questo video e fai un elenco dei punti principali`

## Error handling

- Textbox not found within the ~10s timeout → `console.warn`, no crash; the
  `pendingVideo` payload is left in place so the user can reload the tab to retry.
- Unrecognized URL → the menu item never appears (filtered by `targetUrlPatterns`).
- `MutationObserver` is disconnected once the textbox is found or the timeout fires.

## Fragility note

The single most fragile point is the Gemini textbox selector. It lives in one
named constant at the top of `gemini-content.js` with ordered fallbacks, so a
future Gemini redesign is a one-line fix.

## File structure

```
youtube2gemini/
├── manifest.json
├── background.js
├── gemini-content.js
├── icons/        (16, 48, 128 px)
└── README.md     (English)
```

## Out of scope (v1)

- Prompt customization widget + local storage of prompts → "advanced beta" phase.
- Firefox port → second phase.
- Icon injected into the YouTube video description.
- Auto-send in Gemini.

## Target

Chrome-like browsers (Arc included). Firefox later. Docs and store-facing UI in
English; the prompt sent to Gemini is in Italian per the plan.
