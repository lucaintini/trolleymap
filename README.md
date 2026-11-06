# TrolleyMap

Spot an abandoned shopping trolley, snap it, pin it. TrolleyMap is a phone-first web app (installable PWA) where anyone can report a trolley with a photo and GPS location, see every report on a live map, and mark it collected once it is picked up.

**Live:** https://lucaintini.ai/trolley/
**Back it:** https://lucaintini.ai/trolley/back.html

Idea by Susannah Soon, our first customer.

Built at **Industry Inner Join v20, $1 Sprint** (4 Nov 2026, Perth), run by DR Analytics with Civic Hackers and Endava.

## How it works
- `web/` static site: `index.html`, `app.js`, Leaflet (self-hosted in `web/vendor`), OpenStreetMap tiles, PWA manifest and service worker.
- Data lives in Supabase. The map reads `trolley_feed`. A report is `trolley_report` (photo required, then the same photo check as googlymaps). Still there / Gone is `trolley_vote`. The browser uses the public publishable key only.
- A pin with a photo shows a thumbnail in the popup. Tap the photo to open it full size. Same-origin paths (such as `/trolley/seed.jpg`) and `data:image/...` load directly. Supabase Storage URLs and `public-photos/...` keys are fetched and shown as `blob:` URLs, because the live page CSP allows that host in `connect-src` but not in `img-src`.
- Suburb names come from OpenStreetMap Nominatim reverse geocoding.
- Support is via Stripe Payment Links (no server code).

## Deploy to lucaintini.ai/trolley
The live site is static files. CSP is a Caddy (or AppService) response header and is not in this repo. Publishing `web/` does not change that header.

1. Copy the `web/` directory to the static root that already serves `https://lucaintini.ai/trolley/` (the directory that contains the current `index.html`, `app.js`, and `seed.jpg`).
2. No database migration. Existing `photo` values keep working: `/trolley/...`, `data:image/jpeg;base64,...`, a Supabase Storage HTTPS URL, or a `public-photos/...` object key.
3. `index.html` loads `app.js?v=3`. The live response sends `cache-control: no-cache`.
4. Optional, not required for photos to show: add the Supabase host to `img-src` so Storage images can load without the blob step:
   `img-src 'self' data: blob: https://tile.openstreetmap.org https://qbikznnmzthhhdeghfzf.supabase.co`

## Verify
Open the map, click a pin that has a photo (demo pins use `/trolley/seed.jpg`), confirm the thumbnail, then click the photo and confirm the full-size view. Close it with Close, the backdrop, or Escape. A pin with no photo shows neither.

## Run locally
Serve the `web/` folder with any static server, for example `npx serve web`. To use your own backend, create a Supabase project, run `sql/schema.sql`, and change `SB` and `KEY` at the top of `web/app.js`.

## License
MIT
