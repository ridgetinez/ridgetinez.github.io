# Verification — 24 October 2026

The early sections record the original Node/SQLite app. The Obsidian/static-site verification is recorded at the end; it is the current publishing path.

## Automated

All six integration-test groups passed on the development runtime and Node.js 24:

- Public GET/HEAD-only boundary, including forged identity and CSRF headers.
- Editor host, origin and CSRF checks.
- Configured Tailscale owner accepted; missing or different owner rejected.
- Publishing, editing, tags, dates, LaTeX, code, RSS, backlinks, archive/restore and persistence after reopening SQLite.
- Real photo/audio uploads, metadata removal, media byte ranges, active-file rejection and archive access.
- Safe Markdown and math rendering against executable HTML/links.

`npm run check` passed. `npm audit --omit=dev --audit-level=high` reported no known dependency vulnerabilities at verification time.

## Browser

The public page had no composer or owner actions and no generated artefacts. The editor accepted a photo, rendered LaTeX and highlighted code in Preview, saved the entry, loaded it for editing, saved the edit and archived it. The public reader reflected the changes. The sample audio played and its time advanced; transcripts start collapsed.

The browser-created verification entry was archived in the isolated demo database. Normal app storage starts empty.

The editor was also checked at a 320px viewport with no horizontal page overflow. Reader and editor demo ports are separate from the clean app’s ports.

## Backup and reference

The backup command produced a SQLite snapshot and media copy while the demo was running. The snapshot opened with `integrity_check = ok`, no foreign-key issues, and all referenced media present.

The preserved fragment is byte-for-byte identical to the original inspiration file. Its standalone wrapper is also included in `design/`.

## Limits

The owner policy was tested with simulated local Tailscale proxy requests. An actual tailnet, HTTPS Serve endpoint, domain and production host have not been configured. Browser microphone capture is implemented but was not exercised against the user’s microphone. Automatic transcription is not connected. Deployment and external Git hosting remain unperformed.

## Margin garden — 27 October 2026

`npm run check` and all six integration-test groups passed after adding the independent decorative module. No new dependencies were added.

Browser checks covered the full-size plants at 1280px, scaled plants at 814px, and the hidden garden at 390px. At 390px the page and viewport were both 390px wide, with no horizontal overflow. Plant canvases remained outside the 480px reading column and had `pointer-events: none`. The garden was absent from the accessibility tree. Filtering and audio playback continued to work, transcripts remained collapsed, and the browser reported no warnings or errors.

Reduced-motion and hidden-tab behaviour were checked in the implementation; browser preference emulation was not available. The reader preview uses the isolated demo's sample content, not personal posts.

### Top-down, coarse-cell revision

Replaced the upright plants with a cropped canopy and added passive pointer interaction. Browser checks covered 1280px and 814px desktop layouts, the cursor-brush response, a 390px phone layout with no horizontal overflow, and tag-filter navigation. The canopy is hidden on the phone. Drawing is clipped around the centre column, although the canvas element itself spans the viewport. Overlapping leaf interiors are now fully opaque, and the larger cells retain gradient colour and characters. Browser logs were clear of errors and warnings.

CSS and browser scripts now have content-versioned URLs, fixing the stale artwork seen after an ordinary reload. The earlier upright source is preserved in `design/`; the coarse-cell screenshot uses isolated sample posts.

The content-filled preview is served by `npm run demo` at port 3433 with its separate sample database. The final composition moves the flowers beside the leaves and adds curved pedicels behind the canopy. Syntax checks and browser logs were clear after this placement change. No personal posts were added or altered.

## Obsidian and GitHub Pages — 27 October 2026

All 11 integration groups passed on the development runtime and on Node 24, including the original six access/media/persistence groups. `npm run check`, `npm run build` and `git diff --check` passed. Both workflow files parsed as YAML. A real GitHub Actions run remains unverified because there is no remote repository or configured Pages site.

The new integration groups cover public-note selection, omitted private properties/comments, photo metadata removal, retained audio bytes, collapsed transcripts, preserved code examples, private-link rejection, unsupported embeds, duplicate IDs, timezone validation, failed-export retention, project URL prefixes, custom-domain root URLs, static filters and pagination, Unicode tags, permalinks, backlinks, absolute RSS, withdrawal of pages/media, output-directory guards and symlink handling.

The generated artifact contains reader assets only, with no editor script, API route, SQLite, private vault or configuration file. Tests serve the artifact through the read-only loopback preview and verify that writes are rejected and private/code paths return 404. A manual watch check changed a sample Obsidian note and confirmed that the preview rebuilt while tracked `content/posts.json` stayed unchanged; the sample change was restored.

