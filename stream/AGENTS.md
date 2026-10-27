# Working on ridge

Read `docs/spec.md` before expanding scope. Generated artefacts are deferred; retain `design/` as inspiration.

The public listener must remain read-only at the HTTP boundary. Never expose editor routes through it or infer write permission from UI state. The editor must keep its loopback bind, explicit owner policy in Tailscale mode, and origin/CSRF checks. Treat Tailscale identity headers as trustworthy only behind the local Serve proxy.

Use `npm test` for access, persistence and media changes. Use `npm run check` for syntax checks. Run browser checks when changing the interface. Keep private vaults, `.env`, original uploads, SQLite and backups out of Git. The owner has chosen Obsidian → static GitHub Pages: only the deliberately exported public `content/` snapshot belongs in Git. `npm run demo` uses separate sample Obsidian notes.

Read `docs/obsidian.md` and `docs/deployment-plan.md` for the current publishing path. Never export an entire vault or private metadata. Only notes with boolean `publish: true` and their used media enter the snapshot. Writing preview must stay in ignored `.local/`; it must never update `content/`, commit or push. The deployed artifact is only `dist/`, with no editor or server code. Preserve the legacy editor's access boundary while it remains available.

The owner requested migration and deployment to the existing ridgetinez.github.io repository on 28 October 2026. Root workflows publish master, and the current app is in stream/. Keep legacy-public/ separate from exports to preserve old essay URLs. Future routine development still requires authorization to deploy; custom-domain DNS and tailnet setup remain separate requests.
