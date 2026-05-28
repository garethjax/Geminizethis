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
