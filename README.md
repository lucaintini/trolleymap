# TrolleyMap

Spot an abandoned shopping trolley, snap it, pin it. TrolleyMap is a phone-first web app (installable PWA) where anyone can report a trolley with a photo and GPS location, see every report on a live map, and mark it collected once it is picked up.

**Live:** https://lucaintini.ai/trolley/
**Back it:** https://lucaintini.ai/trolley/back.html

Idea by Susannah Soon, our first customer.

Built at **Industry Inner Join v20, $1 Sprint** (4 Nov 2026, Perth), run by DR Analytics with Civic Hackers and Endava.

## How it works
- `web/` static site: `index.html`, `app.js`, Leaflet (self-hosted in `web/vendor`), OpenStreetMap tiles, PWA manifest and service worker.
- Data lives in a Supabase table `trolley_reports` (see `sql/schema.sql`). The browser uses the public publishable key only; Row Level Security allows public read, insert of new reports, and the `trolley_mark_collected` function for the Collected button.
- Suburb names come from OpenStreetMap Nominatim reverse geocoding.
- Support is via Stripe Payment Links (no server code).

## Run locally
Serve the `web/` folder with any static server, for example `npx serve web`. To use your own backend, create a Supabase project, run `sql/schema.sql`, and change `SB` and `KEY` at the top of `web/app.js`.

## License
MIT
