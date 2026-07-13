import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import { createUserSchema, updateUserSchema } from "@repairflow/validation";
import { hash } from "@node-rs/argon2";
import { UserRole, UserStatus } from "@repairflow/shared-types";

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  async create(data: any, actorId: string) {
    const parsed = createUserSchema.safeParse(data);
    if (!parsed.success) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Invalid user inputs.",
        details: parsed.error.issues,
      });
    }

    const { email, password, fullName, role, status, phone } = parsed.data;

    // Check unique email
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException("A user with this email already exists.");
    }

    const pass = password || "password123"; // Default password for invitation
    const passwordHash = await hash(pass);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName,
          email,
          phone,
          passwordHash,
          role: role as any,
          status: status as any,
        },
      });

      // Audit Log user creation
      await this.auditLogs.createLog(
        tx,
        actorId,
        null,
        "CREATE_USER",
        "User",
        user.id,
        null,
        {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
        },
      );

      return user;
    });
  }

  async findAll(query: {
    search?: string;
    role?: UserRole;
    branchId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.role) where.role = query.role;

    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
        { phone: { contains: query.search, mode: "insensitive" } },
      ];
    }

    if (query.branchId) {
      where.userBranches = {
        some: { branchId: query.branchId },
      };
    }

    const [total, data] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fullName: "asc" },
        include: {
          userBranches: {
            include: { branch: true },
          },
        },
      }),
    ]);

    // Format users list (remove password hash)
    const formatted = data.map((u) => {
      const { passwordHash, ...rest } = u;
      return {
        ...rest,
        branches: u.userBranches.map((ub) => ub.branch),
      };
    });

    return {
      data: formatted,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        userBranches: {
          include: { branch: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const { passwordHash, ...rest } = user;
    return {
      ...rest,
      branches: user.userBranches.map((ub) => ub.branch),
    };
  }

  async update(id: string, data: any, actorId: string) {
    const user = await this.findOne(id);
    const parsed = updateUserSchema.safeParse(data);
    if (!parsed.success) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Invalid inputs.",
        details: parsed.error.issues,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: parsed.data as any,
      });

      await this.auditLogs.createLog(
        tx,
        actorId,
        null,
        "UPDATE_USER",
        "User",
        id,
        user,
        updated,
      );
      return updated;
    });
  }

  async updateStatus(id: string, status: UserStatus, actorId: string) {
    const user = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: { status: status as any },
      });

      // Business Rule 22 & 21: Invalidate active sessions if suspended/disabled
      if (status === "SUSPENDED" || status === "DISABLED") {
        await tx.refreshSession.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }

      await this.auditLogs.createLog(
        tx,
        actorId,
        null,
        "UPDATE_USER_STATUS",
        "User",
        id,
        { status: user.status },
        { status: updated.status },
      );

      return updated;
    });
  }

  async updateRole(id: string, role: UserRole, actorId: string) {
    const user = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: { role: role as any },
      });

      // Invalidate sessions on role change (Business Rule 22)
      await tx.refreshSession.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await this.auditLogs.createLog(
        tx,
        actorId,
        null,
        "UPDATE_USER_ROLE",
        "User",
        id,
        { role: user.role },
        { role: updated.role },
      );

      return updated;
    });
  }

  async assignBranch(userId: string, branchId: string, actorId: string) {
    // Check if user and branch exist
    await this.findOne(userId);
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
    });
    if (!branch) {
      throw new NotFoundException("Branch not found");
    }

    // Check duplicate
    const existing = await this.prisma.userBranch.findUnique({
      where: { userId_branchId: { userId, branchId } },
    });
    if (existing) {
      return { success: true };
    }

    return this.prisma.$transaction(async (tx) => {
      const userBranch = await tx.userBranch.create({
        data: { userId, branchId },
      });

      await this.auditLogs.createLog(
        tx,
        actorId,
        branchId,
        "ASSIGN_USER_BRANCH",
        "User",
        userId,
        null,
        { branchId, branchCode: branch.code },
      );

      return userBranch;
    });
  }

  async removeBranch(userId: string, branchId: string, actorId: string) {
    const existing = await this.prisma.userBranch.findUnique({
      where: { userId_branchId: { userId, branchId } },
    });

    if (!existing) {
      throw new NotFoundException("User is not assigned to this branch.");
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.userBranch.delete({
        where: { userId_branchId: { userId, branchId } },
      });

      await this.auditLogs.createLog(
        tx,
        actorId,
        branchId,
        "REMOVE_USER_BRANCH",
        "User",
        userId,
        { branchId },
        null,
      );

      return { success: true };
    });
  }
}
