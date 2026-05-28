# Design: Archivio prompt per youtube2gemini

Data: 2026-05-28
Branch: feature/youtube2gemini-extension

## Obiettivo

Permettere all'utente di costruire un archivio locale di prompt da iniettare
in Gemini: crearli, modificarli, importarli/esportarli e impostarne uno di
default. Oggi l'estensione usa un singolo prompt hardcoded
(`background.js:2`).

## Modello dati

Tutto in `chrome.storage.local` (già locale, niente sync cloud).

```jsonc
{
  "prompts": [
    { "id": "<uuid>", "name": "Riassunto", "text": "...", "author": "..." }
  ],
  "defaultPromptId": "<uuid>"
}
```

- `id`: stringa univoca (`crypto.randomUUID()`).
- `name`: etichetta mostrata nel sottomenu e nelle liste.
- `text`: corpo del prompt. Può contenere il segnaposto `{{url}}`; se assente,
  l'URL del video viene aggiunto in coda (`text + "\n" + url`).
- `author`: attribuzione libera, per scambio prompt tra utenti. Facoltativo.

### Migrazione

Al primo avvio (storage senza `prompts`), si crea un prompt di default con il
testo esistente ("Riassumi questo video e fai un elenco dei punti
principali"), `author` vuoto, e lo si imposta come `defaultPromptId`.

## Componenti

### `prompts.js` (nuovo, modulo condiviso)

Unica fonte di verità per la logica, usata da background, popup e options.

- `getPrompts()` → `{ prompts, defaultPromptId }`
- `savePrompt(prompt)` — crea o aggiorna (per `id`)
- `deletePrompt(id)` — se era il default, ne promuove un altro
- `setDefault(id)`
- `applyTemplate(text, url)` — sostituisce `{{url}}` o appende in coda
- `exportJson()` → stringa JSON `{ version, prompts }`
- `importJson(jsonString)` — valida, fa **merge** (aggiunge) ai prompt esistenti

Il service worker MV3 non supporta `import` ESM diretto nel manifest;
`prompts.js` espone le funzioni in modo utilizzabile sia dal service worker
(via `importScripts`) sia dalle pagine HTML (via `<script>`). Da decidere in
fase di plan il meccanismo concreto.

### `background.js`

- Ricostruisce il context-menu come **sottomenu** "Geminize this" con una voce
  per ogni prompt salvato; il default in cima.
- Ricostruisce il menu su `onInstalled` e su `chrome.storage.onChanged`
  (quando i prompt cambiano da options/popup).
- Al clic recupera il `text` del prompt scelto, risolve il template con
  `applyTemplate`, salva `pendingVideo` e apre Gemini (come oggi).

### `gemini-content.js`

Invariato nella sostanza: legge `pendingVideo` (già `prompt` + `url`) e riempie
il textbox. Il template è già risolto a monte.

### Pagina Opzioni (`options.html` / `options.js`)

- Lista dei prompt con nome e author.
- Editor: campi nome, testo, author. Crea/modifica/elimina.
- Imposta default (radio o pulsante per riga).
- Import / Export tramite file `.json`.

### Popup toolbar (`popup.html` / `popup.js`)

- Scelta rapida del prompt (la selezione può aggiornare il default o servire
  come scorciatoia — da rifinire in plan).
- Link "Apri Opzioni".

### Manifest

- Aggiungere `"action"` (default_popup + icone).
- Aggiungere `"options_page": "options.html"`.

## Import / Export

Formato file `.json`:

```jsonc
{ "version": 1, "prompts": [ { "name": "...", "text": "...", "author": "..." } ] }
```

- **Export**: scarica un file con tutti i prompt correnti.
- **Import**: valida lo schema (errori segnalati, mai silenziosi); rifiuta input
  malformati; **aggiunge** i prompt importati a quelli esistenti generando nuovi
  `id` (merge), così gli utenti possono scambiarsi i prompt senza sovrascrivere
  i propri.

## Error handling

- Import malformato → messaggio d'errore esplicito, nessuna modifica allo
  storage.
- Nessun prompt / nessun default → fallback sul primo prompt disponibile.
- Selettori Gemini non trovati → comportamento attuale invariato (payload
  conservato, warning in console).

## Testing

- Test unitari su `prompts.js`: `applyTemplate` (con/senza `{{url}}`),
  `importJson` (valido, malformato, merge), `deletePrompt` (riassegnazione
  default), migrazione iniziale.
- Verifica manuale: sottomenu si aggiorna dopo modifica prompt; import da file;
  export e re-import.

## Fuori scope

- Sync cloud / `chrome.storage.sync`.
- Editor avanzato (markdown, variabili oltre `{{url}}`).
- Port Firefox.
