# ridge

Source for [ridgetinez.github.io](https://ridgetinez.github.io/). The current website lives in **`stream/`**: a static personal stream with a procedural nasturtium garden and an animated Ōtori-sama.

## Local preview

Requires Node 24 or newer.

```sh
cd stream
npm ci
npm run demo
```

Open <http://127.0.0.1:4174> for sample content, or `/garden-study.html` for the long-scroll experiment. Samples never enter the published stream.

## Write in Obsidian

From `stream/`:

```sh
npm run vault:init
npm run dev -- "/absolute/path/to/your/vault"
```

Open the private vault in Obsidian. Each entry is a Markdown note using the supplied template. Set `publish: true` for notes you want on the site. Saving updates only the local preview.

When ready to publish:

```sh
npm run publish:prepare -- "/absolute/path/to/your/vault"
git add content
git diff --cached
git commit -m "Update stream"
git push origin master
```

Only selected notes and their used media enter `stream/content/`. Pushing to `master` runs checks, builds the site and deploys **only `stream/dist/`** to GitHub Pages. There is no database, public write API or website login. Nothing pushes automatically from Obsidian.

See [the writing guide](stream/docs/obsidian.md) and [deployment details](stream/docs/deployment-plan.md).

## Earlier writing

The three existing essays remain at their original URLs and are listed at [/archive/](https://ridgetinez.github.io/archive/). Their public HTML and assets are preserved in `stream/legacy-public/`, independently of future Obsidian exports. The stream starts empty, by choice; preview posts are demonstrations only.

The old Jekyll content and templates remain for reference, with the theme README in `LEGACY-JEKYLL.md`. The unused Ruby dependency manifests were retired; the complete old build remains recoverable at commit `c54852f`. GitHub Actions builds the Node project rather than Jekyll. The unfinished changes in the separate local checkout at `projects/my-website` were not included in this migration.
