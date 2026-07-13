# Security Checklist — RepairFlow

This document presents the security controls, validation pipes, and permission guards implemented within the **RepairFlow** platform.

---

## 1. Authentication & Session Security

- [x] **Argon2id Password Hashing**: Passwords are encrypted on creation and verification using Argon2id with high memory/iteration parameters. Raw passwords are never stored.
- [x] **Short-Lived Access Tokens**: JWT access tokens carry a 15-minute expiration window to limit token intercept risks.
- [x] **Rotating Refresh Tokens**: Refresh sessions rotate on every call. If an old refresh token is reused, all active sessions for that user are revoked.
- [x] **HttpOnly Cookies**: Refresh tokens are returned in cookies with `HttpOnly`, `Secure` (production), and `SameSite=Lax` configurations.
- [x] **Account Lockout Policy**: User accounts temporarily lock for 15 minutes after 5 consecutive failed login attempts to block brute-force attacks.
- [x] **Decoupled Reset Tokens**: Password reset requests generate a secure random token; only the SHA-256 hash of the token is saved in the database with a 1-hour expiry.

---

## 2. Authorization & Branch Boundaries

- [x] **Role-Based Access Control (RBAC)**: Custom `@Roles` decorator and `RolesGuard` verify user scopes (SYSTEM_ADMIN, OWNER, BRANCH_MANAGER, FRONT_DESK, TECHNICIAN).
- [x] **Branch Isolation Guard**: The `BranchAccessGuard` ensures staff cannot query or write data for branches other than their assigned locations.
- [x] **Customer Portal Token Isolation**: Customers track repairs via random tokens. The backend validates token hashes and yields only public attributes (no internal tech notes or other customer profiles).
- [x] **Workbench Assignment Verification**: Technicians are restricted to editing tickets assigned to them in their authorized branches.

---

## 3. Input & Network Protections

- [x] **Type-Safe Validation Pipes**: NestJS `ValidationPipe` utilizes `class-validator` and `class-transformer` on incoming DTOs. Unexpected parameters are stripped.
- [x] **Zod Client/Server Schema Sync**: Shared `@repairflow/validation` package ensures identical rules are verified on both the React client forms and NestJS controllers.
- [x] **SQL Injection Defense**: Prisma ORM executes parameterized queries, preventing SQL injection exploits. Raw queries are avoided.
- [x] **HTTP Security Headers (Helmet)**: Helmet middleware sets secure headers (XSS Filter, HSTS, Frame Options, Content Security Policy).
- [x] **Throttling & Rate Limiting**: Global API throttling is set to 100 requests per minute. Public customer endpoints carry tighter limits (15 requests/min) to prevent token scanning.
