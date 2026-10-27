# Writing ridge in Obsidian

Obsidian is the editor. The website is a separate, static view of selected notes. You can write offline, leave things unfinished and keep your normal vault structure. No community plugin, Obsidian Publish subscription, website login or cloud database is required.

## Start with a separate vault

From the ridge project directory:

```sh
npm ci
npm run vault:init
```

In Obsidian choose **Open folder as vault**, then select `.local/vault` in this project. The entire folder is ignored by Git. If you already have a vault, use that instead; the exporter reads it without changing its files or Obsidian settings. Keep it outside `content/` and `dist/`.

For an existing vault, copy `obsidian/Templates/Stream entry.md` into a template folder in that vault. The template is the only setup file you need. Never put your whole vault in the website repository's tracked files.

## Make capture quick

Enable Obsidian's built-in **Templates**, **Unique note creator** and optionally **Audio recorder**. Set Templates' folder to `Templates`. Set Unique note creator's template to `Templates/Stream entry`, and its new-note location to `Stream`. Assign **Create new unique note** a convenient hotkey. These are manual settings so we don't overwrite your existing Obsidian preferences.

The hotkey creates a small timestamped note with the properties filled in. No title, introduction or heading is needed. Put `running` in Tags and write:

```text
8km, 5:30 pace. kinda tuff.
Kept thinking about that reflection problem on the way home.
```

Obsidian saves the file as you work. A new note starts with `publish: false`. When it belongs on the site, enable its **publish** checkbox. This selects it for the next export; it does not send anything to the internet.

The minimal completed note looks like:

```yaml
---
id: "20261027083000"
date: "2026-10-27T08:30:00+11:00"
tags: [running]
publish: true
---
8km, 5:30 pace. kinda tuff.
```

Keep `id` unchanged, even if you rename or move the note: it is the public address. The template inserts a timestamp ID; duplicate IDs stop the export with an error. Existing notes without an ID get one derived from their vault-relative filename; add an explicit `id` before moving them if their URLs should stay the same. The exporter never writes IDs back into your vault.

`date` is the moment of the entry, including your timezone offset. The template supplies it automatically. Backdate it to describe something earlier. `created` is accepted as an alternative property. Dates without an offset are rejected so a GitHub runner cannot silently change the day. The site groups days in Australia/Sydney by default.

## A stream entry is a note

Use one note for a run, a coffee, an unfinished proof or a recipe iteration. This keeps each thing independently taggable and linkable. Filenames and frontmatter don't become headings on the site; only the body does. Add a heading when you actually want one.

Keep a Daily Note as a private index of those entries if that's useful. This version doesn't split daily-note headings into separate public posts: it would make timestamps, tags and stable links less clear. A whole Daily Note can also be one public entry if you explicitly select it and give it a date.

Tags come from the `tags` property, not every `#word` in your prose. Up to eight tags, each up to 30 characters, using letters, numbers and hyphens. Tag names become public filter pages.

## Photos, audio and transcripts

Set Obsidian's attachment location to `Attachments`. Drag or paste a photo into a note, or use Audio recorder. Obsidian creates an embed such as:

```markdown
![[Attachments/morning-coffee.jpg]]

![[Attachments/reflection.m4a]]
```

Only files actually embedded by selected notes are copied. Photos are resized to at most 2200px and converted to WebP without their original metadata. Audio keeps its format. Up to six attachments, each up to 15 MB. Photos and audio appear after the entry's text, in embed order, in the centre column. Their exact positions between paragraphs aren't preserved in this first version.

For photo alt text, use ordinary Markdown `![Coffee on the kitchen counter](Attachments/coffee.jpg)` or an `alt` property. An Obsidian embed alias is also accepted as alt text; numeric size aliases are ignored.

Add a `transcript` text property for an audio entry. For a longer transcript, switch to Source mode and use a YAML block:

```yaml
transcript: |-
  I'm trying to see why reflecting P preserves its distance from A.
  I keep losing track of what stays fixed.
```

