const list = document.getElementById("list");

async function render() {
  const { prompts, defaultPromptId } = await self.Prompts.getPrompts();
  list.innerHTML = "";
  for (const p of prompts) {
    const label = document.createElement("label");
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "def";
    radio.checked = p.id === defaultPromptId;
    radio.addEventListener("change", async () => {
      await self.Prompts.setDefault(p.id);
    });
    label.appendChild(radio);
    label.appendChild(document.createTextNode(" " + p.name));
    list.appendChild(label);
  }
}

document.getElementById("opts").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
  window.close();
});

render();
