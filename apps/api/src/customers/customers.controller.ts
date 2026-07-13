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
import { CustomersService } from "./customers.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";

@ApiTags("Customers")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("customers")
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @ApiOperation({ summary: "Register a new customer" })
  async create(@Body() body: any, @CurrentUser() actor: any) {
    const customer = await this.customersService.create(body, actor.id);
    return { success: true, data: customer };
  }

  @Get()
  @ApiOperation({ summary: "List and search customers" })
  async findAll(
    @Query("search") search?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    const result = await this.customersService.findAll({ search, page, limit });
    return {
      success: true,
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get customer by ID" })
  async findOne(@Param("id") id: string) {
    const customer = await this.customersService.findOne(id);
    return { success: true, data: customer };
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update customer contact profile" })
  async update(
    @Param("id") id: string,
    @Body() body: any,
    @CurrentUser() actor: any,
  ) {
    const customer = await this.customersService.update(id, body, actor.id);
    return { success: true, data: customer };
  }

  @Get(":id/devices")
  @ApiOperation({
    summary: "Get list of devices registered under this customer",
  })
  async getDevices(@Param("id") id: string) {
    const devices = await this.customersService.getDevices(id);
    return { success: true, data: devices };
  }

  @Get(":id/repair-history")
  @ApiOperation({
    summary: "Get complete repair ticket history for this customer",
  })
  async getRepairHistory(@Param("id") id: string) {
    const history = await this.customersService.getRepairHistory(id);
    return { success: true, data: history };
  }
}
