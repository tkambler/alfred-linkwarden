export {};

const BASE_URL = process.env.LINKWARDEN_URL?.replace(/\/$/, '');
const API_KEY = process.env.LINKWARDEN_API_KEY;
const url = (process.argv[2] ?? '').trim();

if (!BASE_URL || !API_KEY || !url) {
  process.exit(1);
}

try {
  const res = await fetch(`${BASE_URL}/api/v1/links`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      type: 'url',
      collection: {},
    }),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

  process.stdout.write(`Saved ${url} to Linkwarden\n`);
} catch (error) {
  process.stderr.write(
    `Failed to save: ${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exit(1);
}
