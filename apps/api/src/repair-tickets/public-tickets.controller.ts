import {
  Controller,
  Get,
  Param,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import * as crypto from "crypto";

@ApiTags("Public Customer Operations")
@Controller("public")
export class PublicTicketsController {
  constructor(private readonly prisma: PrismaService) {}

  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  @Throttle({ default: { limit: 15, ttl: 60 } })
  @Get("track/:token")
  @ApiOperation({
    summary:
      "Customer tracks repair status and public timeline using secure token",
  })
  async trackTicket(@Param("token") token: string) {
    const tokenHash = this.hashToken(token);

    // Find the estimate decision holding this token
    const decision = await this.prisma.estimateDecision.findUnique({
      where: { tokenHash },
      include: {
        estimate: {
          include: {
            repairTicket: {
              include: {
                branch: {
                  select: {
                    name: true,
                    phone: true,
                    email: true,
                    addressLine1: true,
                  },
                },
                device: { select: { brand: true, model: true } },
                customer: { select: { fullName: true } },
                statusHistory: {
                  orderBy: { createdAt: "desc" },
                  include: {
                    changedBy: { select: { fullName: true, role: true } },
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
      throw new BadRequestException("This tracking link has expired.");
    }

    const ticket = decision.estimate.repairTicket;

    // Sanitize timeline: only show public status changes and public notes (Business Rule 19)
    const publicTimeline = ticket.statusHistory.map((h) => ({
      previousStatus: h.previousStatus,
      newStatus: h.newStatus,
      note: h.publicNote || "Status updated.",
      timestamp: h.createdAt,
    }));

    return {
      success: true,
      data: {
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
        priority: ticket.priority,
        reportedProblem: ticket.reportedProblem,
        conditionNotes: ticket.conditionNotes,
        expectedCompletionAt: ticket.expectedCompletionAt,
        publicNotes: ticket.publicNotes,
        branch: ticket.branch,
        device: ticket.device,
        customerName: ticket.customer.fullName,
        timeline: publicTimeline,
        invoiceAvailable:
          (await this.prisma.invoice.count({
            where: { repairTicketId: ticket.id, status: { not: "VOID" } },
          })) > 0,
      },
    };
  }
}
