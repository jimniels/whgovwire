import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractLinks, mergeLinks, snapshotDate } from '../scripts/extract-links.js';
import renderIndex from '../src/index.js';

test('extracts readable external links, normalizes whitespace and counts a URL once', () => {
 const html = `<main><h1><a href="https://news.example.co.uk/story?a=1&amp;b=2" target="_blank"><img></a>
 <a href="https://news.example.co.uk/story?a=1&amp;b=2" target="_blank"> A &amp; B\n headline </a>
 <a href="https://news.example.co.uk/story?a=1&amp;b=2" target="_blank">Duplicate</a>
 <a href="https://whitehouse.gov/wire/" target="_blank">Internal</a>
 <a href="https://www.whitehouse.gov/" target="_blank">Internal subdomain</a>
 <a href="https://example.com/?source=whitehouse.gov" target="_blank">External reference</a>
 <a href="https://social.example/" target="_blank"><svg></svg>Social</a>
 <a href="https://example.com/other">No target</a>
 <a href="https://example.com/empty" target="_blank"> \n </a></h1></main>`;
 assert.deepEqual(extractLinks(html), [
  { url:'https://news.example.co.uk/story?a=1&b=2', domain:'example.co.uk', text:'A & B headline' },
  { url:'https://example.com/?source=whitehouse.gov', domain:'example.com', text:'External reference' },
 ]);
});
test('preserves first headline and tracks observation dates, including multiple captures per day', () => {
 const records = new Map();
 const link = {url:'https://example.com/a',domain:'example.com',text:'Later title'};
 mergeLinks(records,[link,link],'2026-11-19T19:08:00.000Z');
 mergeLinks(records,[{...link,text:'Original title'}],'2026-11-18T19:08:00.000Z');
 mergeLinks(records,[link],'2026-11-19T20:08:00.000Z');
 assert.deepEqual(records.get(link.url), {...link,text:'Original title',firstSeen:'2026-11-18T19:08:00.000Z',lastSeen:'2026-11-19T20:08:00.000Z',snapshotCount:3});
});
test('keeps different query strings as different URLs', () => {
 const links=extractLinks('<main><h2><a href="https://example.com/a?x=1" target="_blank">One</a><a href="https://example.com/a?x=2" target="_blank">Two</a></h2></main>');
 assert.equal(links.length,2);
});
test('derives dates from both supported timestamp precisions and rejects unrecognized filenames', () => {
 assert.equal(snapshotDate('whgovwire_html_2026-11-12T19:08:13.031Z.html'),'2026-11-12T19:08:13.031Z');
 assert.equal(snapshotDate('whgovwire_html_2026-11-12T19:08:13Z.html'),'2026-11-12T19:08:13.000Z');
 assert.throws(()=>snapshotDate('unrecognized.html'));
});
test('escapes source headlines and URLs in generated HTML', () => {
 const html=renderIndex({links:[{url:'https://example.com/?a=1&b="x"',domain:'example.com',text:'<script>alert(1)</script>',firstSeen:'2026-11-19T19:08:00Z',lastSeen:'2026-11-19T19:08:00Z',snapshotCount:1,daysOnPage:1}],metrics:{snapshots:1,firstSnapshot:'2026-11-19T19:08:00Z',lastSnapshot:'2026-11-19T19:08:00Z'}});
 assert.ok(!html.includes('<script>')); assert.ok(html.includes('&lt;script&gt;')); assert.ok(html.includes('&amp;b=&quot;x&quot;'));
});

test('full pipeline orders files by timestamp and parses one record across captures', async () => {
 const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
 const { tmpdir } = await import('node:os');
 const { join } = await import('node:path');
 const { default: buildArchive } = await import('../scripts/extract-links.js');
 const directory = await mkdtemp(join(tmpdir(), 'whgovwire-extraction-'));
 try {
  await writeFile(join(directory,'whgovwire_html_2026-11-19T19:08:13Z.html'),'<main><h1><a href="https://example.com/story" target="_blank">Later</a></h1></main>');
  await writeFile(join(directory,'whgovwire_html_2026-11-18T19:08:13.031Z.html'),'<main><h2><a href="https://example.com/story" target="_blank">Earlier</a></h2></main>');
  await writeFile(join(directory,'whgovwire_html_2026-11-19T20:08:13Z.html'),'<main><h2><a href="https://example.com/story" target="_blank">Later again</a></h2></main>');
  const result = await buildArchive(directory);
  assert.equal(result.links.length,1);
  assert.equal(result.links[0].text,'Earlier');
  assert.equal(result.links[0].snapshotCount,3);
  assert.equal(result.links[0].daysOnPage,2);
  assert.equal(result.links[0].firstSeen,'2026-11-18T19:08:13.031Z');
  assert.equal(result.links[0].lastSeen,'2026-11-19T20:08:13.000Z');
  assert.equal(result.metrics.snapshots,3);
 } finally { await rm(directory,{recursive:true,force:true}); }
});


test('only selects links in main h1 and h2 headings', () => {
 const a = '<a href="https://example.com/a" target="_blank">Headline</a>';
 assert.equal(extractLinks(`<header><h1>${a}</h1></header><main><p>${a}</p><h3>${a}</h3></main>`).length, 0);
 assert.equal(extractLinks(`<main><h1>${a}</h1></main>`).length, 1);
 assert.equal(extractLinks(`<main><h2>${a}</h2></main>`).length, 1);
});
