# flavordraft.app

The FlavorDraft product site: home, Privacy Policy, Terms of Service.

Static HTML and CSS built with [Eleventy](https://www.11ty.dev/). No runtime
framework, no client-side rendering, ~1 KB of JavaScript.

```
src/
  _data/site.json      the two values that are still unresolved live here
  _includes/           base + legal layouts, the icon set, small macros
  assets/css/site.css  every style on the site; tokens at the top
  assets/img/          artwork copied from the design system (see below)
  index.njk  privacy.njk  terms.njk
scripts/build-icons.mjs  regenerates the raster icons and the share image
scripts/og/              their source pages (not part of the site)
```

## Commands

```sh
npm install
npm start     # local preview with live reload → http://localhost:8080
npm run build # static output into _site/
npm run icons # regenerate favicon / apple-touch-icon / og.png (macOS + Chrome)
```

`_site/` is the deploy directory. Nothing is generated at request time, so it
can be served from any static host.

## Unresolved values

Both live in `src/_data/site.json`, and the build prints a warning naming any
that are still empty.

| Key | Effect while empty |
| --- | --- |
| `contactEmail` | `/privacy`, `/terms` and the footer render a visible `[CONTACT_EMAIL]` placeholder. Setting it turns on the mailto links and the footer's Contact link. |
| `appStoreUrl` | The site shows the "Coming to the App Store" status. Setting it turns on the App Store link in the header and a download button in the closing section — drop Apple's official badge asset in at `src/index.njk`. |

## Design system

`flavordraft-design-system/` (gitignored, not part of this site) is the source
of truth for colour, type, spacing, radii and the app-icon master. The tokens at
the top of `src/assets/css/site.css` are taken from it; deviations are commented
where they occur. A handful of its SVGs are copied verbatim into
`src/assets/img/` so the site has no dependency on that folder at build time.
