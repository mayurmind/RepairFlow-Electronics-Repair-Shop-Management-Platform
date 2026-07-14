import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import { UnauthorizedException, ForbiddenException } from "@nestjs/common";
import { verify, hash } from "@node-rs/argon2";
import type { Prisma } from "@prisma/client";

jest.mock("@node-rs/argon2", () => ({
  verify: jest.fn(),
  hash: jest.fn(),
}));

describe("AuthService", () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockUser = {
    id: "user-uuid",
    fullName: "John Tech",
    email: "tech.a1@repairflow.com",
    phone: "555-1234",
    passwordHash: "hashed_password",
    role: "TECHNICIAN",
    status: "ACTIVE",
    lastLoginAt: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService: any = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    refreshSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    passwordResetToken: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(() => "mock_token"),
  };

  const mockAuditLogsService = {
    createLog: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: AuditLogsService, useValue: mockAuditLogsService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();

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

  describe("validateUser", () => {
    it("should throw UnauthorizedException if user does not exist", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.validateUser("none@user.com", "pwd"),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw ForbiddenException if user status is SUSPENDED", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        status: "SUSPENDED",
      });

      await expect(service.validateUser(mockUser.email, "pwd")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should throw ForbiddenException if user is locked out", async () => {
      const lockedTime = new Date(Date.now() + 10 * 60 * 1000); // locked for 10 minutes
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        lockedUntil: lockedTime,
      });

      await expect(service.validateUser(mockUser.email, "pwd")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should increment failed attempts and lockout after 5 fails", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        failedLoginAttempts: 4,
      });
      (verify as jest.Mock).mockResolvedValue(false);

      await expect(
        service.validateUser(mockUser.email, "wrong_pwd"),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          data: expect.objectContaining({
            failedLoginAttempts: 5,
            lockedUntil: expect.any(Date),
          }),
        }),
      );
    });

    it("should reset failed attempts and return user profile on success", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        failedLoginAttempts: 3,
      });
      (verify as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(mockUser.email, "correct_pwd");
      expect(result).toBeDefined();
      expect(result.id).toBe(mockUser.id);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          data: expect.objectContaining({
            failedLoginAttempts: 0,
            lockedUntil: null,
          }),
        }),
      );
    });
  });

  describe("login", () => {
    it("should generate access token and return profile data", async () => {
      mockPrismaService.refreshSession.create.mockResolvedValue({
        id: "sess-uuid",
      });

      const result = await service.login(
        mockUser.id,
        mockUser.email,
        mockUser.role,
        "127.0.0.1",
        "jest-agent",
      );
      expect(result).toBeDefined();
      expect(result.accessToken).toBe("mock_token");
      expect(result.user.email).toBe(mockUser.email);
      expect(mockPrismaService.refreshSession.create).toHaveBeenCalled();
    });
  });
});
