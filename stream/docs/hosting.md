# Hosting

The current target is **GitHub Pages**, with **Obsidian as the local editor**. Public visitors receive HTML, CSS, JavaScript, images and audio. There is no public Node process, SQLite database, write API or editor to secure.

```text
Obsidian vault (private, local)
       │ explicit export of publish: true notes
       ▼
content/ (public snapshot, reviewed and committed)
       │ git push
       ▼
GitHub Actions → dist/ → GitHub Pages → your domain
```

The laptop can sleep after publication. GitHub permissions control who can change the site; visitors need no accounts. Tailscale, Supabase and CloudFront are unnecessary for this version.

Read [the local writing guide](obsidian.md) for capture and preview, and [the deployment plan](deployment-plan.md) for the first GitHub setup. The existing repository is `ridgetinez/ridgetinez.github.io`, with `master` as its publishing branch. The root workflow builds `stream/` and uploads `stream/dist/`. The public address is https://ridgetinez.github.io/. The old essays remain at their original URLs. Custom-domain DNS is separate.

The earlier server-based design is preserved in [legacy hosting notes](legacy-server-hosting.md) and [its deployment plan](legacy-server-deployment-plan.md). The original local editor and SQLite remain available under `npm run legacy`; their data are unchanged and are not automatically published. They are an alternative, not part of the GitHub Pages runtime.
