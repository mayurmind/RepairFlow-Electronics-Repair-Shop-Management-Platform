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

describe("Security Matrix (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const branchId = randomUUID();
  const techAssignedId = randomUUID();
  const techUnassignedId = randomUUID();
  const frontDeskId = randomUUID();

  let currentActorRole = "FRONT_DESK";
  let currentActorId = frontDeskId;

  let customerId: string;
  let deviceId: string;
  let ticketId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = {
            id: currentActorId,
            role: currentActorRole,
            branches: [{ id: branchId }],
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
    await prisma.user.deleteMany({
      where: { email: { in: ["fd@s.com", "ta@s.com", "tu@s.com"] } },
    });

    await prisma.user.createMany({
      data: [
        { id: frontDeskId, email: "fd@s.com", passwordHash: "h", fullName: "FD", role: "FRONT_DESK", status: "ACTIVE" },
        { id: techAssignedId, email: "ta@s.com", passwordHash: "h", fullName: "TA", role: "TECHNICIAN", status: "ACTIVE" },
        { id: techUnassignedId, email: "tu@s.com", passwordHash: "h", fullName: "TU", role: "TECHNICIAN", status: "ACTIVE" },
      ],
    });

    await prisma.branch.create({
      data: {
        id: branchId,
        name: "Security Branch",
        code: "SEC1",
        phone: "000000000",
        email: "sec@s.com",
        addressLine1: "123 Sec St",
        city: "City",
        state: "State",
        postalCode: "12345",
        country: "Country",
        isActive: true,
      },
    });

    // Map users to branch
    await prisma.userBranch.createMany({
      data: [
        { userId: frontDeskId, branchId },
        { userId: techAssignedId, branchId },
        { userId: techUnassignedId, branchId },
      ],
    });

    // Create Customer
    const customer = await prisma.customer.create({
      data: {
        branchId,
        fullName: "Security Cust",
        phone: "+1112223334",
      }
    });
    customerId = customer.id;

    // Create Device
    const device = await prisma.device.create({
      data: {
        branchId,
        customerId,
        category: "Mobile",
        brand: "Sec",
        model: "Phone",
      }
    });
    deviceId = device.id;
  });

  afterAll(async () => {
    await prisma.diagnosis.deleteMany({});
    await prisma.ticketStatusHistory.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.technicianAssignmentHistory.deleteMany({});
    await prisma.$executeRaw`DELETE FROM "Estimate" WHERE "repairTicketId" IN (SELECT id FROM "RepairTicket" WHERE "branchId" = ${branchId})`;
    await prisma.repairTicket.deleteMany({ where: { branchId } });
    await prisma.device.deleteMany({ where: { branchId } });
    await prisma.customer.deleteMany({ where: { branchId } });
    await prisma.userBranch.deleteMany({ where: { branchId } });
    await prisma.branch.deleteMany({ where: { id: branchId } });
    await prisma.user.deleteMany({
      where: { id: { in: [frontDeskId, techAssignedId, techUnassignedId] } }
    });
    await app.close();
  });

  it("should create ticket successfully", async () => {
    currentActorId = frontDeskId;
    currentActorRole = "FRONT_DESK";

    const res = await request(app.getHttpServer())
      .post("/repair-tickets")
      .send({
        branchId,
        customerId,
        deviceId,
        priority: "NORMAL",
        reportedProblem: "Test Issue",
      });
    expect(res.status).toBe(201);
    ticketId = res.body.data.id;
  });

  it("should assign technician", async () => {
    const res = await request(app.getHttpServer())
      .post(`/repair-tickets/${ticketId}/assign`)
      .send({ technicianId: techAssignedId });
    expect(res.status).toBe(201);
  });

  it("front-desk should be denied setting technical status", async () => {
    currentActorId = frontDeskId;
    currentActorRole = "FRONT_DESK";
    const res = await request(app.getHttpServer())
      .post(`/repair-tickets/${ticketId}/status`)
      .send({ status: "DIAGNOSING" });
    expect(res.status).toBe(403);
    expect(res.body.message).toContain("not authorized");
  });

  it("unassigned technician should be denied diagnosis", async () => {
    currentActorId = techUnassignedId;
    currentActorRole = "TECHNICIAN";
    const res = await request(app.getHttpServer())
      .post(`/repair-tickets/${ticketId}/diagnosis`)
      .send({ 
        repairFeasibility: "REPAIRABLE", 
        faultCategory: "Hardware",
        diagnosticFindings: "Screen broken",
        recommendedRepair: "Replace screen",
        internalNotes: "Unassigned" 
      });
    expect(res.status).toBe(403);
    expect(res.body.message).toContain("not assigned");
  });

  it("assigned technician should successfully set DIAGNOSING", async () => {
    currentActorId = techAssignedId;
    currentActorRole = "TECHNICIAN";
    const res = await request(app.getHttpServer())
      .post(`/repair-tickets/${ticketId}/status`)
      .send({ status: "DIAGNOSING" });
    expect(res.status).toBe(201);
  });

  it("assigned technician should successfully add diagnosis", async () => {
    currentActorId = techAssignedId;
    currentActorRole = "TECHNICIAN";
    const res = await request(app.getHttpServer())
      .post(`/repair-tickets/${ticketId}/diagnosis`)
      .send({ 
        repairFeasibility: "REPAIRABLE", 
        faultCategory: "Hardware",
        diagnosticFindings: "Screen broken",
        recommendedRepair: "Replace screen",
        internalNotes: "Assigned Tech" 
      });
    expect(res.status).toBe(201);
  });

  it("technician should be denied from setting APPROVED/REJECTED status", async () => {
    currentActorId = techAssignedId;
    currentActorRole = "TECHNICIAN";
    // Ticket automatically becomes WAITING_FOR_APPROVAL after diagnosis REPAIRABLE
    const res = await request(app.getHttpServer())
      .post(`/repair-tickets/${ticketId}/status`)
      .send({ status: "APPROVED" });
    expect(res.status).toBe(403);
    expect(res.body.message).toContain("not authorized");
  });

  it("front-desk should approve ticket", async () => {
    currentActorId = frontDeskId;
    currentActorRole = "FRONT_DESK";
    const res = await request(app.getHttpServer())
      .post(`/repair-tickets/${ticketId}/status`)
      .send({ status: "APPROVED" });
    expect(res.status).toBe(201);
  });

  it("technician should set READY_FOR_COLLECTION", async () => {
    currentActorId = techAssignedId;
    currentActorRole = "TECHNICIAN";
    await request(app.getHttpServer()).post(`/repair-tickets/${ticketId}/status`).send({ status: "REPAIR_IN_PROGRESS" });
    
    const res = await request(app.getHttpServer())
      .post(`/repair-tickets/${ticketId}/status`)
      .send({ status: "READY_FOR_COLLECTION" });
    expect(res.status).toBe(201);
  });

  it("generic status endpoint should block DELIVERED", async () => {
    currentActorId = frontDeskId;
    currentActorRole = "FRONT_DESK";
    const res = await request(app.getHttpServer())
      .post(`/repair-tickets/${ticketId}/status`)
      .send({ status: "DELIVERED" });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("dedicated delivery endpoint");
  });

  it("technician should be denied from dedicated delivery", async () => {
    currentActorId = techAssignedId;
    currentActorRole = "TECHNICIAN";
    const res = await request(app.getHttpServer())
      .post(`/repair-tickets/${ticketId}/deliver`)
      .send({ publicNote: "Delivering as tech" });
    expect(res.status).toBe(403);
  });

  it("front-desk should successfully use dedicated delivery", async () => {
    currentActorId = frontDeskId;
    currentActorRole = "FRONT_DESK";
    const res = await request(app.getHttpServer())
      .post(`/repair-tickets/${ticketId}/deliver`)
      .send({ publicNote: "Delivering properly" });
    expect(res.status).toBe(201);
  });

  it("delivered ticket should reject further modification", async () => {
    currentActorId = techAssignedId;
    currentActorRole = "TECHNICIAN";
    const res = await request(app.getHttpServer())
      .post(`/repair-tickets/${ticketId}/diagnosis`)
      .send({ 
        repairFeasibility: "UNREPAIRABLE", 
        faultCategory: "Hardware",
        diagnosticFindings: "Screen broken",
        recommendedRepair: "Replace screen",
        internalNotes: "Modify" 
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("delivered or cancelled");
  });

  it("history queries should show correct audit/timeline size", async () => {
    const res = await request(app.getHttpServer()).get(`/repair-tickets/${ticketId}/timeline`);
    expect(res.status).toBe(200);
    // Ticket underwent: RECEIVED -> DIAGNOSING -> WAITING_FOR_APPROVAL -> APPROVED -> REPAIR_IN_PROGRESS -> READY_FOR_COLLECTION -> DELIVERED
    expect(res.body.data.length).toBe(7);
  });
});
