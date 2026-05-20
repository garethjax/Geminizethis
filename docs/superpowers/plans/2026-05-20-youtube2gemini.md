# youtube2gemini Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome MV3 extension that adds a "Gemini this" right-click menu on YouTube video links, opening gemini.google.com with the prompt and video URL pre-filled.

**Architecture:** A background service worker registers a context menu filtered to YouTube watch URLs; on click it normalizes the URL, stores `{url, prompt}` in `chrome.storage.local`, and opens a Gemini tab. A content script on `gemini.google.com` reads that payload, waits for the prompt textbox via a MutationObserver, fills it with `execCommand('insertText')`, and clears the payload. No auto-send.

**Tech Stack:** Chrome Extension Manifest V3, vanilla JavaScript, no build step, no test framework. Verification is manual via `chrome://extensions` "Load unpacked".

---

### Task 1: Project scaffold and manifest

**Files:**
- Create: `manifest.json`
- Create: `icons/README.md`

- [ ] **Step 1: Create the manifest**

Create `manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "youtube2gemini",
  "version": "0.1.0",
  "description": "Right-click any YouTube video and send it to Gemini for a summary.",
  "permissions": ["contextMenus", "storage"],
  "host_permissions": ["https://gemini.google.com/*"],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["https://gemini.google.com/*"],
      "js": ["gemini-content.js"]
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

- [ ] **Step 2: Create icons placeholder note**

Create `icons/README.md`:

```markdown
# Icons

Place `icon16.png`, `icon48.png`, `icon128.png` here.

For local development the extension loads without icons present — Chrome
shows a default placeholder. Real icons are required before Chrome Web
Store submission.
```

- [ ] **Step 3: Verify the extension loads**

Open `chrome://extensions`, enable Developer mode, click "Load unpacked", select the project folder.
Expected: extension appears with no manifest errors. (An icon-not-found warning is acceptable at this stage.)

- [ ] **Step 4: Commit**

```bash
git add manifest.json icons/README.md
git commit -m "feat: add MV3 manifest and project scaffold"
```

---

### Task 2: Background service worker — context menu and URL normalization

**Files:**
- Create: `background.js`

- [ ] **Step 1: Write background.js**

Create `background.js`:

```javascript
const MENU_ID = "gemini-this";
const PROMPT = "Riassumi questo video e fai un elenco dei punti principali";
const GEMINI_URL = "https://gemini.google.com/app";

// Build a clean canonical watch URL, or return null if no video id is found.
function normalizeYouTubeUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  let videoId = null;
  if (parsed.hostname === "youtu.be") {
    videoId = parsed.pathname.slice(1);
  } else if (parsed.hostname.endsWith("youtube.com")) {
    videoId = parsed.searchParams.get("v");
  }

  if (!videoId) {
    return null;
  }
  return `https://www.youtube.com/watch?v=${videoId}`;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "Gemini this",
    contexts: ["link"],
    targetUrlPatterns: [
      "*://*.youtube.com/watch?v=*",
      "*://youtu.be/*"
    ]
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== MENU_ID) {
    return;
  }
  const url = normalizeYouTubeUrl(info.linkUrl);
  if (!url) {
    console.warn("youtube2gemini: could not parse video URL from", info.linkUrl);
    return;
  }
  chrome.storage.local.set({ pendingVideo: { url, prompt: PROMPT } }, () => {
    chrome.tabs.create({ url: GEMINI_URL });
  });
});
```

- [ ] **Step 2: Verify the menu appears**

Reload the extension at `chrome://extensions`. Go to `https://www.youtube.com`, right-click a video thumbnail/link.
Expected: a "Gemini this" item is present in the context menu. Right-clicking non-video links (e.g. a channel link) shows no such item.

- [ ] **Step 3: Verify the payload and tab open**

Click "Gemini this" on a video link.
Expected: a new tab opens at `gemini.google.com/app`. In the service worker console (`chrome://extensions` → "service worker" link → DevTools), run `chrome.storage.local.get("pendingVideo", console.log)`.
Expected: logs `{pendingVideo: {url: "https://www.youtube.com/watch?v=...", prompt: "Riassumi..."}}`.

- [ ] **Step 4: Commit**

```bash
git add background.js
git commit -m "feat: add context menu and YouTube URL normalization"
```

---

