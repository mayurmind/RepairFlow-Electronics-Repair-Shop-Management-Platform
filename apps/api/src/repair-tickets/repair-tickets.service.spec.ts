import { Test, TestingModule } from "@nestjs/testing";
import { RepairTicketsService } from "./repair-tickets.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import type { Prisma } from "@prisma/client";
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { AuthenticatedUser } from "../auth/types/authenticated-user.type";

describe("RepairTicketsService", () => {
  let service: RepairTicketsService;
  let prisma: PrismaService;

  const mockBranchId = "11111111-1111-1111-1111-111111111111";
  const mockCustomerId = "22222222-2222-2222-2222-222222222222";
  const mockDeviceId = "33333333-3333-3333-3333-333333333333";
  const mockActorId = "44444444-4444-4444-4444-444444444444";

  const mockBranch = {
    id: mockBranchId,
    name: "Branch A",
    code: "BR-A",
    isActive: true,
  };
  const mockCustomer = { id: mockCustomerId, fullName: "Alice Cust" };
  const mockDevice = {
    id: mockDeviceId,
    customerId: mockCustomerId,
    brand: "Apple",
    model: "iPhone 13",
  };
  const mockActor: AuthenticatedUser = {
    id: mockActorId,
    email: "frontdesk@repairflow.com",
    role: "FRONT_DESK",
    status: "ACTIVE",
    branchIds: [mockBranchId],
  };

  const mockPrismaService: any = {
    branch: {
      findUnique: jest.fn(),
    },
    customer: {
      findFirst: jest.fn(),
    },
    device: {
      findUnique: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
    repairTicket: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    sequenceCounter: {
      update: jest.fn(() => ({ value: 12 })),
    },
    ticketStatusHistory: {
      create: jest.fn(),
    },
    technicianAssignmentHistory: {
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
    invoice: {
      findFirst: jest.fn(),
    },
    diagnosis: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockAuditLogsService = {
    createLog: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepairTicketsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogsService, useValue: mockAuditLogsService },
      ],
    }).compile();

    service = module.get<RepairTicketsService>(RepairTicketsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();

    mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);

    mockPrismaService.$transaction = jest.fn(
      async <T>(
        callback: (tx: Prisma.TransactionClient) => Promise<T>,
      ): Promise<T> =>
        callback(mockPrismaService as unknown as Prisma.TransactionClient),
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create ticket", () => {
    it("should validate inputs successfully and create a ticket", async () => {
      mockPrismaService.branch.findUnique.mockResolvedValue(mockBranch);
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);
      mockPrismaService.repairTicket.create.mockResolvedValue({
        id: "ticket-1",
        ticketNumber: "RF-BR-A-2026-000012",
      });

      const payload = {
        customerId: mockCustomer.id,
        deviceId: mockDevice.id,
        branchId: mockBranch.id,
        reportedProblem: "Screen glass cracked and unresponsive to touch",
        priority: "NORMAL" as const,
      };

      const result = await service.create(payload, mockActor);
      expect(result).toBeDefined();
      expect(result.ticketNumber).toBeDefined();
      expect(mockPrismaService.repairTicket.create).toHaveBeenCalled();
    });

    it("should fail if device does not belong to selected customer", async () => {
      mockPrismaService.branch.findUnique.mockResolvedValue(mockBranch);
      mockPrismaService.device.findUnique.mockResolvedValue({
        ...mockDevice,
        customerId: "cust-2",
      });

      const payload = {
        customerId: mockCustomer.id,
        deviceId: mockDevice.id,
        branchId: mockBranch.id,
        reportedProblem: "Screen glass cracked",
        priority: "NORMAL" as const,
      };

      await expect(service.create(payload, mockActor)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should fail if branch is deactivated", async () => {
      mockPrismaService.branch.findUnique.mockResolvedValue({
        ...mockBranch,
        isActive: false,
      });
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);

      const payload = {
        customerId: mockCustomer.id,
        deviceId: mockDevice.id,
        branchId: mockBranch.id,
        reportedProblem: "Screen glass cracked",
        priority: "NORMAL" as const,
      };

      await expect(service.create(payload, mockActor)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should fail if actor does not have access to selected branchId", async () => {
      mockPrismaService.branch.findUnique.mockResolvedValue(mockBranch);
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);

      const payload = {
        customerId: mockCustomer.id,
        deviceId: mockDevice.id,
        branchId: "99999999-9999-9999-9999-999999999999",
        reportedProblem: "Screen glass cracked",
        priority: "NORMAL" as const,
      };

      await expect(service.create(payload, mockActor)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("technician assignment", () => {
    const mockTechId = "tech-1";
    const mockTechUser = {
      id: mockTechId,
      role: "TECHNICIAN",
      status: "ACTIVE",
      userBranches: [{ branchId: mockBranchId }],
    };

    it("should assign technician successfully if technician belongs to ticket branch", async () => {
      const ticket = {
        id: "ticket-1",
        ticketNumber: "RF-BR-A-000001",
        status: "RECEIVED",
        branchId: mockBranchId,
        device: { brand: "Apple", model: "iPhone 13" },
      };
      mockPrismaService.repairTicket.findUnique.mockResolvedValue(ticket);
      mockPrismaService.user.findFirst.mockResolvedValue(mockTechUser);
      mockPrismaService.repairTicket.update.mockResolvedValue({
        ...ticket,
        assignedTechnicianId: mockTechId,
      });

      const result = await service.assignTechnician(
        "ticket-1",
        { technicianId: mockTechId },
        mockActor,
      );
      expect(result.assignedTechnicianId).toBe(mockTechId);
    });

    it("should reject assignment if technician does not belong to ticket branch", async () => {
      const ticket = {
        id: "ticket-1",
        ticketNumber: "RF-BR-A-000001",
        status: "RECEIVED",
        branchId: mockBranchId,
        device: { brand: "Apple", model: "iPhone 13" },
      };
      mockPrismaService.repairTicket.findUnique.mockResolvedValue(ticket);
      mockPrismaService.user.findFirst.mockResolvedValue({
        ...mockTechUser,
        userBranches: [{ branchId: "different-branch" }],
      });

      await expect(
        service.assignTechnician(
          "ticket-1",
          { technicianId: mockTechId },
          mockActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("updateStatus state machine and delivery", () => {
    it("should enforce state machine transitions: RECEIVED -> DIAGNOSING", async () => {
      const ticket = {
        id: "ticket-1",
        status: "RECEIVED",
        branchId: mockBranchId,
      };
      mockPrismaService.repairTicket.findUnique.mockResolvedValue(ticket);
      mockPrismaService.repairTicket.update.mockResolvedValue({
        ...ticket,
        status: "DIAGNOSING",
      });

      const result = await service.updateStatus(
        "ticket-1",
        { status: "DIAGNOSING" },
        mockActor,
      );
      expect(result.status).toBe("DIAGNOSING");
    });

    it("should deny invalid status transitions: RECEIVED -> DELIVERED", async () => {
      const ticket = {
        id: "ticket-1",
        status: "RECEIVED",
        branchId: mockBranchId,
      };
      mockPrismaService.repairTicket.findUnique.mockResolvedValue(ticket);

      await expect(
        service.updateStatus("ticket-1", { status: "DELIVERED" }, mockActor),
      ).rejects.toThrow(BadRequestException);
    });

    it("should reject delivery if ticket is not in READY_FOR_COLLECTION state", async () => {
      const ticket = {
        id: "ticket-1",
        status: "DIAGNOSING",
        branchId: mockBranchId,
      };
      mockPrismaService.repairTicket.findUnique.mockResolvedValue(ticket);

      await expect(
        service.deliverTicket(
          "ticket-1",
          { deliveryNotes: "Delivered ok" },
          mockActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should reject any modification of delivered tickets", async () => {
      const ticket = {
        id: "ticket-1",
        status: "DELIVERED",
        branchId: mockBranchId,
      };
      mockPrismaService.repairTicket.findUnique.mockResolvedValue(ticket);

      await expect(
        service.updateStatus("ticket-1", { status: "DIAGNOSING" }, mockActor),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
