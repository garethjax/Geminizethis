const test = require("node:test");
const assert = require("node:assert");
const P = require("../SOURCE/prompts.js");

test("applyTemplate replaces {{url}} placeholder", () => {
  assert.strictEqual(P.applyTemplate("Watch {{url}} now", "https://x/v"), "Watch https://x/v now");
});
test("applyTemplate replaces all occurrences of {{url}}", () => {
  assert.strictEqual(P.applyTemplate("{{url}} and {{url}}", "U"), "U and U");
});
test("applyTemplate appends url when no placeholder", () => {
  assert.strictEqual(P.applyTemplate("Summarize this", "https://x/v"), "Summarize this\nhttps://x/v");
});

test("parseImportJson returns normalized prompts", () => {
  const json = JSON.stringify({ version: 1, prompts: [{ name: "A", text: "t", author: "me" }] });
  assert.deepStrictEqual(P.parseImportJson(json), [{ name: "A", text: "t", author: "me" }]);
});
test("parseImportJson defaults missing author to empty string", () => {
  const json = JSON.stringify({ version: 1, prompts: [{ name: "A", text: "t" }] });
  assert.strictEqual(P.parseImportJson(json)[0].author, "");
});
test("parseImportJson throws on invalid JSON", () => {
  assert.throws(() => P.parseImportJson("{not json"), /Invalid JSON/);
});
test("parseImportJson throws when prompts is not an array", () => {
  assert.throws(() => P.parseImportJson(JSON.stringify({ version: 1, prompts: {} })), /prompts.*array/);
});
test("parseImportJson throws when an entry lacks name or text", () => {
  assert.throws(() => P.parseImportJson(JSON.stringify({ version: 1, prompts: [{ name: "A" }] })), /name.*text/);
});

test("mergeImported appends imported prompts with fresh ids", () => {
  let n = 0;
  const genId = () => `id-${++n}`;
  const existing = [{ id: "x", name: "Old", text: "o", author: "" }];
  const imported = [{ name: "New", text: "nt", author: "bob" }];
  const result = P.mergeImported(existing, imported, genId);
  assert.deepStrictEqual(result, [
    { id: "x", name: "Old", text: "o", author: "" },
    { id: "id-1", name: "New", text: "nt", author: "bob" }
  ]);
});
test("reassignDefault keeps current default when not deleted", () => {
  assert.strictEqual(P.reassignDefault([{ id: "a" }, { id: "b" }], "a", "b"), "a");
});
test("reassignDefault picks first remaining when default deleted", () => {
  assert.strictEqual(P.reassignDefault([{ id: "b" }, { id: "c" }], "a", "a"), "b");
});
test("reassignDefault returns null when no prompts remain", () => {
  assert.strictEqual(P.reassignDefault([], "a", "a"), null);
});

const DEFAULT_TEXT = "Riassumi questo video e fai un elenco dei punti principali";
test("migrate seeds a default prompt when storage is empty", () => {
  const result = P.migrate({}, () => "seed-1");
  assert.deepStrictEqual(result, {
    prompts: [{ id: "seed-1", name: "Riassunto", text: DEFAULT_TEXT, author: "" }],
    defaultPromptId: "seed-1"
  });
});
test("migrate leaves existing prompts untouched", () => {
  const stored = { prompts: [{ id: "a", name: "X", text: "t", author: "" }], defaultPromptId: "a" };
  assert.deepStrictEqual(P.migrate(stored, () => "ignored"), stored);
});
