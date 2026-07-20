/**
 * Customer Branch Creation Contract (e2e)
 *
 * Verifies the five branch validation cases for POST /customers:
 *   1. Missing branchId           → 400 (schema validation)
 *   2. Malformed UUID branchId    → 400 (schema validation)
 *   3. Foreign branchId           → 403 (actor not a member)
 *   4. Inactive branchId          → 400 (branch.isActive = false)
 *   5. Valid authorized branchId  → 201 (happy path)
 *
 * Uses a real database — requires DATABASE_URL to be set (e.g. repairflow_test).
 */
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  BadRequestException,
  ExecutionContext,
} from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { JwtAuthGuard } from "../src/auth/guards/jwt-auth.guard";
import { randomUUID } from "crypto";

describe("Customer Branch Creation Contract (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const actorUserId = randomUUID();
  const authorizedBranchId = randomUUID();
  const foreignBranchId = randomUUID();
  const inactiveBranchId = randomUUID();

  // Mutable so individual tests can switch branch membership.
  let currentActorBranches: { id: string }[] = [{ id: authorizedBranchId }];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = {
            id: actorUserId,
            role: "FRONT_DESK",
            branches: currentActorBranches,
          };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        exceptionFactory: (errors) => {
          const details = errors.map((err) => ({
            field: err.property,
            constraints: Object.values(err.constraints || {}),
          }));
          return new BadRequestException({
            code: "VALIDATION_ERROR",
            message: "The submitted data is invalid.",
            details,
          });
        },
      }),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Seed actor user
    await prisma.user.create({
      data: {
        id: actorUserId,
        email: `contract-test-${Date.now()}@test.com`,
        passwordHash: "hashedPassword",
        fullName: "Contract Test User",
        role: "FRONT_DESK",
      },
    });

    // Seed branches
    const ts = Date.now();
    await prisma.branch.createMany({
      data: [
        {
          id: authorizedBranchId,
          name: "Authorized Branch",
          code: `AUTH${ts}`,
          phone: "1000000001",
          email: `auth${ts}@test.com`,
          addressLine1: "1 Auth St",
          city: "City",
          state: "State",
          postalCode: "00001",
          country: "Country",
          isActive: true,
        },
        {
          id: foreignBranchId,
          name: "Foreign Branch",
          code: `FORB${ts}`,
          phone: "2000000002",
          email: `for${ts}@test.com`,
          addressLine1: "2 Foreign St",
          city: "City",
          state: "State",
          postalCode: "00002",
          country: "Country",
          isActive: true,
        },
        {
          id: inactiveBranchId,
          name: "Inactive Branch",
          code: `INAB${ts}`,
          phone: "3000000003",
          email: `ina${ts}@test.com`,
          addressLine1: "3 Inactive St",
          city: "City",
          state: "State",
          postalCode: "00003",
          country: "Country",
          isActive: false,
        },
      ],
    });
  });

  afterAll(async () => {
    // AuditLog has FK to both User and Branch — must be cleared first.
    await prisma.auditLog.deleteMany({
      where: { actorUserId },
    });
    await prisma.auditLog.deleteMany({
      where: {
        branchId: {
          in: [authorizedBranchId, foreignBranchId, inactiveBranchId],
        },
      },
    });
    await prisma.customer.deleteMany({
      where: {
        branchId: {
          in: [authorizedBranchId, foreignBranchId, inactiveBranchId],
        },
      },
    });
    await prisma.branch.deleteMany({
      where: {
        id: { in: [authorizedBranchId, foreignBranchId, inactiveBranchId] },
      },
    });
    await prisma.user.deleteMany({ where: { id: actorUserId } });
    await app.close();
  });

  it("rejects POST /customers when branchId is missing → 400", async () => {
    const res = await request(app.getHttpServer()).post("/customers").send({
      fullName: "Missing Branch Customer",
      phone: "+10000000001",
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
    const fields = res.body.details.map((d: any) => d.field);
    expect(fields).toContain("branchId");
  });

  it("rejects POST /customers when branchId is a malformed UUID → 400", async () => {
    const res = await request(app.getHttpServer()).post("/customers").send({
      branchId: "not-a-uuid",
      fullName: "Malformed UUID Customer",
      phone: "+10000000002",
    });

    expect(res.status).toBe(400);
  });

  it("rejects POST /customers when branchId belongs to a foreign branch → 403", async () => {
    // Actor only has access to authorizedBranchId, not foreignBranchId.
    const res = await request(app.getHttpServer()).post("/customers").send({
      branchId: foreignBranchId,
      fullName: "Foreign Branch Customer",
      phone: "+10000000003",
    });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/access/i);
  });

  it("rejects POST /customers when branchId is inactive → 400", async () => {
    // Give actor access to the inactive branch so the guard passes.
    currentActorBranches = [{ id: inactiveBranchId }];

    const res = await request(app.getHttpServer()).post("/customers").send({
      branchId: inactiveBranchId,
      fullName: "Inactive Branch Customer",
      phone: "+10000000004",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/inactive/i);

    // Reset actor branches.
    currentActorBranches = [{ id: authorizedBranchId }];
  });

  it("accepts POST /customers with a valid authorized active branchId → 201", async () => {
    const res = await request(app.getHttpServer())
      .post("/customers")
      .send({
        branchId: authorizedBranchId,
        fullName: "Valid Branch Customer",
        phone: "+10000000005",
        email: `valid${Date.now()}@test.com`,
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      fullName: "Valid Branch Customer",
      branchId: authorizedBranchId,
    });
  });
});
