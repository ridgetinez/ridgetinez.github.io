# Margin garden

The direction draws on the filled cells and soft motion of [Dao Ho's koi](https://www.daoho.dev/), the earlier [ASCII Sharks](https://github.com/stackedlol/ascii-sharks) reference, and ridge's nasturtium photograph. Geometry, textures and motion code are original. No libraries, remote images or services are added.

## How it developed

The upright first pass was too small and too much like a complete plant. Its source is retained in `design/garden-upright-reference.js`, outside the running application.

The second pass changed to large top-down leaves cropped by the side and bottom edges. Colour fills the cells; characters sit on top. Filtering the artwork before sampling kept thin veins from aliasing into scattered dots. The first flower silhouette remained too close to a circular rosette, and alpha blending made overlapping leaves look translucent.

The next pass increased the cells from 5.4 × 6.4px to 8.5 × 9.5px. Opaque leaf interiors, cast shadows, offset radial veins and five uneven flower petals gave the shapes more definition. Curved pedicels run behind the foliage, connecting each flower rather than leaving it as a badge pasted on a leaf. This fixed composition, including its smaller marigold, is retained in `design/garden-fixed-reference.js`.

The current experiment lets the margins develop along the document. It keeps the coarse cells, opacity, gradients and soft motion while varying coherent patches of nasturtiums. The first orange patch arrives in the lower portion of the opening viewport. Later patches occupy the margins alongside the content; the centre remains clear.

Saved browser views show the [opening composition](../design/garden/generative-top.png) and [variegated leaves beside the sample feed](../design/garden/generative-variegated.png).

## Botanical traits

Nasturtiums have broadly round, peltate leaves, radiating veins, gently uneven edges and five-petalled flowers. The variation should still read as the same plant. The [University of Wisconsin cultivar descriptions](https://hort.extension.wisc.edu/articles/nasturtium-tropaeolum-majus/) and [University of Saskatchewan plant guide](https://gardening.usask.ca/articles-and-lists/articles-plant-descriptions/annuals/nasturtium.php) inform the six palette families below.

| Profile | Traits used in the artwork |
| --- | --- |
| Gleam | Familiar orange flowers, green foliage, looser grouping |
| Alaska | Irregular cream mottling on green leaves, warm flowers, compact grouping |
| Empress of India | Dark blue-green foliage and red flowers |
| Peach Melba | Pale cream flowers with orange-brown throats |
| Black Velvet | Deep burgundy flowers |
| Vesuvius | Salmon/apricot flowers and generous green leaves |

These are artistic interpretations rather than botanical simulations. Within each family, the seed varies leaf size, roundness, edge ripples, rotation, spacing and cluster density. Mottling consists of clipped irregular patches, not scattered white noise. Flower anatomy remains consistent across the palettes.

The opening sequence shows a few contrasting families deliberately; later patches choose from the full set. Changing the garden seed changes the composition. Individual patch coordinates always generate the same traits, including after a texture has been evicted and rebuilt.

## Rendering and motion

`public/garden.js` generates each patch from its side, integer position and a fixed seed. It does not append plants to an ever-growing collection. A small moving window of patches covers the viewport plus overscan; distant patches are discarded. Their traits regenerate when revisited. Existing visible plants retain their spring state as the window moves.

The renderer preserves the deployed garden's per-coordinate geometry, palette, leaf size and ripple, veins, mottling, five-petalled flowers, overlap order and screen-aligned colour/character grid. It does not replace unique leaves with shared shape variants or rotate a static strip.

Each plant retains the original independent spring state. The wind, pointer distance/velocity forces, damping, rotation, bending stems and per-row flex use the original equations. Animation continues while scrolling. Reduced motion and hidden/narrow-page behaviour retain the deployed rules. The GPU path can paint every animation frame instead of the previous 30fps paint cap.

The expensive change is in painting: `garden-gl.js` batches coloured cells and their glyph masks into one instanced WebGL2 draw per margin. A small, subpixel-phase-aware mask atlas rasterises the original eleven characters on layout, instead of thousands of `fillText` calls every frame. RGBA samples, glyph selection, alpha thresholds and cell spacing come from the same original calculations. Canvas and GPU antialiasing can differ slightly at pixel edges; deterministic comparisons quantify that difference in the [performance report](garden-performance.md).

The original vector paths and world-space shadow extents are rasterised with 192px supersampling on bounded workers, then filtered to the 64/96px resolution selected by the old renderer and returned as pixel buffers. The small antialiasing differences are measured against the deployed reference. Up to four workers (leaving a logical CPU free) prepare the current window and four bands ahead/behind. Requests already in flight are deduplicated; pending work follows the viewport. At most 512 individual textures are retained so rapid reversals can reuse the same seeded artwork. No canonical plant atlas is used. Unsupported workers/GPU contexts fall back to `garden-2d.js`, the deployed Canvas2D implementation.

Two fixed, transparent canvases occupy only the side gutters, reserving the centre 480px plus 26px on each side even during a pointer flick. `garden-host.js` transfers them to `garden-render-worker.js`, where the same simulation and renderer run without occupying the DOM thread. The host forwards passive pointer/scroll messages and handles sizing and visibility. Browsers without worker animation support use the same core directly; GPU failure uses the original Canvas2D fallback. The garden cannot intercept clicks or enter the accessibility tree, is omitted below 760px and in print, and remains independent of the feed and its content.

## Trying the long-scroll study

Run `npm run demo`, then open <http://127.0.0.1:4174/garden-study.html>. It begins with the real sample feed, then extends one empty spacer as the bottom approaches. It never fabricates or repeats entries. The DOM stays constant as the study grows. Ordinary browser limits still apply to the total scrollable height.

The study is generated by `scripts/create-garden-study.js` after each demo rebuild. Its extension script lives in `design/garden-study.js`. Neither file is included in the production builder's output. The real stream uses the same garden renderer but ends naturally with its authored posts.

`test/garden.test.js` checks deterministic regeneration, coherent and varied traits, viewport-bounded patch selection and cache eviction. Browser checks and their limits are recorded in [verification](verification.md).
