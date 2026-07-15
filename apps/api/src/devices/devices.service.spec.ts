import { Test, TestingModule } from "@nestjs/testing";
import { DevicesService } from "./devices.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import type { Prisma } from "@prisma/client";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/types/authenticated-user.type";

describe("DevicesService", () => {
  let service: DevicesService;
  let prisma: PrismaService;

  const mockActor: AuthenticatedUser = {
    id: "actor-1",
    email: "staff@repairflow.com",
    fullName: "Staff Member",
    role: "FRONT_DESK" as any,
    branches: [{ id: "branch-1" }] as any,
  };

  const mockPrismaService: any = {
    customer: {
      findFirst: jest.fn(),
    },
    device: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    repairTicket: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockAuditLogsService = {
    createLog: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevicesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogsService, useValue: mockAuditLogsService },
      ],
    }).compile();

    service = module.get<DevicesService>(DevicesService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();

    mockPrismaService.repairTicket.findMany.mockResolvedValue([]);
    mockPrismaService.repairTicket.count.mockResolvedValue(0);
    mockPrismaService.repairTicket.findFirst.mockResolvedValue(null);

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

  describe("create device", () => {
    it("should register a device successfully", async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue({
        id: "cust-1",
        fullName: "John Doe",
        deletedAt: null,
      });
      mockPrismaService.device.create.mockResolvedValue({
        id: "device-1",
        customerId: "cust-1",
        category: "Mobile phone",
        brand: "Apple",
        model: "iPhone 15",
      });

      const dto = {
        category: "Mobile phone" as const,
        brand: "Apple",
        model: "iPhone 15",
        serialNumber: "SN12345",
      };

      const result = await service.create("cust-1", dto, mockActor);
      expect(result).toBeDefined();
      expect(result.id).toBe("device-1");
      expect(mockPrismaService.device.create).toHaveBeenCalled();
    });

    it("should fail if customer is missing/not found", async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(null);

      const dto = {
        category: "Mobile phone" as const,
        brand: "Apple",
        model: "iPhone 15",
      };

      await expect(service.create("cust-1", dto, mockActor)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should fail if customer is deleted", async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue({
        id: "cust-1",
        deletedAt: new Date(),
      });

      const dto = {
        category: "Mobile phone" as const,
        brand: "Apple",
        model: "iPhone 15",
      };

      await expect(service.create("cust-1", dto, mockActor)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should fail if category is not in enum list", async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue({
        id: "cust-1",
        deletedAt: null,
      });

      const dto: any = {
        category: "InvalidCategory",
        brand: "Apple",
        model: "iPhone 15",
      };

      await expect(service.create("cust-1", dto, mockActor)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
