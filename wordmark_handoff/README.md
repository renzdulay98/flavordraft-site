# FlavorDraft Wordmark — handoff

The approved wordmark, re-inked to the FlavorDraft brand red. **The letterforms are the
supplied artwork, unmodified** — no redraw, no re-spacing, no substituted `f`.

## Files

| File | Ink | Ground | Use |
| --- | --- | --- | --- |
| `wordmark-flavordraft.png` | `#9E1F1F` | transparent | Default. Paper and light grounds |
| `wordmark-flavordraft-mono.png` | `#F6EFE3` | transparent | Reversed — on `#9E1F1F`, on dark, over photography |
| `reference-supplied.png` | — | cream | The original reference, for provenance only. Do not ship |

## Specs

```
Ink box        1193 × 274 px   (cropped to the artwork's own bounds)
Aspect ratio   4.354 : 1       — set ONE dimension, let the other follow
Ink            #9E1F1F         logoRed
Reversed ink   #F6EFE3         parchment
Ground         transparent
Clear space    ≥ 8% of the placed width on all four sides
Minimum width  110 pt
```

`#9E1F1F` is the existing **logoRed** token — the same red as the app icon. It is reserved for
the icon and the wordmark and is *not* a UI accent. The UI accent is `primaryRed #B62B25`.
Do not substitute one for the other.

### Colour is uniform — verified

Every interior pixel is one value. 79,220 fully opaque pixels, exactly one RGB triplet
(`158, 31, 31`), zero off-colour pixels. Only a ~3% edge rim carries partial alpha, which is
the antialiasing that keeps the curves smooth. If you ever see banding or a lighter letter,
something in the pipeline has recompressed the file — go back to this original.

## Placement sizes

Widths, from the same file:

| Context | Width × height |
| --- | --- |
| App Store / marketing | 640 × 147 |
| Paywall | 320 × 74 |
| Onboarding · Welcome | 210 × 48 |
| Home header | 140 × 32 |

Below ~110 pt the `f`'s tail softens. Keep that as the floor.

## Implementation

Import both PNGs into the asset catalogue as **@1x / @2x / @3x** sets, or supply the 1193 px
file as the @3x and let Xcode downsample. Place by width and let height follow the 4.354:1
aspect — never set both dimensions independently, and never stretch.

```swift
Image("wordmark-flavordraft")
    .resizable()
    .aspectRatio(contentMode: .fit)
    .frame(width: 140)          // Home header
    .accessibilityLabel("FlavorDraft")
```

Both files already carry their own ink colour, so no tinting is required. Do **not** apply
`.foregroundStyle()` to these — they are not template assets (see below).

### ⚠️ Ask before you build: is there a vector?

The supplied artwork was a raster, so this delivery is a raster. That has two consequences:

1. It is **not resolution-independent.** Sharp at every size listed above, but it will not
   survive being scaled up beyond 1193 px.
2. It **cannot be a tintable template asset.** That is why two colour variants ship as separate
   files instead of one template tinted per appearance.

If the original vector exists — SVG, AI, PDF or EPS from whoever set the wordmark — use that
instead and re-apply `#9E1F1F`. You then get one `Render As · Template Image` asset that tints
for every appearance, stays sharp at any size, and is a fraction of the bundle size:

```swift
Image("wordmark-flavordraft")      // single-scale vector, Template Image
    .renderingMode(.template)
    .foregroundStyle(Color.fdLogoRed)
```

Raise this with the designer before wiring up the asset catalogue — it changes how the asset
is configured, so it is cheaper to settle first than to redo.

## Rollout — not yet applied

The wordmark currently appears as Newsreader 600 text (`FlavorDraft` + a full stop) in **eight
places** across the two design documents. None have been changed. The new mark drops the camel
case and the full stop; lowercase throughout reads quieter, and the written `f` carries the
editorial weight the serif was doing.

Sites, for when the rollout is approved:

- Onboarding · 01 Welcome — 150 pt
- App · 01 Home header — 126 pt
- App · icon-lockup and appearance specimens (§ App icon) — 6 further instances

Related, not in this bundle: `assets/icon-q-d4.svg`, the shipped app-icon master, which pairs
with this wordmark and shares `logoRed`.
