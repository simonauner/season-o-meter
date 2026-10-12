# Season-o-meter

See how TV series are rated season by season: where they peaked and where
they went downhill.

Ratings come from [IMDb's non-commercial datasets](https://developer.imdb.com/non-commercial-datasets/).
A season's rating is the average of its episode ratings. Episodes with fewer
than five votes are left out, and only series with at least 5,000 votes and two
rated seasons are included.

## How it works

The site is fully static. There are no API calls when someone visits it.

1. `npm run data` ([scripts/build-data.mts](scripts/build-data.mts)) downloads
   the IMDb datasets (~290 MB, cached in `.imdb/` for 20 hours) and writes
   per-season ratings for every included series to `data/shows.json`.
2. `npm run build` reads that file and exports every page to `out/`:
   a front page with sections, a page per series, a list page per section,
   and a search index for client-side search.
3. [GitHub Actions](.github/workflows/deploy.yml) does both every night and
   deploys to GitHub Pages. The repository is public, so Actions minutes are
   free.

The front-page sections ("Slow starters", "Collapsed like a house of cards",
…) and the verdict for each series are defined in
[lib/analysis.ts](lib/analysis.ts).

## Getting started

```bash
nvm use
npm install
npm run data
npm run dev
```

Open <http://localhost:3000>.

## Scripts

| Script              | What it does                                      |
| ------------------- | ------------------------------------------------- |
| `npm run data`      | Download IMDb datasets and generate the show data |
| `npm run dev`       | Start the dev server                              |
| `npm run build`     | Static export to `out/`                           |
| `npm run lint`      | ESLint                                            |
| `npm run typecheck` | Generate route types and run tsc                  |
| `npm run format`    | Prettier                                          |
