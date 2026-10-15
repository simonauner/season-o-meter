# Notes for agents

[README.md](README.md) describes how the site works. This is what it takes
to work on it.

## Node version

The repository needs Node 24 ([.nvmrc](.nvmrc)), but a new shell may start
with an older default where Next.js, TypeScript and ESLint fail with
confusing errors (e.g. `structuredClone is not defined`). Check with
`node -v` and switch with nvm before running anything. Shell state doesn't
carry over between commands, so do it in the same command:

```sh
source ~/.nvm/nvm.sh && nvm use && npm run typecheck
```

## Checks

The same as CI ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)),
after `npm ci`:

```sh
npm run lint
npm run typecheck
npx prettier --check .
```

The sync server in [sync/](sync/) has its own dependencies:
`npm ci --prefix sync && npm run typecheck --prefix sync`.

## Running the site locally

Pages are built from `data/shows.json`, which isn't committed. A new
checkout or worktree doesn't have it, and `npm run dev` then fails with
"Could not read …/data/shows.json". Either run `npm run data` (downloads
~1.5 GB of IMDb data, cached in `.imdb/`) or, to try out a page quickly,
write a small `data/shows.json` by hand that matches `DataFile` in
[lib/types.ts](lib/types.ts), with at least one series, film series and
person, since a static export can't have a dynamic route without any pages.
`data/` is ignored by git.
