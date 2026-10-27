# Obsidian → GitHub Pages

Updated 28 October 2026 for the owner-requested deployment to the existing `ridgetinez/ridgetinez.github.io` repository. The app is in `stream/`, publishing from `master` to https://ridgetinez.github.io/. The existing essays stay at their original URLs. No separate custom-domain DNS is needed.

## The choice

Use Obsidian for writing, a reviewed public snapshot in Git for delivery, and GitHub Pages for hosting. Keep the current feed renderer and browser interactions. There is no framework migration and no production database. The earlier always-on server proposal is preserved as [a reference](legacy-server-deployment-plan.md).

| Responsibility | Tool |
| --- | --- |
| Capture, editing, attachments, personal organisation | Obsidian and ordinary local Markdown files |
| Private drafts and unpublished material | The vault, outside tracked source |
| Select public entries | Boolean `publish` note property |
| Preview on saves | `npm run dev`, loopback only, ignored output |
| Prepare a reviewed public snapshot | `npm run publish:prepare` |
| Build public pages and assets | Existing Node renderer, at build time |
| Version and authorise publication | Git + your GitHub account |
| Public HTTPS hosting | GitHub Pages, optionally your own domain |

The local writing guide covers the concrete [Obsidian workflow](obsidian.md). Timestamped notes avoid the ceremony of naming an article. Stable IDs survive renames; explicit timestamps preserve chronology; ordinary note links become backlinks. One public note is one stream entry. Daily Notes can remain a private index.

## The two boundaries

**Editing versus selecting:** Obsidian saves freely. A note only enters an export when its `publish` property is the boolean `true`. The starter template defaults to false. Unpublished notes aren't pulled in transitively through backlinks or embeds.

**Selecting versus publishing:** the watch preview uses `.local/`, never the committed snapshot. Preparing a publication replaces `content/`, but does not commit or push. Only pushing a reviewed commit on `master` triggers deployment. This gives a short, deliberate publication step without a login form or credentials in Obsidian.

The exporter reads files without modifying the vault. It copies only used media, normalises photos and whitelists public metadata. It refuses unresolved private links, missing files, ambiguous targets and unsupported local embeds. Failed exports preserve the previous snapshot. Builds likewise replace their output only after succeeding.

## What is ready

- Static home, date grouping, coloured tags, permanent post pages, filters, 30-entry pagination, recipe backlinks and RSS.
- Audio controls and collapsed transcripts, photos in the main feed, maths and highlighted code rendered before delivery.
- Self-hosted Inter and KaTeX fonts, with their licences; the margin garden remains client-side.
- Project Pages subpaths and custom-domain root paths, a 404 page, sitemap and `.nojekyll`.
- A deployment workflow that tests and builds on `master`, gets the actual site URL from GitHub, uploads **only `stream/dist/`**, and deploys with narrowly scoped Pages permissions.
- A pull-request workflow that checks/builds without publishing.

No private SQLite, editor code, write endpoint, `.env`, vault, original uploads or `node_modules` is in the deployed artifact. The initial tracked snapshot is deliberately empty, so sample posts cannot become ridge's history by accident. `npm run demo` previews separate sample Obsidian notes at port 4174.

## Repository and Pages configuration

1. **Choose the repository.** A project repository can serve `https://USERNAME.github.io/REPOSITORY/`. A repository named `USERNAME.github.io` serves the account-root site. Either can later use your domain. GitHub Free supports Pages from public repositories; Pages from a private source repository requires a qualifying paid plan. The website itself is public in this plan.
2. **Review what will be public.** Source, the preserved design study, sample assets and `content/` should be suitable for a public repository. Never commit the full vault, `.env`, local database or backups. Private source hosting also doesn't make the generated Pages site private.
3. **Use the existing repository.** `ridgetinez/ridgetinez.github.io` keeps its `master` branch and Git history. The migration uses a clean checkout; unfinished changes in `projects/my-website` are preserved separately. Normal GitHub authentication pushes the source and reviewed snapshot; no custom deploy token is needed in the frontend or Obsidian.
4. **Enable Pages.** In repository **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**. Run the included `Publish GitHub Pages` workflow manually if the initial push ran before this setting was ready.
5. **Check the first deployment.** Visit the URL shown in Actions. Verify a permalink, a tag page, Older posts when there are enough entries, an image, a seeking audio player, a collapsed transcript, maths, code, RSS, 404 behaviour, mobile layout and the garden. Test with a signed-out browser; no owner controls should exist.
6. **Connect the domain separately.** Verify domain ownership in GitHub, add it in the Pages settings, and apply the records GitHub specifies at your DNS provider. Enable Enforce HTTPS once its certificate is ready. Re-run the workflow after a domain change so canonical URLs, RSS and asset paths use the new base URL. The workflow reads this URL from GitHub; a handwritten CNAME file alone does not configure a domain.

