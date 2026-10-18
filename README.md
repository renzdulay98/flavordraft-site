# flavordraft.app

The FlavorDraft product site: home, Support, Privacy Policy, Terms of Service.

Static HTML and CSS built with [Eleventy](https://www.11ty.dev/). No runtime
framework, no client-side rendering, no webfonts, no dependencies beyond
Eleventy. Two small scripts: one shared (header, menu, legal contents), one for
the homepage's film, page turn and pen.

```
docs/privacy.md  docs/terms.md   the legal documents — /privacy and /terms render these
src/
  _data/site.json      site-wide values: URL, support address, App Store link, Apple credit line
  _data/screens.json   every homepage image's shape, widths and rights (generated: npm run screens)
  _data/pen.js         the red pen's marks (the hero's ring and underline, the arrow), built from the
                       App Store campaign's pen model at build time
  _data/build.js       values from the build itself (the footer's year)
  _data/legal.js       reads the two documents in docs/ for the legal pages
  _includes/base.njk   header, footer, <head> — shared by every page
  _includes/brand.njk  wordmark, App Store badge, img (responsive AVIF/WebP), ink (pen marks)
  _includes/home/      the homepage, one partial per section, in page order from index.njk
  _includes/legal.njk  the legal-page layout
  assets/css/site.css  styles shared by every page; tokens at the top
  assets/css/home.css  the homepage's sections (loaded on / only)
  assets/js/site.js    header state, small-screen menu, legal contents marker
  assets/js/home.js    the iPhone Duo film, the Cook View page turn, the arrow (homepage only)
  assets/img/screens/  the homepage's images (generated: npm run screens)
  assets/media/        the homepage's video (generated: npm run media)
  index.njk  support.njk  privacy.njk  terms.njk  download.njk
scripts/screens.json     every homepage image (the capture it is cut from) and video, with its rights status
scripts/build-screens.mjs  regenerates assets/img/screens/ and _data/screens.json (lib/render_image.py does the pixels)
scripts/build-media.mjs  copies the iPhone Duo film and cuts the page-turn clip into assets/media/
scripts/build-icons.mjs  regenerates the raster icons, the share image and the wordmark's sizes
scripts/og/              their source pages (not part of the site)
```

## Routes

| Route | Source | Notes |
| --- | --- | --- |
| `/` | `src/index.njk` | Marketing home (FlavorDraft 2.0) |
| `/support/` | `src/support.njk` | The App Store Connect **Support URL**. Contact address, quick help, contact again. |
| `/privacy/` | `docs/privacy.md` | Linked from the Terms and from the app; do not move |
| `/terms/` | `docs/terms.md` | |
| `/download` | `src/download.njk` | The short link to share. Redirects to `appStoreUrl`; `noindex`, and out of the sitemap |
| `/sitemap.xml` `/robots.txt` | `src/sitemap.njk`, `src/root/` | Every page with a `canonical` is in the sitemap |

GitHub Pages answers `/support` with a redirect to `/support/`, so canonicals,
the sitemap and the site's own links use the trailing slash. Links from the app
and App Store Connect without it still arrive.

Deployed by `.github/workflows/deploy.yml` to GitHub Pages on every push to
`main`; the `CNAME` file carries the custom domain into the output.

## Commands

```sh
npm install
npm start        # local preview with live reload → http://localhost:8080
npm run build    # static output into _site/
npm run media    # copy the iPhone Duo film, cut its phone crop and the page-turn clip (needs ffmpeg with libx264, libx265 and libvpx-vp9)
npm run screens  # regenerate the homepage images (needs python3 + Pillow 11.3+, cwebp, ffmpeg)
npm run icons    # regenerate favicon / apple-touch-icon / og.png / wordmark sizes (macOS + Chrome)
```

`media` and `screens` read the FlavorDraft app documentation folder,
`flavordraft-app-docs/` at the repo root (gitignored, 13 GB; `SCREENS_SRC`
points elsewhere). Run `media` before `screens`: two posters are frames of the
clip it cuts. Their outputs are committed, so a production build never needs
the sources or the tools.

`_site/` is the deploy directory. Nothing is generated at request time, so it
can be served from any static host.

## Site values

All live in `src/_data/site.json`. The build prints a warning naming any that
are empty, and naming every homepage image that is not cleared (below).

| Key | Effect |
| --- | --- |
| `contactEmail` | The public support address (`support@flavordraft.app`). Shown on `/support` and in the footer; the legal documents state it in their own text. |
| `appStoreUrl` | The App Store listing (`https://apps.apple.com/app/id6809896491`). One value behind every download route: the header's Download button, the hero and closing badges, the footer link, and where `/download` sends people. |
| `legal.appleCredit` | Apple's credit line, in the footer of every page. Drafted from Apple's templates (see the iPhone Duo rights review in the app docs) for the owner to finalise. |

## The homepage

One partial per section in `src/_includes/home/`: hero, the iPhone Duo film,
"Cook the videos you save", "Every recipe. One cookbook.", "Make recipes fit
you", "Cook one step at a time", "A place for every recipe", pricing, closing.

- **No device is drawn.** FlavorDraft's real screens lie on the page as cards,
  the way the iPhone Duo film (Track B) shows them. The App Store frames' iPhone
  (drawn) and iPhone Duo (3D-rendered), and the Duo Studio film (Track A, Apple's
  own model), are not cleared for the website: Apple's marketing guidelines name
  3D renders and simulations of its products as not permitted.
- **Paper is recipe content only:** the recipe sheet, the index cards, the
  collection stacks, the Draft with AI slips. Loose paper lies a little askew;
  screens and chrome stand square. Chrome (header, buttons, pricing, footer) is
  never paper. There is no tape.
- **Draft with AI** shows the three requests on Lasagna that the campaign
  approved for App Store screenshot 03, each an excerpt of its real capture
  (`bands` in `scripts/screens.json`: the request and two lines of the answer,
  nothing retyped). The Tiramisu exchange is not used: it strikes two liqueur
  brands through in red and was never approved for a layout.
- **The red pen** draws twice: the hero's ring and underline on load, and the
  arrow in "Cook the videos you save" when it comes into view. Its marks are
  computed in `src/_data/pen.js` and drawn on with a CSS mask. Apart from them,
  the film and the page turn, nothing on the page moves: no reveals, no
  parallax. Pen ink is never drawn over an app capture.
- **Video** (`home.js`): the film and the page turn play only in view, never under
  `prefers-reduced-motion` or Save-Data, and never without a visible control.
  Without the script, both show their stills and no video downloads.

## Images and video

Every homepage image is listed in `scripts/screens.json` with the capture it is
cut from, the crop, the output widths and its **rights** status. To swap an
image, point `from` at a new capture of the same screen and run
`npm run screens`. Images are AVIF (4:4:4, so the app's red type keeps its
edges) with WebP for browsers without AVIF; each `<img>` gets its size from
`src/_data/screens.json`, so no template states an image's dimensions.

**Before launch:** the slab and Duo capture READMEs in the app docs say of the
seeded cookbook's recipe photographs, imported from publishers: "None of it is
cleared for marketing use." Thirteen images and the iPhone Duo film show them
(`rights: "publisher-photos"`; the film's entry is under `media`; every build
lists them). Re-seed those screens with owned or
licensed photography, or secure permission, then recapture and regenerate. The
iPhone Duo film carries the same photographs; recapturing it means re-rendering
Track B (`source/trackb.py` in the app docs).

The film is Track B of the iPhone Duo showcase, "PUBLIC CANDIDATE" in its
rights review. Its three 1920 encodes are copied unchanged by `npm run media`
(`web/EMBED.md` in the app docs describes the files). Two pieces are new edits,
for the owner to sign off with the film: the phone film (`duo-film-narrow.*`,
the loop's middle 4:3 at 1200 × 900, re-encoded), and the Cook View page-turn
clip, two seconds of the same film's 4K master cropped to the screen.

## Type and brand

The site uses the app's own faces through system stacks — Avenir Next for
headlines and interface, Charter for editorial passages — with Helvetica
Neue/Arial and Georgia as fallbacks. No font files are bundled or loaded.

Two reds, as in the app and the App Store campaign: the brand red `#9E1F1F` for
the wordmark and headlines only, and the pen's red `#B62B25` for ink, links and
actions. The page is the app's cream `#FAF3E8` with the campaign's own grain
(`assets/img/paper-grain.png`), laid so the page averages exactly that cream.

Apple's product names are never set in capitals (no `text-transform` on any
text that can hold one), never broken across lines, and used in a referential
phrase ("for iPhone Duo"). The credit line sits in the footer.

The App Store badge is Apple's own artwork, downloaded unaltered from Apple's
marketing toolbox (`app-store-badge.svg`; `-white`, for a red ground, is kept but
not used at present). Apple's guidelines govern it: place it by height, never
recolour, crop, outline, animate or redraw it, and keep clear space around it.
One badge per screen: the header says Download in words instead. Replace the
files rather than editing them.

The wordmark is the approved raster from `wordmark_handoff/` (see its README
for specs): `src/assets/img/wordmark-flavordraft.png` on paper, served at the
140–560 px sizes `npm run icons` resamples from it, always placed by width. The
`-mono` file (reversed, for red) is kept but not used at present, as are the
Lucide doodles in `src/assets/img/doodles/` (ISC; see `SOURCES.txt`).

## Legal pages

`docs/privacy.md` and `docs/terms.md` are the source of truth for the Privacy
Policy and the Terms of Service on the site. The app bundles the same files
byte for byte, so change them in both repositories together. The leading
`# Title` becomes the page heading, the `**Effective date: …**` line under it
becomes the header's date, and everything after is rendered as written —
headings get anchor ids, email addresses become mailto links.

## Design system

`flavordraft-design-system/` (gitignored, not part of this site) is the source
of truth for colour, spacing, radii and the app-icon master. The tokens at the
top of `src/assets/css/site.css` are taken from it. The paper, ink and motion
values follow the app's paper design system (in the app docs,
`paper-interactions/`).
