# Hosting and private posting

Historical alternative. The current recommendation is [Obsidian and GitHub Pages](deployment-plan.md). This document describes the preserved Node/SQLite implementation, not the current deployment target.

Nothing in this document has been deployed or applied. The repository is local; no domain, tailnet, remote repository or hosting account has been changed.

The [deployment plan](legacy-server-deployment-plan.md) sets out the proposed provider, launch phases, backups, release process and optional CloudFront configuration, reviewed on 27 October 2026.

## The recommendation

For this version, I recommend a small, always-on Linux VPS with persistent disk. A VPS is a rented computer that stays on when your laptop sleeps. It can run this Node app, keep its SQLite database and media, and serve your public domain.

Use the same app through two separate entrances:

```text
Everyone on the internet
        │
        ▼
  your-domain.example ── HTTPS/Caddy ── reader on 127.0.0.1:3333
                                           │
                                           └── read-only database connection

Your enrolled devices
        │
        ▼
  Tailscale Serve ── exact owner check ── editor on 127.0.0.1:3334
                                           │
                                           └── posts, SQLite and media
```

The public domain is always the reader. Your editor lives at a private `device.tailnet.ts.net` address. There is no public login screen and no password database to build.

This is an architectural recommendation rather than a hosting purchase. We still need to choose the server/provider and domain, review backups and updates, and walk through the configuration before deploying.

## How Tailscale replaces the extra website login

Your devices already authenticate to Tailscale. [Tailscale Serve](https://tailscale.com/docs/features/tailscale-serve) proxies a local service to the tailnet and supplies the connecting user’s identity. The app requires that identity to match `TAILSCALE_OWNER`. Another tailnet member is therefore not automatically an author.

The editor listens only on loopback so remote callers cannot bypass Serve and invent their own identity headers. The server machine and its local processes remain trusted. This follows Tailscale’s documented identity-header trust model.

Serve is the private option. [Funnel exposes a service to the public internet](https://tailscale.com/kb/1223/funnel), so we would not use it for the editor. Funnel’s tailnet-domain limitation also makes it a poor default for the public custom-domain site.

## Prepared configuration, for later

On the eventual server, the relevant environment values would look like this:

```dotenv
PUBLIC_HOST=127.0.0.1
PUBLIC_PORT=3333
PUBLIC_ORIGIN=https://your-domain.example
EDITOR_PORT=3334
EDITOR_ACCESS=tailscale
EDITOR_ORIGIN=https://your-server.your-tailnet.ts.net
TAILSCALE_OWNER=your-exact-tailscale-login@example.com
RIDGE_DATA_DIR=/var/lib/ridge
BLOG_TIMEZONE=Australia/Sydney
```

After Tailscale is installed and the correct identity and permissions have been checked, the private proxy would be configured with:

```sh
tailscale serve --bg 3334
```

That command is shown for explanation, not executed. The app must be in Tailscale mode before the editor is shared. We would also review the tailnet’s existing grants; adding a narrow grant does not remove a broader existing allow rule. The app’s exact-owner check is the additional restriction even if the tailnet is shared.

The repository contains a Caddyfile example that proxies **only port 3333**. [Caddy can manage the public HTTPS certificate](https://caddyserver.com/docs/quick-starts/reverse-proxy) once DNS points at the server and the public HTTP/HTTPS ports are correctly routed. A sample systemd unit describes how Linux could restart the Node process after a reboot. Neither file is installed.

## Why not other hosting models first?

| Option | What fits | What changes |
| --- | --- | --- |
| Linux VPS + Caddy + Tailscale | Fits this app’s persistent database, uploads and two listeners | You manage server updates and backups |
| Public static hosting + private local publisher | Excellent separation; public hosting has no write server at all | Needs a static export/publishing pipeline and a plan for reaching the editor while your computer sleeps |
| Serverless app platform | Managed runtime and deployment | Needs durable external database/media storage and a different private-editor access design |
| Your own always-on home machine | Can run the current app and Tailscale | Public availability depends on home connectivity, power and the chosen ingress |

[Cloudflare Pages supports static HTML](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/), so a future static-public architecture is viable. It is not a direct deployment target for this Node/SQLite app as written. We should choose that design deliberately rather than bolt on a half-working publishing step.

## What we should decide together before deployment

1. The public domain and where it is managed.
2. VPS versus a static-public/private-publisher architecture.
3. Your Tailscale login and whether other people share the tailnet.
4. Where backups live, how often they run, and how we verify a restore.
5. Whether you want automatic transcription later and where that processing may happen.

There is no cloud account setup, billing commitment or automatic publishing in this milestone.
