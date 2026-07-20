import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import { createDeviceSchema, updateDeviceSchema } from "@repairflow/validation";
import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { CreateDeviceDto } from "./dto/create-device.dto";
import { UpdateDeviceDto } from "./dto/update-device.dto";
import { FindDevicesQueryDto } from "./dto/find-devices-query.dto";
import type { Prisma } from "@prisma/client";

@Injectable()
export class DevicesService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  async create(
    customerId: string,
    dto: CreateDeviceDto,
    actor: AuthenticatedUser,
  ) {
    // Load & verify customer access
    const customerWhere: any = { id: customerId, deletedAt: null };
    if (actor.role !== "SYSTEM_ADMIN" && actor.role !== "OWNER") {
      customerWhere.branchId = { in: actor.branches?.map((b) => b.id) || [] };
    }
    const customer = await this.prisma.customer.findFirst({
      where: customerWhere,
    });
    if (!customer) {
      throw new NotFoundException("Customer profile not found");
    }

    // Parse with zod for service safety & test compatibility
    const parsed = createDeviceSchema.safeParse(dto);
    if (!parsed.success) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Invalid device parameters.",
        details: parsed.error.issues,
      });
    }

    const {
      category,
      brand,
      model,
      serialNumber,
      imeiNumber,
      colour,
      variant,
      notes,
    } = parsed.data;

    try {
      return await this.prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const device = await tx.device.create({
            data: {
              branchId: customer.branchId,
              customerId,
              category,
              brand,
              model,
              serialNumber: serialNumber || null,
              imeiNumber: imeiNumber || null,
              colour: colour || null,
              variant: variant || null,
              notes: notes || null,
            },
          });

          await this.auditLogs.createLog(
            tx,
            actor.id,
            customer.branchId,
            "REGISTER_DEVICE",
            "Device",
            device.id,
            null,
            device,
          );

          return device;
        },
      );
    } catch (error: any) {
      if (error.code === "P2002") {
        const target = error.meta?.target as string[];
        if (target?.includes("serialNumber")) {
          throw new ConflictException(
            "Device serial number already exists in this branch",
          );
        }
        if (target?.includes("imeiNumber")) {
          throw new ConflictException(
            "Device IMEI already exists in this branch",
          );
        }
      }
      throw error;
    }
  }

  async findAll(query: FindDevicesQueryDto, actor: AuthenticatedUser) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    const andClauses: any[] = [];

    if (query.customerId) {
      where.customerId = query.customerId;
    }

    // Branch isolation: limit devices to those owned by accessible branches
    if (actor.role !== "SYSTEM_ADMIN" && actor.role !== "OWNER") {
      andClauses.push({
        branchId: { in: actor.branches?.map((b) => b.id) || [] },
      });
    }

    if (query.search) {
      andClauses.push({
        OR: [
          { brand: { contains: query.search, mode: "insensitive" } },
          { model: { contains: query.search, mode: "insensitive" } },
          { serialNumber: { contains: query.search, mode: "insensitive" } },
          { imeiNumber: { contains: query.search, mode: "insensitive" } },
        ],
      });
    }

    if (andClauses.length > 0) {
      where.AND = andClauses;
    }

    const sortField = (query as any).sort || "createdAt";
    const sortDir = (query as any).sortDirection || "desc";

    const [total, data] = await Promise.all([
      this.prisma.device.count({ where }),
      this.prisma.device.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortField]: sortDir },
        include: {
          customer: {
            select: { id: true, fullName: true, phone: true },
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

  async findOne(id: string, actor: AuthenticatedUser) {
    const where: any = { id };
    if (actor.role !== "SYSTEM_ADMIN" && actor.role !== "OWNER") {
      where.branchId = { in: actor.branches?.map((b) => b.id) || [] };
    }

    const device = await this.prisma.device.findFirst({
      where,
      include: {
        customer: {
          select: { id: true, fullName: true, phone: true, email: true },
        },
      },
    });
    if (!device) {
      throw new NotFoundException("Device not found");
    }
    return device;
  }

  async update(id: string, dto: UpdateDeviceDto, actor: AuthenticatedUser) {
    const parsed = updateDeviceSchema.safeParse(dto);
    if (!parsed.success) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Invalid device parameters.",
        details: parsed.error.issues,
      });
    }

    const device = await this.findOne(id, actor);

    try {
      return await this.prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const updated = await tx.device.update({
            where: { id },
            data: parsed.data as any,
          });

          await this.auditLogs.createLog(
            tx,
            actor.id,
            device.branchId,
            "UPDATE_DEVICE",
            "Device",
            id,
            device,
            updated,
          );
          return updated;
        },
      );
    } catch (error: any) {
      if (error.code === "P2002") {
        const target = error.meta?.target as string[];
        if (target?.includes("serialNumber")) {
          throw new ConflictException(
            "Device serial number already exists in this branch",
          );
        }
        if (target?.includes("imeiNumber")) {
          throw new ConflictException(
            "Device IMEI already exists in this branch",
          );
        }
      }
      throw error;
    }
  }

  async getRepairHistory(deviceId: string, actor: AuthenticatedUser) {
    const device = await this.findOne(deviceId, actor);
    return this.prisma.repairTicket.findMany({
      where: { deviceId, branchId: device.branchId },
      orderBy: { createdAt: "desc" },
      include: {
        branch: { select: { name: true, code: true } },
        createdBy: { select: { fullName: true } },
        assignedTechnician: { select: { fullName: true } },
      },
    });
  }
}
