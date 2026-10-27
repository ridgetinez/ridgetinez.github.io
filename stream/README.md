# ridge

A small personal stream. Write in **Obsidian**, publish selected notes as a **static website on GitHub Pages**. The existing typography, coloured tags, photos, audio, maths, code blocks and interactive margin garden stay intact. Generated artefacts are deferred.

This app lives in `stream/` inside [ridgetinez/ridgetinez.github.io](https://github.com/ridgetinez/ridgetinez.github.io). GitHub Pages is configured through the workflow at the repository root; `master` is the publishing branch. Run the commands below from this directory.

## Try it

Node.js 24 or newer:

```sh
npm ci
npm run demo
```

Open <http://127.0.0.1:4174> for the sample feed, generated from separate sample Obsidian notes. This never updates the actual public content snapshot.

Open <http://127.0.0.1:4174/garden-study.html> to explore the continually growing nasturtium margins. This local design study extends the scrolling space after the sample posts; it is excluded from the deployed website. [The garden notes](docs/garden.md) record the botanical references, earlier iterations and rendering approach.

## Write

```sh
npm run vault:init
```

Open `.local/vault` as a folder vault in Obsidian. It includes a stream-entry template. Or copy that template from `obsidian/Templates/` into an existing vault.

Use a timestamped note for each entry. The template sets its ID, date and `publish: false`; write the fleeting thought, add tags and attachments, and enable the publish checkbox when ready. [The Obsidian guide](docs/obsidian.md) walks through hotkey setup, transcripts, links, previews and backups.

```sh
npm run dev -- "/absolute/path/to/your/vault"
```

Open <http://127.0.0.1:4173>. Saving selected notes rebuilds the local preview; refresh to see changes. This watches without modifying your vault or the tracked public snapshot. Nothing is committed or pushed automatically. Use `RIDGE_VAULT` in an ignored `.env` to avoid passing the path each time.

## Prepare and publish

```sh
npm run publish:prepare -- "/absolute/path/to/your/vault"
```

Only notes with boolean `publish: true` and media they use are exported into `content/`. Private properties, comments, vault paths and Obsidian configuration are omitted. The command also builds `dist/`. Review changes and new files before committing. The whole private vault must remain outside tracked Git files.

To publish the reviewed snapshot:

```sh
git add -A content
git diff --cached -- content
git commit -m "Update stream"
git push origin master
```

GitHub Actions tests the project, builds the selected snapshot and deploys **only `dist/`**. Visitors receive files, with no server, database, write API or login. The site stays online while the laptop sleeps.

[The deployment plan](docs/deployment-plan.md) explains first-time GitHub setup, your domain, publication boundaries, withdrawal, backups and the tradeoffs. The existing account-root Pages site is the deployment target; a separate custom domain can be configured later.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run vault:init` | Create an ignored starter vault, refusing to overwrite one |
| `npm run dev -- "/path/to/vault"` | Watch selected notes and preview on port 4173 |
| `npm run demo` | Preview separate sample Obsidian content on port 4174 |
| `npm run export -- "/path/to/vault"` | Replace the reviewed public `content/` snapshot |
| `npm run publish:prepare -- "/path/to/vault"` | Export and build, without committing or pushing |
| `npm run build` | Build committed `content/` to ignored `dist/` |
| `npm start` | Build the snapshot and serve it on port 4173 |
| `npm run preview` | Serve an existing `dist/`, read-only and loopback only |
| `npm test` | Publishing, static routing, privacy and legacy integration tests |
| `npm run check` | JavaScript syntax checks |

`SITE_URL` is the full website URL, including a repository path when needed, e.g. `https://name.github.io/ridge/`. GitHub Actions gets it automatically from Pages settings; custom domains work too. `BLOG_TIMEZONE` defaults to Australia/Sydney. `PREVIEW_PORT` changes the local preview port. Do not expose a local preview server to the internet.

## Files and ownership

```text
obsidian/       Template to copy into your private vault
.local/         Ignored vaults and writing previews
content/        Reviewed public export, tracked in Git
dist/           Generated public website, ignored in Git
src/            Shared renderer, Obsidian exporter and static builder
public/         CSS and browser interactions
scripts/        Local preview, export, build and legacy tools
.github/        GitHub Pages deployment and pull-request checks
docs/           Writing guide, scope and deployment plan
design/         Preserved HTML inspiration; artefacts are deferred
examples/       Sample posts and sample media with source notes
```

Back up the private vault and its attachments separately. Git backs up published snapshots, not private drafts. Withdrawing a note removes it from the next site build, but not from Git history or copies others saved. GitHub Pages currently has a 1 GB site limit; growing media can move to object storage later.

The [header study](docs/header-design.md) records the references and visual iterations.

The original [HTML study](design/ridge-stream-reference.html) and [exact fragment](design/ridge-stream-reference.fragment.html) remain as inspiration.

## Previous local composer

The earlier Node/SQLite editor is preserved under `npm run legacy` (reader port 3333, editor 3334). Its real `data/` and uploads are unchanged and ignored; they aren't automatically exported. `npm run demo:legacy` uses separate sample SQLite storage. Its CSRF/origin and Tailscale checks remain in place. `npm run backup -- /absolute/path` applies only to that legacy database. See [the earlier hosting design](docs/legacy-server-hosting.md) if revisiting it.
