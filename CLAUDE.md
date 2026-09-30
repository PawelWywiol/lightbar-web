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

- React Router 8 framework mode with `ssr: false` (`react-router.config.ts`), fs-routes in `app/routes`
- `app/` - root layout, client entry (Sentry), routes (`/`, `/editor`)
- `components/` - editor (lights frame grid, color picker, scheme state) and connected devices UI
- `lib/connections` - binary protocol to device (`wifi` / `frame` requests, type + size + EOL headers, little-endian)
- `lib/devices` - device list (localStorage), scan, provider, `useConnectedDeviceData` hook, device API (`devicesApi.ts`)
- `lib/lights` - scheme/frame types, config, zod schema
- `lib/ui` - Radix + Tailwind components (CVA variants), theme in `tailwind-theme.css`
- `lib/utils` - custom events, storage, uid, rafTimeout

Firmware and device UI live in `lightbar-embedded`; protocol changes must stay in sync with it.

## Gotchas

- `isbot` must stay in `dependencies`: `react-router build` auto-adds it otherwise (default `entry.server` prerenders `index.html`)
- Never run `biome migrate` blindly: on 2.5 it rewrote `"recommended": true` to `"preset": "none"` (disables all rules); correct is `"preset": "recommended"`
- pnpm 12 enforces `minimumReleaseAge` (1 day): a lockfile with younger versions fails install; a fresh install whose range floor is younger silently writes `minimumReleaseAgeExclude` to `pnpm-workspace.yaml`. Lower the range to a mature version instead and delete that file
- pnpm 12 reads only auth/registry keys from `.npmrc`; other settings go to `pnpm-workspace.yaml`

## Dependencies

```bash
pnpm taze major -r -l      # list updates; add -w to write, -I for interactive
```

## Code Style

- Biome: single quotes, trailing commas, semicolons, 2-space indent, 100 char width
- Conventional commits (commitlint); pre-commit runs lint, typecheck, tests