### Task 3: Gemini content script — prompt injection

**Files:**
- Create: `gemini-content.js`

- [ ] **Step 1: Write gemini-content.js**

Create `gemini-content.js`:

```javascript
// Most fragile point of the extension. If Gemini redesigns its editor,
// update these selectors (tried in order).
const TEXTBOX_SELECTORS = [
  ".ql-editor[contenteditable='true']",
  "div[contenteditable='true']"
];
const WAIT_TIMEOUT_MS = 10000;

function findTextbox() {
  for (const selector of TEXTBOX_SELECTORS) {
    const el = document.querySelector(selector);
    if (el) {
      return el;
    }
  }
  return null;
}

// Resolve with the textbox element, or null if it never appears in time.
function waitForTextbox() {
  return new Promise((resolve) => {
    const existing = findTextbox();
    if (existing) {
      resolve(existing);
      return;
    }
    const observer = new MutationObserver(() => {
      const el = findTextbox();
      if (el) {
        observer.disconnect();
        clearTimeout(timer);
        resolve(el);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const timer = setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, WAIT_TIMEOUT_MS);
  });
}

function fillTextbox(element, text) {
  element.focus();
  // execCommand fires the input events Gemini's Quill editor needs to
  // register the text into its internal model.
  document.execCommand("insertText", false, text);
}

async function run() {
  const { pendingVideo } = await chrome.storage.local.get("pendingVideo");
  if (!pendingVideo) {
    return;
  }
  const textbox = await waitForTextbox();
  if (!textbox) {
    console.warn(
      "youtube2gemini: Gemini prompt textbox not found within timeout; " +
      "payload kept — reload this tab to retry."
    );
    return;
  }
  fillTextbox(textbox, `${pendingVideo.prompt}\n${pendingVideo.url}`);
  await chrome.storage.local.remove("pendingVideo");
}

run();
```

- [ ] **Step 2: Verify end-to-end injection**

Reload the extension. Make sure you are logged into Gemini. Right-click a YouTube video link → "Gemini this".
Expected: the Gemini tab opens and, within a few seconds, the prompt textbox contains the prompt text on the first line and the video URL on the second line. The message is NOT sent automatically.

- [ ] **Step 3: Verify no re-fill on refresh**

In the Gemini tab from Step 2, press F5 to reload.
Expected: the textbox is empty (payload was cleared after the first fill).

- [ ] **Step 4: Verify the summary works**

In the Gemini tab, click the send button manually.
Expected: Gemini processes the YouTube link and returns a summary with key points.

- [ ] **Step 5: Commit**

```bash
git add gemini-content.js
git commit -m "feat: inject prompt and video URL into Gemini textbox"
```

---

### Task 4: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README.md**

Create `README.md`:

```markdown
# youtube2gemini

A Chrome extension that sends YouTube videos to Gemini for summarization.

## Usage

Right-click any link to a YouTube video and choose **"Gemini this"**.
A new tab opens on [gemini.google.com](https://gemini.google.com) with the
prompt and video URL pre-filled. Click send to get the summary.

You must be signed in to Gemini with your Google account.

## Install (development)

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this folder.

## How it works

- A background service worker adds a context-menu item filtered to YouTube
  watch URLs. On click it stores the video URL and opens Gemini.
- A content script on `gemini.google.com` fills the prompt textbox with the
  prompt and URL. It does not send the message — you do.

## Limitations

- Depends on Gemini's page structure; a Gemini redesign may require updating
  the textbox selectors in `gemini-content.js`.
- Chrome / Chromium-based browsers only (Firefox support planned).

## Roadmap

- Prompt customization widget (advanced beta).
- Firefox port.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README"
```

---

## Self-Review Notes

- **Spec coverage:** manifest/permissions (Task 1), context menu + URL normalization + tab open (Task 2), content-script injection + MutationObserver + execCommand + payload clear + error handling (Task 3), English README (Task 4). All spec sections covered.
- **Out of scope confirmed:** no customization widget, no Firefox port, no YouTube content script, no auto-send — none appear in any task.
- **Type consistency:** storage key `pendingVideo` holds `{url, prompt}` — written in `background.js`, read in `gemini-content.js`, identical shape.
- **Icons:** real PNG icons are deferred (placeholder note in `icons/`); not blocking for local development, required before store submission.
