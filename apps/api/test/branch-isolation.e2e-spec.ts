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

describe("Branch Isolation Workflow (e2e)", () => {
  let app: INestApplication;

  const mockCustomer = {
    id: "e2c3407a-42c2-487f-be9d-473d09a2b6e1",
    branchId: "b0000000-0000-0000-0000-000000000002",
    deletedAt: null,
  };
  const mockPrismaService: any = {
    $transaction: jest.fn().mockImplementation(async (cb) => {
      return cb(mockPrismaService);
    }),
    customer: {
      create: jest.fn().mockResolvedValue(mockCustomer),
      findUnique: jest.fn().mockImplementation((args: any) => {
        if (args?.where?.id === mockCustomer.id) return mockCustomer;
        return null;
      }),
      findFirst: jest.fn().mockImplementation((args: any) => {
        console.log("findFirst called with:", args);
        if (args?.where?.id === mockCustomer.id) return mockCustomer;
        return null;
      }),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    device: {
      create: jest.fn().mockResolvedValue({ id: "d0000000-0000-0000-0000-000000000001", branchId: "b0000000-0000-0000-0000-000000000002" }),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === "d0000000-0000-0000-0000-000000000001") {
          return { id: "d0000000-0000-0000-0000-000000000001", branchId: "b0000000-0000-0000-0000-000000000002", customerId: mockCustomer.id };
        }
        return null;
      }),
    },
    repairTicket: {
      count: jest.fn().mockResolvedValue(0),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: "audit-1" }),
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = {
            id: "user-1",
            role: "FRONT_DESK",
            branches: [{ id: "b0000000-0000-0000-0000-000000000001" }],
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
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Customer Branch Isolation", () => {
    it("should reject customer creation if actor lacks access to branch", async () => {
      const res = await request(app.getHttpServer()).post("/customers").send({
        branchId: "b0000000-0000-0000-0000-000000000002", // User only has access to branch-1
        fullName: "Test User",
        phone: "+1234567890",
      });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("You do not have access to create a customer in this branch.");
    });

    it("should allow customer creation if actor has access to branch", async () => {
      const res = await request(app.getHttpServer()).post("/customers").send({
        branchId: "b0000000-0000-0000-0000-000000000001",
        fullName: "Test User",
        phone: "+1234567891",
      });

      // It will either succeed (201) or hit our mocked DB duplicate check, but shouldn't be 403
      expect(res.status).not.toBe(403);
    });

    it("should reject fetching a customer from a different branch", async () => {
      // mockCustomer is in branch-2, actor is in branch-1
      const res = await request(app.getHttpServer()).get(`/customers/${mockCustomer.id}`);
      expect(res.status).toBe(403);
      expect(res.body.message).toBe("You do not have access to this customer.");
    });
  });

  describe("Device Branch Isolation", () => {
    it("should reject creating a device for a customer outside the actor's branch", async () => {
      // Customer is in branch-2, actor is in branch-1
      const res = await request(app.getHttpServer()).post(`/customers/${mockCustomer.id}/devices`).send({
        category: "Mobile phone",
        brand: "Apple",
        model: "iPhone 13",
      });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("You do not have access to this customer.");
    });
  });
});
