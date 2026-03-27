export {};

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const BASE_URL = process.env.LINKWARDEN_URL?.replace(/\/$/, '');
const API_KEY = process.env.LINKWARDEN_API_KEY;
const CACHE_DIR = process.env.alfred_workflow_cache ?? '';
const query = (process.argv[2] ?? '').trim().toLowerCase();

const TAG_CACHE_MAX_AGE = 60 * 60 * 1000; // 1 hour

interface AlfredMod {
  arg?: string;
  subtitle?: string;
  valid?: boolean;
}

interface AlfredItem {
  uid?: string;
  title: string;
  subtitle?: string;
  arg?: string;
  valid?: boolean;
  autocomplete?: string;
  text?: { copy: string; largetype: string };
  quicklookurl?: string;
  mods?: { [key: string]: AlfredMod };
  variables?: { [key: string]: string };
}

interface Tag {
  id: number;
  name: string;
}

interface Collection {
  id: number;
  name: string;
}

interface Link {
  id: number;
  name: string;
  url: string;
  tags?: Tag[];
  collection?: Collection;
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

interface TagCache {
  timestamp: number;
  tags: Tag[];
}

function getCachedTags(): Tag[] | null {
  if (!CACHE_DIR) return null;
  try {
    const raw = readFileSync(join(CACHE_DIR, 'tags.json'), 'utf-8');
    const cache = JSON.parse(raw) as TagCache;
    if (Date.now() - cache.timestamp < TAG_CACHE_MAX_AGE) {
      return cache.tags;
    }
  } catch {}
  return null;
}

function setCachedTags(tags: Tag[]): void {
  if (!CACHE_DIR) return;
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    const cache: TagCache = { timestamp: Date.now(), tags };
    writeFileSync(join(CACHE_DIR, 'tags.json'), JSON.stringify(cache));
  } catch {}
}

async function getTags(): Promise<Tag[]> {
  const cached = getCachedTags();
  if (cached) return cached;
  const tags = await apiFetch<Tag[]>(`${BASE_URL}/api/v1/tags`);
  setCachedTags(tags);
  return tags;
}

function linkToItem(link: Link): AlfredItem {
  const tagNames = (link.tags ?? []).map(t => t.name).join(', ');
  const parts = [link.url];
  if (link.collection?.name) parts.push(link.collection.name);
  if (tagNames) parts.push(tagNames);
  return {
    uid: String(link.id),
    title: link.name || link.url,
    subtitle: parts.join('  —  '),
    arg: link.url,
    autocomplete: link.name,
    text: { copy: link.url, largetype: link.url },
    quicklookurl: link.url,
    mods: {
      ctrl: {
        arg: `${BASE_URL}/preserved/${link.id}?format=4`,
        subtitle: '⌃↵ Open preserved version',
      },
    },
  };
}

try {
  const rawQuery = (process.argv[2] ?? '').trim();

  const [nameLinks, allTags] = await Promise.all([
    apiFetch<Link[]>(`${BASE_URL}/api/v1/links?searchQueryString=${encodeURIComponent(query)}&searchByName=true`),
    getTags(),
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
      title: `No results for "${rawQuery}"`,
      subtitle: 'Try a different search term or tag',
      valid: false,
    }]);
    process.exit(0);
  }

  output(links.map(linkToItem));
} catch (error) {
  output([{
    title: 'Error searching Linkwarden',
    subtitle: error instanceof Error ? error.message : String(error),
    valid: false,
  }]);
  process.exit(1);
}
