import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import {
  createInvoiceSchema,
  recordPaymentSchema,
} from "@repairflow/validation";
import { InvoiceStatus, PaymentMethod } from "@repairflow/shared-types";
import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import PDFDocument from "pdfkit";
import { createHash } from "crypto";
import type { Prisma, EstimateItem } from "@prisma/client";

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  private async generateInvoiceNumber(
    tx: Prisma.TransactionClient,
    branchCode: string,
  ): Promise<string> {
    const counter = await tx.sequenceCounter.update({
      where: { name: "invoice" },
      data: { value: { increment: 1 } },
    });
    const seqStr = String(counter.value).padStart(6, "0");
    return `INV-${branchCode}-2026-${seqStr}`;
  }

  async createFromTicket(
    ticketId: string,
    data: any,
    actor: AuthenticatedUser,
  ) {
    const ticket = await this.prisma.repairTicket.findUnique({
      where: { id: ticketId },
      include: {
        branch: true,
        estimates: {
          where: { status: "APPROVED" },
          include: { items: true },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException("Repair ticket not found.");
    }

    // Check if invoice already exists (usually one invoice per ticket)
    const existing = await this.prisma.invoice.findFirst({
      where: { repairTicketId: ticketId, status: { not: "VOID" } },
    });
    if (existing) {
      throw new BadRequestException(
        "An active invoice already exists for this repair ticket.",
      );
    }

    const parsed = createInvoiceSchema.safeParse(data);
    if (!parsed.success) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Invalid invoice fields.",
        details: parsed.error.issues,
      });
    }

    // Load items from approved estimate if available, otherwise fallback to empty or diagnosis
    const approvedEstimate = ticket.estimates[0];
    if (!approvedEstimate) {
      throw new BadRequestException(
        "Cannot create invoice. There is no approved estimate associated with this ticket.",
      );
    }

    const subtotal = approvedEstimate.subtotal;
    const taxAmount = Math.round(subtotal * 0.1); // 10% tax
    const discountAmount = parsed.data.discountAmount || 0;

    // Apply role-based discount validation (Business Rules 17, 18)
    if (discountAmount > 0) {
      if (actor.role === "TECHNICIAN") {
        throw new ForbiddenException("Technicians cannot authorize discounts.");
      }
      if (actor.role === "FRONT_DESK" && discountAmount > 2000) {
        // Max $20.00
        throw new ForbiddenException(
          "Front-desk staff discounts cannot exceed $20.00 (2000 cents).",
        );
      }
      if (actor.role === "BRANCH_MANAGER" && discountAmount > 5000) {
        // Max $50.00
        throw new ForbiddenException(
          "Branch managers discounts cannot exceed $50.00 (5000 cents).",
        );
      }
    }

    const totalAmount = subtotal + taxAmount - discountAmount;

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const invoiceNumber = await this.generateInvoiceNumber(
        tx,
        ticket.branch.code,
      );

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          repairTicketId: ticketId,
          status: "UNPAID",
          subtotal,
          taxAmount,
          discountAmount,
          totalAmount,
          amountPaid: 0,
          balanceDue: totalAmount,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days payment terms
          customerNotes:
            parsed.data.customerNotes || "Thank you for choosing RepairFlow!",
          internalNotes: parsed.data.internalNotes || null,
          createdById: actor.id,
          items: {
            createMany: {
              data: approvedEstimate.items.map((item: EstimateItem) => ({
                itemType: item.itemType,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
              })),
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
        "CREATE_INVOICE",
        "Invoice",
        invoice.id,
        null,
        invoice,
      );

      return invoice;
    });
  }

  async findAll(
    actor: AuthenticatedUser,
    query: { status?: InvoiceStatus; page?: number; limit?: number },
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Branch isolation
    if (actor.role !== "SYSTEM_ADMIN" && actor.role !== "OWNER") {
      const assignedBranchIds = actor.branches?.map((b) => b.id) || [];
      where.repairTicket = {
        branchId: { in: assignedBranchIds },
      };
    }

    if (query.status) where.status = query.status;

    const [total, data] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
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
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        items: true,
        payments: {
          include: { receivedBy: { select: { fullName: true } } },
        },
        repairTicket: {
          include: {
            customer: true,
            device: true,
            branch: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException("Invoice not found.");
    }

    // Branch isolation check
    if (actor.role !== "SYSTEM_ADMIN" && actor.role !== "OWNER") {
      const assignedBranchIds = actor.branches?.map((b) => b.id) || [];
      if (!assignedBranchIds.includes(invoice.repairTicket.branchId)) {
        throw new ForbiddenException("Branch access isolation violation.");
      }
    }

    return invoice;
  }

  async recordPayment(
    invoiceId: string,
    paymentData: any,
    actor: AuthenticatedUser,
  ) {
    const invoice = await this.findOne(invoiceId, actor);
    if (invoice.status === "PAID") {
      throw new BadRequestException("Invoice is already fully paid.");
    }
    if (invoice.status === "VOID") {
      throw new BadRequestException(
        "Cannot record payment on a voided invoice.",
      );
    }

    const parsed = recordPaymentSchema.safeParse(paymentData);
    if (!parsed.success) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Invalid payment inputs.",
        details: parsed.error.issues,
      });
    }

    const { amount, method, referenceNumber, notes } = parsed.data;

    if (amount > invoice.balanceDue) {
      throw new BadRequestException(
        `Payment amount exceeds the outstanding balance of $${(invoice.balanceDue / 100).toFixed(2)}.`,
      );
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Record payment
      const payment = await tx.paymentRecord.create({
        data: {
          invoiceId,
          amount,
          method: method as any,
          referenceNumber: referenceNumber || null,
          receivedById: actor.id,
          notes: notes || null,
        },
      });

      const amountPaid = invoice.amountPaid + amount;
      const balanceDue = invoice.totalAmount - amountPaid;

      let status: InvoiceStatus = "PARTIALLY_PAID";
      if (balanceDue === 0) {
        status = "PAID";
      }

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          amountPaid,
          balanceDue,
          status: status as any,
        },
      });

      // Audit Log
      await this.auditLogs.createLog(
        tx,
        actor.id,
        invoice.repairTicket.branchId,
        "RECORD_PAYMENT",
        "Invoice",
        invoiceId,
        { status: invoice.status, balance: invoice.balanceDue },
        { status, balance: balanceDue, amountReceived: amount },
      );

      return {
        payment,
        invoice: updatedInvoice,
      };
    });
  }

  async voidInvoice(id: string, actor: AuthenticatedUser) {
    const invoice = await this.findOne(id, actor);
    if (invoice.status === "PAID" || invoice.amountPaid > 0) {
      throw new BadRequestException(
        "Cannot void a paid or partially paid invoice. Process a refund instead.",
      );
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.invoice.update({
        where: { id },
        data: { status: "VOID", balanceDue: 0 },
      });

      await this.auditLogs.createLog(
        tx,
        actor.id,
        invoice.repairTicket.branchId,
        "VOID_INVOICE",
        "Invoice",
        id,
      );

      return updated;
    });
  }

  async getPayments(invoiceId: string, actor: AuthenticatedUser) {
    await this.findOne(invoiceId, actor);
    return this.prisma.paymentRecord.findMany({
      where: { invoiceId },
      orderBy: { paidAt: "desc" },
      include: { receivedBy: { select: { fullName: true } } },
    });
  }

  // PDF stream generator using pdfkit
  async generatePdf(invoice: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const buffers: Buffer[] = [];

      doc.on("data", (chunk: any) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err: any) => reject(err));

      // Header Block
      doc
        .fillColor("#1e3a8a") // Deep Navy
        .fontSize(24)
        .text("RepairFlow", 50, 50, { bold: true } as any)
        .fontSize(10)
        .fillColor("#4b5563") // Slate
        .text("Track every device, repair and customer.", 50, 80);

      // Branch Details (Top Right)
      const branch = invoice.repairTicket.branch;
      doc
        .fillColor("#1f2937")
        .fontSize(10)
        .text(branch.name, 400, 50, { align: "right" })
        .text(branch.addressLine1, 400, 65, { align: "right" })
        .text(`${branch.city}, ${branch.state} ${branch.postalCode}`, 400, 80, {
          align: "right",
        })
        .text(`Phone: ${branch.phone}`, 400, 95, { align: "right" });

      // Dividers
      doc.moveTo(50, 120).lineTo(550, 120).strokeColor("#e5e7eb").stroke();

      // Invoice Details Block
      doc
        .fontSize(14)
        .fillColor("#1e3a8a")
        .text("INVOICE", 50, 140, { bold: true } as any)
        .fontSize(10)
        .fillColor("#1f2937")
        .text(`Invoice Number: ${invoice.invoiceNumber}`, 50, 160)
        .text(`Date: ${invoice.invoiceDate.toLocaleDateString()}`, 50, 175)
        .text(`Due Date: ${invoice.dueDate.toLocaleDateString()}`, 50, 190)
        .text(`Ticket Ref: ${invoice.repairTicket.ticketNumber}`, 50, 205);

      // Customer Details (Right)
      const customer = invoice.repairTicket.customer;
      const device = invoice.repairTicket.device;
      doc
        .fontSize(12)
        .fillColor("#1e3a8a")
        .text("BILLED TO:", 300, 140, { bold: true } as any)
        .fontSize(10)
        .fillColor("#1f2937")
        .text(customer.fullName, 300, 160)
        .text(`Phone: ${customer.phone}`, 300, 175)
        .text(`Email: ${customer.email || "N/A"}`, 300, 190)
        .text(
          `Device: ${device.brand} ${device.model} (${device.serialNumber || "No Serial"})`,
          300,
          205,
        );

      // Table Header
      let y = 250;
      doc.rect(50, y, 500, 20).fill("#f3f4f6");
      doc
        .fontSize(10)
        .fillColor("#1e3a8a")
        .text("Description", 60, y + 5)
        .text("Type", 260, y + 5)
        .text("Qty", 360, y + 5)
        .text("Unit Price", 410, y + 5, { align: "right", width: 60 })
        .text("Total", 480, y + 5, { align: "right", width: 60 });

      // Table Items
      y += 20;
      doc.fillColor("#1f2937");
      for (const item of invoice.items) {
        doc.rect(50, y, 500, 20).strokeColor("#f3f4f6").stroke();
        doc
          .text(item.description, 60, y + 5)
          .text(item.itemType, 260, y + 5)
          .text(String(item.quantity), 360, y + 5)
          .text(`$${(item.unitPrice / 100).toFixed(2)}`, 410, y + 5, {
            align: "right",
            width: 60,
          })
          .text(`$${(item.totalPrice / 100).toFixed(2)}`, 480, y + 5, {
            align: "right",
            width: 60,
          });
        y += 20;
      }

      // Totals Box
      y += 10;
      doc.fontSize(10);
      doc
        .text("Subtotal:", 380, y)
        .text(`$${(invoice.subtotal / 100).toFixed(2)}`, 480, y, {
          align: "right",
          width: 60,
        });
      y += 15;
      doc
        .text("Tax (10%):", 380, y)
        .text(`$${(invoice.taxAmount / 100).toFixed(2)}`, 480, y, {
          align: "right",
          width: 60,
        });
      y += 15;
      doc
        .text("Discount:", 380, y)
        .text(`-$${(invoice.discountAmount / 100).toFixed(2)}`, 480, y, {
          align: "right",
          width: 60,
        });
      y += 15;

      doc
        .fontSize(12)
        .fillColor("#1e3a8a")
        .text("Total:", 380, y, { bold: true } as any)
        .text(`$${(invoice.totalAmount / 100).toFixed(2)}`, 480, y, {
          align: "right",
          width: 60,
          bold: true,
        } as any);

      y += 20;
      doc
        .fontSize(10)
        .fillColor("#4b5563")
        .text("Amount Paid:", 380, y)
        .text(`$${(invoice.amountPaid / 100).toFixed(2)}`, 480, y, {
          align: "right",
          width: 60,
        });

      y += 15;
      doc
        .fillColor(invoice.balanceDue > 0 ? "#b91c1c" : "#15803d")
        .text("Balance Due:", 380, y, { bold: true } as any)
        .text(`$${(invoice.balanceDue / 100).toFixed(2)}`, 480, y, {
          align: "right",
          width: 60,
          bold: true,
        } as any);

      // Terms / Footer
      doc
        .fillColor("#4b5563")
        .fontSize(10)
        .text("Terms & Conditions:", 50, 480, { bold: true } as any)
        .text(
          "All repairs carry a 90-day warranty on replaced parts. Payments are due within 7 days of completion.",
          50,
          495,
        )
        .text(`Payment Status: ${invoice.status}`, 50, 520, {
          bold: true,
        } as any);

      doc.end();
    });
  }

  // Public portal helper: Fetch PDF by tracking token
  async getInvoicePdfByPublicToken(
    token: string,
  ): Promise<{ pdfBuffer: Buffer; filename: string }> {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const decision = await this.prisma.estimateDecision.findUnique({
      where: { tokenHash },
      include: {
        estimate: {
          include: {
            repairTicket: {
              include: {
                invoices: {
                  where: { status: { not: "VOID" } },
                  include: {
                    items: true,
                    repairTicket: {
                      include: {
                        branch: true,
                        customer: true,
                        device: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!decision) {
      throw new NotFoundException("Tracking token invalid.");
    }

    const invoice = decision.estimate.repairTicket.invoices[0];
    if (!invoice) {
      throw new NotFoundException(
        "No active invoice generated yet for this repair.",
      );
    }

    const pdfBuffer = await this.generatePdf(invoice);
    return {
      pdfBuffer,
      filename: `${invoice.invoiceNumber}.pdf`,
    };
  }
}
