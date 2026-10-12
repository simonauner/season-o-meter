# Season-o-meter

See how a TV series is rated season by season: where it peaked and where it
went downhill.

Each season's rating is the average of its rated episodes on
[TMDB](https://www.themoviedb.org/). Unaired episodes and episodes without
votes are left out, and specials (season 0) are ignored.

## Getting started

1. Get an API key (or API Read Access Token) at
   <https://www.themoviedb.org/settings/api>.
2. Copy `.env.example` to `.env.local` and set `TMDB_API_KEY`.
3. Run the dev server:

```bash
nvm use
npm install
npm run dev
```

Open <http://localhost:3000>.

## How it works

- [Next.js](https://nextjs.org/) App Router with Cache Components. All TMDB
  calls happen on the server in [`lib/tmdb.ts`](lib/tmdb.ts) and are cached
  with `"use cache"` (lists for hours, show details for days).
- A show and all its seasons are fetched with TMDB's `append_to_response`,
  so most shows need a single request.
- The verdict ("Peaked in season 3", "Fell at the finish line", …) comes from
  [`lib/analysis.ts`](lib/analysis.ts).
- Charts are plain SVG, no chart library.

## Scripts

| Script              | What it does                     |
| ------------------- | -------------------------------- |
| `npm run dev`       | Start the dev server             |
| `npm run build`     | Production build                 |
| `npm run lint`      | ESLint                           |
| `npm run typecheck` | Generate route types and run tsc |
| `npm run format`    | Prettier                         |
