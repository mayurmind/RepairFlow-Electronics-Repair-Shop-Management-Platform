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
import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { CreateRepairTicketDto } from "./dto/create-repair-ticket.dto";
import { FindRepairTicketsQueryDto } from "./dto/find-repair-tickets-query.dto";
import { AssignTechnicianDto } from "./dto/assign-technician.dto";
import { UpdateTicketStatusDto } from "./dto/update-ticket-status.dto";
import { UpsertDiagnosisDto } from "./dto/upsert-diagnosis.dto";
import { DeliverTicketDto } from "./dto/deliver-ticket.dto";
import { verifyCustomerDeviceIntegrity } from "../common/utils/integrity";
import type { Prisma } from "@prisma/client";

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

const STATUS_TRANSITION_ROLES = {
  DIAGNOSING: ["TECHNICIAN", "BRANCH_MANAGER", "OWNER", "SYSTEM_ADMIN"],
  WAITING_FOR_APPROVAL: [
    "TECHNICIAN",
    "BRANCH_MANAGER",
    "OWNER",
    "SYSTEM_ADMIN",
  ],
  APPROVED: ["FRONT_DESK", "BRANCH_MANAGER", "OWNER", "SYSTEM_ADMIN"],
  REJECTED: ["FRONT_DESK", "BRANCH_MANAGER", "OWNER", "SYSTEM_ADMIN"],
  CANCELLED: ["FRONT_DESK", "BRANCH_MANAGER", "OWNER", "SYSTEM_ADMIN"],
  REPAIR_IN_PROGRESS: ["TECHNICIAN", "BRANCH_MANAGER", "OWNER", "SYSTEM_ADMIN"],
  PARTS_REQUIRED: ["TECHNICIAN", "BRANCH_MANAGER", "OWNER", "SYSTEM_ADMIN"],
  UNREPAIRABLE: ["TECHNICIAN", "BRANCH_MANAGER", "OWNER", "SYSTEM_ADMIN"],
  READY_FOR_COLLECTION: [
    "TECHNICIAN",
    "BRANCH_MANAGER",
    "OWNER",
    "SYSTEM_ADMIN",
  ],
  DELIVERED: ["FRONT_DESK", "BRANCH_MANAGER", "OWNER", "SYSTEM_ADMIN"],
} as const;

