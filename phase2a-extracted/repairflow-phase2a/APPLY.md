# Apply the RepairFlow Phase 2A implementation pack

This pack was prepared from the public `main` branch inspection. Apply it only on the approved feature branch.

```bash
git checkout main
git pull origin main
git checkout -b feature/phase2-core-workflow

# From the extracted pack directory, copy files over the repository root.
cp -R apps/api/src/* <REPOSITORY>/apps/api/src/
cp docs/phase2a-gap-analysis.md <REPOSITORY>/docs/

cd <REPOSITORY>
pnpm install --frozen-lockfile
pnpm build:packages
pnpm --filter api exec prisma generate
pnpm --filter api exec prisma validate
pnpm --filter api lint
pnpm --filter api test:ci
pnpm --filter web test
pnpm build
pnpm --filter e2e test
```

Before committing, inspect the diff and ensure no unrelated changes are included.

Suggested Phase 2A commit:

```bash
git add apps/api/src/common apps/api/src/auth apps/api/src/customers apps/api/src/devices apps/api/src/repair-tickets docs/phase2a-gap-analysis.md
git commit -m "refactor(api): add typed core workflow DTOs"
```

Do not merge into `main`. Stop for Boss review after the validation output is recorded.
