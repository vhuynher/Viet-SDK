import { LotrClient, ApiError, AuthenticationError } from '../src/index.js';

function loadApiKey(): string {
  const raw = process.env.LOTR_API_KEY ?? '';
  const apiKey = raw.replace(/^\uFEFF/, '').trim();
  if (!apiKey) {
    console.error('Missing LOTR_API_KEY.');
    console.error('Copy .env.example to .env and paste your key from https://the-one-api.dev/sign-up');
    process.exit(1);
  }
  if (raw.length !== apiKey.length) {
    console.warn('Warning: trimmed extra whitespace from LOTR_API_KEY — remove trailing spaces in .env');
  }
  return apiKey;
}

async function main() {
  const client = new LotrClient({ apiKey: loadApiKey() });

  console.log('--- Movies (basic list) ---');
  const all = await client.movies.list({ limit: 3, sort: { name: 'asc' } });
  console.log(all.docs.map((m) => m.name));

  console.log('\n--- Movies with runtime >= 160 min (sorted by name) ---');
  const movies = await client.movies.list({
    filter: { runtimeInMinutes: { gte: 160 } },
    limit: 3,
    sort: { name: 'asc' },
  });
  console.log(movies.docs.map((m) => `${m.name} (${m.runtimeInMinutes} min)`));

  const movieId = '5cd95395de30eff6ebccde5b'; // The Two Towers — has quotes (series entries often do not)

  console.log('\n--- Single movie ---');
  const movie = await client.movies.get(movieId);
  console.log(`${movie.name} — ${movie.academyAwardWins} Oscar wins`);

  console.log('\n--- Quotes from that movie ---');
  const movieQuotes = await client.movies.quotes(movieId, { limit: 3 });
  if (movieQuotes.docs.length === 0) {
    console.log('(no quotes returned for this movie)');
  }
  movieQuotes.docs.forEach((q) => console.log(`- ${q.dialog.slice(0, 80)}...`));

  console.log('\n--- Random quote from that movie ---');
  const randomFromMovie = await client.movies.randomQuote(movieId);
  console.log(randomFromMovie.dialog.slice(0, 80) + '...');

  console.log('\n--- Random quote (any movie) ---');
  const randomQuote = await client.quotes.random();
  console.log(randomQuote.dialog.slice(0, 80) + '...');

  console.log('\n--- Filter quotes by dialog ---');
  const filtered = await client.quotes.list({
    filter: { dialog: /ring/i },
    limit: 2,
  });
  filtered.docs.forEach((q) => console.log(`- ${q.dialog.slice(0, 80)}...`));
}

main().catch((error) => {
  if (error instanceof AuthenticationError) {
    console.error('\nAuthentication failed (401). Your LOTR_API_KEY is invalid.');
    console.error('Sign up or reset your key at https://the-one-api.dev/sign-up');
    console.error('Make sure .env contains ONLY your real key — not the .env.example placeholder.');
  } else if (error instanceof ApiError) {
    console.error(`\nAPI error (HTTP ${error.status}): ${error.message}`);
    console.error('Run: npm run diagnose');
    console.error('The One API often returns 500 for bad keys or broken queries — not always your SDK.');
  } else {
    console.error(error);
  }
  process.exit(1);
});
