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
import { BranchesService } from "./branches.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/role.guard";
import { BranchAccessGuard } from "../common/guards/branch.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";

@ApiTags("Branches")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, BranchAccessGuard)
@Controller("branches")
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @Roles("SYSTEM_ADMIN", "OWNER")
  @ApiOperation({ summary: "Create new branch (Admin/Owner only)" })
  async create(@Body() body: any, @CurrentUser() user: any) {
    const branch = await this.branchesService.create(body, user.id);
    return { success: true, data: branch };
  }

  @Get()
  @ApiOperation({ summary: "List all branches" })
  async findAll(
    @Query("search") search?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    const result = await this.branchesService.findAll({ search, page, limit });
    return {
      success: true,
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get branch details by ID" })
  async findOne(@Param("id") id: string) {
    const branch = await this.branchesService.findOne(id);
    return { success: true, data: branch };
  }

  @Patch(":id")
  @Roles("SYSTEM_ADMIN", "OWNER")
  @ApiOperation({ summary: "Update branch coordinates" })
  async update(
    @Param("id") id: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    const branch = await this.branchesService.update(id, body, user.id);
    return { success: true, data: branch };
  }

  @Patch(":id/status")
  @Roles("SYSTEM_ADMIN", "OWNER")
  @ApiOperation({ summary: "Activate/Deactivate branch status" })
  async toggleStatus(
    @Param("id") id: string,
    @Body("isActive") isActive: boolean,
    @CurrentUser() user: any,
  ) {
    const branch = await this.branchesService.toggleStatus(
      id,
      isActive,
      user.id,
    );
    return { success: true, data: branch };
  }
}
