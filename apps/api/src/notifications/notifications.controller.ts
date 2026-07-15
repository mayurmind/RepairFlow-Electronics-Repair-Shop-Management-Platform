import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  ParseBoolPipe,
} from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";

@ApiTags("Notifications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "Get current user notifications" })
  async findAll(
    @CurrentUser() actor: AuthenticatedUser,
    @Query("isRead") isReadStr?: string,
  ) {
    const isRead =
      isReadStr === "true" ? true : isReadStr === "false" ? false : undefined;
    const notifications = await this.notificationsService.findAll(
      actor.id,
      isRead,
    );
    return { success: true, data: notifications };
  }

  @Patch("read-all")
  @ApiOperation({ summary: "Mark all notifications as read" })
  async markAllAsRead(@CurrentUser() actor: AuthenticatedUser) {
    await this.notificationsService.markAllAsRead(actor.id);
    return { success: true };
  }

  @Patch(":id/read")
  @ApiOperation({ summary: "Mark a specific notification as read" })
  async markAsRead(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    const notification = await this.notificationsService.markAsRead(
      id,
      actor.id,
    );
    return { success: true, data: notification };
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a notification" })
  async remove(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    await this.notificationsService.remove(id, actor.id);
    return { success: true };
  }
}
