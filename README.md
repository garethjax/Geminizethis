# Geminizethis (youtube2gemini)

A Chrome extension that seamlessly sends YouTube videos to Google Gemini for summarization and analysis.

## How it Works

1.  **Context Menu**: The extension adds a "Gemini this" option to your browser's right-click context menu, specifically active when you right-click on YouTube video links.
2.  **Redirection**: Upon clicking, it opens a new tab directed to [gemini.google.com](https://gemini.google.com).
3.  **Injection**: A content script runs on the Gemini page, searching for the message input field via JavaScript DOM selectors and automatically injecting a pre-defined prompt along with the YouTube video URL.

## Installation

### For Beta Testers (ZIP version)
1.  Download the `youtube2gemini-v0.1.zip` from the [latest releases](https://github.com/garethjax/Geminizethis/releases).
2.  Extract the ZIP file to a folder on your computer.
3.  Open Chrome and navigate to `chrome://extensions`.
4.  Enable **"Developer mode"** (top right toggle).
5.  Click **"Load unpacked"** and select the extracted `SOURCE` directory.

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
*   **LLM Verification**: We recommend running the source code through a frontier LLM (e.g., **Claude Opus 4.7**, **GPT 5.5**, or **DeepSeek 4**) to ensure the extension does not exfiltrate data or perform malicious actions.

## Roadmap (TODO)

- [ ] **Custom Prompts**: Implementation of a settings UI to save and manage custom prompts in the browser's local storage.
- [ ] **Firefox Support**: Porting the extension to be compatible with Mozilla Firefox.
- [ ] **Auto-Submit**: Optional setting to automatically trigger the "Send" button after injection.

## License

MIT
