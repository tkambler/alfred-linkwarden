export {};

const BASE_URL = process.env.LINKWARDEN_URL?.replace(/\/$/, '');
const API_KEY = process.env.LINKWARDEN_API_KEY;
const query = (process.argv[2] ?? '').trim().toLowerCase();

interface AlfredItem {
  uid?: string;
  title: string;
  subtitle?: string;
  arg?: string;
  valid?: boolean;
  autocomplete?: string;
  text?: { copy: string; largetype: string };
  quicklookurl?: string;
}

interface Tag {
  id: number;
  name: string;
}

interface Link {
  id: number;
  name: string;
  url: string;
  tags?: Tag[];
}

interface ApiResponse<T> {
  response: T;
}

function output(items: AlfredItem[]): void {
  process.stdout.write(JSON.stringify({ items }) + '\n');
}

if (!BASE_URL || !API_KEY) {
  output([{
    title: 'Linkwarden is not configured',
    subtitle: 'Set LINKWARDEN_URL and LINKWARDEN_API_KEY in the workflow variables',
    valid: false,
  }]);
  process.exit(0);
}

if (!query) {
  output([{
    title: 'Search Linkwarden',
    subtitle: 'Type a name or tag to search your bookmarks',
    valid: false,
  }]);
  process.exit(0);
}

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const data = await res.json() as ApiResponse<T>;
  return data.response;
}

try {
  const [nameLinks, allTags] = await Promise.all([
    apiFetch<Link[]>(`${BASE_URL}/api/v1/links?searchQueryString=${encodeURIComponent(query)}&searchByName=true`),
    apiFetch<Tag[]>(`${BASE_URL}/api/v1/tags`),
  ]);

  const matchingTags = allTags.filter(t => t.name.toLowerCase().includes(query));

  const tagLinkResults = await Promise.all(
    matchingTags.map(tag => apiFetch<Link[]>(`${BASE_URL}/api/v1/links?tagId=${tag.id}`))
  );

  const tagLinks = tagLinkResults.flat();

  const seen = new Map<number, Link>();
  for (const link of [...nameLinks, ...tagLinks]) {
    if (!seen.has(link.id)) seen.set(link.id, link);
  }
  const links = [...seen.values()];

  if (links.length === 0) {
    output([{
      title: `No results for "${process.argv[2]}"`,
      subtitle: 'Try a different search term or tag',
      valid: false,
    }]);
    process.exit(0);
  }

  output(links.map(link => {
    const tagNames = (link.tags ?? []).map(t => t.name).join(', ');
    return {
      uid: String(link.id),
      title: link.name || link.url,
      subtitle: tagNames ? `${link.url}  —  ${tagNames}` : link.url,
      arg: link.url,
      autocomplete: link.name,
      text: { copy: link.url, largetype: link.url },
      quicklookurl: link.url,
    };
  }));
} catch (error) {
  output([{
    title: 'Error searching Linkwarden',
    subtitle: error instanceof Error ? error.message : String(error),
    valid: false,
  }]);
  process.exit(1);
}
