# Lightbar Web

Scheme gallery and editor for [Lightbar](https://github.com/PawelWywiol/lightbar-embedded) LED devices: https://lightbar.wywiol.eu

- **Gallery** (`/`): presets and published schemes from the API plus schemes saved in the browser, sorted by name, with animated previews.
- **Editor** (`/editor`): paint frames, set lights count, tempo, fade, shuffle, hue shift and pixel shift per frame, preview, save locally, publish online.
- **Devices**: add a device by IP or URL (or scan common LAN addresses), send schemes to it.

## Translations

Language comes from the browser (`navigator.languages`): first supported one wins, otherwise English. Supported: English (`lib/config/messages.ts`, source of truth), Polish (`lib/config/messages.pl.ts`). Components read texts with `useMessages()` (`lib/i18n/i18n.ts`); prerendered HTML is English and switches after hydration.

New language: add `messages.<locale>.ts` typed `Messages` and register it in `LOCALE_MESSAGES` in `lib/i18n/i18n.ts`. "Lightbar" and preset scheme names are not translated.

## Stack

- React 19, React Router 8 (SPA mode, file routes in `app/routes`), Tailwind CSS 4, Radix UI, zod
- Cloudflare Workers: static assets from `build/client` + API worker `workers/api.ts` for `/api/*`
- Cloudflare D1 (`lightbar`, previews: `lightbar-preview`), schema and presets in `migrations/`
- Cloudflare Access for `/api/admin/*` (JWT verified in `workers/access.ts`)
- vitest + Testing Library, oxlint, oxfmt, lefthook, commitlint

## Layout

```
app/          routes (_index = gallery, editor, schemes = redirect to /)
components/   editor, schemesGallery, schemePreview, pageHeader, connectedDevice
lib/          lights (palette, frames), schemes (binary format, API clients, local storage),
              devices (device API, scan, bridge), connections (protocol constants), session, ui
workers/      API worker, Access auth, test database
migrations/   D1 schema and preset schemes
scripts/      writes build/client/_headers (CSP with inline script hashes, security headers)
```

## Requirements

- Node.js 24
- pnpm 12 (`packageManager` field, corepack >= 0.36)

## Commands

```bash
pnpm install
pnpm dev            # http://localhost:3210, /api proxied to API_PROXY_TARGET or http://localhost:8787
pnpm build          # build/client + _headers
pnpm preview        # serve build/client
pnpm lint           # oxlint (lint:fix)
pnpm fmt            # oxfmt (fmt:check)
pnpm typecheck
pnpm test           # vitest + coverage (test:watch)
pnpm audit          # audit-ci
pnpm fallow         # dead code / complexity / duplication
pnpm deps:check     # outdated deps (deps:update)
pnpm release        # version bump + CHANGELOG + tag
```

Production schemes in dev (read-only, admin endpoints need Cloudflare Access): set `API_PROXY_TARGET=https://lightbar.wywiol.eu` in `.env`.

Local API with D1:

```bash
pnpm build
npx wrangler d1 migrations apply lightbar --local
npx wrangler dev --local    # app + API on http://localhost:8787
```

`/api/admin/*` returns 401 locally (no Access token). If `wrangler dev` returns 500, kill a stale `workerd` process.

Git hooks (lefthook): pre-commit oxfmt + oxlint, commit-msg commitlint, pre-push typecheck + tests.

## API

| Method | Path | Auth | |
|---|---|---|---|
| GET | `/api/schemes` | public | up to 200 schemes, newest first, `data` base64, cached 60 s |
| GET | `/api/admin/login` | Access | redirects to `/` after Access login |
| GET | `/api/admin/me` | Access | `{ email, isAdmin, schemeIds }` |
| POST | `/api/admin/schemes` | Access | publish scheme, returns `{ id }` |
| PUT, DELETE | `/api/admin/schemes/:id` | owner or admin | update / delete |

Writes require same `Origin`, `Content-Type: application/octet-stream`, valid scheme bytes, max 80 KiB. Presets (`preset-*`) are changed only by admins or migrations.

## Scheme format

Same binary chunks the device receives (`lib/schemes/schemeFormat.ts`). Each chunk: type (4 B, LE ASCII), payload size (4 B), payload, `EOL\0`.

- `head`: `[version=1, nameLength, name…]`
- `frm2`: `[flags, pixelShift (int8), tempo, colors…]` (legacy `fram` without pixel shift is still read)
- flags: bit 0 fade, bit 1 shuffle, bits 2–7 hue shift (signed, −32..31)
- tempo: 1–240 BPM, 241–254 = 255 − value ticks at 60 FPS
- color: bits 6–7 lightness, bits 0–5 hue (0–62); hue 63 achromatic (`0x3f` off, `0xff` white)

Hue and pixel shift accumulate across frames for the whole scheme. Frames shorter than the strip repeat along it.

## Devices

The browser talks to the device directly: `GET`/`POST http://<device>/api/lightbar`.

The app is served over HTTPS and browsers may block HTTP requests from it. "Connect via device page" opens `http://<device>/#bridge=<origin>` in a popup; requests then go through it with `postMessage`. The device page accepts only `https://lightbar.wywiol.eu` and `*-lightbar-web.pawel-wywiol.workers.dev` previews.

WiFi credentials are set on the device page itself (see lightbar-embedded).

## Deploy

Cloudflare Workers Builds:

- push to `main`: `npx wrangler d1 migrations apply lightbar --remote && npx wrangler deploy` → https://lightbar.wywiol.eu
- other branches: preview build with `lightbar-preview` database and separate Access app

Add presets or schema changes as a new file in `migrations/`; update the expected preset count in `workers/api.spec.ts`.

Deploy firmware first when the scheme format changes.

## Env

- `VITE_SENTRY_DSN` (build): optional Sentry DSN for production builds
- `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD` (worker vars, `wrangler.jsonc`): Cloudflare Access JWT validation
- `ADMIN_EMAILS` (worker secret, `wrangler secret put ADMIN_EMAILS`): comma-separated admin emails

## License

GPL-3.0, see [LICENSE](LICENSE).
