# Repo imagery

Paste a GitHub URL into a project's **Source code URL** field, press **Find
images**, and pick a cover or gallery screenshots from what comes back.

Everything the feature is lives in this folder. Three files outside it wire it
in, and removing all four things removes the feature completely — see
[Removing it](#removing-it).

## What it produces

Three sources, in the order the panel shows them.

| Source | What it is | Needs |
| --- | --- | --- |
| **Generated covers** | Four layouts × light and dark, drawn on this server from the repository's name, description, language and topics. The hue is derived from the language, falling back to a hash of `owner/repo`, so a repository always gets the same colour. | Nothing |
| **From the repository** | Screenshots and demo GIFs already committed to the README, plus GitHub's own rendered social card. | Nothing |
| **Related photos** | Free Unsplash photography matched to the repository's topics. | `UNSPLASH_ACCESS_KEY` |

Generated covers are not files. Their URL is
`/api/repo-imagery/cover?…`, and the route renders the PNG on request from the
parameters in the query string. That is deliberate: projects store images as
URLs and this codebase has no upload path anywhere, so a generated image has to
be reachable at one. Being root-relative, it also needs no host allow-listing
and survives a change of domain.

## Configuration

All optional; see `.env.example` for the full notes.

- `GITHUB_TOKEN` — raises GitHub's 60-requests-an-hour unauthenticated limit.
  A token with no scopes is enough.
- `UNSPLASH_ACCESS_KEY` — turns on the stock source.
- `REPO_IMAGERY_SECRET` — signs cover URLs.

**On the secret.** `/api/repo-imagery/cover` renders arbitrary text as an image
on this site's domain, so the query string is HMAC-signed and an unsigned
request gets a 403. When `REPO_IMAGERY_SECRET` is unset a constant published in
this repository is used, which means the signature is forgeable and the
protection is nominal. Setting it later invalidates cover URLs already saved on
projects — they 403 until the covers are picked again.

## What it deliberately does not do

- **No SVG.** `next/image` will not optimise remote SVG without
  `dangerouslyAllowSVG`, which would let every allow-listed host serve a
  scriptable document. README logos are the loss.
- **No badges.** Build status, licence and coverage shields are filtered out by
  host and by filename. They are images, and they are never what you wanted.
- **No private repositories.** The lookup is unauthenticated by design; a
  private repo reports as not found.

## How it is wired

Four touch points outside this folder:

1. `src/lib/constants/images.ts` — one relative import of `./hosts`, spread into
   `REMOTE_IMAGE_HOSTS`. Relative because `next.config.ts` loads that file
   outside the bundler, where the `@/` alias does not exist.
2. `src/components/admin/project-form.tsx` — the import, three `useWatch` lines,
   and one `<RepoImageryPanel>` block inside the **Media & links** section.
3. `src/app/api/repo-imagery/cover/route.tsx` — a re-export of `./route`.
4. `.env.example` — the optional variables above.

### Removing it

```
rm -r src/features/repo-imagery
rm -r src/app/api/repo-imagery
```

then delete the import and the `<RepoImageryPanel>` block from
`project-form.tsx` (and the three `useWatch` lines, which nothing else uses),
and the one import line and `...REPO_IMAGERY_HOSTS` from
`src/lib/constants/images.ts`.

Nothing else refers to the feature. Projects that already have a generated cover
keep a URL pointing at a route that no longer exists — reset those covers before
removing it, or the images 404.

## The files

| File | |
| --- | --- |
| `hosts.ts` | Extra `next/image` hosts. Dependency-free: it is reached from `next.config.ts`. |
| `repo-url.ts` | `parseRepoRef` — the one place `owner` and `repo` are validated. Every URL the feature builds is concatenated from them. |
| `types.ts` | The shapes that cross the Server Action boundary. |
| `github.ts` | The two GitHub reads, with failures classified as not-found / rate-limited / unavailable. |
| `harvest.ts` | Pulls images out of README markdown and ranks them. Pure. |
| `cover.ts` | Cover parameters, and their encoding into a query string. All the length caps live here. |
| `signature.ts` | HMAC over the canonical sorted query. |
| `cover-image.tsx` | The satori JSX. Flexbox only — `display: grid` does nothing. |
| `route.tsx` | The `GET` handler behind the re-export in `app/`. |
| `stock.ts` | Unsplash search, and the usage ping their terms require. |
| `suggest.ts` | Runs all three sources and assembles the result. |
| `actions.ts` | Two `withAdmin`-guarded Server Actions. |
| `panel.tsx` | The admin UI. Knows nothing about react-hook-form. |
