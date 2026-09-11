# flavordraft.app

The FlavorDraft product site: home, Privacy Policy, Terms of Service.

Static HTML and CSS built with [Eleventy](https://www.11ty.dev/). No runtime
framework, no client-side rendering, ~1 KB of JavaScript.

```
docs/privacy.md  docs/terms.md   the legal documents — /privacy and /terms render these
src/
  _data/site.json      site-wide values: URL, support address, App Store link
  _data/legal.js       reads the two documents in docs/ for the legal pages
  _includes/           base + legal layouts, the icon set
  assets/css/site.css  every style on the site; tokens at the top
  assets/img/          artwork copied from the design system (see below)
  index.njk  privacy.njk  terms.njk
scripts/build-icons.mjs  regenerates the raster icons and the share image
scripts/og/              their source pages (not part of the site)
```

## Legal pages

`docs/privacy.md` and `docs/terms.md` are the source of truth for the Privacy
Policy and the Terms of Service. Edit them there; there is no other copy. The
leading `# Title` becomes the page heading, the `**Effective date: …**` line
under it becomes the header's date, and everything after is rendered as
written — headings get anchor ids, email addresses become mailto links.

## Commands

```sh
npm install
npm start     # local preview with live reload → http://localhost:8080
npm run build # static output into _site/
npm run icons # regenerate favicon / apple-touch-icon / og.png (macOS + Chrome)
```

`_site/` is the deploy directory. Nothing is generated at request time, so it
can be served from any static host.

## Site values

Both live in `src/_data/site.json`, and the build prints a warning naming any
that are empty.

| Key | Effect |
| --- | --- |
| `contactEmail` | The public support address (`support@flavordraft.app`), used by the footer's Contact link. The legal documents state it in their own text. |
| `appStoreUrl` | While empty, the site shows the "Coming to the App Store" status. Setting it turns on the App Store link in the header and a download button in the closing section — drop Apple's official badge asset in at `src/index.njk`. |

## Design system

`flavordraft-design-system/` (gitignored, not part of this site) is the source
of truth for colour, type, spacing, radii and the app-icon master. The tokens at
the top of `src/assets/css/site.css` are taken from it; deviations are commented
where they occur. A handful of its SVGs are copied verbatim into
`src/assets/img/` so the site has no dependency on that folder at build time.
