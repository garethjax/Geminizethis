# Prompt Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local archive of injectable Gemini prompts (create/edit/import/export/default) to the youtube2gemini Chrome extension.

**Architecture:** A shared `prompts.js` module holds all prompt logic. Pure helpers (template resolution, import parsing/merge, default reassignment, migration) are environment-agnostic and unit-tested with `node:test`. Chrome-bound functions wrap these helpers over `chrome.storage.local`. The service worker rebuilds a "Geminize this" submenu from saved prompts; an options page manages the archive and an action popup offers quick selection.

**Tech Stack:** Vanilla JS, Chrome Extension MV3, `node:test` (Node built-in test runner, no deps).

---

## File Structure

- `SOURCE/prompts.js` (new) — shared prompt logic. Pure helpers + chrome.storage wrappers. UMD-style export so it works under `importScripts` (service worker), `<script>` (pages), and `require` (Node tests).
- `SOURCE/background.js` (modify) — build submenu from prompts, rebuild on storage change, resolve template on click.
- `SOURCE/gemini-content.js` (unchanged) — already consumes `pendingVideo.{prompt,url}`.
- `SOURCE/options.html` / `SOURCE/options.js` (new) — full archive management.
- `SOURCE/popup.html` / `SOURCE/popup.js` (new) — quick prompt selection + link to options.
- `SOURCE/manifest.json` (modify) — add `action`, `options_page`.
- `package.json` (new, repo root) — `test` script for `node:test`.
- `tests/prompts.test.js` (new) — unit tests for pure helpers.

---

## Task 1: Test scaffold

**Files:**
- Create: `package.json`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "youtube2gemini",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 2: Verify the runner works**

Run: `npm test`
Expected: exits 0 with "tests 0" (no test files yet) — confirms Node test runner is available.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add node:test runner scaffold"
```

---

## Task 2: `applyTemplate` helper

**Files:**
- Create: `SOURCE/prompts.js`
- Test: `tests/prompts.test.js`

- [ ] **Step 1: Write the failing test**

```js
const test = require("node:test");
const assert = require("node:assert");
const P = require("../SOURCE/prompts.js");

test("applyTemplate replaces {{url}} placeholder", () => {
  assert.strictEqual(
    P.applyTemplate("Watch {{url}} now", "https://x/v"),
    "Watch https://x/v now"
  );
});

test("applyTemplate replaces all occurrences of {{url}}", () => {
  assert.strictEqual(
    P.applyTemplate("{{url}} and {{url}}", "U"),
    "U and U"
  );
});

