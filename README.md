# Geminize This

A Chrome extension that seamlessly sends YouTube videos to Google Gemini for summarization and analysis.

## How it Works

1.  **Context Menu**: The extension adds a "Geminize this" submenu to your browser's right-click context menu. It appears both when you right-click a YouTube video link (e.g. a thumbnail in the feed) and anywhere on a video's watch page, so you can summarize the video you're currently watching. The submenu lists all your saved prompts, with the default one on top.
2.  **Redirection**: Upon clicking a prompt, it opens a new tab directed to [gemini.google.com](https://gemini.google.com).
3.  **Injection**: A content script runs on the Gemini page, searching for the message input field via JavaScript DOM selectors and automatically injecting the chosen prompt with the YouTube video URL.

## Prompt Archive

Manage your prompts locally (stored in the browser via `chrome.storage.local`, never synced to any server):

*   **Options page**: open the extension's *Options* (`chrome://extensions` → *Details* → *Extension options*) to create, edit, and delete prompts, and to set the default.
*   **`{{url}}` placeholder**: put `{{url}}` anywhere in a prompt's text to control where the video URL is inserted; if omitted, the URL is appended at the end.
*   **Quick default**: click the toolbar icon to switch the default prompt from a popup.
*   **Author field**: each prompt has an optional `author` for attribution.
*   **Import / Export**: export all prompts to a JSON file, or import a JSON file from someone else. Import **merges** (adds) the prompts to your existing ones, so prompts can be shared without overwriting your own.

> **Backup your prompts.** Prompts live only in your browser (`chrome.storage.local`) and are **lost if you uninstall the extension**. Use *Esporta tutto* in the Options page to keep a JSON backup, and *Importa* to restore it. (Account sync is on the roadmap.)

## Installation

### For Beta Testers (ZIP version)
1.  Download the latest `youtube2gemini-vX.Y.zip` from the [latest releases](https://github.com/garethjax/Geminizethis/releases).
2.  Extract the ZIP file to a folder on your computer (the extracted folder already contains `manifest.json` at its root — it *is* the unpacked extension).
3.  Open Chrome and navigate to `chrome://extensions`.
4.  Enable **"Developer mode"** (top right toggle).
5.  Click **"Load unpacked"** and select the extracted folder.

### For Developers (Clone version)
1.  Clone this repository.
2.  Open Chrome and navigate to `chrome://extensions`.
3.  Enable **"Developer mode"** (top right toggle).
4.  Click **"Load unpacked"** and select the `SOURCE` directory from this project.

## Important Caveats

### DOM Dependency
The extension relies on specific JavaScript selectors to find the input field on Google Gemini. **If Google performs drastic changes to the Gemini DOM/HTML structure, the extension may fail to inject the prompt.** If this happens, an update to the content script selectors will be required.

### Security Note
**Your privacy and security are paramount.** Before installing any browser extension that interacts with your web pages, you should verify its integrity.
*   **Audit the Code**: The logic is simple and contained within `background.js` and `gemini-content.js`.
*   **LLM Verification**: If you prefer, paste the source code into a frontier LLM of your choice and ask it to confirm the extension does not exfiltrate data or perform malicious actions.

## Roadmap (TODO)

- [x] **Custom Prompts**: Settings UI to save, manage, import, and export custom prompts in the browser's local storage.
- [ ] **Account Sync**: Sync prompts across devices and survive reinstalls via `chrome.storage.sync`.
- [ ] **Firefox Support**: Porting the extension to be compatible with Mozilla Firefox.
- [ ] **Auto-Submit**: Optional setting to automatically trigger the "Send" button after injection.

## License

MIT
