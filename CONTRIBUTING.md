# Contributing to OpenSkills Recorder

Thanks for your interest in contributing. This project is a pnpm + Turbo monorepo — a few minutes of setup goes a long way.

## Prerequisites

- **Node.js 22+**
- **pnpm 9** — `corepack enable && corepack prepare pnpm@9.15.0 --activate`
- **Playwright Chromium** — `npx playwright install chromium`

## Local development

```bash
git clone <repo-url>
cd openskills-recorder
cp .env.example .env
chmod +x scripts/dev.sh
./scripts/dev.sh
```

| Service   | URL |
|-----------|-----|
| Web UI    | http://localhost:3000 |
| Demo app  | http://localhost:4321 |
| Electron  | Opens with `pnpm dev` (optional shell) |

### Manual commands

```bash
pnpm install
pnpm db:generate && pnpm db:push
pnpm build:packages
pnpm dev
```

## Before opening a PR

1. **Unit tests:** `pnpm test`
2. **E2E tests:** `pnpm test:e2e` (starts demo app + web automatically)
3. **Typecheck:** `pnpm typecheck` (optional but recommended)
4. **Web build:** `pnpm --filter @openskills/web build` (if you touched the UI or API)

## Monorepo map

| Path | Purpose |
|------|---------|
| `apps/web` | Next.js UI + API routes |
| `apps/desktop` | Electron shell (ESM main + CJS preload) |
| `packages/core` | Zod schemas, paths, logger, skill diff |
| `packages/db` | Prisma + SQLite |
| `packages/recorder` | Browser capture + selectors |
| `packages/synthesis` | Heuristic skill synthesis + markdown |
| `packages/replay` | Deterministic Playwright executor |
| `packages/ai` | Optional LLM metadata enhancement |
| `fixtures/demo-app` | Static demo site for dev and E2E |

## Good first contributions

- Improve selector heuristics in `packages/recorder/src/selectors.ts`
- Add synthesis edge-case tests in `packages/synthesis/src/heuristic.test.ts`
- Extend `fixtures/demo-app` with new E2E scenarios
- Fix replay reliability for dynamic SPAs
- Documentation, demo assets, and example skills

## Code style

- Match existing TypeScript patterns in the file you edit
- Keep changes focused — one concern per PR
- Prefer extending existing packages over new abstractions
- Do not commit `.env`, database files, or `openskills-data/`

## Reporting bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.yml). Include:

- OS and Node version
- Recording scope (`tab` / `session`)
- Target URL
- Steps to reproduce
- Relevant logs from `~/.openskills/logs/` if applicable

## Feature proposals

Open an issue before large features — the project is v0.1.0 and APIs may still evolve.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