test("applyTemplate appends url when no placeholder", () => {
  assert.strictEqual(
    P.applyTemplate("Summarize this", "https://x/v"),
    "Summarize this\nhttps://x/v"
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../SOURCE/prompts.js'`.

- [ ] **Step 3: Write minimal implementation**

Create `SOURCE/prompts.js`:

```js
// Shared prompt logic. Works under importScripts (service worker),
// <script> (pages), and require (Node tests).
(function (root) {
  const PLACEHOLDER = "{{url}}";

  function applyTemplate(text, url) {
    if (text.includes(PLACEHOLDER)) {
      return text.split(PLACEHOLDER).join(url);
    }
    return `${text}\n${url}`;
  }

  const api = { applyTemplate };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.Prompts = api;
  }
})(typeof self !== "undefined" ? self : this);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add SOURCE/prompts.js tests/prompts.test.js
git commit -m "feat: add applyTemplate prompt helper"
```

---

## Task 3: `parseImportJson` helper

**Files:**
- Modify: `SOURCE/prompts.js`
- Test: `tests/prompts.test.js`

- [ ] **Step 1: Write the failing test**

```js
test("parseImportJson returns normalized prompts", () => {
  const json = JSON.stringify({
    version: 1,
    prompts: [{ name: "A", text: "t", author: "me" }]
  });
  assert.deepStrictEqual(P.parseImportJson(json), [
    { name: "A", text: "t", author: "me" }
  ]);
});

test("parseImportJson defaults missing author to empty string", () => {
  const json = JSON.stringify({ version: 1, prompts: [{ name: "A", text: "t" }] });
  assert.strictEqual(P.parseImportJson(json)[0].author, "");
});

test("parseImportJson throws on invalid JSON", () => {
  assert.throws(() => P.parseImportJson("{not json"), /Invalid JSON/);
});

test("parseImportJson throws when prompts is not an array", () => {
  assert.throws(() => P.parseImportJson(JSON.stringify({ version: 1, prompts: {} })),
    /prompts.*array/);
});

test("parseImportJson throws when an entry lacks name or text", () => {
  assert.throws(() => P.parseImportJson(JSON.stringify({ version: 1, prompts: [{ name: "A" }] })),
    /name.*text/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `P.parseImportJson is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `SOURCE/prompts.js`, add inside the IIFE before `const api`:

```js
  function parseImportJson(jsonString) {
    let data;
    try {
      data = JSON.parse(jsonString);
    } catch {
      throw new Error("Invalid JSON: could not parse file.");
    }
    if (!data || !Array.isArray(data.prompts)) {
      throw new Error("Invalid file: 'prompts' must be an array.");
    }
    return data.prompts.map((p, i) => {
      if (!p || typeof p.name !== "string" || typeof p.text !== "string") {
        throw new Error(`Invalid prompt at index ${i}: name and text are required.`);
      }
      return {
        name: p.name,
        text: p.text,
        author: typeof p.author === "string" ? p.author : ""
      };
    });
  }
```

Add `parseImportJson` to the `api` object:

```js
  const api = { applyTemplate, parseImportJson };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add SOURCE/prompts.js tests/prompts.test.js
git commit -m "feat: add parseImportJson with validation"
```

---

## Task 4: `mergeImported` + `reassignDefault` helpers

**Files:**
- Modify: `SOURCE/prompts.js`
- Test: `tests/prompts.test.js`

ID generation uses `globalThis.crypto.randomUUID`, available in Node 19+ and browsers. Tests pass a deterministic id generator to keep assertions stable.

- [ ] **Step 1: Write the failing test**

```js
test("mergeImported appends imported prompts with fresh ids", () => {
  let n = 0;
  const genId = () => `id-${++n}`;
  const existing = [{ id: "x", name: "Old", text: "o", author: "" }];
  const imported = [{ name: "New", text: "nt", author: "bob" }];
  const result = P.mergeImported(existing, imported, genId);
  assert.deepStrictEqual(result, [
    { id: "x", name: "Old", text: "o", author: "" },
    { id: "id-1", name: "New", text: "nt", author: "bob" }
  ]);
});

test("reassignDefault keeps current default when not deleted", () => {
  const prompts = [{ id: "a" }, { id: "b" }];
  assert.strictEqual(P.reassignDefault(prompts, "a", "b"), "a");
});

test("reassignDefault picks first remaining when default deleted", () => {
  const prompts = [{ id: "b" }, { id: "c" }];
  assert.strictEqual(P.reassignDefault(prompts, "a", "a"), "b");
});

test("reassignDefault returns null when no prompts remain", () => {
  assert.strictEqual(P.reassignDefault([], "a", "a"), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — functions not defined.

- [ ] **Step 3: Write minimal implementation**

In `SOURCE/prompts.js`, add inside the IIFE:

```js
  function mergeImported(existing, imported, genId) {
    const fresh = imported.map((p) => ({
      id: genId(),
      name: p.name,
      text: p.text,
      author: p.author || ""
    }));
    return existing.concat(fresh);
  }

  // Returns the defaultPromptId after a delete: unchanged if the deleted id
  // was not the default, otherwise the first remaining prompt's id (or null).
  function reassignDefault(prompts, defaultPromptId, deletedId) {
    if (defaultPromptId !== deletedId) {
      return defaultPromptId;
    }
    return prompts.length > 0 ? prompts[0].id : null;
  }
```

Update `api`:

```js
  const api = { applyTemplate, parseImportJson, mergeImported, reassignDefault };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add SOURCE/prompts.js tests/prompts.test.js
git commit -m "feat: add mergeImported and reassignDefault helpers"
```

---

## Task 5: `migrate` helper + chrome.storage wrappers

**Files:**
- Modify: `SOURCE/prompts.js`
- Test: `tests/prompts.test.js`

- [ ] **Step 1: Write the failing test**

```js
const DEFAULT_TEXT = "Riassumi questo video e fai un elenco dei punti principali";

test("migrate seeds a default prompt when storage is empty", () => {
  const genId = () => "seed-1";
  const result = P.migrate({}, genId);
  assert.deepStrictEqual(result, {
    prompts: [{ id: "seed-1", name: "Riassunto", text: DEFAULT_TEXT, author: "" }],
    defaultPromptId: "seed-1"
  });
});

test("migrate leaves existing prompts untouched", () => {
  const stored = { prompts: [{ id: "a", name: "X", text: "t", author: "" }], defaultPromptId: "a" };
  assert.deepStrictEqual(P.migrate(stored, () => "ignored"), stored);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `P.migrate is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `SOURCE/prompts.js`, add inside the IIFE:

```js
  const DEFAULT_PROMPT_TEXT =
    "Riassumi questo video e fai un elenco dei punti principali";

  function migrate(stored, genId) {
    if (stored && Array.isArray(stored.prompts) && stored.prompts.length > 0) {
      return stored;
    }
    const id = genId();
    return {
      prompts: [{ id, name: "Riassunto", text: DEFAULT_PROMPT_TEXT, author: "" }],
      defaultPromptId: id
    };
  }
```

Update `api` to add `migrate`. Then append the chrome.storage wrappers (guarded so Node require does not need chrome):

```js
  // --- chrome.storage wrappers (no-op shape under Node) ---
  if (typeof chrome !== "undefined" && chrome.storage) {
    const newId = () => globalThis.crypto.randomUUID();

    async function load() {
      const stored = await chrome.storage.local.get(["prompts", "defaultPromptId"]);
      const migrated = migrate(stored, newId);
      if (migrated !== stored) {
        await chrome.storage.local.set(migrated);
      }
      return migrated;
    }

    api.getPrompts = load;

    api.savePrompt = async function (prompt) {
      const { prompts, defaultPromptId } = await load();
      const idx = prompts.findIndex((p) => p.id === prompt.id);
      if (idx >= 0) {
        prompts[idx] = prompt;
      } else {
        prompts.push({ ...prompt, id: prompt.id || newId() });
      }
      await chrome.storage.local.set({ prompts, defaultPromptId });
    };

    api.deletePrompt = async function (id) {
      const { prompts, defaultPromptId } = await load();
      const remaining = prompts.filter((p) => p.id !== id);
      const newDefault = reassignDefault(remaining, defaultPromptId, id);
      await chrome.storage.local.set({ prompts: remaining, defaultPromptId: newDefault });
    };

    api.setDefault = async function (id) {
      const { prompts } = await load();
      await chrome.storage.local.set({ prompts, defaultPromptId: id });
    };

    api.exportJson = async function () {
      const { prompts } = await load();
      const bare = prompts.map((p) => ({ name: p.name, text: p.text, author: p.author }));
      return JSON.stringify({ version: 1, prompts: bare }, null, 2);
    };

    api.importJson = async function (jsonString) {
      const imported = parseImportJson(jsonString);
      const { prompts, defaultPromptId } = await load();
      const merged = mergeImported(prompts, imported, newId);
      await chrome.storage.local.set({ prompts: merged, defaultPromptId });
      return imported.length;
    };
  }
```

Final `api` line before the IIFE export:

```js
  const api = { applyTemplate, parseImportJson, mergeImported, reassignDefault, migrate };
```

(Place this `const api` BEFORE the chrome block so the block can attach methods to it.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — all pure-helper tests green; chrome block is skipped under Node.

- [ ] **Step 5: Commit**

```bash
git add SOURCE/prompts.js tests/prompts.test.js
git commit -m "feat: add migrate helper and chrome.storage wrappers"
```

---

## Task 6: Background submenu

**Files:**
- Modify: `SOURCE/background.js`

This task is integration glue with the Chrome API; verified manually (no unit test, since `chrome.contextMenus` is not available under `node:test`).

- [ ] **Step 1: Rewrite background.js**

Replace the entire contents of `SOURCE/background.js` with:

```js
importScripts("prompts.js");

const MENU_PREFIX = "gemini-prompt:";
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

async function rebuildMenu() {
  await chrome.contextMenus.removeAll();
  const { prompts, defaultPromptId } = await self.Prompts.getPrompts();
  chrome.contextMenus.create({
    id: "geminize-root",
    title: "Geminize this",
    contexts: ["link"],
    targetUrlPatterns: ["*://*.youtube.com/watch?v=*", "*://youtu.be/*"]
  });
  // Default first, then the rest.
  const ordered = prompts.slice().sort((a, b) => {
    if (a.id === defaultPromptId) return -1;
    if (b.id === defaultPromptId) return 1;
    return 0;
  });
  for (const p of ordered) {
    const suffix = p.id === defaultPromptId ? " (default)" : "";
    chrome.contextMenus.create({
      id: MENU_PREFIX + p.id,
      parentId: "geminize-root",
      title: p.name + suffix,
      contexts: ["link"],
      targetUrlPatterns: ["*://*.youtube.com/watch?v=*", "*://youtu.be/*"]
    });
  }
}

chrome.runtime.onInstalled.addListener(rebuildMenu);
chrome.runtime.onStartup.addListener(rebuildMenu);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.prompts || changes.defaultPromptId)) {
    rebuildMenu();
  }
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (!String(info.menuItemId).startsWith(MENU_PREFIX)) {
    return;
  }
  const url = normalizeYouTubeUrl(info.linkUrl);
  if (!url) {
    console.warn("youtube2gemini: could not parse video URL from", info.linkUrl);
    return;
  }
  const promptId = String(info.menuItemId).slice(MENU_PREFIX.length);
  const { prompts } = await self.Prompts.getPrompts();
  const chosen = prompts.find((p) => p.id === promptId);
  if (!chosen) {
    console.warn("youtube2gemini: prompt not found", promptId);
    return;
  }
  const prompt = self.Prompts.applyTemplate(chosen.text, url);
  await chrome.storage.local.set({ pendingVideo: { url, prompt } });
  chrome.tabs.create({ url: GEMINI_URL });
});
```

- [ ] **Step 2: Adjust gemini-content.js template join**

`gemini-content.js:63` currently joins prompt and url again. Since `background.js` now pre-resolves the full prompt (URL already included), change line 63 from:

```js
  fillTextbox(textbox, `${pendingVideo.prompt}\n${pendingVideo.url}`);
```

to:

```js
  fillTextbox(textbox, pendingVideo.prompt);
```

- [ ] **Step 3: Manual verification**

Load `SOURCE` unpacked in `chrome://extensions`. Right-click a YouTube link → "Geminize this" shows a submenu with the default prompt on top. Click it → Gemini opens with the prompt + URL filled.

- [ ] **Step 4: Commit**

```bash
git add SOURCE/background.js SOURCE/gemini-content.js
git commit -m "feat: build context-menu submenu from saved prompts"
```

---

## Task 7: Options page

**Files:**
- Create: `SOURCE/options.html`, `SOURCE/options.js`
- Modify: `SOURCE/manifest.json`

- [ ] **Step 1: Create options.html**

```html
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <title>youtube2gemini — Prompt</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 720px; margin: 24px auto; padding: 0 16px; }
    .prompt { border: 1px solid #ccc; border-radius: 8px; padding: 12px; margin: 8px 0; }
    .prompt textarea { width: 100%; min-height: 60px; box-sizing: border-box; }
    .prompt input[type=text] { width: 100%; box-sizing: border-box; margin-bottom: 6px; }
    .row { display: flex; gap: 8px; align-items: center; margin-top: 6px; }
    .muted { color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <h1>Archivio prompt</h1>
  <p class="muted">Usa <code>{{url}}</code> nel testo per posizionare l'URL del video; se assente, viene aggiunto in fondo.</p>
  <div id="list"></div>
  <button id="add">+ Nuovo prompt</button>
  <hr />
  <div class="row">
    <button id="export">Esporta JSON</button>
    <input type="file" id="importFile" accept="application/json,.json" />
  </div>
  <p id="status" class="muted"></p>
  <script src="prompts.js"></script>
  <script src="options.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create options.js**

```js
const list = document.getElementById("list");
const status = document.getElementById("status");

function setStatus(msg) {
  status.textContent = msg;
  if (msg) setTimeout(() => { status.textContent = ""; }, 4000);
}

async function render() {
  const { prompts, defaultPromptId } = await self.Prompts.getPrompts();
  list.innerHTML = "";
  for (const p of prompts) {
    const div = document.createElement("div");
    div.className = "prompt";
    div.innerHTML = `
      <input type="text" class="name" placeholder="Nome" />
      <textarea class="text" placeholder="Testo del prompt"></textarea>
      <input type="text" class="author" placeholder="Autore (facoltativo)" />
      <div class="row">
        <label><input type="radio" name="def" class="def" /> Default</label>
        <button class="save">Salva</button>
        <button class="del">Elimina</button>
      </div>`;
    div.querySelector(".name").value = p.name;
    div.querySelector(".text").value = p.text;
    div.querySelector(".author").value = p.author || "";
    div.querySelector(".def").checked = p.id === defaultPromptId;
    div.querySelector(".save").addEventListener("click", async () => {
      await self.Prompts.savePrompt({
        id: p.id,
        name: div.querySelector(".name").value,
        text: div.querySelector(".text").value,
        author: div.querySelector(".author").value
      });
      if (div.querySelector(".def").checked) await self.Prompts.setDefault(p.id);
      setStatus("Salvato.");
      render();
    });
    div.querySelector(".del").addEventListener("click", async () => {
      await self.Prompts.deletePrompt(p.id);
      setStatus("Eliminato.");
      render();
    });
    list.appendChild(div);
  }
}

document.getElementById("add").addEventListener("click", async () => {
  await self.Prompts.savePrompt({ name: "Nuovo prompt", text: "", author: "" });
  render();
});

document.getElementById("export").addEventListener("click", async () => {
  const json = await self.Prompts.exportJson();
  const blob = new Blob([json], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "youtube2gemini-prompts.json";
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById("importFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const count = await self.Prompts.importJson(text);
    setStatus(`Importati ${count} prompt.`);
    render();
  } catch (err) {
    setStatus("Errore import: " + err.message);
  }
  e.target.value = "";
});

render();
```

- [ ] **Step 3: Add options_page to manifest**

In `SOURCE/manifest.json`, after the `"icons"` block add:

```json
  ,"options_page": "options.html"
```

(Ensure valid JSON — the comma goes after the preceding block's closing brace.)

- [ ] **Step 4: Manual verification**

Reload extension → chrome://extensions → Dettagli → Opzioni. Add a prompt, set default, save. Confirm the submenu updates. Export downloads a JSON file; importing it adds the prompts.

- [ ] **Step 5: Commit**

```bash
git add SOURCE/options.html SOURCE/options.js SOURCE/manifest.json
git commit -m "feat: add options page for prompt management"
```

---

## Task 8: Toolbar popup

**Files:**
- Create: `SOURCE/popup.html`, `SOURCE/popup.js`
- Modify: `SOURCE/manifest.json`

The popup lets the user pick which prompt is the default (quick selection) and links to the options page.

- [ ] **Step 1: Create popup.html**

```html
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: system-ui, sans-serif; width: 260px; padding: 12px; }
    h2 { font-size: 14px; margin: 0 0 8px; }
    label { display: block; padding: 4px 0; }
    a { display: inline-block; margin-top: 10px; font-size: 12px; }
  </style>
</head>
<body>
  <h2>Prompt di default</h2>
  <div id="list"></div>
  <a href="#" id="opts">Gestisci prompt…</a>
  <script src="prompts.js"></script>
  <script src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create popup.js**

```js
const list = document.getElementById("list");

async function render() {
  const { prompts, defaultPromptId } = await self.Prompts.getPrompts();
  list.innerHTML = "";
  for (const p of prompts) {
    const label = document.createElement("label");
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "def";
    radio.checked = p.id === defaultPromptId;
    radio.addEventListener("change", async () => {
      await self.Prompts.setDefault(p.id);
    });
    label.appendChild(radio);
    label.appendChild(document.createTextNode(" " + p.name));
    list.appendChild(label);
  }
}

document.getElementById("opts").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

render();
```

- [ ] **Step 3: Add action to manifest**

In `SOURCE/manifest.json`, after the `"options_page"` line add:

```json
  ,"action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  }
```

- [ ] **Step 4: Manual verification**

Reload extension. Click the toolbar icon → popup lists prompts with the default selected. Change selection → submenu default updates. "Gestisci prompt…" opens options.

- [ ] **Step 5: Commit**

```bash
git add SOURCE/popup.html SOURCE/popup.js SOURCE/manifest.json
git commit -m "feat: add toolbar popup for quick default selection"
```

---

## Task 9: Update README

**Files:**
- Modify: `SOURCE/README.md`, `README.md`

- [ ] **Step 1: Update the usage and roadmap sections**

In both READMEs, document: the prompt archive (options page), the submenu of prompts, `{{url}}` placeholder, default selection via popup, and JSON import (merge) / export with `author` field. Remove "Prompt customization widget (advanced beta)" from the roadmap since it is now implemented.

- [ ] **Step 2: Commit**

```bash
git add README.md SOURCE/README.md
git commit -m "docs: document prompt archive feature"
```

---

## Self-Review Notes

- **Spec coverage:** data model (Task 5 migrate/wrappers), `{{url}}` placeholder (Task 2), submenu (Task 6), options page (Task 7), popup (Task 8), import-merge + author (Tasks 3–5, 7), export (Task 5/7), migration (Task 5), error handling on import (Task 3 + Task 7 catch). All covered.
- **Type consistency:** prompt shape `{id, name, text, author}` used consistently; `getPrompts` returns `{prompts, defaultPromptId}` everywhere.
- **No placeholders:** all code steps contain full code.
