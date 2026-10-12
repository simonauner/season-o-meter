# Season-o-meter

See how TV series are rated season by season, and film series movie by movie:
where they peaked and where they went downhill.

**Live at <https://www.auner.se/season-o-meter/>**, rebuilt every night
from the latest data.

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
   deploys to GitHub Pages at <https://www.auner.se/season-o-meter/>. The
   repository is public, so Actions minutes are free.

The front-page sections ("Slow starters", "Collapsed like a house of cards",
…) and the verdict for each series are defined in
[lib/analysis.ts](lib/analysis.ts), and the ones for film series in
[lib/franchiseAnalysis.ts](lib/franchiseAnalysis.ts). A picker at the top of
the series front page and list pages lets visitors require at least two, three
or four rated seasons in every section (four by default). Every choice is
rendered at build time, and the visitor's choice is remembered in the browser.

## Your own ratings and watchlist

Visitors can rate a series or film series as a whole, each season and each
movie (1–10), and add series and film series to a watchlist. Their own ratings
are drawn next to IMDb's in the chart, and everything is listed on
`/mine/`. There are no accounts. Everything is kept in `localStorage`
([lib/userStore.ts](lib/userStore.ts)).

- **Sharing.** `/mine/` creates a link to `/shared/` with the whole list
  compressed into the URL fragment, which is never sent to a server. Whoever
  opens it sees the list next to their own ratings, and can import it. With
  sync on, the link instead points at the synced list, so it is always
  current.
- **Merging.** Every value is stored with when it was set, and the latest
  change wins per title, season or movie ([lib/userData.ts](lib/userData.ts)).
  That makes imports and syncs safe in any order.
- **Sync between devices.** Turning on sync on `/mine/` creates a random
  secret and a private link, `/mine/#sync=<secret>`, that connects other
  devices. They sync when a page opens, when it comes back into view, a
  second after a change and every minute while it's visible
  ([lib/sync.ts](lib/sync.ts)).
- **IMDb.** IMDb has no API for a user's ratings, but its ratings and
  watchlist CSV exports can be imported on `/mine/`
  ([lib/imdbImport.ts](lib/imdbImport.ts)). Season ratings can't be, since
  IMDb rates episodes.

## Sync server

[sync/](sync/) is a Cloudflare Worker with one Durable Object per synced
list, which keeps the list in SQLite and merges changes with the same rule as
the site. Lists are stored under a hash of the secret, which is also the id in
read-only links, so the server never stores a secret
([lib/syncProtocol.ts](lib/syncProtocol.ts)).

- `POST /v1/sync` with `Authorization: Bearer <secret>` sends a device's
  changes and returns what changed since the device's last sync.
- `GET /v1/lists/<id>` returns a list for a read-only link.

The site only offers sync when it's built with `NEXT_PUBLIC_SYNC_URL`, which
the deploy workflow takes from the `SYNC_URL` repository variable.

```bash
cd sync
npm install
npm run dev     # http://localhost:8787
npm run deploy  # needs `npx wrangler login` first
```

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
