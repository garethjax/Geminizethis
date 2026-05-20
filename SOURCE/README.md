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
3. Click **Load unpacked** and select this `SOURCE` folder.

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
