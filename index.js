import alfy from 'alfy';

const BASE_URL = process.env.LINKWARDEN_URL?.replace(/\/$/, '');
const API_KEY  = process.env.LINKWARDEN_API_KEY;

if (!BASE_URL || !API_KEY) {
  alfy.output([{
    title: 'Linkwarden is not configured',
    subtitle: 'Set LINKWARDEN_URL and LINKWARDEN_API_KEY in the workflow variables',
    valid: false,
  }]);
  process.exit(0);
}

const query = alfy.input.trim().toLowerCase();

if (!query) {
  alfy.output([{
    title: 'Search Linkwarden',
    subtitle: 'Type a name or tag to search your bookmarks',
    valid: false,
  }]);
  process.exit(0);
}

const headers = { Authorization: `Bearer ${API_KEY}` };

const [nameResult, tagsResult] = await Promise.all([
  alfy.fetch(
    `${BASE_URL}/api/v1/links?searchQueryString=${encodeURIComponent(query)}&searchByName=true`,
    { headers, maxAge: 30_000 }
  ),
  alfy.fetch(`${BASE_URL}/api/v1/tags`, { headers, maxAge: 300_000 }),
]);

const nameLinks = nameResult?.response  ?? [];
const allTags   = tagsResult?.response  ?? [];

const matchingTags = allTags.filter(t => t.name.toLowerCase().includes(query));

const tagLinkResults = await Promise.all(
  matchingTags.map(tag =>
    alfy.fetch(`${BASE_URL}/api/v1/links?tagId=${tag.id}`, { headers, maxAge: 30_000 })
  )
);

const tagLinks = tagLinkResults.flatMap(r => r?.response ?? []);

// Deduplicate by id, name results first
const seen = new Map();
for (const link of [...nameLinks, ...tagLinks]) {
  if (!seen.has(link.id)) seen.set(link.id, link);
}
const links = [...seen.values()];

if (links.length === 0) {
  alfy.output([{
    title: `No results for "${alfy.input}"`,
    subtitle: 'Try a different search term or tag',
    valid: false,
  }]);
  process.exit(0);
}

alfy.output(links.map(link => {
  const tagNames = (link.tags ?? []).map(t => t.name).join(', ');
  return {
    uid:          String(link.id),
    title:        link.name || link.url,
    subtitle:     tagNames ? `${link.url}  —  ${tagNames}` : link.url,
    arg:          link.url,
    autocomplete: link.name,
    text:         { copy: link.url, largetype: link.url },
    quicklookurl: link.url,
  };
}));
