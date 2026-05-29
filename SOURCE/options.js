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
    list.innerHTML = '<div class="empty">Nessun prompt salvato. Crea il primo con “Nuovo prompt”.</div>';
    return;
  }
  for (const p of prompts) {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <label class="field">Nome</label>
      <input type="text" class="name" placeholder="Nome" />
      <label class="field">Testo del prompt</label>
      <textarea class="text" placeholder="Testo del prompt…"></textarea>
      <label class="field">Autore</label>
      <input type="text" class="author" placeholder="Autore (facoltativo)" />
      <div class="row between">
        <label class="row" style="gap:6px;cursor:pointer;">
          <input type="radio" name="def" class="def" /> <span class="muted">Prompt di default</span>
        </label>
        <div class="row">
          <button class="del danger">Elimina</button>
          <button class="exp">Esporta</button>
          <button class="save primary">Salva</button>
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
      setStatus("Salvato.");
      render();
    });
    div.querySelector(".del").addEventListener("click", async () => {
      await self.Prompts.deletePrompt(p.id);
      setStatus("Eliminato.");
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
  await self.Prompts.savePrompt({ name: "Nuovo prompt", text: "", author: "" });
  render();
});

document.getElementById("exportAll").addEventListener("click", async () => {
  const { prompts } = await self.Prompts.getPrompts();
  if (prompts.length === 0) {
    setStatus("Nessun prompt da esportare.", true);
    return;
  }
  const date = new Date().toISOString().slice(0, 10);
  downloadJson(`geminize-backup-${date}.json`, self.Prompts.serializePrompts(prompts));
  setStatus(`Esportati ${prompts.length} prompt.`);
});

document.getElementById("importFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const count = await self.Prompts.importJson(text);
    setStatus(`Importati ${count} prompt.`);
    render();
  } catch (err) {
    setStatus("Errore import: " + err.message, true);
  }
  e.target.value = "";
});

render();
