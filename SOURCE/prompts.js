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

  const api = { applyTemplate, parseImportJson, mergeImported, reassignDefault };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.Prompts = api;
  }
})(typeof self !== "undefined" ? self : this);
