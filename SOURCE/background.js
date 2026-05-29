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

// Serialize rebuilds: multiple triggers (onInstalled/onStartup/onChanged,
// plus the storage write migrate() makes on first run) can otherwise run
// concurrently and both create "geminize-root", causing a duplicate-id error.
let rebuildChain = Promise.resolve();
function rebuildMenu() {
  rebuildChain = rebuildChain
    .then(doRebuildMenu)
    .catch((err) => console.warn("youtube2gemini: rebuildMenu failed", err));
  return rebuildChain;
}

// Show on YouTube video links (feed thumbnails) and also anywhere on a
// watch page itself, so you can geminize the video you're currently watching.
const LINK_PATTERNS = ["*://*.youtube.com/watch?v=*", "*://youtu.be/*"];
const PAGE_PATTERNS = ["*://*.youtube.com/watch?v=*"];

async function doRebuildMenu() {
  await chrome.contextMenus.removeAll();
  const { prompts, defaultPromptId } = await self.Prompts.getPrompts();
  chrome.contextMenus.create({
    id: "geminize-root",
    title: "Geminize this",
    contexts: ["link", "page"],
    targetUrlPatterns: LINK_PATTERNS,
    documentUrlPatterns: PAGE_PATTERNS
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
      contexts: ["link", "page"],
      targetUrlPatterns: LINK_PATTERNS,
      documentUrlPatterns: PAGE_PATTERNS
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
  // On a link it's info.linkUrl; on the watch page itself it's info.pageUrl.
  const raw = info.linkUrl || info.pageUrl;
  const url = normalizeYouTubeUrl(raw);
  if (!url) {
    console.warn("youtube2gemini: could not parse video URL from", raw);
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
