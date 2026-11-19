const repository = "jimniels/whgovwire";
const branch = "main";
const source = "https://www.whitehouse.gov/wire/";

export async function capture({ token, fetch: request = globalThis.fetch, now = new Date() }) {
  if (!token) throw new Error("Set GITHUB_TOKEN in Netlify environment variables and redeploy.");
  // Leave a little headroom under Netlify's 30-second scheduled-function limit.
  const signal = AbortSignal.timeout(25_000);
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "whgovwire-netlify-collector",
  };
  const api = `https://api.github.com/repos/${repository}`;
  const timestamp = now.toISOString();
  const prefix = `snapshots/whgovwire_html_${timestamp.slice(0, 10)}`;

  const treeResponse = await request(`${api}/git/trees/${branch}?recursive=1`, { headers, signal });
  if (!treeResponse.ok) throw new Error(`GitHub archive listing failed: HTTP ${treeResponse.status}`);
  const tree = await treeResponse.json();
  if (tree.truncated || !Array.isArray(tree.tree)) throw new Error("Incomplete GitHub archive listing; refusing an unchecked capture.");
  const existing = tree.tree.find(entry => entry.type === "blob" && entry.path.startsWith(prefix) && entry.path.endsWith(".html"));
  if (existing) return { status: "already-captured", path: existing.path };

  const page = await request(source, { signal });
  if (!page.ok) throw new Error(`Source fetch failed: HTTP ${page.status}`);
  const bytes = Buffer.from(await page.arrayBuffer());
  const html = bytes.toString("utf8");
  if (!bytes.length || !/<html[\s>]/i.test(html) || !/white house wire/i.test(html)) {
    throw new Error("Source did not return the expected White House Wire HTML; nothing committed.");
  }

  const path = `snapshots/whgovwire_html_${timestamp}.html`;
  const saved = await request(`${api}/contents/${encodeURI(path)}`, {
    method: "PUT", headers: { ...headers, "Content-Type": "application/json" }, signal,
    body: JSON.stringify({
      message: `Capture White House Wire ${timestamp}`,
      content: bytes.toString("base64"), branch,
    }),
  });
  if (!saved.ok) throw new Error(`GitHub snapshot commit failed: HTTP ${saved.status}`);
  const commit = await saved.json();
  return { status: "captured", path, bytes: bytes.length, commit: commit.commit.sha };
}
