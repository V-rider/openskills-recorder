# Launch copy — OpenSkills Recorder v0.1.0

Ready-to-paste descriptions for publishing the repo. Update the GitHub URL after `scripts/publish-github.sh`.

---

## GitHub About (short)

Local-first browser workflow recorder → inspectable skill.json → deterministic Playwright replay. MIT.

---

## X / Twitter

**Option A (280 chars)**

> OpenSkills Recorder (OSS): record a browser workflow once → versioned skill.json → replay with inputs via Playwright. Local-first, SQLite, optional Ollama for metadata. Not a black-box agent — the skill is the artifact. v0.1.0 MIT.
>
> https://github.com/YOUR_USER/openskills-recorder

**Option B (thread hook)**

> We built the missing layer between brittle scripts and opaque AI agents: record once, inspect everything, replay deterministically.

---

## Hacker News

**Title options**

1. Show HN: OpenSkills Recorder – record browser workflows as inspectable, replayable skills
2. Show HN: Local-first skill recorder for browser automation (Playwright, not black-box agents)

**Post body**

OpenSkills Recorder is an open-source, local-first tool to:

1. Record a browser workflow (Playwright + injected capture)
2. Synthesize a versioned `skill.json` + `skill.md`
3. Edit steps, selectors, and parameters in the UI
4. Replay with different inputs — deterministic execution, optional LLM metadata polish only

Why: ad-hoc scripts break silently; black-box agents are hard to debug. This targets repeatable ops workflows where **the artifact is the product**.

Stack: Next.js 15, Electron (optional), SQLite/Prisma, Playwright, TypeScript monorepo.

Try it: clone → `cp .env.example .env` → `./scripts/dev.sh` → import `fixtures/expense-skill.zip` for instant replay demo.

MIT license. Feedback and contributions welcome.

---

## Reddit

**Subreddits:** r/selfhosted, r/automation, r/webdev, r/opensource

**Title:** Open-source local-first browser workflow recorder — saves inspectable skills, replays with Playwright (not a black-box agent)

**Body:** (same as HN, slightly informal tone OK)

---

## Product Hunt tagline

Record browser workflows once. Ship inspectable skills. Replay with confidence.

---

## After publish checklist

- [ ] Replace `YOUR_USER` in this file and README CI badge
- [ ] Add GitHub topics: `browser-automation`, `playwright`, `workflow-recording`, `local-first`, `typescript`
- [ ] Pin README demo GIF in repo social preview (Settings → Social preview)
- [ ] Post Show HN / X with `docs/assets/hero-demo.gif` attached
- [ ] Watch Actions tab for first CI run on `main`
