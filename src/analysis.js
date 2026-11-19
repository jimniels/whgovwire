export function domainGroup(domain) {
  return domain === 'youtu.be' ? 'youtube.com' : domain;
}

// Treat alternate links to a YouTube video as one destination when counting domains.
// Original URLs remain intact in the source dataset and link tables.
export function destinationKey(link) {
  if (domainGroup(link.domain) !== 'youtube.com') return link.url;
  const url = new URL(link.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const video = link.domain === 'youtu.be' ? parts[0]
    : url.pathname === '/watch' ? url.searchParams.get('v')
    : ['shorts', 'live', 'embed'].includes(parts[0]) ? parts[1] : null;
  return video ? `youtube-video:${video}` : link.url;
}

export function summarize(links) {
  const longest = [...links].sort((a, b) => b.daysOnPage - a.daysOnPage
    || a.firstSeen.localeCompare(b.firstSeen) || a.url.localeCompare(b.url)).slice(0, 20);
  const groups = new Map();
  for (const link of links) {
    const domain = domainGroup(link.domain);
    if (!groups.has(domain)) groups.set(domain, new Set());
    groups.get(domain).add(destinationKey(link));
  }
  const domains = [...groups].map(([domain, urls]) => ({ domain, count: urls.size }))
    .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain)).slice(0, 20);
  return { longest, domains, domainCount: groups.size };
}
