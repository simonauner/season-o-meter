# Season-o-meter

See how TV series are rated season by season, and film series movie by movie:
where they peaked and where they went downhill.

**Live at <https://seasonometer.com/>**, rebuilt every night
from the latest data.

Ratings come from [IMDb's non-commercial datasets](https://developer.imdb.com/non-commercial-datasets/).
A season's rating is the average of its episode ratings. Episodes with fewer
than five votes are left out, and only series with at least 5,000 votes and two
rated seasons are included.

IMDb doesn't say which movies belong together, so film series come from
[Wikidata](https://www.wikidata.org/): everything that is a film series, film
trilogy or other kind of film series there. A film series is included if it has
at least two movies with 1,000 votes each and 20,000 votes in total.

Posters come from [TMDB](https://www.themoviedb.org/). This website uses TMDB
and the TMDB APIs but is not endorsed, certified, or otherwise approved by
TMDB.

## How it works

The site is fully static. There are no API calls when someone visits it,
though posters are loaded from TMDB's image server.

1. `npm run data` ([scripts/build-data.mts](scripts/build-data.mts)) downloads
   the IMDb datasets (~290 MB, cached in `.imdb/` for 20 hours), queries
   Wikidata for film series, looks up posters on TMDB, and writes per-season
   ratings for every included series and per-movie ratings for every
   included film series to `data/shows.json`. Posters need a TMDB API key or
   read access token in `TMDB_API_KEY`, in `.env` locally and as a
   repository secret for the deploy workflow. Without it the data has no
   posters, and the site draws its own from the title and its ratings.
2. `npm run build` reads that file and exports every page to `out/`:
   a front page with sections for series and one for movies (`/movies/`),
   a page per series and film series, a list page per section, and a search
   index for client-side search.
3. [GitHub Actions](.github/workflows/deploy.yml) does both every night and
   deploys to GitHub Pages at <https://seasonometer.com/>. The repository is
   public, so Actions minutes are free.

The front-page sections ("Slow starters", "Collapsed like a house of cards",
…) and the verdict for each series are defined in
[lib/analysis.ts](lib/analysis.ts), and the ones for film series in
[lib/franchiseAnalysis.ts](lib/franchiseAnalysis.ts). A picker at the top of
the series front page and list pages lets visitors require at least two, three
or four rated seasons in every section (four by default). Every choice is
rendered at build time, and the visitor's choice is remembered in the browser.

On the series front page, visitors can also show only series they have rated
(as a whole or any season), or only ones they haven't. That depends on their
own ratings, so it can't be rendered at build time. Instead, every section's
full list of matches is written to `/home-sections.json`, which is fetched
the first time the filter is used.

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
- **Friends.** Opening someone's live link offers to add them as a friend,
  under a name of your choosing, or the link can be pasted on `/friends/`.
  That page puts everyone's rating of each series or film series side by
  side, with an average, sorted by any column, and limited to what all of
  them have rated or not ([lib/compare.ts](lib/compare.ts)). Friends are
  kept with the ratings, so they sync too, but they are left out of share
  links and live links: a friend's link lets anyone read their list, and
  they only gave it to you ([lib/friends.ts](lib/friends.ts)).
- **Swipe.** `/swipe/` shows one series or film series at a time, with its
  poster and how many seasons or movies it has, to rate, skip or add to
  the watchlist. Like a dating app, left is no and right is yes: dragging
  the card left, pressing ← or the Skip button skips it, and dragging it
  right or pressing → adds it to the watchlist. Ratings are a tap or a
  number key. It favours popular titles, the ones visitors are most likely
  to have seen, but in a new order every visit
  ([lib/swipeDeck.ts](lib/swipeDeck.ts)). Anything rated, skipped or on the
  watchlist doesn't come up again. Skips are kept with the ratings, so they
  sync, but are left out of share links and live links. `/profile/` lists
  them and brings them back. Browsers that let a page turn off swiping
  back and forward in history (Chrome on a trackpad) don't do it on
  `/swipe/`; swiping from the edge of a phone's screen still goes back.
- **Merging.** Every value is stored with when it was set, and the latest
  change wins per title, season or movie ([lib/userData.ts](lib/userData.ts)).
  That makes imports and syncs safe in any order.
- **Sync between devices.** Turning on sync on `/mine/` creates a random
  secret. Another device connects in one of three ways: opening the private
  link `/mine/#sync=<secret>`, scanning a QR code of that link, or getting a
  pairing code like `brave-otter` on its `/mine/` and entering it on a device
  that syncs. Devices sync when a page opens, when it comes back into view, a
  second after a change and every minute while it's visible
  ([lib/sync.ts](lib/sync.ts)).
- **Pairing codes.** A code is two words from lists of 256 short words
  ([lib/pairingWords.ts](lib/pairingWords.ts)), too few combinations to
  protect a secret. So the code doesn't: the secret only goes to the device
  showing the code someone typed, encrypted for a key that only that device
  has, and codes last ten minutes. Guessing codes could connect a stranger's
  new device to the guesser's list, so the server keeps guessing slow for
  everyone together. Holding codes in the hope that someone mistypes theirs
  into one would get the holder that person's secret, so no two words are
  one typo apart and nobody can hold more than a few codes
  ([lib/pairingCode.ts](lib/pairingCode.ts)).

## Sync server

[sync/](sync/) is a Cloudflare Worker with one Durable Object per synced
list, which keeps the list in SQLite and merges changes with the same rule as
the site. Lists are stored under a hash of the secret, which is also the id in
read-only links, so the server never stores a secret
([lib/syncProtocol.ts](lib/syncProtocol.ts)). One more Durable Object keeps
the pairing codes that devices are waiting with: at most 1,000 at a time and
three per network, with at most 60 wrong codes entered a minute in all
([sync/src/pairing.ts](sync/src/pairing.ts)).

- `POST /v1/sync` with `Authorization: Bearer <secret>` sends a device's
  changes and returns what changed since the device's last sync.
- `GET /v1/lists/<id>` returns a list for a read-only link, without its
  friends.
- `POST /v1/pair` with `{ "publicKey": "…" }`, from a device that wants to
  connect, returns a pairing code and a ticket.
- `POST /v1/pair/approve` with `Authorization: Bearer <secret>` and
  `{ "code": "…" }`, from a device that syncs, seals the secret for the
  device waiting with that code, or returns 404.
- `POST /v1/pair/wait` with `{ "ticket": "…" }` returns the sealed secret
  once the code has been entered, and `null` until then.
- `POST /v1/pair/cancel` with `{ "ticket": "…" }` forgets the code.

Getting and entering codes is limited to ten times a minute per IP address
(per /48 for IPv6), and waiting for or cancelling one to sixty.

The site only offers sync when it's built with `NEXT_PUBLIC_SYNC_URL`, which
the deploy workflow takes from the `SYNC_URL` repository variable. Deploy the
worker before the site when the two change together, so the site never calls
an endpoint that isn't there yet.

The deploy workflow also deploys the sync server on every push to `main`.
That needs a `CLOUDFLARE_API_TOKEN` repository secret with the "Edit
Cloudflare Workers" permission.

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
