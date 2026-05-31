const list = document.getElementById("list");
const status = document.getElementById("status");

function setStatus(msg, isError) {
  status.textContent = msg;
  status.className = "status" + (isError ? " error" : "");
  if (msg) setTimeout(() => { status.textContent = ""; }, 4000);
}

async function render() {
  const { prompts, defaultPromptId } = await self.Prompts.getPrompts();
  list.innerHTML = "";
  if (prompts.length === 0) {
    list.innerHTML = '<div class="empty">No prompts saved yet. Create your first one with “New prompt”.</div>';
    return;
  }
  for (const p of prompts) {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <label class="field">Name</label>
      <input type="text" class="name" placeholder="Name" />
      <label class="field">Prompt text</label>
      <textarea class="text" placeholder="Prompt text…"></textarea>
      <label class="field">Author</label>
      <input type="text" class="author" placeholder="Author (optional)" />
      <div class="row between">
        <label class="row" style="gap:6px;cursor:pointer;">
          <input type="radio" name="def" class="def" /> <span class="muted">Default prompt</span>
        </label>
        <div class="row">
          <button class="del danger">Delete</button>
          <button class="exp">Export</button>
          <button class="save primary">Save</button>
        </div>
      </div>`;
    div.querySelector(".name").value = p.name;
    div.querySelector(".text").value = p.text;
    div.querySelector(".author").value = p.author || "";
    div.querySelector(".def").checked = p.id === defaultPromptId;
    div.querySelector(".save").addEventListener("click", async () => {
      await self.Prompts.savePrompt({
        id: p.id,
        name: div.querySelector(".name").value,
        text: div.querySelector(".text").value,
        author: div.querySelector(".author").value
      });
      if (div.querySelector(".def").checked) await self.Prompts.setDefault(p.id);
      setStatus("Saved.");
      render();
    });
    div.querySelector(".del").addEventListener("click", async () => {
      await self.Prompts.deletePrompt(p.id);
      setStatus("Deleted.");
      render();
    });
    div.querySelector(".exp").addEventListener("click", () => {
      const current = {
        name: div.querySelector(".name").value,
        text: div.querySelector(".text").value,
        author: div.querySelector(".author").value
      };
      const json = self.Prompts.serializePrompts([current]);
      downloadJson(slugify(current.name) + ".json", json);
    });
    list.appendChild(div);
  }
}

function slugify(name) {
  const base = (name || "prompt").toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return "geminize-" + (base || "prompt");
}

function downloadJson(filename, json) {
  const blob = new Blob([json], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

document.getElementById("add").addEventListener("click", async () => {
  await self.Prompts.savePrompt({ name: "New prompt", text: "", author: "" });
  render();
});

document.getElementById("exportAll").addEventListener("click", async () => {
  const { prompts } = await self.Prompts.getPrompts();
  if (prompts.length === 0) {
    setStatus("No prompts to export.", true);
    return;
  }
  const date = new Date().toISOString().slice(0, 10);
  downloadJson(`geminize-backup-${date}.json`, self.Prompts.serializePrompts(prompts));
  setStatus(`Exported ${prompts.length} prompt(s).`);
});

document.getElementById("importFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const count = await self.Prompts.importJson(text);
    setStatus(`Imported ${count} prompt(s).`);
    render();
  } catch (err) {
    setStatus("Import error: " + err.message, true);
  }
  e.target.value = "";
});

render();