@Injectable()
export class RepairTicketsService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  private async generateTicketNumber(
    tx: Prisma.TransactionClient,
    branchId: string,
  ): Promise<string> {
    const branch = await tx.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      throw new NotFoundException("Branch not found");
    }

    const counter = await tx.sequenceCounter.upsert({
      where: { name: "ticket" },
      create: { name: "ticket", value: 1 },
      update: { value: { increment: 1 } },
    });

    const currentYear = new Date().getFullYear();
    const seqStr = String(counter.value).padStart(6, "0");
    return `RF-${branch.code}-${currentYear}-${seqStr}`;
  }

  async create(dto: CreateRepairTicketDto, actor: AuthenticatedUser) {
    // Map DTO publicNotes/internalNotes to initialPublicNote/initialInternalNote for schema validation compatibility
    const schemaInput = {
      ...dto,
      initialPublicNote: dto.initialPublicNote,
      initialInternalNote: dto.initialInternalNote,
    };

    const parsed = createTicketSchema.safeParse(schemaInput);
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
      if (!actor.branches?.map((b) => b.id).includes(branchId)) {
        throw new ForbiddenException(
          "You cannot create tickets for a branch you do not belong to.",
        );
      }
    }

    // Business Rule: Deactivated branches cannot create new tickets
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
    });
    if (!branch || !branch.isActive) {
      throw new BadRequestException(
        "Deactivated branches cannot register new tickets.",
      );
    }

    // Validate customer owner exists, is active (not deleted), and matches the branch
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, branchId, deletedAt: null },
      select: { id: true, branchId: true },
    });
    if (!customer) {
      throw new NotFoundException(
        "Customer profile not found or archived in this branch.",
      );
    }

    // Business Rule: The device must belong to the selected customer and branch
    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, customerId, branchId },
      select: { id: true, customerId: true, branchId: true },
    });
    if (!device) {
      throw new NotFoundException("Device profile not found in this branch.");
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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

  async findAll(actor: AuthenticatedUser, query: FindRepairTicketsQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Security check: Branch access isolation
    if (actor.role !== "SYSTEM_ADMIN" && actor.role !== "OWNER") {
      where.branchId = { in: actor.branches?.map((b) => b.id) || [] };
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

    if ((query as any).createdFrom) {
      where.createdAt = {
        ...where.createdAt,
        gte: new Date((query as any).createdFrom),
      };
    }
    if ((query as any).createdTo) {
      where.createdAt = {
        ...where.createdAt,
        lte: new Date((query as any).createdTo),
      };
    }

    const sortField = (query as any).sort || "createdAt";
    const sortDir = (query as any).sortDirection || "desc";

    const [total, data] = await Promise.all([
      this.prisma.repairTicket.count({ where }),
      this.prisma.repairTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortField]: sortDir },
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

  async findOne(id: string, actor: AuthenticatedUser) {
    const where: any = { id };

    // Security check: Branch access isolation
    if (actor.role !== "SYSTEM_ADMIN" && actor.role !== "OWNER") {
      where.branchId = { in: actor.branches?.map((b) => b.id) || [] };
    }

    const ticket = await this.prisma.repairTicket.findFirst({
      where,
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

  async getTimeline(id: string, actor: AuthenticatedUser) {
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

  async assignTechnician(
    ticketId: string,
    dto: AssignTechnicianDto,
    actor: AuthenticatedUser,
  ) {
    const ticket = await this.findOne(ticketId, actor);

    // Protection: modification denial for delivered tickets
    if (ticket.status === "DELIVERED" || ticket.status === "CANCELLED") {
      throw new BadRequestException(
        "Cannot modify a delivered or cancelled repair ticket.",
      );
    }

    const { technicianId } = dto;

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

    // Business Rule: Technician must belong to the ticket's branch
    const techBranches = tech.userBranches.map(
      (userBranch: { branchId: string }) => userBranch.branchId,
    );
    if (!techBranches.includes(ticket.branchId)) {
      throw new BadRequestException(
        "Selected technician is not assigned to this branch.",
      );
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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

  async updateStatus(
    ticketId: string,
    dto: UpdateTicketStatusDto,
    actor: AuthenticatedUser,
  ) {
    const ticket = await this.findOne(ticketId, actor);

    // Protection: modification denial for delivered tickets
    if (ticket.status === "DELIVERED" || ticket.status === "CANCELLED") {
      throw new BadRequestException(
        "Cannot modify a delivered or cancelled repair ticket.",
      );
    }

    const parsed = updateTicketStatusSchema.safeParse(dto);
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

    if (status === "DELIVERED") {
      throw new BadRequestException(
        "Use the dedicated delivery endpoint to deliver a ticket",
      );
    }

    const permittedRoles =
      STATUS_TRANSITION_ROLES[status as keyof typeof STATUS_TRANSITION_ROLES];
    if (permittedRoles && !permittedRoles.includes(actor.role as any)) {
      throw new ForbiddenException(
        `Role ${actor.role} is not authorized to transition ticket to ${status}.`,
      );
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const dataUpdate: any = { status: status as any };
      if (status === "DIAGNOSING") {
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

  async deliverTicket(
    ticketId: string,
    dto: DeliverTicketDto,
    actor: AuthenticatedUser,
  ) {
    const ticket = await this.findOne(ticketId, actor);

    // Verify it is in READY_FOR_COLLECTION state
    if (ticket.status !== "READY_FOR_COLLECTION") {
      throw new BadRequestException({
        code: "INVALID_STATUS_TRANSITION",
        message: `Cannot deliver device. Ticket status must be READY_FOR_COLLECTION, currently ${ticket.status}.`,
      });
    }

    // Role restrictions: Non-technicians only
    if (actor.role === "TECHNICIAN") {
      throw new ForbiddenException(
        "Technicians are not authorized to confirm device delivery.",
      );
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Invoices deferred from Phase 2, skipping invoice check

      const updated = await tx.repairTicket.update({
        where: { id: ticketId },
        data: {
          status: "DELIVERED",
          deliveredAt: new Date(),
          deliveredById: actor.id,
          deliveryNotes:
            (dto as any).publicNote || "Device delivered to customer.",
        },
      });

      // Insert delivery event into timeline
      await tx.ticketStatusHistory.create({
        data: {
          repairTicketId: ticketId,
          previousStatus: ticket.status as any,
          newStatus: "DELIVERED",
          publicNote:
            (dto as any).publicNote || "Device delivered to customer.",
          internalNote: "Handover completed and delivery confirmed.",
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
        { status: "DELIVERED" },
      );

      return updated;
    });
  }

  async addDiagnosis(
    ticketId: string,
    dto: UpsertDiagnosisDto,
    actor: AuthenticatedUser,
  ) {
    const ticket = await this.findOne(ticketId, actor);

    // Protection: modification denial for delivered tickets
    if (ticket.status === "DELIVERED" || ticket.status === "CANCELLED") {
      throw new BadRequestException(
        "Cannot modify a delivered or cancelled repair ticket.",
      );
    }

    if (
      actor.role === "TECHNICIAN" &&
      ticket.assignedTechnicianId !== actor.id
    ) {
      throw new ForbiddenException(
        "Unassigned technicians cannot submit diagnosis.",
      );
    }

    if (actor.role !== "SYSTEM_ADMIN" && actor.role !== "TECHNICIAN") {
      throw new ForbiddenException(
        "Only assigned technicians or system administrators can record diagnostic findings.",
      );
    }

    const parsed = createDiagnosisSchema.safeParse(dto);
    if (!parsed.success) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Invalid diagnosis inputs.",
        details: parsed.error.issues,
      });
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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

      // Update status based on feasibility
      if (ticket.status === "DIAGNOSING") {
        let newStatus = null;
        let publicNote = "";

        if (parsed.data.repairFeasibility === "UNREPAIRABLE") {
          newStatus = "UNREPAIRABLE";
          publicNote = "Device was diagnosed as unrepairable.";
        } else if (parsed.data.repairFeasibility === "REPAIRABLE") {
          newStatus = "WAITING_FOR_APPROVAL";
          publicNote = "Diagnosis complete. Waiting for customer approval.";
        }

        if (newStatus) {
          await tx.repairTicket.update({
            where: { id: ticketId },
            data: { status: newStatus as any },
          });

          await tx.ticketStatusHistory.create({
            data: {
              repairTicketId: ticketId,
              previousStatus: "DIAGNOSING",
              newStatus: newStatus as any,
              publicNote: publicNote,
              internalNote: "Diagnostic completion automatic transition.",
              changedById: actor.id,
            },
          });

          await this.auditLogs.createLog(
            tx,
            actor.id,
            ticket.branchId,
            "UPDATE_TICKET_STATUS",
            "RepairTicket",
            ticketId,
            { status: ticket.status },
            {
              status: newStatus,
              source: "DIAGNOSIS_COMPLETION",
            },
          );
        }
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

  async getDiagnosis(ticketId: string, actor: AuthenticatedUser) {
    await this.findOne(ticketId, actor);
    return this.prisma.diagnosis.findFirst({
      where: { repairTicketId: ticketId },
      include: { technician: { select: { fullName: true } } },
    });
  }

  // Reopen ticket workflow
  async reopenTicket(ticketId: string, actor: AuthenticatedUser) {
    const ticket = await this.findOne(ticketId, actor);
    if (ticket.status !== "DELIVERED") {
      throw new BadRequestException("Only delivered tickets can be re-opened.");
    }

    // Reopening creates a new ticket linked to original
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
