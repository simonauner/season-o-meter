# Season-o-meter

See how TV series are rated season by season, and film series movie by movie:
where they peaked and where they went downhill.

Ratings come from [IMDb's non-commercial datasets](https://developer.imdb.com/non-commercial-datasets/).
A season's rating is the average of its episode ratings. Episodes with fewer
than five votes are left out, and only series with at least 5,000 votes and two
rated seasons are included.

IMDb doesn't say which movies belong together, so film series come from
[Wikidata](https://www.wikidata.org/): everything that is a film series, film
trilogy or other kind of film series there. A film series is included if it has
at least two movies with 1,000 votes each and 20,000 votes in total.

## How it works

The site is fully static. There are no API calls when someone visits it.

1. `npm run data` ([scripts/build-data.mts](scripts/build-data.mts)) downloads
   the IMDb datasets (~290 MB, cached in `.imdb/` for 20 hours), queries
   Wikidata for film series, and writes per-season ratings for every included
   series and per-movie ratings for every included film series to
   `data/shows.json`.
2. `npm run build` reads that file and exports every page to `out/`:
   a front page with sections for series and one for movies (`/movies/`),
   a page per series and film series, a list page per section, and a search
   index for client-side search.
3. [GitHub Actions](.github/workflows/deploy.yml) does both every night and
   deploys to GitHub Pages. The repository is public, so Actions minutes are
   free.

The front-page sections ("Slow starters", "Collapsed like a house of cards",
…) and the verdict for each series are defined in
[lib/analysis.ts](lib/analysis.ts), and the ones for film series in
[lib/franchiseAnalysis.ts](lib/franchiseAnalysis.ts).

## Getting started

```bash
nvm use
npm install
npm run data
npm run dev
```

Open <http://localhost:3000>.

## Scripts

| Script              | What it does                                    |
| ------------------- | ----------------------------------------------- |
| `npm run data`      | Download IMDb and Wikidata data and generate it |
| `npm run dev`       | Start the dev server                            |
| `npm run build`     | Static export to `out/`                         |
| `npm run lint`      | ESLint                                          |
| `npm run typecheck` | Generate route types and run tsc                |
| `npm run format`    | Prettier                                        |
