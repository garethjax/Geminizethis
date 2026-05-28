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

  const api = { applyTemplate, parseImportJson };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.Prompts = api;
  }
})(typeof self !== "undefined" ? self : this);
