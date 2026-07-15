import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { DevicesService } from "./devices.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import {
  ApiArrayDataResponse,
  ApiCreatedDataResponse,
  ApiOkDataResponse,
  ApiPaginatedDataResponse,
  ApiValidationErrorDto,
} from "../common/dto/api-response.dto";
import { CreateDeviceDto } from "./dto/create-device.dto";
import { UpdateDeviceDto } from "./dto/update-device.dto";
import { FindDevicesQueryDto } from "./dto/find-devices-query.dto";
import { DeviceResponseDto } from "./dto/device-response.dto";
import { RepairTicketResponseDto } from "../repair-tickets/dto/repair-ticket-response.dto";

@ApiTags("Devices")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get("devices")
  @ApiOperation({ summary: "List and search registered devices" })
  @ApiPaginatedDataResponse(DeviceResponseDto)
  async findAll(@Query() query: FindDevicesQueryDto) {
    const result = await this.devicesService.findAll(query);
    return { success: true as const, data: result.data, meta: result.meta };
  }

  @Post("customers/:customerId/devices")
  @ApiOperation({ summary: "Register a device under a customer" })
  @ApiParam({ name: "customerId", format: "uuid" })
  @ApiCreatedDataResponse(DeviceResponseDto)
  @ApiBadRequestResponse({ type: ApiValidationErrorDto })
  async create(
    @Param("customerId", new ParseUUIDPipe()) customerId: string,
    @Body() body: CreateDeviceDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const device = await this.devicesService.create(customerId, body, actor.id);
    return { success: true as const, data: device };
  }

  @Get("devices/:id")
  @ApiOperation({ summary: "Get device details by ID" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkDataResponse(DeviceResponseDto)
  async findOne(@Param("id", new ParseUUIDPipe()) id: string) {
    const device = await this.devicesService.findOne(id);
    return { success: true as const, data: device };
  }

  @Patch("devices/:id")
  @ApiOperation({ summary: "Update device registration profile" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkDataResponse(DeviceResponseDto)
  @ApiBadRequestResponse({ type: ApiValidationErrorDto })
  async update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() body: UpdateDeviceDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const device = await this.devicesService.update(id, body, actor.id);
    return { success: true as const, data: device };
  }

  @Get("devices/:id/repair-history")
  @ApiOperation({ summary: "Get repair ticket history for this device" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiArrayDataResponse(RepairTicketResponseDto)
  async getRepairHistory(@Param("id", new ParseUUIDPipe()) id: string) {
    const history = await this.devicesService.getRepairHistory(id);
    return { success: true as const, data: history };
  }
}
