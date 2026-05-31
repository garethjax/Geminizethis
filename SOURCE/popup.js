const list = document.getElementById("list");

async function render() {
  const { prompts, defaultPromptId } = await self.Prompts.getPrompts();
  list.innerHTML = "";
  if (prompts.length === 0) {
    list.innerHTML = '<div class="empty">No prompts yet. Open the manager below.</div>';
    return;
  }
  for (const p of prompts) {
    const row = document.createElement("div");
    row.className = "select-row" + (p.id === defaultPromptId ? " selected" : "");
    const dot = document.createElement("span");
    dot.className = "dot";
    const label = document.createElement("span");
    label.className = "label";
    label.textContent = p.name;
    row.appendChild(dot);
    row.appendChild(label);
    row.addEventListener("click", async () => {
      await self.Prompts.setDefault(p.id);
      render();
    });
    list.appendChild(row);
  }
}

document.getElementById("opts").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
  window.close();
});

const ver = document.getElementById("ver");
ver.textContent = "v" + chrome.runtime.getManifest().version;
ver.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: chrome.runtime.getURL("changelog.html") });
  window.close();
});

render();
