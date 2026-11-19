import { test } from "node:test";
import assert from "node:assert/strict";
import { capture } from "../netlify/lib/capture.mjs";
const now = new Date("2026-11-20T19:08:12.399Z");
const html = "<!doctype html><html><title>White House Wire</title><p>Snapshot</p></html>";
function mock(responses) {
  const calls = [];
  const fetch = async (url, options) => { calls.push({ url, options }); assert.ok(responses.length); return responses.shift(); };
  return { fetch, calls };
}
test("commits exact source bytes to main with timestamp, without deploying directly", async () => {
  const m = mock([Response.json({ tree: [], truncated: false }), new Response(html), Response.json({ commit: { sha: "abc" } }, { status: 201 })]);
  const result = await capture({ token: "test-token", fetch: m.fetch, now });
  assert.equal(result.status, "captured");
  const body = JSON.parse(m.calls[2].options.body);
  assert.equal(Buffer.from(body.content, "base64").toString(), html);
  assert.equal(body.branch, "main");
  assert.match(m.calls[2].url, /whgovwire_html_2026-11-20T19:08:12.399Z.html$/);
  assert.equal(m.calls.length, 3);
});
test("rerun skips a day already in the archive", async () => {
  const m = mock([Response.json({ tree: [{ type: "blob", path: "snapshots/whgovwire_html_2026-11-20T19:08:00Z.html" }] })]);
  assert.equal((await capture({ token: "test", fetch: m.fetch, now })).status, "already-captured");
  assert.equal(m.calls.length, 1);
});
for (const [label, response] of [["HTTP failure", new Response("unavailable", { status: 503 })], ["empty body", new Response("")], ["challenge page", new Response("<html>Access denied</html>")]]) {
  test(`${label} never writes a snapshot`, async () => {
    const m = mock([Response.json({ tree: [] }), response]);
    await assert.rejects(capture({ token: "test", fetch: m.fetch, now }));
    assert.equal(m.calls.length, 2);
  });
}
test("missing credentials never sends requests", async () => {
  const m = mock([]); await assert.rejects(capture({ fetch: m.fetch, now }), /GITHUB_TOKEN/); assert.equal(m.calls.length, 0);
});
test("GitHub write failures fail the run", async () => {
  const m = mock([Response.json({ tree: [] }), new Response(html), new Response("denied", { status: 403 })]);
  await assert.rejects(capture({ token: "test", fetch: m.fetch, now }), /commit failed: HTTP 403/);
});
