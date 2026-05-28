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
