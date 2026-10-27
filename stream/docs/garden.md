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

Temporary canvas paths and gradients become textures filtered at four resolutions, then sampled onto the colour-cell grid. A least-recently-used cache retains at most 48 textures, regardless of scroll distance. Glyph grain is anchored to screen cells so movement does not produce random flicker. Leaf interiors are opaque; only antialiased edges and shadows blend.

Each leaf and flower has its own damped spring, with slow baseline wind and passive pointer forces. Foliage yields to pointer position and velocity, then settles back. No click or drag is required. Rendering runs at up to 30 frames per second; physics follows animation frames. Hidden tabs pause. Reduced motion removes the wind and pointer response, with a single redraw on scrolling so different patches still appear.

A single fixed canvas fills the viewport. Drawing is clipped to the side gutters, reserving the centre 480px plus 26px on either side even during a strong pointer gesture. The garden is hidden below 760px and for print. It is excluded from the accessibility tree and cannot intercept clicks. It remains independent of the editor, audio player and future artefacts.

## Trying the long-scroll study

Run `npm run demo`, then open <http://127.0.0.1:4174/garden-study.html>. It begins with the real sample feed, then extends one empty spacer as the bottom approaches. It never fabricates or repeats entries. The DOM stays constant as the study grows. Ordinary browser limits still apply to the total scrollable height.

The study is generated by `scripts/create-garden-study.js` after each demo rebuild. Its extension script lives in `design/garden-study.js`. Neither file is included in the production builder's output. The real stream uses the same garden renderer but ends naturally with its authored posts.

`test/garden.test.js` checks deterministic regeneration, coherent and varied traits, viewport-bounded patch selection and cache eviction. Browser checks and their limits are recorded in [verification](verification.md).
