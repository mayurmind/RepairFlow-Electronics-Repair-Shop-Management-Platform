import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";

@ApiTags("Root")
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: "API Root" })
  getHello() {
    return {
      success: true,
      message: "Welcome to the RepairFlow Backend API",
      version: "v1",
      docs: "/api/v1/docs",
      health: "/api/v1/health",
    };
  }
}
