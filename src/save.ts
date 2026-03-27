export {};

const BASE_URL = process.env.LINKWARDEN_URL?.replace(/\/$/, '');
const API_KEY = process.env.LINKWARDEN_API_KEY;
const url = (process.argv[2] ?? '').trim();

interface AlfredItem {
  title: string;
  subtitle?: string;
  arg?: string;
  valid?: boolean;
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

if (!url) {
  output([{
    title: 'Save to Linkwarden',
    subtitle: 'Paste a URL to save',
    valid: false,
  }]);
  process.exit(0);
}

if (!/^https?:\/\//i.test(url)) {
  output([{
    title: 'Not a valid URL',
    subtitle: 'Enter a URL starting with http:// or https://',
    valid: false,
  }]);
  process.exit(0);
}

output([{
  title: `Save to Linkwarden`,
  subtitle: url,
  arg: url,
}]);
