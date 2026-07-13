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
import { EstimatesService } from "./estimates.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/role.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { EstimateStatus } from "@repairflow/shared-types";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";

@ApiTags("Estimates")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class EstimatesController {
  constructor(private readonly estimatesService: EstimatesService) {}

  @Post("repair-tickets/:ticketId/estimates")
  @Roles("SYSTEM_ADMIN", "OWNER", "BRANCH_MANAGER", "FRONT_DESK")
  @ApiOperation({ summary: "Create draft estimate for repair ticket" })
  async create(
    @Param("ticketId") ticketId: string,
    @Body() body: any,
    @CurrentUser() actor: any,
  ) {
    const estimate = await this.estimatesService.create(ticketId, body, actor);
    return { success: true, data: estimate };
  }

  @Get("estimates")
  @ApiOperation({ summary: "List and filter estimates" })
  async findAll(
    @CurrentUser() actor: any,
    @Query("ticketId") ticketId?: string,
    @Query("status") status?: EstimateStatus,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    const result = await this.estimatesService.findAll(actor, {
      ticketId,
      status,
      page,
      limit,
    });
    return {
      success: true,
      data: result.data,
      meta: result.meta,
    };
  }

  @Get("estimates/:id")
  @ApiOperation({ summary: "Get estimate details by ID" })
  async findOne(@Param("id") id: string, @CurrentUser() actor: any) {
    const estimate = await this.estimatesService.findOne(id, actor);
    return { success: true, data: estimate };
  }

  @Post("estimates/:id/send")
  @Roles("SYSTEM_ADMIN", "OWNER", "BRANCH_MANAGER", "FRONT_DESK")
  @ApiOperation({
    summary: "Send estimate to customer (releases review token)",
  })
  async send(@Param("id") id: string, @CurrentUser() actor: any) {
    const result = await this.estimatesService.send(id, actor);
    return { success: true, ...result };
  }

  @Post("estimates/:id/cancel")
  @Roles("SYSTEM_ADMIN", "OWNER", "BRANCH_MANAGER")
  @ApiOperation({ summary: "Cancel/void estimate" })
  async cancel(@Param("id") id: string, @CurrentUser() actor: any) {
    const estimate = await this.estimatesService.cancel(id, actor);
    return { success: true, data: estimate };
  }
}
