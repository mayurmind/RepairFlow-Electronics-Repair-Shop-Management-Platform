import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/role.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { UserRole, UserStatus } from "@repairflow/shared-types";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";

@ApiTags("Users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles("SYSTEM_ADMIN", "OWNER")
  @ApiOperation({
    summary: "Create a new staff user account (Admin/Owner only)",
  })
  async create(@Body() body: any, @CurrentUser() actor: any) {
    const user = await this.usersService.create(body, actor.id);
    return { success: true, data: user };
  }

  @Get()
  @ApiOperation({ summary: "List all staff users" })
  async findAll(
    @Query("search") search?: string,
    @Query("role") role?: UserRole,
    @Query("branchId") branchId?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    const result = await this.usersService.findAll({
      search,
      role,
      branchId,
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
  @ApiOperation({ summary: "Get user details by ID" })
  async findOne(@Param("id") id: string) {
    const user = await this.usersService.findOne(id);
    return { success: true, data: user };
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update user profile (personal details)" })
  async update(
    @Param("id") id: string,
    @Body() body: any,
    @CurrentUser() actor: any,
  ) {
    const user = await this.usersService.update(id, body, actor.id);
    return { success: true, data: user };
  }

  @Patch(":id/status")
  @Roles("SYSTEM_ADMIN", "OWNER", "BRANCH_MANAGER")
  @ApiOperation({ summary: "Activate/Suspend/Disable user status" })
  async updateStatus(
    @Param("id") id: string,
    @Body("status") status: UserStatus,
    @CurrentUser() actor: any,
  ) {
    const user = await this.usersService.updateStatus(id, status, actor.id);
    return { success: true, data: user };
  }

  @Patch(":id/role")
  @Roles("SYSTEM_ADMIN", "OWNER")
  @ApiOperation({ summary: "Change user role (Admin/Owner only)" })
  async updateRole(
    @Param("id") id: string,
    @Body("role") role: UserRole,
    @CurrentUser() actor: any,
  ) {
    const user = await this.usersService.updateRole(id, role, actor.id);
    return { success: true, data: user };
  }

  @Post(":id/branches")
  @Roles("SYSTEM_ADMIN", "OWNER", "BRANCH_MANAGER")
  @ApiOperation({ summary: "Assign user to a branch" })
  async assignBranch(
    @Param("id") id: string,
    @Body("branchId") branchId: string,
    @CurrentUser() actor: any,
  ) {
    const userBranch = await this.usersService.assignBranch(
      id,
      branchId,
      actor.id,
    );
    return { success: true, data: userBranch };
  }

  @Delete(":id/branches/:branchId")
  @Roles("SYSTEM_ADMIN", "OWNER", "BRANCH_MANAGER")
  @ApiOperation({ summary: "Remove user from a branch" })
  async removeBranch(
    @Param("id") id: string,
    @Param("branchId") branchId: string,
    @CurrentUser() actor: any,
  ) {
    const result = await this.usersService.removeBranch(id, branchId, actor.id);
    return { success: true, data: result };
  }
}
