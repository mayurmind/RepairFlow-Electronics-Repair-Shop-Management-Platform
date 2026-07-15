import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import {
  createCustomerSchema,
  updateCustomerSchema,
} from "@repairflow/validation";
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

  async create(dto: CreateCustomerDto, actor: AuthenticatedUser) {
    const parsed = createCustomerSchema.safeParse(dto);
    if (!parsed.success) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Invalid customer fields.",
        details: parsed.error.issues,
      });
    }

    const { fullName, phone, email, address, notes, alternatePhone, branchId } =
      parsed.data;

    // Validate branch exists and is active
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
    });
    if (!branch || !branch.isActive) {
      throw new BadRequestException("Branch does not exist or is inactive.");
    }

    if (actor.role !== "SYSTEM_ADMIN" && actor.role !== "OWNER") {
      const allowed = actor.branches?.map((b) => b.id) || [];
      if (!allowed.includes(branchId)) {
        throw new ForbiddenException(
          "You do not have access to create a customer in this branch.",
        );
      }
    }

    try {
      return await this.prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const customer = await tx.customer.create({
            data: {
              branchId,
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
            branchId,
            "CREATE_CUSTOMER",
            "Customer",
            customer.id,
            null,
            customer,
          );

          return customer;
        },
      );
    } catch (error: any) {
      if (error.code === "P2002") {
        const target = error.meta?.target as string[];
        if (target?.includes("phone")) {
          throw new ConflictException(
            "Customer phone already exists in this branch",
          );
        }
        if (target?.includes("email")) {
          throw new ConflictException(
            "Customer email already exists in this branch",
          );
        }
      }
      throw error;
    }
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
        branchId: { in: actor.branches?.map((b) => b.id) || [] },
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
    const where: any = { id, deletedAt: null };
    if (actor.role !== "SYSTEM_ADMIN" && actor.role !== "OWNER") {
      where.branchId = { in: actor.branches?.map((b) => b.id) || [] };
    }
    const customer = await this.prisma.customer.findFirst({ where });
    if (!customer) {
      throw new NotFoundException("Customer not found");
    }
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto, actor: AuthenticatedUser) {
    const parsed = updateCustomerSchema.safeParse(dto);
    if (!parsed.success) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Invalid customer fields.",
        details: parsed.error.issues,
      });
    }

    const customer = await this.findOne(id, actor);

    try {
      return await this.prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const updated = await tx.customer.update({
            where: { id },
            data: parsed.data as any,
          });

          await this.auditLogs.createLog(
            tx,
            actor.id,
            customer.branchId,
            "UPDATE_CUSTOMER",
            "Customer",
            id,
            customer,
            updated,
          );
          return updated;
        },
      );
    } catch (error: any) {
      if (error.code === "P2002") {
        const target = error.meta?.target as string[];
        if (target?.includes("phone")) {
          throw new ConflictException(
            "Customer phone already exists in this branch",
          );
        }
        if (target?.includes("email")) {
          throw new ConflictException(
            "Customer email already exists in this branch",
          );
        }
      }
      throw error;
    }
  }

  async getDevices(customerId: string, actor: AuthenticatedUser) {
    const customer = await this.findOne(customerId, actor);
    return this.prisma.device.findMany({
      where: { customerId, branchId: customer.branchId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getRepairHistory(customerId: string, actor: AuthenticatedUser) {
    const customer = await this.findOne(customerId, actor);
    return this.prisma.repairTicket.findMany({
      where: { customerId, branchId: customer.branchId },
      orderBy: { createdAt: "desc" },
      include: {
        device: true,
        branch: { select: { name: true, code: true } },
      },
    });
  }
}
