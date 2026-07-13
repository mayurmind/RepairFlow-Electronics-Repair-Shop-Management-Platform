import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import {
  createTicketSchema,
  updateTicketStatusSchema,
  createDiagnosisSchema,
} from "@repairflow/validation";
import {
  TicketStatus,
  TicketPriority,
  RepairFeasibility,
  UserRole,
} from "@repairflow/shared-types";

const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  RECEIVED: ["DIAGNOSING", "CANCELLED"],
  DIAGNOSING: ["WAITING_FOR_APPROVAL", "UNREPAIRABLE", "CANCELLED"],
  WAITING_FOR_APPROVAL: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["REPAIR_IN_PROGRESS"],
  REPAIR_IN_PROGRESS: ["READY_FOR_COLLECTION", "PARTS_REQUIRED"],
  PARTS_REQUIRED: ["REPAIR_IN_PROGRESS"],
  READY_FOR_COLLECTION: ["DELIVERED"],
  DELIVERED: [], // Terminal state
  REJECTED: ["READY_FOR_COLLECTION"],
  UNREPAIRABLE: ["READY_FOR_COLLECTION"],
  CANCELLED: [], // Terminal state
};

@Injectable()
export class RepairTicketsService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  private async generateTicketNumber(
    tx: any,
    branchId: string,
  ): Promise<string> {
    const branch = await tx.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      throw new NotFoundException("Branch not found");
    }

    const counter = await tx.sequenceCounter.update({
      where: { name: "ticket" },
      data: { value: { increment: 1 } },
    });

    const seqStr = String(counter.value).padStart(6, "0");
    return `RF-${branch.code}-2026-${seqStr}`;
  }

  async create(data: any, actor: any) {
    const parsed = createTicketSchema.safeParse(data);
    if (!parsed.success) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Invalid ticket fields.",
        details: parsed.error.issues,
      });
    }

    const {
      customerId,
      deviceId,
      branchId,
      reportedProblem,
      existingDamage,
      conditionNotes,
      accessories,
      priority,
      expectedCompletionAt,
      initialPublicNote,
      initialInternalNote,
    } = parsed.data;

    // Validate branch access for non-admins
    if (actor.role !== "SYSTEM_ADMIN" && actor.role !== "OWNER") {
      const assignedBranchIds = actor.branches?.map((b: any) => b.id) || [];
      if (!assignedBranchIds.includes(branchId)) {
        throw new ForbiddenException(
          "You cannot create tickets for a branch you do not belong to.",
        );
      }
    }

    // Business Rule 20: Deactivated branches cannot create new tickets
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
    });
    if (!branch || !branch.isActive) {
      throw new BadRequestException(
        "Deactivated branches cannot register new tickets.",
      );
    }

    // Business Rule 3: The device must belong to the selected customer
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
    });
    if (!device || device.customerId !== customerId) {
      throw new BadRequestException(
        "The selected device must belong to the selected customer.",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const ticketNumber = await this.generateTicketNumber(tx, branchId);

      const ticket = await tx.repairTicket.create({
        data: {
          ticketNumber,
          branchId,
          customerId,
          deviceId,
          createdById: actor.id,
          priority: priority as any,
          status: "RECEIVED",
          reportedProblem,
          existingDamage: existingDamage || null,
          conditionNotes: conditionNotes || null,
          accessories: accessories || null,
          internalNotes: initialInternalNote || null,
          publicNotes: initialPublicNote || "Device checked in and received.",
          expectedCompletionAt: expectedCompletionAt
            ? new Date(expectedCompletionAt)
            : null,
        },
      });

      // Status history log
      await tx.ticketStatusHistory.create({
        data: {
          repairTicketId: ticket.id,
          previousStatus: "RECEIVED",
          newStatus: "RECEIVED",
          publicNote: initialPublicNote || "Device received.",
          internalNote: initialInternalNote || "Ticket created in database.",
          changedById: actor.id,
        },
      });

      // Audit Log
      await this.auditLogs.createLog(
        tx,
        actor.id,
        branchId,
        "CREATE_REPAIR_TICKET",
        "RepairTicket",
        ticket.id,
        null,
        ticket,
      );

      return ticket;
    });
  }

  async findAll(
    actor: any,
    query: {
      search?: string;
      status?: TicketStatus;
      priority?: TicketPriority;
      branchId?: string;
      technicianId?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Security check: Branch access isolation
    if (actor.role !== "SYSTEM_ADMIN" && actor.role !== "OWNER") {
      const assignedBranchIds = actor.branches?.map((b: any) => b.id) || [];
      where.branchId = { in: assignedBranchIds };
    } else if (query.branchId) {
      where.branchId = query.branchId;
    }

    // Security check: Technicians see only assigned jobs
    if (actor.role === "TECHNICIAN") {
      where.assignedTechnicianId = actor.id;
    } else if (query.technicianId) {
      where.assignedTechnicianId = query.technicianId;
    }

    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;

    if (query.search) {
      const searchTerms = query.search.trim();
      where.OR = [
        { ticketNumber: { contains: searchTerms, mode: "insensitive" } },
        { reportedProblem: { contains: searchTerms, mode: "insensitive" } },
        {
          customer: {
            OR: [
              { fullName: { contains: searchTerms, mode: "insensitive" } },
              { phone: { contains: searchTerms, mode: "insensitive" } },
            ],
          },
        },
        {
          device: {
            OR: [
              { brand: { contains: searchTerms, mode: "insensitive" } },
              { model: { contains: searchTerms, mode: "insensitive" } },
              { serialNumber: { contains: searchTerms, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.repairTicket.count({ where }),
      this.prisma.repairTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { fullName: true, phone: true } },
          device: { select: { brand: true, model: true, serialNumber: true } },
          assignedTechnician: { select: { fullName: true } },
          branch: { select: { name: true, code: true } },
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

  async findOne(id: string, actor: any) {
    const ticket = await this.prisma.repairTicket.findUnique({
      where: { id },
      include: {
        customer: true,
        device: true,
        assignedTechnician: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        createdBy: { select: { fullName: true } },
        deliveredBy: { select: { fullName: true } },
        branch: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException("Repair ticket not found.");
    }

    // Security check: Branch access isolation
    if (actor.role !== "SYSTEM_ADMIN" && actor.role !== "OWNER") {
      const assignedBranchIds = actor.branches?.map((b: any) => b.id) || [];
      if (!assignedBranchIds.includes(ticket.branchId)) {
        throw new ForbiddenException("Branch access isolation violation.");
      }
    }

    // Security check: Technician assignment check
    if (
      actor.role === "TECHNICIAN" &&
      ticket.assignedTechnicianId !== actor.id
    ) {
      throw new ForbiddenException(
        "Access denied: You are not assigned to this repair ticket.",
      );
    }

    return ticket;
  }

  async getTimeline(id: string, actor: any) {
    // Validate access to ticket
    await this.findOne(id, actor);

    return this.prisma.ticketStatusHistory.findMany({
      where: { repairTicketId: id },
      orderBy: { createdAt: "desc" },
      include: {
        changedBy: { select: { fullName: true, role: true } },
      },
    });
  }

  async assignTechnician(ticketId: string, technicianId: string, actor: any) {
    const ticket = await this.findOne(ticketId, actor);

    // Validate technician exists and is active
    const tech = await this.prisma.user.findFirst({
      where: { id: technicianId, role: "TECHNICIAN", status: "ACTIVE" },
      include: { userBranches: true },
    });
    if (!tech) {
      throw new BadRequestException(
        "Selected user is not an active technician.",
      );
    }

    // Business Rule 4: Technician must belong to the ticket's branch
    const techBranches = tech.userBranches.map((ub) => ub.branchId);
    if (!techBranches.includes(ticket.branchId)) {
      throw new BadRequestException(
        "Selected technician is not assigned to this branch.",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Deactivate old assignment
      await tx.technicianAssignmentHistory.updateMany({
        where: { repairTicketId: ticketId, removedAt: null },
        data: { removedAt: new Date() },
      });

      // Create new assignment log
      await tx.technicianAssignmentHistory.create({
        data: {
          repairTicketId: ticketId,
          technicianId,
          assignedById: actor.id,
        },
      });

      // Update ticket
      const updated = await tx.repairTicket.update({
        where: { id: ticketId },
        data: { assignedTechnicianId: technicianId },
      });

      // Write in-app notification for technician
      await tx.notification.create({
        data: {
          userId: technicianId,
          title: "New Job Assigned",
          message: `Ticket ${ticket.ticketNumber} (${ticket.device.brand} ${ticket.device.model}) has been assigned to you.`,
          link: `/tickets/${ticketId}`,
        },
      });

      // Audit Log
      await this.auditLogs.createLog(
        tx,
        actor.id,
        ticket.branchId,
        "ASSIGN_TECHNICIAN",
        "RepairTicket",
        ticketId,
        { assignedTechnicianId: ticket.assignedTechnicianId },
        { assignedTechnicianId: technicianId },
      );

      return updated;
    });
  }

  async updateStatus(ticketId: string, statusData: any, actor: any) {
    const ticket = await this.findOne(ticketId, actor);
    const parsed = updateTicketStatusSchema.safeParse(statusData);
    if (!parsed.success) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Invalid status transition input.",
        details: parsed.error.issues,
      });
    }

    const { status, publicNote, internalNote } = parsed.data;

    // Check transition validity
    const allowed = VALID_TRANSITIONS[ticket.status as TicketStatus] || [];
    if (!allowed.includes(status as any)) {
      throw new BadRequestException({
        code: "INVALID_STATUS_TRANSITION",
        message: `Cannot transition repair ticket status from ${ticket.status} to ${status}.`,
      });
    }

    // Role restrictions
    if (status === "DELIVERED") {
      if (actor.role === "TECHNICIAN") {
        throw new ForbiddenException(
          "Technicians are not authorized to confirm device delivery.",
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // If status is DELIVERED, make sure it matches rules
      const dataUpdate: any = { status: status as any };
      if (status === "DELIVERED") {
        // Business Rule 16: Check invoice and delivery confirmation
        const unpaidInvoices = await tx.invoice.findFirst({
          where: {
            repairTicketId: ticketId,
            status: { in: ["UNPAID", "PARTIALLY_PAID"] },
          },
        });
        if (unpaidInvoices) {
          throw new BadRequestException(
            "Cannot deliver device. There are unpaid invoices associated with this ticket.",
          );
        }

        dataUpdate.deliveredAt = new Date();
        dataUpdate.deliveredById = actor.id;
        dataUpdate.deliveryNotes =
          publicNote || "Device delivered to customer.";
      } else if (status === "DIAGNOSING") {
        dataUpdate.diagnosisStartedAt = new Date();
      } else if (status === "REPAIR_IN_PROGRESS") {
        dataUpdate.repairStartedAt = new Date();
      } else if (status === "READY_FOR_COLLECTION") {
        dataUpdate.readyAt = new Date();
        dataUpdate.completedAt = new Date();
        // Notify owner / customer
        await tx.notification.create({
          data: {
            userId: ticket.createdById,
            title: "Repair Complete",
            message: `Ticket ${ticket.ticketNumber} is ready for collection.`,
            link: `/tickets/${ticketId}`,
          },
        });
      }

      const updated = await tx.repairTicket.update({
        where: { id: ticketId },
        data: dataUpdate,
      });

      // Write status history
      await tx.ticketStatusHistory.create({
        data: {
          repairTicketId: ticketId,
          previousStatus: ticket.status as any,
          newStatus: status as any,
          publicNote: publicNote || null,
          internalNote: internalNote || null,
          changedById: actor.id,
        },
      });

      // Audit Log
      await this.auditLogs.createLog(
        tx,
        actor.id,
        ticket.branchId,
        "UPDATE_TICKET_STATUS",
        "RepairTicket",
        ticketId,
        { status: ticket.status },
        { status },
      );

      return updated;
    });
  }

  async addDiagnosis(ticketId: string, diagData: any, actor: any) {
    const ticket = await this.findOne(ticketId, actor);
    if (actor.role !== "TECHNICIAN" && actor.role !== "SYSTEM_ADMIN") {
      throw new ForbiddenException(
        "Only assigned technicians can record diagnostic findings.",
      );
    }

    const parsed = createDiagnosisSchema.safeParse(diagData);
    if (!parsed.success) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Invalid diagnosis inputs.",
        details: parsed.error.issues,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      // Check if diagnosis exists
      const existing = await tx.diagnosis.findFirst({
        where: { repairTicketId: ticketId },
      });

      let diagnosis;
      if (existing) {
        diagnosis = await tx.diagnosis.update({
          where: { id: existing.id },
          data: { ...parsed.data, technicianId: actor.id } as any,
        });
      } else {
        diagnosis = await tx.diagnosis.create({
          data: {
            ...parsed.data,
            repairTicketId: ticketId,
            technicianId: actor.id,
          } as any,
        });
      }

      // If feasibility is UNREPAIRABLE, update status
      if (
        parsed.data.repairFeasibility === "UNREPAIRABLE" &&
        ticket.status === "DIAGNOSING"
      ) {
        await tx.repairTicket.update({
          where: { id: ticketId },
          data: { status: "UNREPAIRABLE" },
        });

        await tx.ticketStatusHistory.create({
          data: {
            repairTicketId: ticketId,
            previousStatus: "DIAGNOSING",
            newStatus: "UNREPAIRABLE",
            publicNote: "Device was diagnosed as unrepairable.",
            internalNote: "Diagnostic completion automatic transition.",
            changedById: actor.id,
          },
        });
      }

      await this.auditLogs.createLog(
        tx,
        actor.id,
        ticket.branchId,
        "ADD_DIAGNOSIS",
        "Diagnosis",
        diagnosis.id,
        existing,
        diagnosis,
      );

      return diagnosis;
    });
  }

  async getDiagnosis(ticketId: string, actor: any) {
    await this.findOne(ticketId, actor);
    return this.prisma.diagnosis.findFirst({
      where: { repairTicketId: ticketId },
      include: { technician: { select: { fullName: true } } },
    });
  }

  // Reopen ticket workflow
  async reopenTicket(ticketId: string, actor: any) {
    const ticket = await this.findOne(ticketId, actor);
    if (ticket.status !== "DELIVERED") {
      throw new BadRequestException("Only delivered tickets can be re-opened.");
    }

    // Reopening creates a new ticket linked to original (Business Rule 15)
    return this.prisma.$transaction(async (tx) => {
      const newNum = await this.generateTicketNumber(tx, ticket.branchId);

      const newTicket = await tx.repairTicket.create({
        data: {
          ticketNumber: newNum,
          branchId: ticket.branchId,
          customerId: ticket.customerId,
          deviceId: ticket.deviceId,
          createdById: actor.id,
          priority: ticket.priority,
          status: "RECEIVED",
          reportedProblem: `REOPENED JOB (Original Ref: ${ticket.ticketNumber}): ${ticket.reportedProblem}`,
          existingDamage: ticket.existingDamage,
          conditionNotes: ticket.conditionNotes,
          accessories: ticket.accessories,
          internalNotes: `Linked to original ticket ${ticket.id}`,
          publicNotes: `Re-opened repair from ticket ${ticket.ticketNumber}`,
        },
      });

      await tx.ticketStatusHistory.create({
        data: {
          repairTicketId: newTicket.id,
          previousStatus: "RECEIVED",
          newStatus: "RECEIVED",
          publicNote: "Job re-opened with new repair ticket.",
          internalNote: `Linked from original ticket ${ticket.ticketNumber}`,
          changedById: actor.id,
        },
      });

      await this.auditLogs.createLog(
        tx,
        actor.id,
        ticket.branchId,
        "REOPEN_TICKET",
        "RepairTicket",
        newTicket.id,
        { originalTicketId: ticketId },
        { newTicketId: newTicket.id },
      );

      return newTicket;
    });
  }
}
