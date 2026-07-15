import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import { createDeviceSchema } from "@repairflow/validation";
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

  async checkCustomerAccess(customerId: string, actor: AuthenticatedUser) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, deletedAt: null },
    });
    if (!customer || customer.deletedAt !== null) {
      throw new NotFoundException("Customer profile not found");
    }

    // Branch isolation check
    if (actor.role !== "SYSTEM_ADMIN" && actor.role !== "OWNER") {
      const tickets = await this.prisma.repairTicket.findMany({
        where: { customerId },
        select: { branchId: true },
      });

      if (tickets.length > 0) {
        const hasAccess = tickets.some((t) =>
          actor.branches?.map(b => b.id).includes(t.branchId),
        );
        if (!hasAccess) {
          throw new ForbiddenException(
            "You do not have access to this customer.",
          );
        }
      }
    }
    return customer;
  }

  async create(
    customerId: string,
    dto: CreateDeviceDto,
    actor: AuthenticatedUser,
  ) {
    // Load & verify customer access
    await this.checkCustomerAccess(customerId, actor);

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

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const device = await tx.device.create({
        data: {
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
        null,
        "REGISTER_DEVICE",
        "Device",
        device.id,
        null,
        device,
      );

      return device;
    });
  }

  async findAll(query: FindDevicesQueryDto, actor: AuthenticatedUser) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    const andClauses: any[] = [];

    // Branch isolation: limit devices to those owned by accessible customers
    if (actor.role !== "SYSTEM_ADMIN" && actor.role !== "OWNER") {
      andClauses.push({
        customer: {
          OR: [
            { tickets: { none: {} } },
            { tickets: { some: { branchId: { in: actor.branches?.map(b => b.id) || [] } } } },
          ],
        },
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
    const device = await this.prisma.device.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, fullName: true, phone: true, email: true },
        },
      },
    });
    if (!device) {
      throw new NotFoundException("Device not found");
    }
    await this.checkCustomerAccess(device.customerId, actor);
    return device;
  }

  async update(id: string, dto: UpdateDeviceDto, actor: AuthenticatedUser) {
    const device = await this.findOne(id, actor);

    // Load & verify customer access
    await this.checkCustomerAccess(device.customerId, actor);

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.device.update({
        where: { id },
        data: dto as any,
      });

      await this.auditLogs.createLog(
        tx,
        actor.id,
        null,
        "UPDATE_DEVICE",
        "Device",
        id,
        device,
        updated,
      );
      return updated;
    });
  }

  async getRepairHistory(deviceId: string, actor: AuthenticatedUser) {
    await this.findOne(deviceId, actor);
    return this.prisma.repairTicket.findMany({
      where: { deviceId },
      orderBy: { createdAt: "desc" },
      include: {
        branch: { select: { name: true, code: true } },
        createdBy: { select: { fullName: true } },
        assignedTechnician: { select: { fullName: true } },
      },
    });
  }
}
