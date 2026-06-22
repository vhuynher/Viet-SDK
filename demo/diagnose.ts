import { buildQueryString } from '../src/http/query-builder.js';
import { omitSort } from '../src/http/client-sort.js';
import { LotrClient, ApiError, AuthenticationError } from '../src/index.js';

async function runStep(label: string, url: string, fn: () => Promise<void>): Promise<boolean> {
  console.log(`\n→ ${label}`);
  console.log(`  URL path: ${url}`);
  try {
    await fn();
    console.log('  ✓ OK');
    return true;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      console.log('  ✗ 401 Unauthorized — your LOTR_API_KEY is missing or invalid');
      console.log('    Get a new key at https://the-one-api.dev/sign-up');
    } else if (error instanceof ApiError) {
      console.log(`  ✗ HTTP ${error.status}: ${error.message}`);
    } else {
      console.log('  ✗', error);
    }
    return false;
  }
}

async function main() {
  const raw = process.env.LOTR_API_KEY ?? '';
  const apiKey = raw.replace(/^\uFEFF/, '').trim();

  console.log('--- LOTR SDK API diagnostic ---');
  console.log(`API key loaded: ${apiKey ? 'yes' : 'no'} (length ${apiKey.length})`);

  if (!apiKey) {
    console.error('\nSet LOTR_API_KEY in .env (see .env.example)');
    process.exit(1);
  }

  if (raw.length !== apiKey.length) {
    console.log('Note: removed extra whitespace from LOTR_API_KEY in .env — save the trimmed value');
  }

  const client = new LotrClient({ apiKey });

  const steps = [
    {
      label: 'Basic movie list',
      path: '/movie' + buildQueryString({ limit: 1 }),
      run: async () => {
        const result = await client.movies.list({ limit: 1 });
        console.log(`  First movie: ${result.docs[0]?.name ?? '(none)'}`);
      },
    },
    {
      label: 'Movie list with filter',
      path: '/movie' + buildQueryString({ limit: 3, filter: { runtimeInMinutes: { gte: 160 } } }),
      run: async () => {
        const result = await client.movies.list({
          limit: 3,
          filter: { runtimeInMinutes: { gte: 160 } },
        });
        console.log(`  Matches: ${result.docs.length} (total ${result.total})`);
      },
    },
    {
      label: 'Movie list with filter + sort',
      path:
        '/movie' +
        buildQueryString(
          omitSort({
            limit: 3,
            filter: { runtimeInMinutes: { gte: 160 } },
            sort: { name: 'asc' },
          }).options,
        ),
      run: async () => {
        const result = await client.movies.list({
          limit: 3,
          filter: { runtimeInMinutes: { gte: 160 } },
          sort: { name: 'asc' },
        });
        console.log(`  Matches: ${result.docs.map((m) => m.name).join(', ')}`);
        console.log('  (sort applied client-side — API returns 500 for sort on /movie)');
      },
    },
    {
      label: 'Movie quotes by ID',
      path: '/movie/5cd95395de30eff6ebccde5b/quote?limit=2',
      run: async () => {
        const result = await client.movies.quotes('5cd95395de30eff6ebccde5b', { limit: 2 });
        console.log(`  Quotes: ${result.docs.length} (total ${result.total})`);
      },
    },
    {
      label: 'Single movie by ID',
      path: '/movie/5cd95395de30eff6ebccde5b',
      run: async () => {
        const movie = await client.movies.get('5cd95395de30eff6ebccde5b');
        console.log(`  Movie: ${movie.name}`);
      },
    },
    {
      label: 'Quote list with regex filter',
      path: '/quote' + buildQueryString({ limit: 2, filter: { dialog: /ring/i } }),
      run: async () => {
        const result = await client.quotes.list({
          limit: 2,
          filter: { dialog: /ring/i },
        });
        console.log(`  Quotes: ${result.docs.length}`);
      },
    },
  ];

  for (const step of steps) {
    const ok = await runStep(step.label, step.path, step.run);
    if (!ok) {
      console.log('\nStopped at first failure. Fix the issue above, then re-run: npm run diagnose');
      process.exit(1);
    }
  }

  console.log('\nAll checks passed. Run: npm run demo');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
