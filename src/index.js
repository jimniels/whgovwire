import { summarize } from './analysis.js';
export const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

export default function renderIndex({ links, metrics }) {
  const { longest, domains, domainCount } = summarize(links);
  const date = timestamp => `<time datetime="${escapeHtml(timestamp)}" title="${escapeHtml(timestamp)}">${escapeHtml(timestamp.slice(0, 10))}</time>`;
  const linkRows = entries => entries.map(link => `<tr><td>${date(link.firstSeen)}</td><td>${date(link.lastSeen)}</td><td class="count">${link.daysOnPage}</td><td>${escapeHtml(link.domain)}</td><td><a href="${escapeHtml(link.url)}" rel="noreferrer">${escapeHtml(link.text)}</a></td></tr>`).join('\n') || '<tr><td colspan="5">No links found.</td></tr>';
  const linkTable = entries => `<div class="table"><table><thead><tr><th scope="col">First seen</th><th scope="col">Last seen</th><th scope="col" class="count">Days on page</th><th scope="col">Domain</th><th scope="col">Headline</th></tr></thead><tbody>${linkRows(entries)}</tbody></table></div>`;
  const maxDomainCount = domains[0]?.count ?? 1;
  const domainRows = domains.map(entry => `<tr><th scope="row"><span class="domain">${escapeHtml(entry.domain)}<span class="bar" style="width:${(entry.count / maxDomainCount * 100).toFixed(2)}%" aria-hidden="true"></span></span></th><td class="count">${entry.count}</td></tr>`).join('\n') || '<tr><td colspan="2">No domains found.</td></tr>';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>White House Wire links</title>
<style>
:root { color-scheme: light dark; font-family: system-ui, sans-serif; line-height: 1.5; }
body { max-width: 90rem; margin: 2.5rem auto; padding: 0 1.25rem; }
h1,h2 { line-height: 1.2; letter-spacing: -.025em; } h1 { font-size: 2.3rem; }
h2 { margin-bottom: .5rem; } a { color: light-dark(#1459a0, #8bc3ff); }
section { margin-top: 3rem; } .note { max-width: 75ch; color: light-dark(#555, #bbb); }
.stats { display: flex; flex-wrap: wrap; gap: 1rem 3rem; padding: 1rem 0; }
.stats strong { display: block; font-size: 1.7rem; font-variant-numeric: tabular-nums; }
.table { overflow-x: auto; } table { width: 100%; border-collapse: collapse; text-align: left; }
th, td { padding: .7rem .6rem; border-bottom: 1px solid light-dark(#ddd, #444); vertical-align: top; }
thead th { font-size: .85rem; white-space: nowrap; } tbody th { font-weight: 500; }
time { white-space: nowrap; font-variant-numeric: tabular-nums; }
.count { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.domains { max-width: 42rem; } .domains th { width: 85%; }
.domain { position: relative; display: block; padding-bottom: .55rem; }
.bar { position: absolute; height: 3px; left: 0; bottom: 0; background: light-dark(#6b96c3, #689ace); }
footer { margin-top: 3rem; font-size: .9rem; }
</style>
</head>
<body>
<header>
<h1>White House Wire links</h1>
<p>What gets linked, and what stays on the page?</p>
<div class="stats"><div><strong>${links.length.toLocaleString('en-US')}</strong>unique URLs</div><div><strong>${metrics.snapshots.toLocaleString('en-US')}</strong>snapshots</div><div><strong>${domainCount.toLocaleString('en-US')}</strong>domains</div></div>
<p>${metrics.firstSnapshot ? `Archive: ${metrics.firstSnapshot.slice(0, 10)}–${metrics.lastSnapshot.slice(0, 10)} (UTC).` : 'No snapshots yet.'} <a href="/index.json">Download JSON</a> · <a href="https://github.com/jimniels/whgovwire/tree/main/snapshots">Original snapshots</a></p>
</header>
<section aria-labelledby="longest-heading">
<h2 id="longest-heading">Top 20 links by days on page</h2>
<p class="note">Days on page counts distinct UTC dates when a link was observed, once per date. It excludes missing captures and dates when the link was absent; it does not assume continuous publication between first and last seen. Dates are observations, not article publication dates. Headlines retain their first observed wording. Links are extracted from h1 and h2 headings in the main content.</p>
${linkTable(longest)}
</section>
<section class="domains" aria-labelledby="domains-heading">
<h2 id="domains-heading">Top 20 domains linked to</h2>
<p class="note">Count is unique destinations across the archive, not daily appearances. YouTube and youtu.be are grouped together; alternate watch, short, live, and embed URLs for the same video count once. Other URLs retain exact matching.</p>
<div class="table"><table><thead><tr><th scope="col">Domain</th><th scope="col" class="count">Count</th></tr></thead><tbody>${domainRows}</tbody></table></div>
</section>
<footer>Generated at build time from archived HTML. <a href="https://www.whitehouse.gov/wire/">Original source</a>.</footer>
</body>
</html>`;
}
