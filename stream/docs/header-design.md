# Header study — 27 October 2026

The lower garden already gives the page character. The top should feel like the same place while keeping the stream's typography and generous whitespace.

## What the references suggest

| Reference | Observed detail | Useful direction for ridge |
| --- | --- | --- |
| [Jacky Zhao](https://jzhao.xyz/) | A dithered canopy at the top of an otherwise readable personal garden | Bring the garden's actual cell texture into the identity, rather than drawing an unrelated smooth logo |
| [Pirijan](https://pketh.org/) | Coloured, compact topic labels | Give filters a little material presence, like small paper index labels |
| [Spencer Chang](https://spencer.place/) | Small pictorial objects in navigation | Character can sit in a familiar object beside a functional label |
| [Rasmus Andersson](https://rsms.me/) | Restrained typography, whitespace and a concentrated orange accent | Keep the text clear and concentrate decoration instead of filling every empty area |
| [Max Böck](https://mxb.dev/) | A portrait beside the name, plus a playful paint-roller theme control | Identity can be anchored on the left; motion or play can belong to one small object |
| [Robin Sloan](https://www.robinsloan.com/) | A large orange display wordmark | Typography alone can supply character, although ridge keeps the quieter Inter treatment already chosen |

These are current sites, visually inspected in the browser. We take principles rather than copying their assets. Untested returned 403 during the earlier web check, so no new claims about its header are used here.

## First pass: a smooth flower and coloured dots

Added a small vector nasturtium after the name, using our existing five-petal garden outline. Added coloured text, bullets and a soft active-filter tint.

This did connect the palette, but ridge's feedback was that the icon didn't feel right, it might belong on the left, and the bullets were unwelcome. The smooth miniature felt different from the coarse garden cells. The first vector source remains in `design/nasturtium-mark-vector.svg` and the first-pass screenshot is retained in the header references.

## Second pass: a voxel stamp and paper labels

The flower mark moved **before** “ridge”. It uses the same asymmetric flower silhouette, sampled into **124 opaque cells**, with lit top faces and darker lower faces. The 36px mark has a 2px unit cell; there are no rounded vector petal edges. This is an original code-generated SVG and also the favicon. Regenerate it with `node scripts/make-header-mark.js`.

The filters retain their colours and lose their bullets. Quiet filled labels and a very small lower edge give them a more tactile quality. The selected filter has a clearer inset edge and its existing `aria-current` state. Labels keep the same functional names.

A small lift on hover or keyboard focus gives the flower a response. Filter labels lift by one pixel on hover. They don't continuously wiggle; the garden supplies the ambient motion. Reduced motion suppresses the transitions. No additional button, explanatory copy, count or header divider is introduced.

The mark is decorative inside the existing home link, whose accessible name remains “ridge”. The name remains 16px Inter. The stream, its day headings and its content hierarchy are preserved.

## Further whimsy, if it earns its place

The useful directions are a recognisable tiny object, a shared material language, and a detail discovered through interaction. A larger dithered canopy or moving sunlight across the header could be explored later, but would compete more with the bottom garden. This pass concentrates on the small stamp and labels first.

The earlier views are retained in `design/header/`: [before](../design/header/before.jpg), [first pass](../design/header/vector-and-dots.jpg), [voxel flower, dark](../design/header/voxel-and-labels.jpg) and [voxel flower, light](../design/header/voxel-and-labels-light.jpg). The first pass remains visible alongside the feedback that changed it.

## Current mark: Ōtori-sama

Ridge chose Ōtori-sama from *Spirited Away* to replace the flower. His green leaf hat connects the character to the nasturtium canopy naturally. The current mark is a small original pixel rendition: a round cream body, wide white eyes, amber bill and feet, and a broad green pad with an upright stem. It uses 237 opaque cells on a 20 × 20 grid, displayed at 40px, and remains to the left of the name.

The coloured filter labels and their bullet-free treatment remain. The mascot also serves as the favicon and retains the small hover/focus lift. The asset is code-native SVG, generated with `node scripts/make-header-mark.js`; no external image request is needed by the website. The earlier flower remains in `design/header/nasturtium-voxel.svg`.

The [current full-page composition](../design/garden/generative-top.png) shows the mascot alongside the new scrolling garden. A copy of the [mascot SVG](../design/header/otori-sama.svg) is retained with the earlier marks.

## Animation — 28 October 2026

The header now uses an inline SVG with separate body, eyes, bill, feet and leaf layers. The static favicon retains its original drawing. Hovering the mascot or focusing the home link plays a soft two-step waddle, double blink and leaf wobble; it settles after 1.8 seconds. A quieter 2.4-second head tilt/blink begins after 12 seconds, then waits 30–44 seconds between gestures. There is no continuously running animation loop.

`public/mascot.js` uses the browser’s Web Animations API. It cancels gestures and timers while the mascot is offscreen, the tab is hidden, or reduced motion is selected. Returning to view starts a fresh delay. Touch navigation and the home link retain their normal behaviour. No sound, tooltip or extra control is added.
