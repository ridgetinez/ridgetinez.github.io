# Working on ridgetinez.github.io

The current app is in `stream/`; read its `AGENTS.md` and `docs/spec.md` before changing it. Root Jekyll sources are retained history/reference, not the deployment target. Run app commands from `stream/`.

GitHub Pages builds `stream/dist/` through the root `.github/workflows/pages.yml` on pushes to `master`. The owner explicitly requested the migration and deployment. Future routine development must not deploy without authorization. Never force-push or replace the existing Git history.

The three older essays must retain their existing URLs. Their already-public snapshot is in `stream/legacy-public/`; keep that separate from Obsidian exports. Start the new stream empty and do not publish sample entries as the owner's writing. Private vaults, `.local/`, `.env`, uploads, SQLite and backups must stay out of Git and the deployment artifact.

The separate original checkout `/Users/adrianmartinez/projects/my-website` contains unfinished changes and must not be reset, cleaned or overwritten.
