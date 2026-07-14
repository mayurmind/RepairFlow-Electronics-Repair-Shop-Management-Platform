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
  ParseUUIDPipe,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/role.guard";
import { BranchAccessGuard } from "../common/guards/branch.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { UserRole, UserStatus } from "@repairflow/shared-types";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";
import { UpdateUserRoleDto } from "./dto/update-user-role.dto";
import { AssignBranchDto } from "./dto/assign-branch.dto";
import { FindAllUsersQueryDto } from "./dto/find-all-users-query.dto";

@ApiTags("Users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, BranchAccessGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles("SYSTEM_ADMIN", "OWNER", "BRANCH_MANAGER")
  @ApiOperation({
    summary: "Create a new staff user account",
  })
  async create(@Body() body: CreateUserDto, @CurrentUser() actor: any) {
    const user = await this.usersService.create(body, actor);
    return { success: true, data: user };
  }

  @Get()
  @Roles("SYSTEM_ADMIN", "OWNER", "BRANCH_MANAGER")
  @ApiOperation({ summary: "List all staff users" })
  async findAll(
    @Query() query: FindAllUsersQueryDto,
    @CurrentUser() actor?: any,
  ) {
    const result = await this.usersService.findAll(query, actor);
    return {
      success: true,
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(":id")
  @Roles("SYSTEM_ADMIN", "OWNER", "BRANCH_MANAGER")
  @ApiOperation({ summary: "Get user details by ID" })
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: any,
  ) {
    const user = await this.usersService.findOne(id, actor);
    return { success: true, data: user };
  }

  @Patch(":id")
  @Roles("SYSTEM_ADMIN", "OWNER", "BRANCH_MANAGER")
  @ApiOperation({ summary: "Update user profile (personal details)" })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: UpdateUserDto,
    @CurrentUser() actor: any,
  ) {
    const user = await this.usersService.update(id, body, actor);
    return { success: true, data: user };
  }

  @Patch(":id/status")
  @Roles("SYSTEM_ADMIN", "OWNER", "BRANCH_MANAGER")
  @ApiOperation({ summary: "Activate/Suspend/Disable user status" })
  async updateStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: UpdateUserStatusDto,
    @CurrentUser() actor: any,
  ) {
    const user = await this.usersService.updateStatus(id, body.status, actor);
    return { success: true, data: user };
  }

  @Patch(":id/role")
  @Roles("SYSTEM_ADMIN", "OWNER")
  @ApiOperation({ summary: "Change user role (Admin/Owner only)" })
  async updateRole(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: UpdateUserRoleDto,
    @CurrentUser() actor: any,
  ) {
    const user = await this.usersService.updateRole(id, body.role, actor);
    return { success: true, data: user };
  }

  @Post(":id/branches")
  @Roles("SYSTEM_ADMIN", "OWNER", "BRANCH_MANAGER")
  @ApiOperation({ summary: "Assign user to a branch" })
  async assignBranch(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: AssignBranchDto,
    @CurrentUser() actor: any,
  ) {
    const userBranch = await this.usersService.assignBranch(
      id,
      body.branchId,
      actor,
    );
    return { success: true, data: userBranch };
  }

  @Delete(":id/branches/:branchId")
  @Roles("SYSTEM_ADMIN", "OWNER", "BRANCH_MANAGER")
  @ApiOperation({ summary: "Remove user from a branch" })
  async removeBranch(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("branchId", ParseUUIDPipe) branchId: string,
    @CurrentUser() actor: any,
  ) {
    const result = await this.usersService.removeBranch(id, branchId, actor);
    return { success: true, data: result };
  }
}
