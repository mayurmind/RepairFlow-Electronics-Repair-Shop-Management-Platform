import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  Ip,
  BadRequestException,
} from "@nestjs/common";
import { EstimatesService } from "./estimates.service";
import { Request } from "express";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { estimateDecisionSchema } from "@repairflow/validation";

@ApiTags("Public Customer Operations")
@Controller("public")
export class PublicEstimatesController {
  constructor(private readonly estimatesService: EstimatesService) {}

  @Throttle({ default: { limit: 15, ttl: 60 } }) // Stronger rate limits on public queries
  @Get("estimates/:token")
  @ApiOperation({
    summary: "Customer tracks or reviews estimate details using secure token",
  })
  async getByToken(@Param("token") token: string) {
    const data = await this.estimatesService.findByPublicToken(token);
    return { success: true, data };
  }

  @Throttle({ default: { limit: 5, ttl: 60 } }) // Very tight limit on actions
  @Post("estimates/:token/approve")
  @ApiOperation({ summary: "Customer approves estimate" })
  async approve(
    @Param("token") token: string,
    @Body() body: any,
    @Req() req: Request,
    @Ip() ipAddress: string,
  ) {
    const parsed = estimateDecisionSchema.safeParse({
      decision: "APPROVED",
      ...body,
    });
    if (!parsed.success) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Invalid comment input.",
        details: parsed.error.issues,
      });
    }

    const userAgent = req.headers["user-agent"] || "unknown";
    const estimate = await this.estimatesService.makePublicDecision(
      token,
      parsed.data,
      ipAddress,
      userAgent,
    );

    return { success: true, data: estimate };
  }

  @Throttle({ default: { limit: 5, ttl: 60 } })
  @Post("estimates/:token/reject")
  @ApiOperation({ summary: "Customer rejects estimate" })
  async reject(
    @Param("token") token: string,
    @Body() body: any,
    @Req() req: Request,
    @Ip() ipAddress: string,
  ) {
    const parsed = estimateDecisionSchema.safeParse({
      decision: "REJECTED",
      ...body,
    });
    if (!parsed.success) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Invalid comment input.",
        details: parsed.error.issues,
      });
    }

    const userAgent = req.headers["user-agent"] || "unknown";
    const estimate = await this.estimatesService.makePublicDecision(
      token,
      parsed.data,
      ipAddress,
      userAgent,
    );

    return { success: true, data: estimate };
  }
}
