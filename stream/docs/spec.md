# First specification

## Purpose

ridge can publish small, unfinished things from Obsidian. Everyone else gets a readable, chronological static website. The main unit is a note, not an article or a generated dashboard. The local web composer is retained as a legacy alternative.

## Included in v1

Each post has a stable ID, original Markdown text, tags, publication time, update time and ordered media attachments. Posts can contain a line about a run, a mathematical thought, a photo, audio, a recipe or a mixture of these.

The public stream groups posts by day in Australia/Sydney, newest first. It has coloured tags, filters, small but distinct day headings, code blocks, typeset mathematics and primary photos. Audio has a player and a collapsed transcript with a different visual treatment. The top bar says only “ridge”, with a small pixel-art Ōtori-sama wearing his green leaf before it. On hover or keyboard focus he stays deadpan, draws a little pixel chef’s knife, and holds it until the pointer or focus leaves; then he tucks it away. A quieter occasional blink/head tilt remains his idle gesture. Reduced motion switches the reveal instantly. Animation pauses offscreen, in hidden tabs and with reduced motion. Filters use coloured, softly filled labels matching the entry-tag palette, without bullets. See [the header study](header-design.md).

The side margins contain a decorative, top-down canopy, beginning in the lower part of the first viewport. Scrolling reveals seeded nasturtium patches with different foliage, flower colours, leaf sizes, shapes and bunching, informed by real cultivars. Broad leaves crop against the viewport edges and overlap opaquely; filled colour cells and quieter characters give the forms depth. Wind and passive cursor movement displace the foliage with a damped spring; reduced motion leaves it still, and narrow screens omit it. Patches regenerate consistently when revisited, while rendering and texture storage remain bounded. The canopy is independent of posts and generated artefacts and adds no controls or explanatory copy. The actual stream ends with its authored content; a separate local-only garden study provides continually extending space for the experiment. See [the garden study](garden.md).

Obsidian supplies capture, autosave, attachments and optional recording through its core plugins. One note is one entry. A template supplies stable ID, date with timezone, tags and a `publish: false` property. Selected notes (`publish: true`) enter a local watch preview. A separate explicit export prepares a tracked public snapshot; commit and push publish it through GitHub Actions. Saving in Obsidian never pushes automatically.

The exporter supports local photo/audio embeds, editable transcript properties, ordinary Markdown, maths, code and links to other selected notes. It omits private metadata and prose comments, normalises photos, refuses unsupported or private local links and preserves the last successful export on failure. The full vault remains private and untracked. See [the editing guide](obsidian.md).

Recipe iterations are ordinary posts linked to earlier recipes. For example, a v4 note can reference v3; the v3 page then shows the later note as a backlink. The editor’s Link action inserts the reference syntax.

Permalinks, RSS, prebuilt filters and pagination make the content useful outside a JavaScript-heavy client. Reader pages contain the posts before browser scripts run. JavaScript enhances audio controls and the garden. GitHub Pages receives only the generated static output, including self-hosted fonts.

## Excluded from v1

- Generated artefacts, maps, charts, mathematical constructions and draggable bubbles.
- Automatic extraction of structured running or coffee data.
- Automatic transcription or an AI service.
- Habit calendars, raised-bed views and spatial layouts.
- Multiple authors, reader accounts, likes, comments or analytics.
- Custom-domain DNS changes, tailnet configuration and hosting beyond the existing GitHub Pages site.
- Obsidian plugin-specific views, embedded notes and heading/block links.

The prior HTML is retained in `design/`. Keeping it intact preserves the richer direction without making its sample views part of the first implementation.

The existing public essays remain at their old URLs, separate from the new stream. The reader has an Archive link beside RSS. The stream starts empty; sample entries are never exported as the owner’s writing. See [migration notes](legacy-migration.md).

## Access boundary

The current public site has no write runtime. Only the reviewed `content/` snapshot is used to generate `dist/`; the vault, original media, editor, SQLite, `.env` and server code are not deployed. GitHub repository permissions control publication. Local previews bind to loopback and reject methods other than GET and HEAD. No website authentication, Tailscale or cloud database is needed for this path.

The following describes the preserved legacy editor, available with `npm run legacy`:

The reader and editor are separate server listeners. The public listener rejects every HTTP method other than GET and HEAD before route selection. It cannot be turned into the editor by a query parameter, header, hidden control or route name.

The editor always listens on loopback. Local mode checks its host and relies on control of the local computer. Tailscale mode additionally requires the configured Serve hostname and exact owner identity. All changes require a same-origin request and an unpredictable per-process CSRF token. Missing Tailscale configuration prevents startup in that mode.

The trusted boundary is the host running the app. A person who can execute arbitrary code on that host can act as its owner. Tailscale mode relies on the local Serve proxy’s identity headers; arbitrary other proxies are not supported.

## Data ownership

The Obsidian vault and its attachments are the writing source and need independent backups. Only selected entries and used media enter the public Git snapshot. Stable IDs are separate from note filenames. Unchecking `publish`, exporting and deploying withdraws a page and unused media from the next site, but cannot erase Git history or downloaded copies. Normal local preview never changes the tracked snapshot.

The following applies only to the legacy editor:

Posts and attachment records use SQLite. Media use a private filesystem directory with opaque filenames; public URLs look up a live post before serving a file. Uploaded active formats such as HTML and SVG are rejected. Photos are normalized before storage. Raw post HTML is disabled; math rendering does not permit trusted HTML commands.

Content is not committed automatically. Source code and inspiration belong in Git; SQLite and media need independent backups. Archiving is reversible and does not physically purge files in this version.

## Future artefacts

A future view should be separate from authored posts: stable identity, source post IDs, derived data, renderer kind and independent placement/state. That does not require turning photos into generated artefacts or rewriting the source posts. No artefact schema or runtime is added yet; we should specify its ownership, recomputation and lifecycle before implementing it.
