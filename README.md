# Lightbar Web

Light scheme editor for [Lightbar](https://github.com/PawelWywiol/lightbar-embedded) devices.

Static single-page app (React 19, React Router 8 in SPA mode, Tailwind CSS 4). Talks to devices directly from the browser over HTTP (`/api/lightbar`).

## Requirements

- Node.js 24
- pnpm 12 (`packageManager` field; with corepack >= 0.36)

## Commands

```bash
pnpm install
pnpm run dev        # http://localhost:3000
pnpm run build      # static output in build/client
pnpm run preview    # serve build/client
pnpm run lint       # oxlint (lint:fix)
pnpm run fmt        # oxfmt (fmt:check)
pnpm run typecheck
pnpm run test       # vitest + coverage (test:watch)
pnpm run audit      # audit-ci
pnpm run fallow     # dead code / complexity / duplication
pnpm run deps:check # outdated deps (deps:update)
pnpm run release    # version bump + CHANGELOG + tag
```

## Deploy

Serve `build/client` as static files and route every unknown path to `index.html`.

Devices expose plain HTTP, so the app must also be served over HTTP (browsers block HTTP requests from HTTPS pages).

## Env

- `VITE_SENTRY_DSN` - optional, Sentry error reporting in production builds
