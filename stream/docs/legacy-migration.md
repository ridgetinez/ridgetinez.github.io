# Existing-site migration — 28 October 2026

The owner chose to keep the three published essays at their existing URLs and start the new stream empty. The public site was captured before migration from `https://ridgetinez.github.io/`, whose source was commit `c54852f` on `master`.

The app lives in `stream/`; root Jekyll sources and their Git history remain intact. No unfinished files from `/Users/adrianmartinez/projects/my-website` were copied or changed. Only the clean GitHub branch was used.

`legacy-public/` contains the previously public essay HTML, old index at `/archive/`, About and Search pages, search index/script, original feeds/favicon/photo, and four diagram images. The three article routes also have `.html` aliases for earlier links. Relative About-photo URLs were rooted so directory-based URLs retain their original resolution. Six old tag links, which returned 404 on the Jekyll site, have static article lists using the old index layout.

The builder accepts this explicit archive directory, refuses symlinks/hidden files, and copies it into a staging directory before producing current routes. Current stream routes take precedence on any future overlap. The snapshot stays separate from `content/`, so an Obsidian export or note withdrawal cannot erase an older essay. It does not require Ruby, Jekyll or a production database.

The original public HTML retains its historical styling and wording. It is not presented as new writing or silently imported into the stream. The current reader includes a small Archive link beside RSS.

The retired root Gemfile and Gemfile.lock were removed from the active branch after GitHub reported 13 existing Ruby dependency alerts. The new build does not use Ruby. Both original manifests remain in commit `c54852f`; no legacy dependency is needed to serve the preserved static essays.
