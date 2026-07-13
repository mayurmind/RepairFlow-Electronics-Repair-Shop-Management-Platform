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
import { DevicesService } from "./devices.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";

@ApiTags("Devices")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get("devices")
  @ApiOperation({ summary: "List and search all registered devices" })
  async findAll(
    @Query("search") search?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    const result = await this.devicesService.findAll({ search, page, limit });
    return {
      success: true,
      data: result.data,
      meta: result.meta,
    };
  }

  @Post("customers/:customerId/devices")
  @ApiOperation({ summary: "Register a new device under a specific customer" })
  async create(
    @Param("customerId") customerId: string,
    @Body() body: any,
    @CurrentUser() actor: any,
  ) {
    const device = await this.devicesService.create(customerId, body, actor.id);
    return { success: true, data: device };
  }

  @Get("devices/:id")
  @ApiOperation({ summary: "Get device details by ID" })
  async findOne(@Param("id") id: string) {
    const device = await this.devicesService.findOne(id);
    return { success: true, data: device };
  }

  @Patch("devices/:id")
  @ApiOperation({ summary: "Update device registration profile" })
  async update(
    @Param("id") id: string,
    @Body() body: any,
    @CurrentUser() actor: any,
  ) {
    const device = await this.devicesService.update(id, body, actor.id);
    return { success: true, data: device };
  }

  @Get("devices/:id/repair-history")
  @ApiOperation({
    summary: "Get complete repair ticket history for this device",
  })
  async getRepairHistory(@Param("id") id: string) {
    const history = await this.devicesService.getRepairHistory(id);
    return { success: true, data: history };
  }
}
