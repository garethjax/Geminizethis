const list = document.getElementById("list");
const status = document.getElementById("status");

function setStatus(msg) {
  status.textContent = msg;
  if (msg) setTimeout(() => { status.textContent = ""; }, 4000);
}

async function render() {
  const { prompts, defaultPromptId } = await self.Prompts.getPrompts();
  list.innerHTML = "";
  for (const p of prompts) {
    const div = document.createElement("div");
    div.className = "prompt";
    div.innerHTML = `
      <input type="text" class="name" placeholder="Nome" />
      <textarea class="text" placeholder="Testo del prompt"></textarea>
      <input type="text" class="author" placeholder="Autore (facoltativo)" />
      <div class="row">
        <label><input type="radio" name="def" class="def" /> Default</label>
        <button class="save">Salva</button>
        <button class="del">Elimina</button>
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
    list.appendChild(div);
  }
}

document.getElementById("add").addEventListener("click", async () => {
  await self.Prompts.savePrompt({ name: "Nuovo prompt", text: "", author: "" });
  render();
});

document.getElementById("export").addEventListener("click", async () => {
  const json = await self.Prompts.exportJson();
  const blob = new Blob([json], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "youtube2gemini-prompts.json";
  a.click();
  URL.revokeObjectURL(a.href);
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
    setStatus("Errore import: " + err.message);
  }
  e.target.value = "";
});

render();
