import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ApiTags, ApiOperation } from "@nestjs/swagger";

@ApiTags("System Health")
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: "Check API gateway status" })
  async getHealth() {
    return {
      success: true,
      status: "UP",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("database")
  @ApiOperation({ summary: "Check database connectivity status" })
  async getDbHealth() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        success: true,
        database: "CONNECTED",
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        success: false,
        database: "DISCONNECTED",
        error: err.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
