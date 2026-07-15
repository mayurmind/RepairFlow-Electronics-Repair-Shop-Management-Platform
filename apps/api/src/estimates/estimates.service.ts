import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import { createEstimateSchema } from "@repairflow/validation";
import * as crypto from "crypto";
import { EstimateStatus, TicketStatus } from "@repairflow/shared-types";
import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import type { Prisma } from "@prisma/client";

@Injectable()
export class EstimatesService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  private async generateEstimateNumber(
    tx: Prisma.TransactionClient,
    branchCode: string,
  ): Promise<string> {
    const counter = await tx.sequenceCounter.update({
      where: { name: "estimate" },
      data: { value: { increment: 1 } },
    });
    const seqStr = String(counter.value).padStart(6, "0");
    return `EST-${branchCode}-2026-${seqStr}`;
  }

  async create(ticketId: string, data: any, actor: AuthenticatedUser) {
    // Validate ticket exists
    const ticket = await this.prisma.repairTicket.findUnique({
      where: { id: ticketId },
      include: { branch: true },
    });
    if (!ticket) {
      throw new NotFoundException("Repair ticket not found.");
    }

    const parsed = createEstimateSchema.safeParse(data);
    if (!parsed.success) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Invalid estimate inputs.",
        details: parsed.error.issues,
      });
    }

    const { items, validUntil, customerNotes, internalNotes } = parsed.data;

    // Backend calculation of prices (integers, in cents) (Business Rule 12)
    let subtotal = 0;
    const estimateItems = items.map((item) => {
      const totalPrice = item.quantity * item.unitPrice;
      subtotal += totalPrice;
      return {
        itemType: item.itemType as any,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice,
      };
    });

    const taxAmount = Math.round(subtotal * 0.1); // Default 10% tax rate
    const discountAmount = 0; // No discount in draft by default
    const totalAmount = subtotal + taxAmount - discountAmount;

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const estimateNumber = await this.generateEstimateNumber(
        tx,
        ticket.branch.code,
      );

      const estimate = await tx.estimate.create({
        data: {
          estimateNumber,
          repairTicketId: ticketId,
          status: "DRAFT",
          subtotal,
          taxAmount,
          discountAmount,
          totalAmount,
          validUntil: new Date(validUntil),
          customerNotes: customerNotes || null,
          internalNotes: internalNotes || null,
          createdById: actor.id,
          items: {
            createMany: {
              data: estimateItems,
            },
          },
        },
        include: { items: true },
      });

      // Audit Log
      await this.auditLogs.createLog(
        tx,
        actor.id,
        ticket.branchId,
        "CREATE_ESTIMATE",
        "Estimate",
        estimate.id,
        null,
        estimate,
      );

      return estimate;
    });
  }

  async findAll(
    actor: AuthenticatedUser,
    query: {
      ticketId?: string;
      status?: EstimateStatus;
      page?: number;
      limit?: number;
    },
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Branch access isolation
    if (actor.role !== "SYSTEM_ADMIN" && actor.role !== "OWNER") {
      const assignedBranchIds = actor.branches?.map((b) => b.id) || [];
      where.repairTicket = {
        branchId: { in: assignedBranchIds },
      };
    }

    if (query.ticketId) where.repairTicketId = query.ticketId;
    if (query.status) where.status = query.status;

    const [total, data] = await Promise.all([
      this.prisma.estimate.count({ where }),
      this.prisma.estimate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          repairTicket: {
            select: {
              ticketNumber: true,
              customer: { select: { fullName: true } },
            },
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
    const estimate = await this.prisma.estimate.findUnique({
      where: { id },
      include: {
        items: true,
        repairTicket: {
          include: {
            customer: { select: { fullName: true, phone: true, email: true } },
            device: {
              select: { brand: true, model: true, serialNumber: true },
            },
            branch: true,
          },
        },
      },
    });

    if (!estimate) {
      throw new NotFoundException("Estimate not found.");
    }

    // Branch authorization check
    if (actor.role !== "SYSTEM_ADMIN" && actor.role !== "OWNER") {
      const assignedBranchIds = actor.branches?.map((b) => b.id) || [];
      if (!assignedBranchIds.includes(estimate.repairTicket.branchId)) {
        throw new ForbiddenException("Branch access isolation violation.");
      }
    }

    return estimate;
  }

  async send(id: string, actor: AuthenticatedUser) {
    const estimate = await this.findOne(id, actor);
    if (estimate.status !== "DRAFT") {
      throw new BadRequestException("Only draft estimates can be sent.");
    }

    // Generate secure customer token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = this.hashToken(rawToken);
    const tokenExpiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days expiry

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Deactivate old decisions if any
      await tx.estimateDecision.deleteMany({ where: { estimateId: id } });

      // Create decision record holding token
      await tx.estimateDecision.create({
        data: {
          estimateId: id,
          decision: "APPROVED", // Will be determined when customer updates, initial record holds token
          tokenHash,
          tokenExpiresAt,
        },
      });

      const updated = await tx.estimate.update({
        where: { id },
        data: {
          status: "SENT",
          sentAt: new Date(),
        },
      });

      // Automatically update repair ticket status from DIAGNOSING to WAITING_FOR_APPROVAL
      if (estimate.repairTicket.status === "DIAGNOSING") {
        await tx.repairTicket.update({
          where: { id: estimate.repairTicketId },
          data: { status: "WAITING_FOR_APPROVAL" },
        });

        await tx.ticketStatusHistory.create({
          data: {
            repairTicketId: estimate.repairTicketId,
            previousStatus: "DIAGNOSING",
            newStatus: "WAITING_FOR_APPROVAL",
            publicNote: "Estimate generated and sent to customer.",
            internalNote: `Estimate ${estimate.estimateNumber} sent.`,
            changedById: actor.id,
          },
        });
      }

      await this.auditLogs.createLog(
        tx,
        actor.id,
        estimate.repairTicket.branchId,
        "SEND_ESTIMATE",
        "Estimate",
        id,
      );

      return {
        estimate: updated,
        publicLinkToken: rawToken,
      };
    });
  }

  async cancel(id: string, actor: AuthenticatedUser) {
    const estimate = await this.findOne(id, actor);
    if (["APPROVED", "REJECTED", "CANCELLED"].includes(estimate.status)) {
      throw new BadRequestException(
        `Cannot cancel estimate with status ${estimate.status}`,
      );
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.estimate.update({
        where: { id },
        data: { status: "CANCELLED" },
      });

      // Clear tokens
      await tx.estimateDecision.deleteMany({ where: { estimateId: id } });

      await this.auditLogs.createLog(
        tx,
        actor.id,
        estimate.repairTicket.branchId,
        "CANCEL_ESTIMATE",
        "Estimate",
        id,
      );

      return updated;
    });
  }

  // Public portal endpoint: Fetch estimate by token
  async findByPublicToken(token: string) {
    const tokenHash = this.hashToken(token);
    const decision = await this.prisma.estimateDecision.findUnique({
      where: { tokenHash },
      include: {
        estimate: {
          include: {
            items: true,
            repairTicket: {
              include: {
                device: { select: { brand: true, model: true } },
                branch: {
                  select: {
                    name: true,
                    phone: true,
                    email: true,
                    addressLine1: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!decision) {
      throw new NotFoundException("Invalid or expired tracking token.");
    }

    if (decision.tokenExpiresAt < new Date()) {
      throw new BadRequestException("This estimate review link has expired.");
    }

    // Sanitize estimate details to hide internal columns before returning (Business Rule 19)
    const { estimate } = decision;
    const sanitizedTicket = {
      ticketNumber: estimate.repairTicket.ticketNumber,
      device: estimate.repairTicket.device,
      branch: estimate.repairTicket.branch,
      status: estimate.repairTicket.status,
    };

    return {
      id: estimate.id,
      estimateNumber: estimate.estimateNumber,
      subtotal: estimate.subtotal,
      taxAmount: estimate.taxAmount,
      discountAmount: estimate.discountAmount,
      totalAmount: estimate.totalAmount,
      validUntil: estimate.validUntil,
      customerNotes: estimate.customerNotes,
      status: estimate.status,
      items: estimate.items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
      })),
      ticket: sanitizedTicket,
      decisionTime: decision.decisionAt,
      decisionType: estimate.status === "SENT" ? null : decision.decision,
    };
  }

  // Public customer decision
  async makePublicDecision(
    token: string,
    decisionInput: {
      decision: "APPROVED" | "REJECTED";
      customerComment?: string;
    },
    ipAddress: string,
    userAgent: string,
  ) {
    const tokenHash = this.hashToken(token);
    const decisionRecord = await this.prisma.estimateDecision.findUnique({
      where: { tokenHash },
      include: { estimate: { include: { repairTicket: true } } },
    });

    if (!decisionRecord) {
      throw new NotFoundException("Review token invalid.");
    }

    if (decisionRecord.tokenExpiresAt < new Date()) {
      // Business Rule 9
      throw new BadRequestException(
        "Estimate has expired and cannot be approved.",
      );
    }

    // Business Rule 10: One decision only
    if (
      decisionRecord.estimate.status === "APPROVED" ||
      decisionRecord.estimate.status === "REJECTED"
    ) {
      throw new BadRequestException(
        "Decision has already been made for this estimate.",
      );
    }

    const { decision, customerComment } = decisionInput;

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Update decision record
      await tx.estimateDecision.update({
        where: { id: decisionRecord.id },
        data: {
          decision,
          decisionAt: new Date(), // Business Rule 11
          customerComment: customerComment || null,
          ipAddress,
          userAgent,
        },
      });

      // Update estimate status
      const updatedEstimate = await tx.estimate.update({
        where: { id: decisionRecord.estimateId },
        data: {
          status: decision as any,
          approvedAt: decision === "APPROVED" ? new Date() : null,
          rejectedAt: decision === "REJECTED" ? new Date() : null,
        },
      });

      // Auto update repair ticket status based on decision
      const newTicketStatus: TicketStatus =
        decision === "APPROVED" ? "APPROVED" : "REJECTED";
      await tx.repairTicket.update({
        where: { id: decisionRecord.estimate.repairTicketId },
        data: { status: newTicketStatus as any },
      });

      await tx.ticketStatusHistory.create({
        data: {
          repairTicketId: decisionRecord.estimate.repairTicketId,
          previousStatus: "WAITING_FOR_APPROVAL",
          newStatus: newTicketStatus as any,
          publicNote: `Estimate reviewed by customer: ${decision}.`,
          internalNote: `Customer comment: ${customerComment || "None"}`,
          changedById: decisionRecord.estimate.createdById, // Attributed to estimate creator as proxy
        },
      });

      // Notify technician / staff
      await tx.notification.create({
        data: {
          userId: decisionRecord.estimate.createdById,
          title: `Estimate ${decision}`,
          message: `Customer ${decision} estimate ${decisionRecord.estimate.estimateNumber} for ticket ${decisionRecord.estimate.repairTicket.ticketNumber}.`,
          link: `/tickets/${decisionRecord.estimate.repairTicketId}`,
        },
      });

      // Audit Log
      await this.auditLogs.createLog(
        tx,
        null,
        decisionRecord.estimate.repairTicket.branchId,
        `CUSTOMER_${decision}_ESTIMATE`,
        "Estimate",
        decisionRecord.estimateId,
        null,
        { decision, ipAddress, customerComment },
      );

      return updatedEstimate;
    });
  }
}
