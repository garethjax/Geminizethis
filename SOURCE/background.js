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
    title: "Geminize this",
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
