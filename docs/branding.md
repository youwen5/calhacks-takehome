# Cal Hacks branding

The user explicitly requires Cal Hacks branding in place of SB Hacks branding.
Use “Cal Hacks” as the organization name and “Cal Hacks Portal” as the provisional
application title. Apply this consistently to the portal shell, authentication
screens, page metadata, application copy, and email templates.

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