It renders separately from your main prose, collapsed by default. There is no automatic transcription. Multiple recordings can use an advanced `transcripts` mapping keyed by the exact embed target, such as `Attachments/voice.m4a`; the single `transcript` property applies to the first recording.

JPEG, PNG, WebP, AVIF and GIF are accepted (GIF becomes a still); MP3, M4A, WAV, OGG, FLAC and WebM audio are accepted. Convert HEIC first. SVG, PDF, video and embedded notes are not supported. Regular external HTTPS links work. Remote images remain remote; use local attachments if you want to own the copy.

## Maths, code and recipe iterations

Use `$x^2$`, display maths with `$$…$$`, and fenced code blocks with a language. These are rendered at build time; the reader doesn't need Obsidian or a maths service.

Use `[[dumplings-v3|dumplings v3]]` in a later recipe note. Both notes must be selected for publishing. The exporter resolves the note to its stable ID; the older recipe gets a backlink to the new iteration. Ambiguous filenames need a vault-relative path. It never publishes a linked private note automatically: remove the link or explicitly select the other note.

Obsidian `%% comments %%` in prose are omitted. Unknown frontmatter properties are omitted too. Text inside code examples is literal public content, including comment-looking text. Heading/block links, note transclusion, Dataview and other plugin-generated views aren't a website format here. Unsupported local links fail clearly rather than silently becoming broken public URLs. Raw HTML stays escaped.

## Preview while writing

```sh
npm run dev -- "/absolute/path/to/your/vault"
```

Open <http://127.0.0.1:4173>. Saving a selected note or its media rebuilds a private preview; refresh the browser to see it. Invalid YAML or a missing file leaves the last successful preview intact and prints the error in the terminal. Keep that terminal running while writing.

This preview writes only to ignored `.local/writing-preview/`. It never changes the tracked `content/` snapshot. Notes with `publish: false` stay out of this reader preview; edit those in Obsidian until ready to select them.

For convenience put this in your ignored `.env`:

```dotenv
RIDGE_VAULT="/absolute/path/to/your/vault"
BLOG_TIMEZONE=Australia/Sydney
```

Then `npm run dev` and `npm run publish:prepare` don't need a path. Stop the preview with Ctrl+C. `PREVIEW_PORT` can change the port.

## Prepare a publication

```sh
npm run publish:prepare -- "/absolute/path/to/your/vault"
```

This replaces `content/` with selected notes and their used media, then checks that they build into `dist/`. The exported JSON contains only public body text, tags, IDs, dates, resolved links and attachment metadata. Private vault paths, other properties and Obsidian configuration aren't exported. Review the snapshot before committing:

```sh
git status --short
git diff -- content
git diff --stat -- content
```

New files don't appear in an unstaged `git diff`: inspect them in the file browser too, or stage only `content/` and review `git diff --cached -- content`. To inspect the exact generated snapshot in a browser while the writing preview is still running, use `PREVIEW_PORT=4175 npm run preview` and open port 4175.

Once the GitHub remote and Pages are set up, the deliberate publication step is:

```sh
git add -A content
git diff --cached -- content
git commit -m "Update stream"
git push
```

GitHub builds and deploys that commit. The site is updated only when the Pages workflow succeeds, not when an Obsidian checkbox changes. Saving locally requires no internet; GitHub publication does.

To withdraw an entry, uncheck `publish`, prepare again, then commit and push. Its page and unreferenced media disappear from the next deployment. Fix any other published notes linking to it first. This does not erase Git history, previous downloads or third-party caches.

## Back up the writing vault

The website repository is a backup of published snapshots, not your whole writing life. Keep a separate backup of the vault and attachments. Obsidian Sync or iCloud can move files between your own devices; they aren't a substitute for a recoverable backup. Phone writing can sync into this vault, but the laptop still needs to export and push before the website changes. No always-on computer is needed to keep the public site online.

References: [Templates](https://obsidian.md/help/plugins/templates), [Unique note creator](https://obsidian.md/help/plugins/unique-note), [attachments](https://obsidian.md/help/attachments), [embeds](https://obsidian.md/help/embeds) and [properties](https://obsidian.md/help/properties).
