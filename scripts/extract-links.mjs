import { load } from 'cheerio';
import { getDomain } from 'tldts';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';

const snapshotsDirectory = new URL('../snapshots/', import.meta.url);
const filenamePattern = /^whgovwire_html_(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)\.html$/;

export function snapshotDate(filename) {
  const match = filename.match(filenamePattern);
  if (!match || !Number.isFinite(Date.parse(match[1]))) {
    throw new Error(`Invalid snapshot filename: ${filename}`);
  }
  return new Date(match[1]).toISOString();
}

export function extractLinks(html) {
  const $ = load(html);
  const links = new Map();
  // This selector is the hereustic for guestimating where the links are that
  // represent editorial choices. Tweak this to get different data results.
  // This one is meant to convey the approximate semantic choices around
  // What links ended up at the top of the page (video) and the middle columns
  $('main :is(h1, h2) a[href^="http"][target="_blank"]').each((_, element) => {
    const anchor = $(element);
    if (anchor.find('svg').length) return;
    const url = anchor.attr('href');
    let parsed;
    try { parsed = new URL(url); } catch { return; }
    if (!['http:', 'https:'].includes(parsed.protocol)) return;
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === 'whitehouse.gov' || hostname.endsWith('.whitehouse.gov')) return;
    const text = anchor.text().replace(/\s+/g, ' ').trim();
    if (!text || links.has(url)) return;
    links.set(url, { url, domain: getDomain(hostname) ?? hostname, text });
  });
  return [...links.values()];
}

export function mergeLinks(records, links, timestamp) {
  // Defensive deduplication also makes counts correct for callers other than extractLinks.
  const seen = new Set();
  for (const link of links) {
    if (seen.has(link.url)) continue;
    seen.add(link.url);
    const existing = records.get(link.url);
    if (existing) {
      existing.snapshotCount++;
      if (timestamp < existing.firstSeen) {
        existing.firstSeen = timestamp;
        existing.text = link.text;
      }
      if (timestamp > existing.lastSeen) existing.lastSeen = timestamp;
    } else {
      records.set(link.url, { ...link, firstSeen: timestamp, lastSeen: timestamp, snapshotCount: 1 });
    }
  }
}

export default async function buildArchive(directory = snapshotsDirectory) {
  const started = performance.now();
  const snapshots = (await readdir(directory))
    .filter(name => name.endsWith('.html'))
    .map(name => ({ name, timestamp: snapshotDate(name) }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.name.localeCompare(b.name));
  const records = new Map();
  const observedDates = new Map();
  let bytes = 0;
  let observations = 0;
  let emptySnapshots = 0;
  let peakRss = process.memoryUsage().rss;
  for (const snapshot of snapshots) {
    const path = join(directory instanceof URL ? fileURLToPath(directory) : directory, snapshot.name);
    const buffer = await readFile(path);
    bytes += buffer.length;
    const links = extractLinks(buffer.toString('utf8'));
    observations += links.length;
    if (!links.length) emptySnapshots++;
    mergeLinks(records, links, snapshot.timestamp);
    for (const link of links) {
      if (!observedDates.has(link.url)) observedDates.set(link.url, new Set());
      observedDates.get(link.url).add(snapshot.timestamp.slice(0, 10));
    }
    peakRss = Math.max(peakRss, process.memoryUsage().rss);
  }
  const links = [...records.values()].map(link => ({ ...link, daysOnPage: observedDates.get(link.url).size })).sort((a, b) => b.firstSeen.localeCompare(a.firstSeen) || a.url.localeCompare(b.url));
  const metrics = {
    snapshots: snapshots.length, inputBytes: bytes, observations, uniqueLinks: links.length,
    emptySnapshots, firstSnapshot: snapshots[0]?.timestamp ?? null,
    lastSnapshot: snapshots.at(-1)?.timestamp ?? null,
    extractionSeconds: Number(((performance.now() - started) / 1000).toFixed(3)),
    peakRssMiB: Number((Math.max(peakRss, process.resourceUsage().maxRSS * 1024) / 1024 / 1024).toFixed(1)),
  };
  console.error(`[archive] ${JSON.stringify(metrics)}`);
  return { links, metrics };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await buildArchive();
}
