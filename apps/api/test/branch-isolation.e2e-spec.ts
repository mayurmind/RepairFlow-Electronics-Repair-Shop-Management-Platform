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

describe("Branch Isolation Workflow (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const branch1Id = randomUUID();
  const branch2Id = randomUUID();
  const branch3InactiveId = randomUUID();

  const actorUserId = randomUUID();

  // We will dynamically change this in tests if needed
  let currentActorBranches = [{ id: branch1Id }];

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

    // Seed user
    await prisma.user.create({
      data: {
        id: actorUserId,
        email: "test@test.com" + Date.now(),
        passwordHash: "hashedPassword123",
        fullName: "Test E2E User",
        role: "FRONT_DESK",
      },
    });

    // Seed branches
    await prisma.branch.createMany({
      data: [
        {
          id: branch1Id,
          name: "Branch 1",
          code: "B1" + Date.now(),
          phone: "1111111111",
          email: "b1@test.com",
          addressLine1: "123 Main St",
          city: "City",
          state: "State",
          postalCode: "12345",
          country: "Country",
          isActive: true,
        },
        {
          id: branch2Id,
          name: "Branch 2",
          code: "B2" + Date.now(),
          phone: "2222222222",
          email: "b2@test.com",
          addressLine1: "456 Main St",
          city: "City",
          state: "State",
          postalCode: "12345",
          country: "Country",
          isActive: true,
        },
        {
          id: branch3InactiveId,
          name: "Branch 3 Inactive",
          code: "B3" + Date.now(),
          phone: "3333333333",
          email: "b3@test.com",
          addressLine1: "789 Main St",
          city: "City",
          state: "State",
          postalCode: "12345",
          country: "Country",
          isActive: false,
        },
      ],
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.device.deleteMany({
      where: { branchId: { in: [branch1Id, branch2Id, branch3InactiveId] } },
    });
    await prisma.customer.deleteMany({
      where: { branchId: { in: [branch1Id, branch2Id, branch3InactiveId] } },
    });
    await prisma.branch.deleteMany({
      where: { id: { in: [branch1Id, branch2Id, branch3InactiveId] } },
    });
    await prisma.user.deleteMany({
      where: { id: actorUserId },
    });
    await app.close();
  });

  let customer1Id: string;
  let customer2Id: string;

  describe("Customer Branch Isolation", () => {
    it("should reject customer creation if actor lacks access to branch", async () => {
      const res = await request(app.getHttpServer()).post("/customers").send({
        branchId: branch2Id, // User only has access to branch-1
        fullName: "Test User 2",
        phone: "+12000000002",
      });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain("access");
    });

    it("should allow customer creation if actor has access to branch", async () => {
      const res = await request(app.getHttpServer()).post("/customers").send({
        branchId: branch1Id,
        fullName: "Test User 1",
        phone: "+12000000001",
        email: "c1@test.com",
      });

      expect(res.status).toBe(201);
      customer1Id = res.body.data.id;
    });

    it("should reject duplicate phone number within the same branch", async () => {
      const res = await request(app.getHttpServer()).post("/customers").send({
        branchId: branch1Id,
        fullName: "Test User 1 Duplicate",
        phone: "+12000000001", // duplicate
      });

      expect(res.status).toBe(409);
    });

    it("should allow same phone number in a different branch", async () => {
      // Temporarily give access to branch2
      currentActorBranches = [{ id: branch2Id }];

      const res = await request(app.getHttpServer()).post("/customers").send({
        branchId: branch2Id,
        fullName: "Test User 2",
        phone: "+12000000001", // same phone, different branch
        email: "c2@test.com",
      });

      expect(res.status).toBe(201);
      customer2Id = res.body.data.id;

      // Revert access
      currentActorBranches = [{ id: branch1Id }];
    });

    it("should reject fetching a customer from a different branch", async () => {
      const res = await request(app.getHttpServer()).get(
        `/customers/${customer2Id}`,
      );
      expect(res.status).toBe(404); // Database scoped findFirst returns 404
    });

    it("should reject fetching customer with malformed UUID", async () => {
      const res = await request(app.getHttpServer()).get(
        `/customers/not-a-uuid`,
      );
      expect(res.status).toBe(400);
    });

    it("should reject updating a customer from a different branch", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/customers/${customer2Id}`)
        .send({
          fullName: "Hacked Name",
        });
      expect(res.status).toBe(404);
    });

    it("should reject customer creation if branch is inactive", async () => {
      // Temporarily give access to inactive branch
      currentActorBranches = [{ id: branch3InactiveId }];

      const res = await request(app.getHttpServer()).post("/customers").send({
        branchId: branch3InactiveId,
        fullName: "Test User 3 Inactive",
        phone: "+12000000003",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("inactive");

      currentActorBranches = [{ id: branch1Id }];
    });

    it("should reject duplicate email within the same branch", async () => {
      const res = await request(app.getHttpServer()).post("/customers").send({
        branchId: branch1Id,
        fullName: "Test User 1 Duplicate Email",
        phone: "+12000009999",
        email: "c1@test.com", // Duplicate email
      });

      expect(res.status).toBe(409);
    });
  });

  describe("Device Branch Isolation", () => {
    it("should reject creating a device for a customer outside the actor's branch", async () => {
      const res = await request(app.getHttpServer())
        .post(`/customers/${customer2Id}/devices`)
        .send({
          category: "Mobile phone",
          brand: "Apple",
          model: "iPhone 13",
        });

      expect(res.status).toBe(404);
    });

    it("should allow creating a device in actor's branch", async () => {
      const res = await request(app.getHttpServer())
        .post(`/customers/${customer1Id}/devices`)
        .send({
          category: "Mobile phone",
          brand: "Apple",
          model: "iPhone 13",
          serialNumber: "SN123",
          imeiNumber: "123456789012345",
        });

      if (res.status !== 201) console.log(res.body);
      expect(res.status).toBe(201);
    });

    it("should reject duplicate serial number in the same branch", async () => {
      const res = await request(app.getHttpServer())
        .post(`/customers/${customer1Id}/devices`)
        .send({
          category: "Mobile phone",
          brand: "Apple",
          model: "iPhone 14",
          serialNumber: "SN123",
        });

      expect(res.status).toBe(409);
    });

    it("should reject fetching a device from a different branch", async () => {
      // Temporarily give access to branch2, create a device
      currentActorBranches = [{ id: branch2Id }];
      const resCreate = await request(app.getHttpServer())
        .post(`/customers/${customer2Id}/devices`)
        .send({
          category: "Laptop",
          brand: "Dell",
          model: "XPS",
        });
      const device2Id = resCreate.body.data.id;

      // Revert access to branch1
      currentActorBranches = [{ id: branch1Id }];

      const resFetch = await request(app.getHttpServer()).get(
        `/devices/${device2Id}`,
      );
      expect(resFetch.status).toBe(404);
    });

    it("should reject duplicate IMEI within the same branch", async () => {
      const res = await request(app.getHttpServer())
        .post(`/customers/${customer1Id}/devices`)
        .send({
          category: "Mobile phone",
          brand: "Apple",
          model: "iPhone 15",
          imeiNumber: "123456789012345", // duplicate
        });

      expect(res.status).toBe(409);
    });
  });

  describe("Repair Ticket Isolation", () => {
    it("should reject ticket creation when customer and device belong to a different branch", async () => {
      // Actor has access to branch 1, but attempts to create a ticket in branch 1
      // using customer and device from branch 2

      // First get a device ID from branch 2
      currentActorBranches = [{ id: branch2Id }];
      const resCreate = await request(app.getHttpServer())
        .post(`/customers/${customer2Id}/devices`)
        .send({
          category: "Mobile phone",
          brand: "Samsung",
          model: "S23",
        });
      const device2Id = resCreate.body.data.id;

      // Revert to branch 1
      currentActorBranches = [{ id: branch1Id }];

      const res = await request(app.getHttpServer())
        .post(`/repair-tickets`)
        .send({
          branchId: branch1Id,
          customerId: customer2Id,
          deviceId: device2Id,
          priority: "NORMAL",
          reportedProblem: "Screen broken",
        });

      expect(res.status).toBe(404); // Should not expose them across branches
    });

    it("should restrict customer repair history to the authorized branch", async () => {
      const res = await request(app.getHttpServer()).get(
        `/customers/${customer2Id}/repair-history`,
      );
      expect(res.status).toBe(404);
    });

    it("should restrict device repair history to the authorized branch", async () => {
      // We need a device ID from branch 2
      currentActorBranches = [{ id: branch2Id }];
      const resCreate = await request(app.getHttpServer())
        .post(`/customers/${customer2Id}/devices`)
        .send({
          category: "Laptop",
          brand: "Asus",
          model: "Zenbook",
        });
      const device2Id = resCreate.body.data.id;

      currentActorBranches = [{ id: branch1Id }];
      const res = await request(app.getHttpServer()).get(
        `/devices/${device2Id}/repair-history`,
      );
      expect(res.status).toBe(404);
    });
  });

  describe("List Isolation", () => {
    it("should only list customers in the accessible branch", async () => {
      const res = await request(app.getHttpServer()).get("/customers");
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      const fromBranch2 = res.body.data.filter(
        (c: any) => c.branchId === branch2Id,
      );
      expect(fromBranch2.length).toBe(0);
    });

    it("should only list devices in the accessible branch", async () => {
      const res = await request(app.getHttpServer()).get("/devices");
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      const fromBranch2 = res.body.data.filter(
        (d: any) => d.branchId === branch2Id,
      );
      expect(fromBranch2.length).toBe(0);
    });
  });
});
