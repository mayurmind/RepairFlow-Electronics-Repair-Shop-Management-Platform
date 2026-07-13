import { Test, TestingModule } from "@nestjs/testing";
import { NotificationsService } from "./notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { NotFoundException } from "@nestjs/common";

describe("NotificationsService", () => {
  let service: NotificationsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    notification: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should find all notifications", async () => {
    mockPrismaService.notification.findMany.mockResolvedValue([{ id: "n1" }]);
    const result = await service.findAll("user-1");
    expect(result).toEqual([{ id: "n1" }]);
  });

  it("should mark as read", async () => {
    mockPrismaService.notification.findFirst.mockResolvedValue({ id: "n1" });
    mockPrismaService.notification.update.mockResolvedValue({
      id: "n1",
      isRead: true,
    });
    const result = await service.markAsRead("n1", "user-1");
    expect(result.isRead).toBe(true);
  });

  it("should throw if mark as read not found", async () => {
    mockPrismaService.notification.findFirst.mockResolvedValue(null);
    await expect(service.markAsRead("n1", "user-1")).rejects.toThrow(
      NotFoundException,
    );
  });
});
