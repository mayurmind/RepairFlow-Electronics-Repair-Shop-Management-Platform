import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import { createDeviceSchema } from "@repairflow/validation";

@Injectable()
export class DevicesService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  async create(customerId: string, data: any, actorId: string) {
    // Verify customer exists
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, deletedAt: null },
    });
    if (!customer) {
      throw new NotFoundException("Customer profile not found");
    }

    const parsed = createDeviceSchema.safeParse(data);
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

    return this.prisma.$transaction(async (tx) => {
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
        actorId,
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

  async findAll(query: { search?: string; page?: number; limit?: number }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.search) {
      where.OR = [
        { brand: { contains: query.search, mode: "insensitive" } },
        { model: { contains: query.search, mode: "insensitive" } },
        { serialNumber: { contains: query.search, mode: "insensitive" } },
        { imeiNumber: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.device.count({ where }),
      this.prisma.device.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
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

  async findOne(id: string) {
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
    return device;
  }

  async update(id: string, data: any, actorId: string) {
    const device = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.device.update({
        where: { id },
        data,
      });

      await this.auditLogs.createLog(
        tx,
        actorId,
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

  async getRepairHistory(deviceId: string) {
    await this.findOne(deviceId);
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
