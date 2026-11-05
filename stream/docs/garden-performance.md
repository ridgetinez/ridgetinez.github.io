# Original-animation scrolling performance

This report supersedes the rejected static-strip optimisation. The target is the animation on `https://ridgetinez.github.io/`, not a simplified visual substitute.

## What is preserved

The seeded leaf and flower geometry, colours, veins, mottling, placement, scale, independent wind phases, pointer position/velocity forces, spring damping, rotation, bending stems and character-grid flex use the deployed code. Tests compare the geometry generator, vector paths and spring equations against `public/garden-2d.js`, the deployed reference. Animation remains active during scrolling. There is no canonical plant atlas, rotating strip, scroll-time animation pause or reduced spring amplitude.

The drawing backend batches the original coloured cells and glyph masks into one instanced WebGL2 draw per margin. A small, subpixel-aware glyph mask atlas replaces thousands of per-frame `fillText` calls. The original screen-aligned lattice, cell spacing, glyph choices, opacity and painter order remain. The renderer paints up to display refresh rather than retaining the old 30fps paint cap.

Unique per-coordinate textures are prepared on at most four workers, with bounded prefetch four bands ahead/behind and a 512-texture cache. The selected 64/96px textures use 192px supersampling in workers instead of the reference's 384px source; geometry and world-space shadow extents are unchanged. This reduces preparation time while retaining close visual parity. GPU/worker failure uses the unchanged Canvas2D reference rather than a static substitute.

## Visual parity

The local visual fixture runs both renderers at identical 40ms clock steps, with matching pointer/scroll input. It compares plant pixels, including alpha, rather than unrelated animation screenshots.

| Pose | Mean absolute RGBA error, 0–255 | Pixels with all channels within 12 levels |
| --- | ---: | ---: |
| Initial | 1.761 | 96.17% |
| Wind after 2.4 seconds | 1.764 | 96.04% |
| Pointer displacement | 1.764 | 96.12% |
| Spring settling | 1.784 | 96.02% |
| After scrolling | 1.717 | 96.38% |

Geometry and physics are preserved; GPU/Canvas antialiasing and the texture sampling path are not byte-identical. These differences average under 0.7% of a full channel range. The prior strip rendering and canonical-shape artwork have been removed from production.

## Earlier GPU measurements (before moving rendering off-thread)

These measurements describe the preceding main-thread GPU revision; the worker follow-up below measures the current version.

## Matched Retina measurements

Measured in the Codex in-app Chromium 156 browser on macOS at **1280 × 720, DPR 2**. Reference/preview animation tabs were closed while timing: the browser keeps those surfaces animating even when they are not the selected tab. These are local measurements, not universal hardware claims.

Each scenario has three 1.8-second repeats. Fresh forward covers 11,000px; reversal traverses a 9,000px span repeatedly; jumps visit distant coordinates. Pointer input alternates between margins. This is deliberately much more aggressive than ordinary reading. The deployed reference blocks for long periods under this workload, so its p95 values are based on relatively few frames and often equal the maximum.

| Scenario | Repeat | Reference p95, ms | GPU p95, ms | Visible plants ready |
| --- | ---: | ---: | ---: | ---: |
| Fresh forward | 1 | 481.4 | 18.5 | 22 / 22 |
| Reversal | 1 | 472.0 | 17.9 | 27 / 27 |
| Large jumps | 1 | 410.9 | 18.4 | 26 / 26 |
| Fresh forward | 2 | 462.1 | 17.9 | 27 / 27 |
| Reversal | 2 | 495.2 | 18.1 | 24 / 24 |
| Large jumps | 2 | 412.1 | 18.0 | 23 / 23 |
| Fresh forward | 3 | 500.9 | 18.3 | 27 / 27 |
| Reversal | 3 | 453.0 | 18.4 | 24 / 24 |
| Large jumps | 3 | 549.9 | 18.5 | 24 / 24 |

The GPU path passed the **25ms p95 frame** and **8ms p95 callback** budgets, with animation active and complete visible foliage at every sampled endpoint. Callback p95 was **2.5–5.2ms**. There were no main-thread pixel readbacks or Canvas2D clears during the samples; GPU framebuffer clears are still performed normally.

The cold first forward run contained a **102ms maximum interval** and 8 estimated missed frames; one reversal contained a 32.9ms interval and 1 estimate. The remaining runs had no estimated missed frames. Missed frames are estimated against 60Hz from requestAnimationFrame gaps, not hardware compositor counters. The cold outlier is retained rather than claiming zero jank.

## Wide-screen and native-input checks

At **1920 × 1080, DPR 1**, all nine endpoint samples had complete foliage and the original animation running. Eight of nine runs passed both timing budgets: p95 frame intervals were **18.2–19.8ms** and callback p95 was **3.6–4.5ms**. The first cold forward run did **not** pass: p95 was **33.4ms**, maximum **150.4ms**, callback p95 **10.7ms**. That startup limitation remains visible in the data; this is not a claim that every cold-start frame meets budget.