`npm run publish:prepare -- .local/vault` exercised the complete local command against the new private starter vault. It correctly prepared an empty public snapshot. Sample posts remain separate. The empty production build is about 1.13 MB including self-hosted font files.

Browser checks on the Obsidian-generated demo covered topic navigation, rendered maths/code, audio playback through its full duration and expanding a transcript that initially appeared collapsed. Browser errors and warnings were empty. The new nasturtium mark remains decorative inside the “ridge” home link. A 390px iframe harness confirmed that the name, filters and text fit, and the lower garden is hidden at that width. This checks layout rather than touch-device emulation.

The demo now runs at port 4174 under `npm run demo`; the old SQLite demo remains `npm run demo:legacy` at port 3433. The actual Obsidian app, microphone recording, device sync, remote deployment and domain setup have not been exercised. The provided template uses documented core-plugin syntax; Obsidian preferences are left for the owner to configure rather than overwritten.

### Header revisions

The current masthead places a 36px cell-based flower before the name and uses coloured filter labels without bullets. The first smooth mark and dot-based filters are retained in design references. The final pass was checked in dark and forced-light renderings, and in a 390px iframe harness; filter navigation continued to work and browser logs were clear. The mark remains absent from the accessible name. All 11 tests passed on Node 24 after the renderer revision, and syntax/build checks passed. The reduced-motion rule suppresses the new hover transitions.

## Generative margins and Ōtori-sama — 28 October 2026

The flower mark is replaced with the owner's chosen leaf-capped Ōtori-sama, an original 20 × 20 pixel SVG. It appears before “ridge” and as the favicon. The prior flower assets and screenshots remain in the design references.

All 14 tests passed on the development runtime and Node 24.22.1. The three new garden groups exercise stable regeneration after visiting distant coordinates, cultivar families and varied leaf traits, viewport-bounded patch selection, and eviction from the 48-texture cache. Syntax checks, the production build and whitespace checks passed. The production snapshot still contains zero personal posts.

Browser review covered the opening orange patches, Alaska-style mottling, dark foliage with red flowers, pale blooms, later generated patches, and the sample feed's photos and recipe. At desktop widths the centre remained clear and there was no horizontal overflow. The local-only study extended its document from 5,199px to 9,999px during scrolling while its DOM remained at 173 elements. Browser warnings and errors were empty.

At 390px, the viewport and page were both 390px wide, the garden was hidden, the header and coloured filters fitted, and the transcript remained collapsed. Topic navigation returned the expected running-only feed. The regular stream had no study spacer. Saved screenshots are in `design/garden/`.

Reduced-motion and hidden-tab handling were reviewed in the implementation; no browser preference emulation was available. The passive pointer springs are retained from the previously checked canopy. Browser review here focused on scrolling and variation, rather than repeating the earlier cursor-brush check. Deterministic backtracking and cache bounds were verified by the model tests, not by measuring browser heap usage. No deployment or remote configuration was performed.

## Animation and existing-repository migration — 28 October 2026

The deployment checkout is the existing `ridgetinez/ridgetinez.github.io` history, with the new app in `stream/`. The owner chose an empty stream and preservation of the three older essays at their current URLs. Samples, private vaults and the unfinished original local checkout were excluded from the migration. The new builder includes only an explicit public archive snapshot, independently of note exports.

All 15 tests passed on the development runtime and Node 24.22.1. The archive integration group verifies old URL serving, retained diagram bytes, survival after replacing the public note snapshot, rejection of hidden files/symlinks, and preservation of the last successful build after refusal. Syntax checks, workflow YAML parsing, production build and whitespace checks passed. HTTP checks returned 200 for the three original essay URLs, an older `.html` alias, archive, About, Search, search index, diagram images, old photo, topic listing and mascot script. The production home has zero entries and no composer or sample posts.

Browser checks observed both the scheduled idle gesture and keyboard-focus greeting through the mascot's rendered state and body/leaf transforms. The home link retains its accessible name and normal navigation. The archive link showed the three original essay titles. Browser warnings and errors were empty. The actual pointer-hover event uses the same greeting function; hardware pointer movement and OS reduced-motion switching were not re-exercised in this pass.

The root Pages workflow targets `master`, runs commands from `stream/`, and uploads only `stream/dist/`. Deployment completion is recorded by GitHub Actions, rather than inferred from a local build.

### Knife-reveal revision

Syntax/build and whitespace checks passed. Browser review confirmed a stationary body, a held knife pose on keyboard focus, retraction on blur, and repeated reveal/retraction. The same controller handles pointer enter/leave. The icon remains 40px, with its blade extending slightly to the left within the page padding; the name and feed do not move. The static favicon is unchanged. No new dependencies or public content were added.
