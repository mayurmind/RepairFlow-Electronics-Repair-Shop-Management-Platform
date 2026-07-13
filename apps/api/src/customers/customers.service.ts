import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import { createCustomerSchema } from "@repairflow/validation";

@Injectable()
export class CustomersService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  async create(data: any, actorId: string) {
    const parsed = createCustomerSchema.safeParse(data);
    if (!parsed.success) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Invalid customer fields.",
        details: parsed.error.issues,
      });
    }

    const { fullName, phone, email, address, notes, alternatePhone } =
      parsed.data;

    // Check duplicate phone where reasonably possible
    const existing = await this.prisma.customer.findFirst({
      where: { phone, deletedAt: null },
    });
    if (existing) {
      throw new BadRequestException(
        "A customer with this phone number already exists.",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          fullName,
          phone,
          alternatePhone,
          email: email || null,
          address: address || null,
          notes: notes || null,
        },
      });

      await this.auditLogs.createLog(
        tx,
        actorId,
        null,
        "CREATE_CUSTOMER",
        "Customer",
        customer.id,
        null,
        customer,
      );

      return customer;
    });
  }

  async findAll(query: { search?: string; page?: number; limit?: number }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (query.search) {
      const searchTerms = query.search.trim();
      where.OR = [
        { fullName: { contains: searchTerms, mode: "insensitive" } },
        { phone: { contains: searchTerms, mode: "insensitive" } },
        { alternatePhone: { contains: searchTerms, mode: "insensitive" } },
        { email: { contains: searchTerms, mode: "insensitive" } },
        {
          devices: {
            some: {
              OR: [
                {
                  serialNumber: { contains: searchTerms, mode: "insensitive" },
                },
                { imeiNumber: { contains: searchTerms, mode: "insensitive" } },
                { model: { contains: searchTerms, mode: "insensitive" } },
              ],
            },
          },
        },
        {
          tickets: {
            some: {
              ticketNumber: { contains: searchTerms, mode: "insensitive" },
            },
          },
        },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fullName: "asc" },
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
    const customer = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
    });
    if (!customer) {
      throw new NotFoundException("Customer not found");
    }
    return customer;
  }

  async update(id: string, data: any, actorId: string) {
    const customer = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.customer.update({
        where: { id },
        data,
      });

      await this.auditLogs.createLog(
        tx,
        actorId,
        null,
        "UPDATE_CUSTOMER",
        "Customer",
        id,
        customer,
        updated,
      );
      return updated;
    });
  }

  async getDevices(customerId: string) {
    await this.findOne(customerId);
    return this.prisma.device.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getRepairHistory(customerId: string) {
    await this.findOne(customerId);
    return this.prisma.repairTicket.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      include: {
        device: true,
        branch: { select: { name: true, code: true } },
      },
    });
  }
}
