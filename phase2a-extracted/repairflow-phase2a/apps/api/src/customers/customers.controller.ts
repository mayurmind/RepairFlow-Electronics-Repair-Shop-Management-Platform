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
import { CustomersService } from "./customers.service";
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
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { FindCustomersQueryDto } from "./dto/find-customers-query.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { CustomerResponseDto } from "./dto/customer-response.dto";
import { DeviceResponseDto } from "../devices/dto/device-response.dto";
import { RepairTicketResponseDto } from "../repair-tickets/dto/repair-ticket-response.dto";

@ApiTags("Customers")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("customers")
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @ApiOperation({ summary: "Register a new customer" })
  @ApiCreatedDataResponse(CustomerResponseDto)
  @ApiBadRequestResponse({ type: ApiValidationErrorDto })
  async create(
    @Body() body: CreateCustomerDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const customer = await this.customersService.create(body, actor.id);
    return { success: true as const, data: customer };
  }

  @Get()
  @ApiOperation({ summary: "List and search customers" })
  @ApiPaginatedDataResponse(CustomerResponseDto)
  async findAll(@Query() query: FindCustomersQueryDto) {
    const result = await this.customersService.findAll(query);
    return { success: true as const, data: result.data, meta: result.meta };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get customer by ID" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkDataResponse(CustomerResponseDto)
  async findOne(@Param("id", new ParseUUIDPipe()) id: string) {
    const customer = await this.customersService.findOne(id);
    return { success: true as const, data: customer };
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update customer contact profile" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkDataResponse(CustomerResponseDto)
  @ApiBadRequestResponse({ type: ApiValidationErrorDto })
  async update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() body: UpdateCustomerDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const customer = await this.customersService.update(id, body, actor.id);
    return { success: true as const, data: customer };
  }

  @Get(":id/devices")
  @ApiOperation({ summary: "Get devices registered under this customer" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiArrayDataResponse(DeviceResponseDto)
  async getDevices(@Param("id", new ParseUUIDPipe()) id: string) {
    const devices = await this.customersService.getDevices(id);
    return { success: true as const, data: devices };
  }

  @Get(":id/repair-history")
  @ApiOperation({ summary: "Get repair ticket history for this customer" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiArrayDataResponse(RepairTicketResponseDto)
  async getRepairHistory(@Param("id", new ParseUUIDPipe()) id: string) {
    const history = await this.customersService.getRepairHistory(id);
    return { success: true as const, data: history };
  }
}
