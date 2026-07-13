import {
  Injectable,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import { createBranchSchema } from "@repairflow/validation";

@Injectable()
export class BranchesService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  async create(data: any, actorId: string) {
    const parsed = createBranchSchema.safeParse(data);
    if (!parsed.success) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Invalid branch input data.",
        details: parsed.error.issues,
      });
    }

    const { code, email } = parsed.data;

    // Check unique constraints
    const existingCode = await this.prisma.branch.findUnique({
      where: { code },
    });
    if (existingCode) {
      throw new ConflictException("A branch with this code already exists.");
    }

    const existingEmail = await this.prisma.branch.findUnique({
      where: { email },
    });
    if (existingEmail) {
      throw new ConflictException("A branch with this email already exists.");
    }

    return this.prisma.$transaction(async (tx) => {
      const branch = await tx.branch.create({
        data: parsed.data,
      });

      await this.auditLogs.createLog(
        tx,
        actorId,
        branch.id,
        "CREATE_BRANCH",
        "Branch",
        branch.id,
        null,
        branch,
      );

      return branch;
    });
  }

  async findAll(query: { search?: string; page?: number; limit?: number }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { code: { contains: query.search, mode: "insensitive" } },
        { city: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.branch.count({ where }),
      this.prisma.branch.findMany({
        where,
        skip,
        take: limit,
        orderBy: { code: "asc" },
      }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
    });
    if (!branch) {
      throw new NotFoundException("Branch not found");
    }
    return branch;
  }

  async update(id: string, data: any, actorId: string) {
    const branch = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.branch.update({
        where: { id },
        data,
      });

      await this.auditLogs.createLog(
        tx,
        actorId,
        id,
        "UPDATE_BRANCH",
        "Branch",
        id,
        branch,
        updated,
      );

      return updated;
    });
  }

  async toggleStatus(id: string, isActive: boolean, actorId: string) {
    const branch = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.branch.update({
        where: { id },
        data: { isActive },
      });

      await this.auditLogs.createLog(
        tx,
        actorId,
        id,
        isActive ? "ACTIVATE_BRANCH" : "DEACTIVATE_BRANCH",
        "Branch",
        id,
        { isActive: branch.isActive },
        { isActive: updated.isActive },
      );

      return updated;
    });
  }
}

import { BadRequestException } from "@nestjs/common";