The included workflow uses GitHub's built-in `GITHUB_TOKEN` to upload and deploy. The workflow deploys from `master`; the existing `github-pages` environment currently has no additional deployment protection rules. Pull requests receive no Pages deployment permission. Two publications don't upload into the same directory: each is a complete artifact, and the workflow serialises deployments. An older run does not mutate a newer run's files.

## A normal day

1. Make a timestamped Obsidian note with a hotkey. Type the fleeting thing; paste a photo or record audio if useful.
2. Adjust tags and date if needed. Use the publish checkbox when it belongs in the stream.
3. Keep `npm run dev` running for preview; save and refresh in the browser.
4. Run `npm run publish:prepare`, inspect changes and new media, commit `content/`, and push.
5. Check that Actions completed. Until then the last successful website remains online.

Keeping Git out of every keystroke matters. This first version deliberately batches publication; it doesn't build a custom Obsidian plugin or silently push each save. If the final commit/push step becomes real friction, a small explicit Obsidian command could wrap this pipeline later. Its semantics should remain “publish this reviewed snapshot,” not “upload the vault.”

## Local preview and production build

`npm start` builds the committed public snapshot and serves it at port 4173. `npm run dev -- "/path/to/vault"` previews current selected notes without changing that snapshot. `npm run demo` uses sample notes on port 4174.

The public build needs Node 24+ for the build only. GitHub Pages serves the output as files. No Node, SQLite, Sharp or Markdown parser runs on GitHub's serving edge or in a reader's browser.

To check a project path locally:

```sh
SITE_URL=https://example.github.io/ridge/ npm run build
SITE_URL=https://example.github.io/ridge/ npm run preview
```

Open `http://127.0.0.1:4173/ridge/`. `SITE_URL` includes the complete site path, unlike the legacy app's `PUBLIC_ORIGIN`. In Actions, `configure-pages` supplies it automatically. For a custom domain it has no repository prefix.

## Reliability and limits

The vault is the writing source; `content/` is a public delivery snapshot. Back up the vault and attachments independently. Git history can restore a previous published snapshot, but doesn't contain unpublished writing. The old SQLite backup command applies only to the old editor.

Withdrawal means changing `publish` to false, re-exporting and publishing a new artifact. The new build omits the page and unused media; it cannot erase Git history, reader downloads or external caches. Use stable IDs and keep dates fixed when editing. A rollback is a new commit restoring the previous public snapshot and rebuilding it; don't rewrite Git history for routine corrections.

GitHub Pages currently limits a published site to 1 GB. Keep photo optimisation and watch growing audio. When this actually approaches a limit, move public media to object storage and leave the website static. Supabase is unnecessary unless the product later needs shared live state. CloudFront adds another delivery layer we don't need for Pages. Tailscale is optional only if we later want another device to reach a local service; ordinary Obsidian sync is simpler for mobile drafting.

No automatic transcription, server-side AI or instant mobile-to-publication path is included. Obsidian-specific plugin views, heading/block links and embedded notes aren't interpreted by this exporter. These are clear expansion points, not reasons to run a public backend now.

Sources: [GitHub Pages overview](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [publishing source and custom domains](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), [configure-pages URL outputs](https://github.com/actions/configure-pages/blob/main/action.yml).
