import {
  Controller,
  Get,
  Query,
  UseGuards,
  Res,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { Response } from "express";
import { ReportsService } from "./reports.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/role.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { PrismaService } from "../prisma/prisma.service";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";

@ApiTags("Management Reports")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("reports")
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("dashboard")
  @ApiOperation({
    summary: "Get role-tailored dashboard metrics and activity lists",
  })
  async getDashboard(
    @CurrentUser() actor: AuthenticatedUser,
    @Query("branchId") branchId?: string,
  ) {
    const data = await this.reportsService.getDashboard(actor, branchId);
    return { success: true, data };
  }

  @Get("revenue")
  @Roles("SYSTEM_ADMIN", "OWNER", "BRANCH_MANAGER")
  @ApiOperation({ summary: "Get revenue report" })
  async getRevenueReport(
    @CurrentUser() actor: AuthenticatedUser,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
    @Query("branchId") branchId?: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException(
        "startDate and endDate are required parameters.",
      );
    }
    const data = await this.reportsService.getRevenueReport(
      actor,
      startDate,
      endDate,
      branchId,
    );
    return { success: true, data };
  }

  @Get("branches")
  @Roles("SYSTEM_ADMIN", "OWNER")
  @ApiOperation({ summary: "Get comparative branch performance reports" })
  async getBranchPerformance(
    @CurrentUser() actor: AuthenticatedUser,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException("startDate and endDate are required.");
    }
    const data = await this.reportsService.getBranchPerformance(
      actor,
      startDate,
      endDate,
    );
    return { success: true, data };
  }

  @Get("technicians")
  @Roles("SYSTEM_ADMIN", "OWNER", "BRANCH_MANAGER")
  @ApiOperation({ summary: "Get technicians performance report" })
  async getTechniciansReport(@CurrentUser() actor: AuthenticatedUser) {
    const technicians = await this.prisma.user.findMany({
      where: { role: "TECHNICIAN" },
      select: {
        id: true,
        fullName: true,
        email: true,
        assignedTickets: {
          select: { id: true, status: true },
        },
      },
    });

    const report = technicians.map((t) => {
      const open = t.assignedTickets.filter(
        (tick) => !["DELIVERED", "CANCELLED"].includes(tick.status),
      ).length;
      const completed = t.assignedTickets.filter((tick) =>
        ["READY_FOR_COLLECTION", "DELIVERED"].includes(tick.status),
      ).length;
      return {
        id: t.id,
        name: t.fullName,
        email: t.email,
        openJobs: open,
        completedJobs: completed,
        totalJobs: t.assignedTickets.length,
      };
    });

    return { success: true, data: report };
  }

  @Get("delayed-tickets")
  @Roles("SYSTEM_ADMIN", "OWNER", "BRANCH_MANAGER")
  @ApiOperation({ summary: "Get delayed tickets" })
  async getDelayedTickets(@CurrentUser() actor: AuthenticatedUser) {
    const where: any = {
      expectedCompletionAt: { lt: new Date() },
      status: { notIn: ["DELIVERED", "CANCELLED", "READY_FOR_COLLECTION"] },
    };

    if (actor.role === "BRANCH_MANAGER") {
      const branchIds = actor.branches?.map((b) => b.id) || [];
      where.branchId = { in: branchIds };
    }

    const tickets = await this.prisma.repairTicket.findMany({
      where,
      include: {
        customer: { select: { fullName: true, phone: true } },
        device: { select: { brand: true, model: true } },
        assignedTechnician: { select: { fullName: true } },
        branch: { select: { code: true } },
      },
    });

    return { success: true, data: tickets };
  }

  @Get("estimate-decisions")
  @Roles("SYSTEM_ADMIN", "OWNER", "BRANCH_MANAGER")
  @ApiOperation({ summary: "Get estimate approvals metrics ratio" })
  async getEstimateRatio() {
    const [approved, rejected, total] = await Promise.all([
      this.prisma.estimate.count({ where: { status: "APPROVED" } }),
      this.prisma.estimate.count({ where: { status: "REJECTED" } }),
      this.prisma.estimate.count({
        where: { status: { in: ["APPROVED", "REJECTED"] } },
      }),
    ]);

    return {
      success: true,
      data: {
        approved,
        rejected,
        total,
        ratio: total > 0 ? (approved / total) * 100 : 0,
      },
    };
  }

  @Get("device-categories")
  @Roles("SYSTEM_ADMIN", "OWNER", "BRANCH_MANAGER")
  @ApiOperation({ summary: "Get tickets distribution by device category" })
  async getDeviceCategories() {
    const list = await this.prisma.device.groupBy({
      by: ["category"],
      _count: { id: true },
    });

    const formatted = list.map((item) => ({
      category: item.category,
      count: item._count.id,
    }));

    return { success: true, data: formatted };
  }

  @Get("export")
  @Roles("SYSTEM_ADMIN", "OWNER", "BRANCH_MANAGER")
  @ApiOperation({ summary: "Export ticket records as CSV" })
  async exportCsv(
    @CurrentUser() actor: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const where: any = {};
    if (actor.role === "BRANCH_MANAGER") {
      const branchIds = actor.branches?.map((b) => b.id) || [];
      where.branchId = { in: branchIds };
    }

    const tickets = await this.prisma.repairTicket.findMany({
      where,
      include: {
        customer: { select: { fullName: true, phone: true } },
        device: { select: { brand: true, model: true, serialNumber: true } },
        branch: { select: { name: true } },
      },
    });

    // Generate CSV string
    const headers =
      "TicketNumber,Branch,CustomerName,Phone,DeviceBrand,DeviceModel,SerialNumber,Status,Priority,CreatedAt\n";
    const rows = tickets
      .map((t) => {
        const brand = t.device.brand.replace(/"/g, '""');
        const model = t.device.model.replace(/"/g, '""');
        const serial = (t.device.serialNumber || "").replace(/"/g, '""');
        const customer = t.customer.fullName.replace(/"/g, '""');
        const branch = t.branch.name.replace(/"/g, '""');

        return `"${t.ticketNumber}","${branch}","${customer}","${t.customer.phone}","${brand}","${model}","${serial}","${t.status}","${t.priority}","${t.createdAt.toISOString()}"`;
      })
      .join("\n");

    const csvContent = headers + rows;

    res.set({
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=tickets-export.csv",
      "Content-Length": Buffer.byteLength(csvContent),
    });

    res.end(csvContent);
  }
}
