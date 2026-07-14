import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import {
  createUserSchema,
  updateUserSchema,
  paginationSchema,
} from "@repairflow/validation";
import { hash } from "@node-rs/argon2";
import { UserRole, UserStatus } from "@repairflow/shared-types";
import { UserResponseMapper } from "./mappers/user-response.mapper";
import type { Prisma } from "@prisma/client";
import {
  AuthorizationService,
  ActorContext,
  TargetContext,
} from "../common/authorization/authorization.service";

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
    private authz: AuthorizationService,
  ) {}

  private getActorContext(actor: any): ActorContext {
    return {
      id: actor.id,
      role: actor.role,
      branchIds: actor.branches?.map((b: any) => b.id) || [],
    };
  }

  private getTargetContext(user: any): TargetContext {
    return {
      id: user.id,
      role: user.role,
      branchIds: user.userBranches?.map((ub: any) => ub.branchId) || [],
    };
  }

  async create(data: any, actor: any) {
    const parsed = createUserSchema.safeParse(data);
    if (!parsed.success) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Invalid user inputs.",
        details: parsed.error.issues,
      });
    }

    const { email, password, fullName, role, status, phone } = parsed.data;

    // Enforce authorization
    this.authz.canManageUser(
      this.getActorContext(actor),
      { role: role as UserRole },
      "CREATE",
    );

    // Check unique email
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException("A user with this email already exists.");
    }

    if (!password) {
      throw new BadRequestException("Password is required.");
    }
    const passwordHash = await hash(password);

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
        actor.id,
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

      return UserResponseMapper.toSafeUser(user);
    });
  }

  async findAll(
    query: {
      search?: string;
      role?: UserRole;
      branchId?: string;
      page?: number;
      limit?: number;
    },
    actor: any,
  ) {
    const p = paginationSchema.safeParse({
      page: query.page,
      limit: query.limit,
    });
    if (!p.success) {
      throw new BadRequestException("Invalid pagination parameters");
    }
    const page = p.data.page;
    const limit = p.data.limit;
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

    const actorCtx = this.getActorContext(actor);

    if (query.branchId) {
      if (
        actorCtx.role === "BRANCH_MANAGER" &&
        !actorCtx.branchIds.includes(query.branchId)
      ) {
        throw new ForbiddenException(
          "You cannot view users for a branch you do not manage.",
        );
      }
      where.userBranches = {
        some: { branchId: query.branchId },
      };
    } else if (actorCtx.role === "BRANCH_MANAGER") {
      // Branch Managers can only see users in their branches
      where.userBranches = {
        some: { branchId: { in: actorCtx.branchIds } },
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

    return {
      data: UserResponseMapper.toSafeUsers(data),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, actor: any) {
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

    this.authz.canViewUser(
      this.getActorContext(actor),
      this.getTargetContext(user),
    );

    return UserResponseMapper.toSafeUser(user);
  }

  async update(id: string, data: any, actor: any) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { userBranches: { include: { branch: true } } },
    });

    if (!user) throw new NotFoundException("User not found");

    this.authz.canManageUser(
      this.getActorContext(actor),
      this.getTargetContext(user),
      "UPDATE",
    );
    const parsed = updateUserSchema.safeParse(data);
    if (!parsed.success) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Invalid inputs.",
        details: parsed.error.issues,
      });
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.user.update({
        where: { id },
        data: parsed.data as any,
      });

      await this.auditLogs.createLog(
        tx,
        actor.id,
        null,
        "UPDATE_USER",
        "User",
        id,
        user,
        updated,
      );
      return UserResponseMapper.toSafeUser(updated);
    });
  }

  async updateStatus(id: string, status: UserStatus, actor: any) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { userBranches: { include: { branch: true } } },
    });

    if (!user) throw new NotFoundException("User not found");

    this.authz.canManageUser(
      this.getActorContext(actor),
      this.getTargetContext(user),
      "SUSPEND",
    );

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
        actor.id,
        null,
        "UPDATE_USER_STATUS",
        "User",
        id,
        { status: user.status },
        { status: updated.status },
      );

      return UserResponseMapper.toSafeUser(updated);
    });
  }

  async updateRole(id: string, role: UserRole, actor: any) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { userBranches: { include: { branch: true } } },
    });

    if (!user) throw new NotFoundException("User not found");

    this.authz.canManageUser(
      this.getActorContext(actor),
      this.getTargetContext(user),
      "CHANGE_ROLE",
    );

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
        actor.id,
        null,
        "UPDATE_USER_ROLE",
        "User",
        id,
        { role: user.role },
        { role: updated.role },
      );

      return UserResponseMapper.toSafeUser(updated);
    });
  }

  async assignBranch(userId: string, branchId: string, actor: any) {
    // Check if user and branch exist
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userBranches: { include: { branch: true } } },
    });
    if (!user) throw new NotFoundException("User not found");

    this.authz.canAssignBranch(this.getActorContext(actor), branchId);
    this.authz.canManageUser(
      this.getActorContext(actor),
      this.getTargetContext(user),
      "ASSIGN_BRANCH",
    );
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

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const userBranch = await tx.userBranch.create({
        data: { userId, branchId },
      });

      await this.auditLogs.createLog(
        tx,
        actor.id,
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

  async removeBranch(userId: string, branchId: string, actor: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userBranches: { include: { branch: true } } },
    });
    if (!user) throw new NotFoundException("User not found");

    this.authz.canAssignBranch(this.getActorContext(actor), branchId);
    this.authz.canManageUser(
      this.getActorContext(actor),
      this.getTargetContext(user),
      "ASSIGN_BRANCH",
    );
    const existing = await this.prisma.userBranch.findUnique({
      where: { userId_branchId: { userId, branchId } },
    });

    if (!existing) {
      throw new NotFoundException("User is not assigned to this branch.");
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.userBranch.delete({
        where: { userId_branchId: { userId, branchId } },
      });

      await this.auditLogs.createLog(
        tx,
        actor.id,
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
