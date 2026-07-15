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
    fullName: "Front Desk Staff",
    role: "FRONT_DESK" as any,
    branches: [{ id: mockBranchId }] as any,
  };

  const mockPrismaService: any = {
    branch: {
      findUnique: jest.fn(),
    },
    customer: {
      findFirst: jest.fn().mockResolvedValue({ id: "customer-id", branchId: "11111111-1111-1111-1111-111111111111" }),
      findUnique: jest.fn().mockResolvedValue({ id: "customer-id", branchId: "11111111-1111-1111-1111-111111111111" }),
    },
    device: {
      findFirst: jest.fn().mockResolvedValue({ id: "device-id", branchId: "11111111-1111-1111-1111-111111111111", customerId: "22222222-2222-2222-2222-222222222222" }),
      findUnique: jest.fn().mockResolvedValue({ id: "device-id", branchId: "11111111-1111-1111-1111-111111111111", customerId: "22222222-2222-2222-2222-222222222222" }),
    },
    user: {
      findFirst: jest.fn(),
    },
    repairTicket: {
      findUnique: jest.fn().mockImplementation(() => Promise.resolve({ id: "ticket-1", status: "RECEIVED", branchId: "11111111-1111-1111-1111-111111111111", assignedTechnicianId: mockActorId, device: { brand: 'Apple', model: 'iPhone 13' } })),
      findFirst: jest.fn().mockImplementation(() => Promise.resolve({ id: "ticket-1", status: "RECEIVED", branchId: "11111111-1111-1111-1111-111111111111", assignedTechnicianId: mockActorId, device: { brand: 'Apple', model: 'iPhone 13' } })),
      create: jest.fn().mockImplementation(() => Promise.resolve({ id: "ticket-1", status: "RECEIVED", branchId: "11111111-1111-1111-1111-111111111111", assignedTechnicianId: mockActorId, device: { brand: 'Apple', model: 'iPhone 13' } })),
      update: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    sequenceCounter: {
      update: jest.fn(() => ({ value: 12 })),
      upsert: jest.fn(() => ({ value: 12 })),
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
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
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
      mockPrismaService.device.findFirst.mockResolvedValue(null);

      const payload = {
        customerId: mockCustomer.id,
        deviceId: mockDevice.id,
        branchId: mockBranch.id,
        reportedProblem: "Screen glass cracked",
        priority: "NORMAL" as const,
      };

      await expect(service.create(payload, mockActor)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should fail if branch is deactivated", async () => {
      mockPrismaService.branch.findUnique.mockResolvedValue({
        ...mockBranch,
        isActive: false,
      });
      mockPrismaService.device.findFirst.mockResolvedValue(mockDevice);

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
      role: "TECHNICIAN" as any,
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
        { ...mockActor, role: "TECHNICIAN" as any },
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
          { internalNotes: "Delivered ok", publicNotes: "Delivered ok" } as any,
          mockActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should reject any modification of delivered tickets", async () => {
      const ticket = {
        id: "ticket-1",
        status: "DELIVERED",
        branchId: mockBranchId,
        assignedTechnicianId: mockActor.id,
      };
      mockPrismaService.repairTicket.findUnique.mockResolvedValue(ticket);
      mockPrismaService.repairTicket.findFirst.mockResolvedValue(ticket);
      mockPrismaService.repairTicket.findFirst.mockResolvedValue(ticket);

      await expect(
        service.updateStatus("ticket-1", { status: "DIAGNOSING" }, { ...mockActor, role: "TECHNICIAN" as any }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("addDiagnosis", () => {
    const techActor = {
      id: "actor-1",
      email: "tech@example.com",
      role: "TECHNICIAN" as any,
      branches: ["11111111-1111-1111-1111-111111111111"],
    };

    it("should update ticket status, history, and create audit logs when feasibility is REPAIRABLE", async () => {
      const ticket = {
        id: "ticket-1",
        status: "DIAGNOSING",
        branchId: mockBranchId,
        assignedTechnicianId: mockActor.id,
      };
      const diagnosis = {
        id: "diag-1",
        repairFeasibility: "REPAIRABLE",
      };

      mockPrismaService.repairTicket.findUnique.mockResolvedValue(ticket);
      mockPrismaService.repairTicket.findFirst.mockResolvedValue(ticket);
      mockPrismaService.diagnosis.findFirst.mockResolvedValue(null);
      mockPrismaService.diagnosis.create.mockResolvedValue(diagnosis);

      const technicianActor = { ...mockActor, role: "TECHNICIAN" as any };

      await service.addDiagnosis(
        "ticket-1",
        {
          faultCategory: "Screen",
          diagnosticFindings: "Broken screen",
          recommendedRepair: "Replace screen",
          repairFeasibility: "REPAIRABLE",
        },
        technicianActor,
      );

      // Verify ticket update
      expect(mockPrismaService.repairTicket.update).toHaveBeenCalledWith({
        where: { id: "ticket-1" },
        data: { status: "WAITING_FOR_APPROVAL" },
      });

      // Verify status history
      expect(mockPrismaService.ticketStatusHistory.create).toHaveBeenCalledWith(
        {
          data: expect.objectContaining({
            repairTicketId: "ticket-1",
            previousStatus: "DIAGNOSING",
            newStatus: "WAITING_FOR_APPROVAL",
          }),
        },
      );

      // Verify audit logs
      expect(mockAuditLogsService.createLog).toHaveBeenCalledWith(
        expect.anything(),
        technicianActor.id,
        ticket.branchId,
        "UPDATE_TICKET_STATUS",
        "RepairTicket",
        "ticket-1",
        { status: "DIAGNOSING" },
        { status: "WAITING_FOR_APPROVAL", source: "DIAGNOSIS_COMPLETION" },
      );
      expect(mockAuditLogsService.createLog).toHaveBeenCalledWith(
        expect.anything(),
        technicianActor.id,
        ticket.branchId,
        "ADD_DIAGNOSIS",
        "Diagnosis",
        "diag-1",
        null,
        diagnosis,
      );
    });

    it("should update ticket status, history, and create audit logs when feasibility is UNREPAIRABLE", async () => {
      const ticket = {
        id: "ticket-1",
        status: "DIAGNOSING",
        branchId: mockBranchId,
        assignedTechnicianId: mockActor.id,
      };
      const diagnosis = {
        id: "diag-1",
        repairFeasibility: "UNREPAIRABLE",
      };

      mockPrismaService.repairTicket.findUnique.mockResolvedValue(ticket);
      mockPrismaService.repairTicket.findFirst.mockResolvedValue(ticket);
      mockPrismaService.diagnosis.findFirst.mockResolvedValue(null);
      mockPrismaService.diagnosis.create.mockResolvedValue(diagnosis);

      const technicianActor = { ...mockActor, role: "TECHNICIAN" as any };

      await service.addDiagnosis(
        "ticket-1",
        {
          faultCategory: "Logic Board",
          diagnosticFindings: "Logic board fried",
          recommendedRepair: "Replace logic board",
          repairFeasibility: "UNREPAIRABLE",
        },
        technicianActor,
      );

      // Verify ticket update
      expect(mockPrismaService.repairTicket.update).toHaveBeenCalledWith({
        where: { id: "ticket-1" },
        data: { status: "UNREPAIRABLE" },
      });

      // Verify status history
      expect(mockPrismaService.ticketStatusHistory.create).toHaveBeenCalledWith(
        {
          data: expect.objectContaining({
            repairTicketId: "ticket-1",
            previousStatus: "DIAGNOSING",
            newStatus: "UNREPAIRABLE",
          }),
        },
      );

      // Verify audit logs
      expect(mockAuditLogsService.createLog).toHaveBeenCalledWith(
        expect.anything(),
        technicianActor.id,
        ticket.branchId,
        "UPDATE_TICKET_STATUS",
        "RepairTicket",
        "ticket-1",
        { status: "DIAGNOSING" },
        { status: "UNREPAIRABLE", source: "DIAGNOSIS_COMPLETION" },
      );
    });
  });
});
