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
  fillTextbox(textbox, pendingVideo.prompt);
  await chrome.storage.local.remove("pendingVideo");
}

run();
