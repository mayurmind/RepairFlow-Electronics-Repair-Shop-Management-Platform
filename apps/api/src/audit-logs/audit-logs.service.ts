import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { Prisma, AuditLog } from "@prisma/client";

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Write an audit log entry.
   * Can accept a Prisma transaction client (tx) to execute as part of a transaction.
   */
  async createLog(
    tx: any,
    actorUserId: string | null,
    branchId: string | null,
    action: string,
    entityType: string,
    entityId: string,
    oldValues?: any,
    newValues?: any,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const prismaClient = tx || this.prisma;

    // Filter out password and secret fields from old/new values
    const sanitize = (data: any) => {
      if (!data || typeof data !== "object") return data;
      const copy = { ...data };
      const secretFields = [
        "password",
        "passwordHash",
        "token",
        "tokenHash",
        "resetToken",
        "secret",
      ];
      for (const field of secretFields) {
        if (field in copy) {
          copy[field] = "[REDACTED]";
        }
      }
      return copy;
    };

    const sanitizedOld = oldValues ? JSON.stringify(sanitize(oldValues)) : null;
    const sanitizedNew = newValues ? JSON.stringify(sanitize(newValues)) : null;

    try {
      return await prismaClient.auditLog.create({
        data: {
          actorUserId,
          branchId,
          action,
          entityType,
          entityId,
          oldValues: sanitizedOld,
          newValues: sanitizedNew,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
      });
    } catch (err) {
      // Never fail the main transaction because of audit log logging error
      console.error("Failed to create audit log:", err);
    }
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    branchId?: string;
    actorUserId?: string;
    entityType?: string;
    entityId?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.branchId) where.branchId = query.branchId;
    if (query.actorUserId) where.actorUserId = query.actorUserId;
    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;

    const [total, data] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          actor: {
            select: { id: true, fullName: true, email: true, role: true },
          },
          branch: {
            select: { id: true, name: true, code: true },
          },
        },
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
    return this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        actor: {
          select: { id: true, fullName: true, email: true, role: true },
        },
        branch: { select: { id: true, name: true } },
      },
    });
  }
}
