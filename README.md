# GitHub Profile Tracker

A static, no-build tracker for GitHub profiles. Search a username to see the profile,
repository stats and language mix, and keep a watchlist that reports what changed since
the last sync.

Data comes from the provided API:

```
POST https://agentaiclone.jhanson.net/api/v1/apis/testing/run
content-type: application/json

{ "userName": "PotatoMan970" }
```

The API sends `access-control-allow-origin: *`, so the browser calls it directly — there is
no backend, no build step and no API key.

## Run it

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Any static host works too (Netlify, Vercel, GitHub Pages, S3): upload `index.html`,
`styles.css` and `app.js`.

## What it does

- **Profile view** — avatar, name, bio, company, location, website, socials, account type,
  join date, and counts for repos, followers, following, stars, forks and gists.
- **Language breakdown** — bar + legend weighted by repositories per language.
- **Repositories** — every repo returned, sortable by stars, recent push or name, with
  stars/forks/issues/license/topics and a link to GitHub.
- **Tracked profiles** — saved in `localStorage` (`gh-profile-tracker:v1`). Each sync stores
  a snapshot of repos/followers/stars, and the next sync shows the deltas (`+2 followers`).
  Sync one profile or all of them.
- **Shareable links** — `#user=octocat` opens that profile directly.
- **Input handling** — accepts `@name` or a pasted `https://github.com/name` URL.

## Notes

- An unknown user comes back from the API as HTTP 200 with `profile.username: null` and
  `sourceStatus.profile.status: 404`; the app detects that and shows a "Profile not found"
  state instead of an empty page.
- Star/fork totals only cover the repositories returned in that lookup, since the API does
  not fetch anything beyond the data it already has.
- All tracked data stays in the browser; clearing site data clears the watchlist.
