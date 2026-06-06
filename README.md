# tbilisi-bus

Real-time Tbilisi public transport tracker. Live bus positions, route maps, stop arrivals.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Leaflet 1.9** for maps (direct, no react-leaflet)
- **TanStack Query 5** for data fetching/caching
- **Tailwind CSS** for styling
- **ttc-api** (local package) wrapping `transit.ttc.com.ge`

## Features

- Live map of all active buses/minibuses across Tbilisi
- Per-route detail page with forward + backward polylines
- Stop search with autocomplete (datalist)
- Per-stop arrival board with realtime ETA
- Journey planner (from/to stops)
- Ka / En locale switching via middleware

## Development

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Build

```bash
npm run build
npm run start
```

## Project layout

```
app/                  Next.js App Router pages + API routes
  api/                REST endpoints wrapping ttc-api
  routes/[id]/        Per-route detail (polylines + stops + live)
  stops/[id]/         Per-stop detail (arrivals + nearby vehicles)
components/           React components (LiveMap, StopSearch, etc.)
lib/                  Domain utilities (ttc, queries, types, polyline)
public/icons/         SVG assets (AIGA bus stop sign, etc.)
```

## Data source

All live data comes from `transit.ttc.com.ge` via the bundled `ttc-api` package.
No API keys required. Polylines are Google encoded polyline format.

## License

MIT
