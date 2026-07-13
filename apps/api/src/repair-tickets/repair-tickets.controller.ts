import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from "@nestjs/common";
import { RepairTicketsService } from "./repair-tickets.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/role.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { TicketStatus, TicketPriority } from "@repairflow/shared-types";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";

import { BranchAccessGuard } from "../common/guards/branch.guard";

@ApiTags("Repair Tickets")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, BranchAccessGuard)
@Controller("tickets")
export class RepairTicketsController {
  constructor(private readonly ticketsService: RepairTicketsService) {}

  @Post()
  @Roles("SYSTEM_ADMIN", "OWNER", "BRANCH_MANAGER", "FRONT_DESK")
  @ApiOperation({ summary: "Register a new repair ticket intake" })
  async create(@Body() body: any, @CurrentUser() actor: any) {
    const ticket = await this.ticketsService.create(body, actor);
    return { success: true, data: ticket };
  }

  @Get()
  @ApiOperation({ summary: "List and filter repair tickets" })
  async findAll(
    @CurrentUser() actor: any,
    @Query("search") search?: string,
    @Query("status") status?: TicketStatus,
    @Query("priority") priority?: TicketPriority,
    @Query("branchId") branchId?: string,
    @Query("technicianId") technicianId?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    const result = await this.ticketsService.findAll(actor, {
      search,
      status,
      priority,
      branchId,
      technicianId,
      page,
      limit,
    });
    return {
      success: true,
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get repair ticket details by ID" })
  async findOne(@Param("id") id: string, @CurrentUser() actor: any) {
    const ticket = await this.ticketsService.findOne(id, actor);
    return { success: true, data: ticket };
  }

  @Post(":id/assign")
  @Roles("SYSTEM_ADMIN", "OWNER", "BRANCH_MANAGER", "FRONT_DESK")
  @ApiOperation({ summary: "Assign a technician to the repair ticket" })
  async assign(
    @Param("id") id: string,
    @Body("technicianId") technicianId: string,
    @CurrentUser() actor: any,
  ) {
    const ticket = await this.ticketsService.assignTechnician(
      id,
      technicianId,
      actor,
    );
    return { success: true, data: ticket };
  }

  @Post(":id/reassign")
  @Roles("SYSTEM_ADMIN", "OWNER", "BRANCH_MANAGER")
  @ApiOperation({ summary: "Reassign technician (Manager/Admin/Owner only)" })
  async reassign(
    @Param("id") id: string,
    @Body("technicianId") technicianId: string,
    @CurrentUser() actor: any,
  ) {
    const ticket = await this.ticketsService.assignTechnician(
      id,
      technicianId,
      actor,
    );
    return { success: true, data: ticket };
  }

  @Post(":id/status")
  @ApiOperation({ summary: "Update ticket status (enforces state machine)" })
  async updateStatus(
    @Param("id") id: string,
    @Body() body: any,
    @CurrentUser() actor: any,
  ) {
    const ticket = await this.ticketsService.updateStatus(id, body, actor);
    return { success: true, data: ticket };
  }

  @Get(":id/timeline")
  @ApiOperation({ summary: "Get ticket status change timeline history" })
  async getTimeline(@Param("id") id: string, @CurrentUser() actor: any) {
    const timeline = await this.ticketsService.getTimeline(id, actor);
    return { success: true, data: timeline };
  }

  @Post(":id/diagnosis")
  @Roles("SYSTEM_ADMIN", "OWNER", "BRANCH_MANAGER", "TECHNICIAN")
  @ApiOperation({ summary: "Add/Update diagnostic findings" })
  async addDiagnosis(
    @Param("id") id: string,
    @Body() body: any,
    @CurrentUser() actor: any,
  ) {
    const diagnosis = await this.ticketsService.addDiagnosis(id, body, actor);
    return { success: true, data: diagnosis };
  }

  @Get(":id/diagnosis")
  @ApiOperation({ summary: "Get diagnostic findings" })
  async getDiagnosis(@Param("id") id: string, @CurrentUser() actor: any) {
    const diagnosis = await this.ticketsService.getDiagnosis(id, actor);
    return { success: true, data: diagnosis };
  }

  @Post(":id/reopen")
  @Roles("SYSTEM_ADMIN", "OWNER", "BRANCH_MANAGER", "FRONT_DESK")
  @ApiOperation({
    summary: "Reopen a delivered ticket (creates a new linked ticket)",
  })
  async reopenTicket(@Param("id") id: string, @CurrentUser() actor: any) {
    const ticket = await this.ticketsService.reopenTicket(id, actor);
    return { success: true, data: ticket };
  }

  @Post(":id/deliver")
  @Roles("SYSTEM_ADMIN", "OWNER", "BRANCH_MANAGER", "FRONT_DESK")
  @ApiOperation({ summary: "Confirm delivery and handover device" })
  async deliver(
    @Param("id") id: string,
    @Body() body: any,
    @CurrentUser() actor: any,
  ) {
    const ticket = await this.ticketsService.updateStatus(
      id,
      { status: "DELIVERED", ...body },
      actor,
    );
    return { success: true, data: ticket };
  }
}
