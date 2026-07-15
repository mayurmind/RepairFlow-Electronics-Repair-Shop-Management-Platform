import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import { createCustomerSchema } from "@repairflow/validation";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { FindCustomersQueryDto } from "./dto/find-customers-query.dto";
import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import type { Prisma } from "@prisma/client";

@Injectable()
export class CustomersService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  async checkCustomerAccess(customerId: string, actor: AuthenticatedUser) {
    if (actor.role === "SYSTEM_ADMIN" || actor.role === "OWNER") {
      return;
    }

    const hasTickets = await this.prisma.repairTicket.count({
      where: { customerId },
    });

    if (hasTickets === 0) {
      return;
    }

    const accessibleTicket = await this.prisma.repairTicket.findFirst({
      where: {
        customerId,
        branchId: {
          in: actor.branches?.map((branch) => branch.id) ?? [],
        },
      },
      select: { id: true },
    });

    if (!accessibleTicket) {
      throw new ForbiddenException("You do not have access to this customer.");
    }
  }

  async create(dto: CreateCustomerDto, actor: AuthenticatedUser) {
    const parsed = createCustomerSchema.safeParse(dto);
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

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
        actor.id,
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

  async findAll(query: FindCustomersQueryDto, actor: AuthenticatedUser) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    const andClauses: any[] = [];

    // Branch isolation scope
    if (actor.role !== "SYSTEM_ADMIN" && actor.role !== "OWNER") {
      andClauses.push({
        OR: [
          { tickets: { none: {} } },
          {
            tickets: {
              some: {
                branchId: { in: actor.branches?.map((b) => b.id) || [] },
              },
            },
          },
        ],
      });
    }

    if (query.search) {
      const searchTerms = query.search.trim();
      andClauses.push({
        OR: [
          { fullName: { contains: searchTerms, mode: "insensitive" } },
          { phone: { contains: searchTerms, mode: "insensitive" } },
          { alternatePhone: { contains: searchTerms, mode: "insensitive" } },
          { email: { contains: searchTerms, mode: "insensitive" } },
          {
            devices: {
              some: {
                OR: [
                  {
                    serialNumber: {
                      contains: searchTerms,
                      mode: "insensitive",
                    },
                  },
                  {
                    imeiNumber: { contains: searchTerms, mode: "insensitive" },
                  },
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
        ],
      });
    }

    if (andClauses.length > 0) {
      where.AND = andClauses;
    }

    const sortField = (query as any).sort || "createdAt";
    const sortDir = (query as any).sortDirection || "desc";

    const [total, data] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortField]: sortDir },
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
    const customer = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
    });
    if (!customer) {
      throw new NotFoundException("Customer not found");
    }
    await this.checkCustomerAccess(id, actor);
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto, actor: AuthenticatedUser) {
    const customer = await this.findOne(id, actor);

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.customer.update({
        where: { id },
        data: dto as any,
      });

      await this.auditLogs.createLog(
        tx,
        actor.id,
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

  async getDevices(customerId: string, actor: AuthenticatedUser) {
    await this.findOne(customerId, actor);
    return this.prisma.device.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getRepairHistory(customerId: string, actor: AuthenticatedUser) {
    await this.findOne(customerId, actor);
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
