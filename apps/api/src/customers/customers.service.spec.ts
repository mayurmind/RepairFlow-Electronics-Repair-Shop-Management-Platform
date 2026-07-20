import { Test, TestingModule } from "@nestjs/testing";
import { CustomersService } from "./customers.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import type { Prisma } from "@prisma/client";
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";

describe("CustomersService", () => {
  let service: CustomersService;
  let prisma: PrismaService;

  const mockPrismaService: any = {
    branch: {
      findUnique: jest.fn(),
    },
    customer: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    device: {
      findMany: jest.fn(),
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

  const mockActor: any = {
    id: "actor-1",
    role: "SYSTEM_ADMIN",
    branchIds: ["branch-1"],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogsService, useValue: mockAuditLogsService },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    prisma = module.get<PrismaService>(PrismaService);
    mockPrismaService.branch.findUnique.mockResolvedValue({
      id: "11111111-1111-1111-1111-111111111111",
      isActive: true,
    });
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

  describe("create customer", () => {
    it("should create a customer successfully", async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(null);
      mockPrismaService.customer.create.mockResolvedValue({
        id: "22222222-2222-2222-2222-222222222222",
        fullName: "John Doe",
        phone: "+15551234567",
        branchId: "11111111-1111-1111-1111-111111111111",
      });

      const dto = {
        branchId: "11111111-1111-1111-1111-111111111111",
        fullName: "John Doe",
        phone: "+15551234567",
        email: "john@example.com",
      };

      const result = await service.create(dto, mockActor);
      expect(result).toBeDefined();
      expect(result.id).toBe("22222222-2222-2222-2222-222222222222");
      expect(mockPrismaService.customer.create).toHaveBeenCalled();
    });

    it("should fail if phone is already registered", async () => {
      mockPrismaService.customer.create.mockRejectedValue({
        code: "P2002",
        meta: { target: ["phone"] },
      });

      const dto = {
        branchId: "11111111-1111-1111-1111-111111111111",
        fullName: "John Doe",
        phone: "+1234567890",
      };

      await expect(service.create(dto, mockActor)).rejects.toThrow(
        ConflictException,
      );
    });

    it("should fail if phone is less than 5 characters", async () => {
      const dto = {
        branchId: "11111111-1111-1111-1111-111111111111",
        fullName: "John Doe",
        phone: "123",
      };

      await expect(service.create(dto, mockActor)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should fail if email is invalid format", async () => {
      const dto = {
        branchId: "11111111-1111-1111-1111-111111111111",
        fullName: "John Doe",
        phone: "+1234567890",
        email: "invalid-email",
      };

      await expect(service.create(dto, mockActor)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("findAll and pagination", () => {
    it("should return paginated list of customers", async () => {
      mockPrismaService.customer.count.mockResolvedValue(2);
      mockPrismaService.customer.findMany.mockResolvedValue([
        { id: "cust-1", fullName: "John Doe" },
        { id: "cust-2", fullName: "Jane Doe" },
      ]);

      const result = await service.findAll({ page: 1, limit: 10 }, mockActor);
      expect(result.data).toHaveLength(2);
      expect(result.meta.totalPages).toBe(1);
    });
  });
});
