# Demo recording script

Use this script when capturing the hero GIF or giving a live demo. Target duration: **30–60 seconds**.

## Prerequisites

- `./scripts/dev.sh` running (web `:3000`, demo `:4321`)
- Browser window at http://localhost:3000

## Steps

### Part 1 — Record a workflow (~20s)

1. Click **New Recording**
2. Fill in:
   - **Name:** Expense Demo
   - **Intent:** Submit expense reimbursement form
   - **Start URL:** `http://localhost:4321`
   - **Scope:** Browser session
3. Click **Start Recording** — Chromium opens
4. In the demo app:
   - Email: `demo@company.com`
   - Amount: `42.50`
   - Category: Travel
   - Click **Submit expense**
5. Return to OpenSkills UI → **Stop & Synthesize**
6. You land on the skill detail page

### Part 2 — Edit and replay (~15s)

1. Show the **step timeline** and synthesized parameters
2. Change **email** to `replay@example.com`
3. Click **Run Replay**
4. Expand the **replay console** — show green step logs

### Part 3 — Export (optional, ~5s)

1. Click **Import / Export** → export ZIP
2. Mention: skills are portable JSON + markdown artifacts

## Recording tips (macOS)

- **GIF:** QuickTime or [Kap](https://getkap.co/) → trim to 30s → export GIF
- **Resolution:** 1280×800 browser window, hide unrelated desktop clutter
- **Cursor:** Move deliberately; pause 1s on skill editor and replay success

## Automated captures

For static screenshots and a rough demo video:

```bash
# With pnpm dev running:
node scripts/capture-demo-assets.mjs
```

Outputs land in `docs/assets/`:

| File | Content |
|------|---------|
| `dashboard.png` | Home page with recent recordings/skills |
| `skill-editor.png` | Skill detail (imported expense demo) |
| `demo-flow.webm` | Short navigational clip |

Convert WebM to GIF (optional):

```bash
ffmpeg -i docs/assets/demo-flow.webm -vf "fps=10,scale=1280:-1" docs/assets/hero-demo.gif
```
