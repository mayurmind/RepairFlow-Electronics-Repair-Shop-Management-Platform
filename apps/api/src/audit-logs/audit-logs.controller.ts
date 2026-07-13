import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { AuditLogsService } from "./audit-logs.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/role.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";

@ApiTags("Audit Logs")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("audit-logs")
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Roles("SYSTEM_ADMIN", "OWNER")
  async findAll(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("branchId") branchId?: string,
    @Query("actorUserId") actorUserId?: string,
    @Query("entityType") entityType?: string,
    @Query("entityId") entityId?: string,
  ) {
    const result = await this.auditLogsService.findAll({
      page,
      limit,
      branchId,
      actorUserId,
      entityType,
      entityId,
    });
    return {
      success: true,
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(":id")
  @Roles("SYSTEM_ADMIN", "OWNER")
  async findOne(@Param("id") id: string) {
    const log = await this.auditLogsService.findOne(id);
    return { success: true, data: log };
  }
}
