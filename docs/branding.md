# Cal Hacks branding

The user explicitly requires Cal Hacks branding in place of SB Hacks branding.
Use “Cal Hacks” as the organization name and “Colmena” as the application wordmark
and page-title suffix. Keep event names and organization references as Cal Hacks.
Use direct headings without marketing heroes, taglines, or decorative preheadings.
Set spacing explicitly: Tailwind resets the browser's heading and paragraph margins.

## Storke is the design baseline

The user explicitly requires close visual reuse on comparable pages. Match Storke's
Source Serif 4 typography, stone light/dark tokens, compact 40px controls, outlined
secondary actions, 256px sidebar, mobile drawer, grouped application panels, and
boxed review answers. Auth screens use its one-third/two-thirds illustrated split
layout and centered 448px form. The explore page stays a simple event list, without
the removed marketing hero. Event selection, application types, and release tools
adapt this same visual language to the new features.

`static/auth-splash.svg` is copied from Storke's `src/lib/assets/splash.svg` at the
user's direction. It contains illustration rather than SB Hacks text or logos.
The normal/italic variable Source Serif 4 fonts are bundled in `static/fonts/`,
from the [Google Fonts source distribution](https://github.com/google/fonts/tree/main/ofl/sourceserif4).
Their SIL Open Font License is retained at `static/fonts/OFL.txt`. Font loading
requires no third-party request at runtime.

Light/dark mode persists locally, with a system-preference default and an early
theme initializer to prevent a light-background flash. Page content uses Storke's
150ms upward exit and 300ms entrance from the left; the top loading bar is separate.
Reduced-motion preferences disable page movement and artificial navigation waits.

## Logo asset

- Source supplied by the user: https://avatars.githubusercontent.com/u/7351179?s=280&v=4
- Local asset: `static/favicon.png`.
- Intended use: favicon and, where appropriate, a small organization mark.
- Serve the local asset rather than depending on GitHub for each page load.
- When the SvelteKit scaffold is created, add
  `<link rel="icon" type="image/png" href="%sveltekit.assets%/favicon.png" />`
  to `src/app.html`.

Do not carry over SB Hacks logos, Storke product labels, SB Hacks email addresses,
Discord links, event dates, or domain-based organizer permissions. Reference and
attribution documentation may still name Storke and SB Hacks accurately.

The user explicitly permits invented event details for this hypothetical take-home.
Create coherent demo names, dates, venues, and descriptions without requiring
confirmation. Identify seeded events as hypothetical/demo events so they are not
mistaken for actual Cal Hacks announcements. Use reserved example domains for
fictional contact addresses, and keep demo content separate from real provider
credentials and authorization configuration.
