# flavordraft.app

The FlavorDraft product site: home, Support, Privacy Policy, Terms of Service.

Static HTML and CSS built with [Eleventy](https://www.11ty.dev/). No runtime
framework, no client-side rendering, no webfonts, one small script.

```
docs/privacy.md  docs/terms.md   the legal documents — /privacy and /terms render these
src/
  _data/site.json      site-wide values: URL, support address, App Store link
  _data/build.js       values from the build itself (the footer's year)
  _data/legal.js       reads the two documents in docs/ for the legal pages
  _includes/base.njk   header, footer, <head> — shared by every page
  _includes/brand.njk  wordmark, App Store CTA, screenshot, doodle and mark macros
  _includes/legal.njk  the legal-page layout
  assets/css/site.css  every style on the site; tokens at the top
  assets/img/screens/  the responsive screenshot set (generated, see below)
  assets/img/doodles/  the line drawings' source SVGs and licences
  assets/js/site.js    header state, small-screen menu, reveals, legal contents marker
  index.njk  support.njk  privacy.njk  terms.njk
scripts/screens.json     which app screenshots the site shows, and where each comes from
scripts/build-screens.mjs  regenerates src/assets/img/screens/ from those sources
scripts/build-icons.mjs  regenerates the raster icons and the share image
scripts/og/              their source pages (not part of the site)
```

## Routes

| Route | Source | Notes |
| --- | --- | --- |
| `/` | `src/index.njk` | Marketing home |
| `/support` | `src/support.njk` | The App Store Connect **Support URL**. Contact address, quick help, contact again. |
| `/privacy` | `docs/privacy.md` | Linked from the Terms and from the app; do not move |
| `/terms` | `docs/terms.md` | |
| `/sitemap.xml` `/robots.txt` | `src/sitemap.njk`, `src/root/` | Every page with a `canonical` is in the sitemap |

Deployed by `.github/workflows/deploy.yml` to GitHub Pages on every push to
`main`; the `CNAME` file carries the custom domain into the output.

## Commands

```sh
npm install
npm start       # local preview with live reload → http://localhost:8080
npm run build   # static output into _site/
npm run screens # regenerate the screenshot set (needs cwebp: brew install webp)
npm run icons   # regenerate favicon / apple-touch-icon / og.png (macOS + Chrome)
```

`_site/` is the deploy directory. Nothing is generated at request time, so it
can be served from any static host.

## Site values

Both live in `src/_data/site.json`, and the build prints a warning naming any
that are empty.

| Key | Effect |
| --- | --- |
| `contactEmail` | The public support address (`support@flavordraft.app`). Shown on `/support` and in the footer; the legal documents state it in their own text. |
| `appStoreUrl` | While `null`, every download call to action renders as an honest "Coming soon to the App Store" status. Set it to the real `https://apps.apple.com/…` URL and the header, hero, closing section and footer all turn into links. |

## Screenshots

Every app screenshot on the site is listed in `scripts/screens.json` with the
capture it comes from. `npm run screens` reads the extracted screenshot archive
(the folder containing `screenshot-source/` and `screenshots/`; `SCREENS_SRC`
points at it, default `./screenshot-assets`, gitignored) and writes resized
WebP files into `src/assets/img/screens/`, which are committed. Production
builds never need the sources or the tool.

To swap an image, change its `from` (and `crop`, if any) and run the command.

**Before launch, read `screenshots/RIGHTS_REVIEW.md` in the archive.** The raw
captures show third-party recipe photography as the app imports it, and the
packaging demo (`packaging` in the manifest, built from the App Store
composite because the raw scan captures are not in the archive) shows a real
brand's box. Re-seed those screens with owned or licensed content and
regenerate before the site goes live. The platform marks in the import section
are decorative, monochrome and accompanied by plain wording; they indicate
supported sources and imply no partnership.

## Type and brand

The site uses the app's own faces through system stacks — Avenir Next for
headlines and interface, Charter for editorial passages — with Helvetica
Neue/Arial and Georgia as fallbacks. No font files are bundled or loaded.

The wordmark is real text: the design system's "f" mark (inlined in
`brand.njk`) followed by "lavordraft". The doodles are Lucide icons (ISC) plus
the whisk and spoon drawn for the screenshot set; the platform marks are from
Simple Icons (CC0) and remain the trademarks of their owners. Sources and
licences: `src/assets/img/doodles/SOURCES.txt`.

## Legal pages

`docs/privacy.md` and `docs/terms.md` are the source of truth for the Privacy
Policy and the Terms of Service. Edit them there; there is no other copy. The
leading `# Title` becomes the page heading, the `**Effective date: …**` line
under it becomes the header's date, and everything after is rendered as
written — headings get anchor ids, email addresses become mailto links.

## Design system

`flavordraft-design-system/` (gitignored, not part of this site) is the source
of truth for colour, spacing, radii and the app-icon master. The tokens at the
top of `src/assets/css/site.css` are taken from it.
