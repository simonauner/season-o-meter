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

## Design rules

### Buttons

Buttons are `Button`, or `ButtonLink` for a link that looks like one, from
[components/Button.tsx](components/Button.tsx). Don't style a button on a
page: a page only adds layout, like a margin or a width, with `className`.
None is filled purple.

- `variant="outlined"`, the default, is for most buttons, including one that
  stands alone, like "Show tips again" or "Create a recovery key".
- `variant="tonal"`, with a purple border and tint, is for the main choice
  next to another button, like "Copy key" next to "Email it to me", and for
  the button that does what a text field is for, like "Copy link", "Add
  friend" or "Restore".
- Removing something is red: `variant="danger"` for the button that asks,
  and `variant="danger-filled"` for the one that does it.
- `size="medium"`, the default, is for panels, `small` next to a rating,
  and `large` for a button on its own under a list, like "Show more".

### Saying that an action is done

When the visitor does something that takes effect where they are, without
going to another page (saving, copying, removing, bringing something back),
say that it's done with `Done` from [components/Done.tsx](components/Done.tsx):
a check that gleams once, then a few words, like "Copied" or "Everything is
deleted."

- It goes right after the button that did it, in the same row. The button
  keeps its label, so nothing moves. Put that button last in its row.
- A text field goes on its own line above its buttons, so there's room for
  it after them.
- A button that has nothing more to do once it's done stays, disabled, with
  `Done` after it, instead of going away.
- Doing it again gleams again: give `Done` a new `key` each time.
- An action that asks first shows Cancel, then the button that does it. Once
  it's done, both stay, disabled, with `Done` after them.
