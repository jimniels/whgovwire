# whgovwire.jim-nielsen.com

A daily raw HTML archive of https://www.whitehouse.gov/wire/.

## How it works

Netlify runs `netlify/functions/capture.mts` daily at **19:08 UTC**
(12:08 p.m. Denver in winter; 1:08 p.m. in summer). The function fetches the
page and creates a timestamped HTML file in this repository's `snapshots/`
directory through the GitHub API. The commit triggers a normal Netlify build.
The build generates only a placeholder `index.html` using `src/site.ori`.
Snapshots are stored in Git but are not copied into the published site yet.
There is no collection during builds, and deploys do not invoke the collector.

## Netlify setup

1. Import the existing GitHub repository `jimniels/whgovwire` into Netlify,
   using `main` as the production branch. Build settings come from `netlify.toml`.
2. Add `GITHUB_TOKEN` in **Project configuration → Environment variables**.
   Use a fine-grained GitHub token with **Contents: Read and write** on only
   this repository. Give it Functions scope (or all scopes if the plan does
   not offer scope selection), production context, and mark it as secret if
   available. Never put the token in Git. `.env.example` is documentation only.
3. Redeploy after setting the variable. A production deploy activates the schedule.
4. Under **Functions → capture**, use **Run now** and confirm a snapshot commit
   appears and Netlify builds that commit. If today's UTC date already has a
   snapshot, the function logs `already-captured` instead of adding another.
5. Add `whgovwire.jim-nielsen.com` as a custom domain in Netlify and follow its
   DNS instructions. Ensure the project is publicly accessible.

## Local development

```sh
npm ci
npm run build
npm test
npm run typecheck
```

`npm start` runs the Origami development server. Local builds and tests do not
capture data or write to GitHub. Renew the GitHub token before its expiration;
an expired or revoked token makes captures fail.

## Archive and handoff

Historical filenames retain their original timestamps. The fresh setup keeps
snapshots through `whgovwire_html_2026-11-12T19:08:13.031Z.html` and removes later
GitHub Action captures from the current tree. They remain recoverable in Git
history. The previous GitHub Actions workflow is removed.

Keep Val Town running until two successive Netlify scheduled captures succeed.
Then import any missing Val Town captures after November 12, preserving their
filenames and skipping exact filename duplicates. Verify date coverage before
disabling Val Town. Overlapping snapshots can remain in the archive.

The collector skips days already present (UTC), rejects HTTP errors and obvious
unexpected HTML, and fails rather than committing partial or invalid results.
Its shared 25-second request deadline fits Netlify's 30-second limit. It has no
automatic retry or independent missed-run alert; inspect Netlify logs during
handoff. Scheduled execution is not an exact-time guarantee.
