import { Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(actor: any, branchId?: string) {
    const where: any = {};

    // Branch isolation for non-admins
    if (actor.role !== "SYSTEM_ADMIN" && actor.role !== "OWNER") {
      const assignedBranchIds = actor.branches?.map((b: any) => b.id) || [];
      where.branchId = { in: assignedBranchIds };
    } else if (branchId) {
      where.branchId = branchId;
    }

    // Technicians only see their own workload dashboard
    if (actor.role === "TECHNICIAN") {
      where.assignedTechnicianId = actor.id;
    }

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());

    const [
      totalOpen,
      receivedToday,
      diagnosing,
      waitingApproval,
      inProgress,
      partsRequired,
      readyCollection,
      delayed,
      completedMonth,
    ] = await Promise.all([
      this.prisma.repairTicket.count({
        where: { ...where, status: { notIn: ["DELIVERED", "CANCELLED"] } },
      }),
      this.prisma.repairTicket.count({
        where: { ...where, createdAt: { gte: todayStart, lte: todayEnd } },
      }),
      this.prisma.repairTicket.count({
        where: { ...where, status: "DIAGNOSING" },
      }),
      this.prisma.repairTicket.count({
        where: { ...where, status: "WAITING_FOR_APPROVAL" },
      }),
      this.prisma.repairTicket.count({
        where: { ...where, status: "REPAIR_IN_PROGRESS" },
      }),
      this.prisma.repairTicket.count({
        where: { ...where, status: "PARTS_REQUIRED" },
      }),
      this.prisma.repairTicket.count({
        where: { ...where, status: "READY_FOR_COLLECTION" },
      }),
      this.prisma.repairTicket.count({
        where: {
          ...where,
          expectedCompletionAt: { lt: new Date() },
          status: { notIn: ["DELIVERED", "CANCELLED", "READY_FOR_COLLECTION"] },
        },
      }),
      this.prisma.repairTicket.count({
        where: {
          ...where,
          status: { in: ["READY_FOR_COLLECTION", "DELIVERED"] },
          completedAt: { gte: monthStart, lte: monthEnd },
        },
      }),
    ]);

    // Financial calculations (Admins, Owners, and Branch Managers only)
    let revenueMonth = 0;
    if (actor.role !== "TECHNICIAN") {
      const revenueWhere: any = {
        status: { in: ["PAID", "PARTIALLY_PAID"] },
        invoiceDate: { gte: monthStart, lte: monthEnd },
      };

      if (actor.role === "BRANCH_MANAGER") {
        const assignedBranchIds = actor.branches?.map((b: any) => b.id) || [];
        revenueWhere.repairTicket = { branchId: { in: assignedBranchIds } };
      } else if (branchId) {
        revenueWhere.repairTicket = { branchId };
      }

      const payments = await this.prisma.paymentRecord.findMany({
        where: {
          paidAt: { gte: monthStart, lte: monthEnd },
          invoice: {
            repairTicket: {
              branchId: revenueWhere.repairTicket?.branchId,
            },
          },
        },
        select: { amount: true },
      });

      revenueMonth = payments.reduce((acc, p) => acc + p.amount, 0);
    }

    // Technician Workload list (Admin / Owner / Manager only)
    let technicianWorkload: any[] = [];
    if (actor.role !== "TECHNICIAN") {
      const branchIdsFilter =
        actor.role === "BRANCH_MANAGER"
          ? actor.branches?.map((b: any) => b.id) || []
          : branchId
            ? [branchId]
            : [];

      const technicians = await this.prisma.user.findMany({
        where: {
          role: "TECHNICIAN",
          status: "ACTIVE",
          ...(branchIdsFilter.length > 0
            ? {
                userBranches: {
                  some: { branchId: { in: branchIdsFilter } },
                },
              }
            : {}),
        },
        select: {
          id: true,
          fullName: true,
          assignedTickets: {
            where: { status: { notIn: ["DELIVERED", "CANCELLED"] } },
            select: { id: true },
          },
        },
      });

      technicianWorkload = technicians.map((t) => ({
        technicianName: t.fullName,
        openTicketsCount: t.assignedTickets.length,
      }));
    }

    // Status distribution
    const statusCounts = await this.prisma.repairTicket.groupBy({
      by: ["status"],
      where,
      _count: { id: true },
    });

    const statusDistribution = statusCounts.map((s) => ({
      status: s.status,
      count: s._count.id,
    }));

    return {
      totalOpen,
      receivedToday,
      diagnosing,
      waitingApproval,
      inProgress,
      partsRequired,
      readyCollection,
      delayed,
      completedMonth,
      revenueMonth,
      technicianWorkload,
      statusDistribution,
    };
  }

  async getRevenueReport(
    actor: any,
    startDate: string,
    endDate: string,
    branchId?: string,
  ) {
    if (actor.role === "TECHNICIAN") {
      throw new ForbiddenException(
        "Access denied: Technicians do not have access to financial reports.",
      );
    }

    const where: any = {
      paidAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };

    if (actor.role === "BRANCH_MANAGER") {
      const assignedBranchIds = actor.branches?.map((b: any) => b.id) || [];
      where.invoice = {
        repairTicket: { branchId: { in: assignedBranchIds } },
      };
    } else if (branchId) {
      where.invoice = {
        repairTicket: { branchId },
      };
    }

    const payments = await this.prisma.paymentRecord.findMany({
      where,
      orderBy: { paidAt: "desc" },
      include: {
        receivedBy: { select: { fullName: true } },
        invoice: {
          select: {
            invoiceNumber: true,
            totalAmount: true,
            repairTicket: {
              select: {
                ticketNumber: true,
                branch: { select: { name: true, code: true } },
              },
            },
          },
        },
      },
    });

    // Group revenue by date
    const dailyGroupMap = new Map<string, number>();
    payments.forEach((p) => {
      const dateStr = p.paidAt.toISOString().split("T")[0];
      const existing = dailyGroupMap.get(dateStr) || 0;
      dailyGroupMap.set(dateStr, existing + p.amount);
    });

    const dailyRevenue = Array.from(dailyGroupMap.entries())
      .map(([date, total]) => ({
        date,
        revenue: total,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

    return {
      totalRevenue,
      transactions: payments.map((p) => ({
        id: p.id,
        invoiceNumber: p.invoice.invoiceNumber,
        ticketNumber: p.invoice.repairTicket.ticketNumber,
        branchName: p.invoice.repairTicket.branch.name,
        amount: p.amount,
        method: p.method,
        referenceNumber: p.referenceNumber,
        paidAt: p.paidAt,
        receivedBy: p.receivedBy.fullName,
      })),
      dailyRevenue,
    };
  }

  async getBranchPerformance(actor: any, startDate: string, endDate: string) {
    if (actor.role !== "SYSTEM_ADMIN" && actor.role !== "OWNER") {
      throw new ForbiddenException(
        "Only system administrators and owners can access company-wide branch reports.",
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const branches = await this.prisma.branch.findMany({
      where: { isActive: true },
    });

    const performance = await Promise.all(
      branches.map(async (b) => {
        const [ticketsCount, completedCount, revenueSum] = await Promise.all([
          this.prisma.repairTicket.count({
            where: { branchId: b.id, createdAt: { gte: start, lte: end } },
          }),
          this.prisma.repairTicket.count({
            where: {
              branchId: b.id,
              status: { in: ["READY_FOR_COLLECTION", "DELIVERED"] },
              completedAt: { gte: start, lte: end },
            },
          }),
          this.prisma.paymentRecord.aggregate({
            where: {
              paidAt: { gte: start, lte: end },
              invoice: { repairTicket: { branchId: b.id } },
            },
            _sum: { amount: true },
          }),
        ]);

        return {
          branchId: b.id,
          branchName: b.name,
          branchCode: b.code,
          ticketsCreated: ticketsCount,
          ticketsCompleted: completedCount,
          revenueGenerated: revenueSum._sum.amount || 0,
        };
      }),
    );

    return performance;
  }
}
