# CLAUDE.md

## Commands

```bash
pnpm run dev          # dev server :3000
pnpm run build        # SPA build -> build/client (index.html prerendered)
pnpm run lint         # biome check --write
pnpm run typecheck    # tsc
pnpm run test         # vitest run
pnpm vitest path/to/file.spec.ts --run
```

## Architecture

- React Router 7 framework mode with `ssr: false` (`react-router.config.ts`), fs-routes in `app/routes`
- `app/` - root layout, client entry (Sentry), routes (`/`, `/editor`)
- `components/` - editor (lights frame grid, color picker, scheme state) and connected devices UI
- `lib/connections` - binary protocol to device (`wifi` / `frame` requests, type + size + EOL headers, little-endian)
- `lib/devices` - device list (localStorage), scan, provider, `useConnectedDeviceData` hook, device API (`devicesApi.ts`)
- `lib/lights` - scheme/frame types, config, zod schema
- `lib/ui` - Radix + Tailwind components (CVA variants), theme in `tailwind-theme.css`
- `lib/utils` - custom events, storage, uid, rafTimeout

Firmware and device UI live in `lightbar-embedded`; protocol changes must stay in sync with it.

## Gotchas

- `@react-router/node` and `isbot` must stay in `dependencies`: `react-router build` refuses to run without them (default `entry.server` prerenders `index.html`)
- `@biomejs/biome` pinned to 2.4.11: `biome migrate` on 2.5 rewrote `"recommended": true` to `"preset": "none"` (disables all rules)

## Code Style

- Biome: single quotes, trailing commas, semicolons, 2-space indent, 100 char width
- Conventional commits (commitlint); pre-commit runs lint, typecheck, tests
