import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { RepairTicketsService } from "./repair-tickets.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/role.guard";
import { BranchAccessGuard } from "../common/guards/branch.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import {
  ApiArrayDataResponse,
  ApiCreatedDataResponse,
  ApiOkDataResponse,
  ApiOkNullableDataResponse,
  ApiPaginatedDataResponse,
  ApiValidationErrorDto,
  ApiStandardErrors,
} from "../common/dto/api-response.dto";
import { CreateRepairTicketDto } from "./dto/create-repair-ticket.dto";
import { FindRepairTicketsQueryDto } from "./dto/find-repair-tickets-query.dto";
import { AssignTechnicianDto } from "./dto/assign-technician.dto";
import { UpdateTicketStatusDto } from "./dto/update-ticket-status.dto";
import { UpsertDiagnosisDto } from "./dto/upsert-diagnosis.dto";
import { DeliverTicketDto } from "./dto/deliver-ticket.dto";
import {
  RepairTicketResponseDto,
  TicketStatusHistoryResponseDto,
} from "./dto/repair-ticket-response.dto";
import { DiagnosisResponseDto } from "./dto/diagnosis-response.dto";

@ApiTags("Repair Tickets")
@ApiBearerAuth()
@ApiStandardErrors()
@UseGuards(JwtAuthGuard, RolesGuard, BranchAccessGuard)
@Controller("tickets")
export class RepairTicketsController {
  constructor(private readonly ticketsService: RepairTicketsService) {}

  @Post()
  @Roles("SYSTEM_ADMIN", "OWNER", "BRANCH_MANAGER", "FRONT_DESK")
  @ApiOperation({ summary: "Register a new repair ticket intake" })
  @ApiCreatedDataResponse(RepairTicketResponseDto)
  @ApiBadRequestResponse({ type: ApiValidationErrorDto })
  async create(
    @Body() body: CreateRepairTicketDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const ticket = await this.ticketsService.create(body, actor);
    return { success: true as const, data: ticket };
  }

  @Get()
  @ApiOperation({ summary: "List and filter repair tickets" })
  @ApiPaginatedDataResponse(RepairTicketResponseDto)
  async findAll(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: FindRepairTicketsQueryDto,
  ) {
    const result = await this.ticketsService.findAll(actor, query);
    return { success: true as const, data: result.data, meta: result.meta };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get repair ticket details by ID" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkDataResponse(RepairTicketResponseDto)
  async findOne(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const ticket = await this.ticketsService.findOne(id, actor);
    return { success: true as const, data: ticket };
  }

  @Post(":id/assign")
  @Roles("SYSTEM_ADMIN", "OWNER", "BRANCH_MANAGER", "FRONT_DESK")
  @ApiOperation({ summary: "Assign a technician to the repair ticket" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkDataResponse(RepairTicketResponseDto)
  @ApiBadRequestResponse({ type: ApiValidationErrorDto })
  async assign(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() body: AssignTechnicianDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const ticket = await this.ticketsService.assignTechnician(
      id,
      body,
      actor,
    );
    return { success: true as const, data: ticket };
  }

  @Post(":id/reassign")
  @Roles("SYSTEM_ADMIN", "OWNER", "BRANCH_MANAGER")
  @ApiOperation({ summary: "Reassign the ticket technician" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkDataResponse(RepairTicketResponseDto)
  @ApiBadRequestResponse({ type: ApiValidationErrorDto })
  async reassign(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() body: AssignTechnicianDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const ticket = await this.ticketsService.assignTechnician(
      id,
      body,
      actor,
    );
    return { success: true as const, data: ticket };
  }

  @Post(":id/status")
  @ApiOperation({ summary: "Update ticket status through the state machine" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkDataResponse(RepairTicketResponseDto)
  @ApiBadRequestResponse({ type: ApiValidationErrorDto })
  async updateStatus(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() body: UpdateTicketStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const ticket = await this.ticketsService.updateStatus(id, body, actor);
    return { success: true as const, data: ticket };
  }

  @Get(":id/timeline")
  @ApiOperation({ summary: "Get the ticket status timeline" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiArrayDataResponse(TicketStatusHistoryResponseDto)
  async getTimeline(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const timeline = await this.ticketsService.getTimeline(id, actor);
    return { success: true as const, data: timeline };
  }

  @Post(":id/diagnosis")
  @Roles("SYSTEM_ADMIN", "TECHNICIAN")
  @ApiOperation({ summary: "Add or update diagnostic findings" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkDataResponse(DiagnosisResponseDto)
  @ApiBadRequestResponse({ type: ApiValidationErrorDto })
  async addDiagnosis(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() body: UpsertDiagnosisDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const diagnosis = await this.ticketsService.addDiagnosis(id, body, actor);
    return { success: true as const, data: diagnosis };
  }

  @Get(":id/diagnosis")
  @ApiOperation({ summary: "Get diagnostic findings" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkNullableDataResponse(DiagnosisResponseDto)
  async getDiagnosis(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const diagnosis = await this.ticketsService.getDiagnosis(id, actor);
    return { success: true as const, data: diagnosis };
  }

  @Post(":id/reopen")
  @Roles("SYSTEM_ADMIN", "OWNER", "BRANCH_MANAGER", "FRONT_DESK")
  @ApiOperation({ summary: "Create a linked ticket for a delivered repair" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiCreatedDataResponse(RepairTicketResponseDto)
  async reopenTicket(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const ticket = await this.ticketsService.reopenTicket(id, actor);
    return { success: true as const, data: ticket };
  }

  @Post(":id/deliver")
  @Roles("SYSTEM_ADMIN", "OWNER", "BRANCH_MANAGER", "FRONT_DESK")
  @ApiOperation({ summary: "Confirm device delivery" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkDataResponse(RepairTicketResponseDto)
  @ApiBadRequestResponse({ type: ApiValidationErrorDto })
  async deliver(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() body: DeliverTicketDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const ticket = await this.ticketsService.updateStatus(
      id,
      { status: "DELIVERED", ...body },
      actor,
    );
    return { success: true as const, data: ticket };
  }
}
