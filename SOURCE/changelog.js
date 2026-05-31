const list = document.getElementById("list");
const currentVersion = chrome.runtime.getManifest().version;

async function render() {
  let releases;
  try {
    const res = await fetch(chrome.runtime.getURL("changelog.json"));
    releases = await res.json();
  } catch (err) {
    list.innerHTML = '<div class="empty">Changelog unavailable.</div>';
    console.warn("Geminize This: could not load changelog.json", err);
    return;
  }
  list.innerHTML = "";
  for (const r of releases) {
    const card = document.createElement("div");
    card.className = "card release";
    const isCurrent = r.version === currentVersion;
    const items = r.changes.map((c) => `<li>${escapeHtml(c)}</li>`).join("");
    card.innerHTML = `
      <div class="release-head">
        <span class="ver">v${escapeHtml(r.version)}</span>
        <span class="codename">${escapeHtml(r.codename || "")}</span>
        ${isCurrent ? '<span class="badge-current">current</span>' : ""}
        <span class="date">${escapeHtml(r.date || "")}</span>
      </div>
      <ul>${items}</ul>`;
    list.appendChild(card);
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

render();
