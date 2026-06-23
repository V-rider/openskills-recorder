# Example skill: Expense Demo

Pre-built skill for the local demo app at http://localhost:4321.

## Import via UI

1. Start dev: `./scripts/dev.sh`
2. Open http://localhost:3000/skills
3. Click **Import / Export** → choose `fixtures/expense-skill.zip` or `fixtures/expense-skill.json`
4. Open the imported skill → fill parameters → **Run Replay**

## Import via API

```bash
curl -X POST http://localhost:3000/api/skills/import \
  -H "Content-Type: application/json" \
  -d @fixtures/expense-skill.json
```

## Regenerate ZIP

```bash
node scripts/package-example-skill.mjs
```

## Parameters

| Name | Example | Description |
|------|---------|-------------|
| `email` | `test@example.com` | Expense submitter email |
| `amount` | `42.50` | Expense amount |
