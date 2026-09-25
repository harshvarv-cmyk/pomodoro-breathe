# Pomodoro Breathe

A compact Pomodoro timer + breathing exercise app built with React + TypeScript + Vite.

## Quick start

Requirements
- Node 18+ (recommended)
- pnpm (tested with pnpm@10.x)

Install dependencies:
```bash
pnpm install
```

Run the app (client) locally:
```bash
cd client
pnpm dev
```

If you want to run a local server (if present):
```bash
# from repo root
cd server
pnpm dev
```

Build the frontend:
```bash
cd client
pnpm build
```

Preview the production build:
```bash
cd client
pnpm preview
```

Run tests:
```bash
# from repo root or client depending on setup
pnpm test
```

## What I added
- `README.md` (this file)
- `LICENSE` (MIT)
- `.env.example` (root and `client/.env.example`)
- `.github/workflows/ci.yml` (basic GitHub Actions workflow)
- `client/public/manifest.webmanifest` (simple PWA manifest)
- Basic vitest smoke test at `client/src/__tests__/shared.const.test.ts`
- Updated `package.json` scripts (see `scripts` section)
- A small `docs/` pointer and `.editorconfig` (optional)

## Project layout
- `client/` — React + TypeScript + Vite frontend (main app)
- `server/` — minimal server code (if used)
- `dist/` — built frontend artifacts (if built)
- `template.json`, `components.json` — project metadata

## Environment variables
See `.env.example` files for examples. Do not commit real secrets.

## Contributing
PRs welcome. Please run `pnpm test` and linting before submitting.

## License
MIT — see LICENSE file
