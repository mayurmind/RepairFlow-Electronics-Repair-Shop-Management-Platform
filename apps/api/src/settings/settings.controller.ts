import { Controller, Get, Patch, Body, UseGuards } from "@nestjs/common";
import { SettingsService } from "./settings.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/role.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";

@ApiTags("System Settings")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: "Retrieve system settings" })
  async getSettings() {
    const settings = await this.settingsService.getSettings();
    return { success: true, data: settings };
  }

  @Patch()
  @Roles("SYSTEM_ADMIN", "OWNER")
  @ApiOperation({ summary: "Update system settings (System Admin/Owner only)" })
  async updateSettings(
    @Body() body: any,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const settings = await this.settingsService.updateSettings(body, actor);
    return { success: true, data: settings };
  }
}
