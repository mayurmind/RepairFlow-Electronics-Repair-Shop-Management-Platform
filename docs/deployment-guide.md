# Deployment Guide — RepairFlow

This guide provides instructions to compile, migrate, and deploy the **RepairFlow** platform to production environments.

---

## 1. Hosting Architecture

- **Frontend**: Hosted on **Vercel** (Next.js App Router).
- **Backend API**: Hosted on **Render** or **Railway** (Node.js/NestJS service).
- **Database**: Managed **PostgreSQL** instance (e.g. Supabase, Neon, or Render PostgreSQL).
- **Object Storage**: S3-compatible service or Cloudinary for intake photos.
- **Monitoring**: **Sentry** for crash logs and performance insights.

---

## 2. Backend Deployment (Render)

1. **Create Web Service**:
   - Link your repository.
   - Environment: `Node`.
   - Region: Select nearest region.
   - Build Command:
     ```bash
     pnpm install && pnpm --filter @repairflow/typescript-config build && pnpm --filter @repairflow/shared-types build && pnpm --filter @repairflow/validation build && pnpm --filter api build
     ```
   - Start Command:
     ```bash
     pnpm --filter api start:prod
     ```

2. **Environment Variables**:
   Add environment variables listed in `.env.example`. Make sure `NODE_ENV` is set to `production`, and configure secure secrets for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.

---

## 3. Database Configurations & Migrations

Prisma requires database schema sync during build. Add a post-build command on Render, or execute the migration pipeline manually:

### Execute Migrations:

```bash
# Run migrations in production
pnpm --filter api exec prisma migrate deploy
```

### Seeding:

```bash
# Optional: Seed initial System Admin and Owner (never use default credentials in production!)
pnpm --filter api exec prisma db seed
```

---

## 4. Frontend Deployment (Vercel)

1. **Import Project**:
   - Link repository in Vercel.
   - Select `apps/web` as the root directory of the build, or configure the project root.
   - Framework Preset: `Next.js`.

2. **Build Settings**:
   - Build Command: `next build` (or `pnpm --filter web build` if deploying from monorepo root).
   - Install Command: `pnpm install`.

3. **Configure Variables**:
   - `NEXT_PUBLIC_API_BASE_URL`: URL of your live NestJS service (e.g., `https://api.repairflow.com/api/v1`).

---

## 5. Backup & Disaster Recovery

### 1. Database Backups

- **Daily Backups**: Enable automated daily snapshots on Neon/Supabase with a 14-day retention period.
- **Manual Backup Command**:
  ```bash
  pg_dump -U postgres -h <db_host> -d repairflow > backup_file.sql
  ```

### 2. Recovery Procedure

To restore a database state:

```bash
psql -U postgres -h <db_host> -d repairflow < backup_file.sql
```
