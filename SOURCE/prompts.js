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