A separate six-second native wheel sample over the left margin measured **19.7ms p95**, **68.6ms maximum** and 13 estimated missed frames, with 23/23 visible plants ready, the GPU animation active and no main-thread pixel readbacks. It includes UI automation overhead and idle time around the gestures. The continuous scripted tests remain the stronger sustained-scroll comparison.

The original geometry and spring equations match the reference in regression tests. All **26 tests**, expanded syntax checks and the static production build pass. Superseded static strips and canonical plant assets are excluded from production output.

## Reproduction

From `stream/`, run `node scripts/garden-benchmark.js`. Open `http://127.0.0.1:4175/baseline.html` and `fixed.html` one at a time. Close other agent-created animation/reference tabs before comparing. Click **Run scroll benchmark**, then expand **Results**. The report includes renderer type, cell count and ready/visible plant counts so an empty or static garden cannot pass as a successful optimisation. **Record native wheel (6s)** records actual wheel gestures separately.

Open `http://127.0.0.1:4175/visual.html` and click **Compare animation poses** for deterministic parity checks. Its clock-controlled iframes are local-only. The benchmark uses the public feed and an empty spacer, never invented posts. None of the benchmark/visual-fixture files enter the production build.

The ignored baseline captures currently contain the deployed reference. For future changes, `--capture-baseline` captures the current renderer before editing and refuses to overwrite an existing capture. Numeric results are in [garden-performance.json](garden-performance.json).

At 390 × 844, the garden remains hidden and the document width is 390px, with no horizontal overflow.

Only worker-capable WebGL2 Chromium has been performance-profiled here. Safari/Firefox, low-powered hardware and the original Canvas2D fallback require separate measurements. Pixel comparisons include rasterisation differences and do not promise byte-identical screenshots across browsers.


## Scroll-start latency follow-up — 5 November

Smooth frame pacing did not establish prompt scroll onset. The earlier report did not measure wheel delivery delay. Removing per-frame debug DOM writes and splitting the canvas into two margin surfaces alone did not resolve the reported delay: exploratory samples still showed roughly 39–65ms before wheel handlers ran.

The current implementation transfers both margin canvases to a dedicated rendering worker. It runs the same `mountGarden` core, plant generators, spring equations, cell renderer and texture preparation there. The DOM thread keeps passive scroll/pointer forwarding and resize/visibility handling. Normal animation performs no DOM mutation or animation callback on the DOM thread. Profiling messages are opt-in on the local fixtures. Failure falls back to the direct GPU renderer, then the deployed Canvas2D reference.

A matched nine-wheel sequence visited left margin, feed and right margin, in both directions, at 1280 × 720 DPR 2. The direct fixture uses the same current GPU core on the DOM thread; the worker fixture uses the production path. These are small local samples, not statistical guarantees.

| Browser-side proxy | Direct core | Worker core |
| --- | ---: | ---: |
| Wheel timestamp → handler, median | 45.1ms | 24.0ms |
| Wheel timestamp → handler, maximum | 47.8ms | 30.3ms |
| Wheel timestamp → scroll observed at rAF, median | 48.7ms | 25.9ms |
| Wheel timestamp → scroll observed at rAF, maximum | 52.3ms | 30.6ms |

Two preceding worker samples also improved handler delivery (three events: median 12.5ms/max 28.4ms; nine events: median 23.1ms/max 39.9ms). One earlier worker sequence still reached 51.6ms for scroll-observed-at-frame, so this is not a zero-outlier claim. Existing user-owned preview tabs remained open in these follow-up checks; comparisons share that background load. Browser automation and host scheduling contribute to the numbers. These proxies **do not measure hardware input-to-photons or actual compositor presentation**, and only one burst start occurred in each sequence. They support reduced main-thread contention; they cannot quantify the complete physical scroll-start delay.

All nine current worker sustained-scroll scenarios passed: p95 DOM-frame intervals 17.3–18.3ms, worker rendering callback p95 2.0–2.6ms, no DOM-thread long tasks during the samples, and every visible plant ready at each endpoint. Worker frame counts were recorded separately so zero DOM-thread renderer callbacks cannot be mistaken for zero rendering cost. The cold first scenario still had a 49.1ms maximum frame interval. The five controlled-clock visual comparisons were rerun after the canvas split and retained exactly the table above. They exercise the shared rendering core directly; the production worker was separately verified drawing both margins. All 27 tests, syntax checks and the production build pass.

Reproduce onset comparisons with `latency-direct.html`, `latency-garden.html` and `latency-control.html` from the benchmark server. Click **Record wheel response (5s)**, scroll across both margins and the feed, and expand the results. The saved JSON includes every wheel sample and all nine worker workloads. The new worker path has been measured in Chromium; other browsers retain functional fallback but have not been performance-profiled.
