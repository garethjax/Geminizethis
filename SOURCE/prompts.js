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

  const api = { applyTemplate, parseImportJson, mergeImported, reassignDefault, migrate };

  // --- chrome.storage wrappers (skipped under Node) ---
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

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.Prompts = api;
  }
})(typeof self !== "undefined" ? self : this);
