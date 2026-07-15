import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe, BadRequestException, ExecutionContext } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { JwtAuthGuard } from "../src/auth/guards/jwt-auth.guard";
import { BranchAccessGuard } from "../src/common/guards/branch.guard";
import { RolesGuard } from "../src/common/guards/role.guard";

describe("Core Workflow (e2e)", () => {
  let app: INestApplication;
  
  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    repairTicket: {
      findFirst: jest.fn(),
    },
    customer: {
      create: jest.fn().mockResolvedValue({ id: "e2c3407a-42c2-487f-be9d-473d09a2b6e1" }),
      update: jest.fn().mockResolvedValue({ id: "e2c3407a-42c2-487f-be9d-473d09a2b6e1" }),
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
          req.user = { id: "user-1", role: "SYSTEM_ADMIN", branches: [{ id: "branch-1" }] };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    
    // Exact same ValidationPipe setup as main.ts
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

  describe("ValidationPipe (unknown properties)", () => {
    it("should reject customer creation with unknown properties", async () => {
      const res = await request(app.getHttpServer())
        .post("/customers")
        .send({
          fullName: "Test User",
          phone: "+1234567890",
          unknownField: "should be rejected"
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
      expect(res.body.details[0].field).toBe("unknownField");
    });
  });

  describe("ParseUUIDPipe (malformed route IDs)", () => {
    it("should reject malformed UUIDs with 400 Bad Request", async () => {
      const res = await request(app.getHttpServer())
        .get("/customers/not-a-uuid");

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Validation failed (uuid is expected)");
    });
  });
  
  describe("PATCH empty object rejection", () => {
    it("should reject an empty PATCH request for customers", async () => {
      const res = await request(app.getHttpServer())
        .patch("/customers/e2c3407a-42c2-487f-be9d-473d09a2b6e1")
        .send({});
        
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Request body cannot be empty");
    });
  });
});
