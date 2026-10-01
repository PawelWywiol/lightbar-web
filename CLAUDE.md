# CLAUDE.md

## Commands

```bash
pnpm run dev          # dev server :3000
pnpm run build        # SPA build -> build/client (index.html prerendered)
pnpm run lint         # oxlint --deny-warnings (lint:fix to autofix)
pnpm run fmt          # oxfmt (fmt:check in CI/hooks)
pnpm run typecheck    # tsc
pnpm run test         # vitest run, coverage on (test:watch without coverage)
pnpm vitest path/to/file.spec.ts --run
pnpm run audit        # audit-ci, fails on high vulns (use `run`: `pnpm audit` is pnpm's builtin)
pnpm run fallow       # fallow audit: dead code, complexity, duplication, cycles in changed files
pnpm run deps:check   # pnpm outdated; deps:update bumps to latest
pnpm run release      # commit-and-tag-version: bump, CHANGELOG, tag
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
- oxlint `react-hooks/exhaustive-deps` is reported at the first use of a missing dep inside the effect, not at `useEffect` - suppress with `/* oxlint-disable ... */` + `/* oxlint-enable ... */` around the effect
- React Compiler rules (`react/set-state-in-effect`, `purity`, `preserve-manual-memoization`, ...) are off in `.oxlintrc.json`: project doesn't use React Compiler; enabling needs effect refactors
- pnpm 12 enforces `minimumReleaseAge` (1 day): a lockfile with younger versions fails install; a fresh install whose range floor is younger silently writes `minimumReleaseAgeExclude` to `pnpm-workspace.yaml`. Lower the range to a mature version instead and delete that file
- pnpm 12 reads only auth/registry keys from `.npmrc`; other settings go to `pnpm-workspace.yaml`

## Code Style

- oxfmt: single quotes, trailing commas, semicolons, 2-space indent, 120 char width
- Conventional commits (commitlint, header max 70)
- lefthook: pre-commit oxfmt --check + oxlint on staged files; commit-msg commitlint; pre-push typecheck + test
