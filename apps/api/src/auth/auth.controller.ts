import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
  Param,
} from "@nestjs/common";
import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@repairflow/validation";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(
    private authService: AuthService,
    private prisma: PrismaService,
  ) {}

  private setCookie(res: Response, token: string) {
    const isSecure = process.env.COOKIE_SECURE === "true";
    const sameSite = (process.env.COOKIE_SAME_SITE as any) || "lax";
    const domain = process.env.COOKIE_DOMAIN;

    res.cookie("refreshToken", token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: sameSite,
      domain: domain || undefined,
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  private clearCookie(res: Response) {
    const domain = process.env.COOKIE_DOMAIN;
    res.clearCookie("refreshToken", {
      httpOnly: true,
      path: "/",
      domain: domain || undefined,
    });
  }

  @Post("login")
  @ApiOperation({ summary: "Staff login" })
  async login(
    @Body() body: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Invalid credentials input.",
        details: parsed.error.issues,
      });
    }

    const { email, password } = parsed.data;
    const ipAddress = req.ip || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "unknown";

    const user = await this.authService.validateUser(email, password);
    const {
      accessToken,
      refreshToken,
      user: profile,
    } = await this.authService.login(
      user.id,
      user.email,
      user.role,
      ipAddress,
      userAgent,
    );

    this.setCookie(res, refreshToken);

    return {
      success: true,
      data: {
        accessToken,
        user: profile,
      },
    };
  }

  @Post("refresh")
  @ApiOperation({ summary: "Rotate access and refresh tokens" })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies["refreshToken"] || req.body.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException("Refresh token is missing");
    }

    const ipAddress = req.ip || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "unknown";

    const { accessToken, refreshToken: newRefreshToken } =
      await this.authService.refresh(refreshToken, ipAddress, userAgent);

    this.setCookie(res, newRefreshToken);

    return {
      success: true,
      data: {
        accessToken,
      },
    };
  }

  @Post("logout")
  @ApiOperation({ summary: "Invalidate current session" })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies["refreshToken"] || req.body.refreshToken;
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    this.clearCookie(res);
    return { success: true };
  }

  @Post("forgot-password")
  @ApiOperation({ summary: "Request password reset token link" })
  async forgotPassword(@Body() body: any) {
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Invalid input.",
        details: parsed.error.issues,
      });
    }

    await this.authService.forgotPassword(parsed.data.email);
    // Security: return success regardless of user existence
    return {
      success: true,
      message:
        "If the email exists, a password reset link has been simulated in logs.",
    };
  }

  @Post("reset-password")
  @ApiOperation({ summary: "Reset password using token" })
  async resetPassword(@Body() body: any) {
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Invalid reset inputs.",
        details: parsed.error.issues,
      });
    }

    await this.authService.resetPassword(
      parsed.data.token,
      parsed.data.password,
    );
    return { success: true, message: "Password has been reset successfully." };
  }

  @Get("me")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get current user profile" })
  async getMe(@CurrentUser() user: any) {
    return {
      success: true,
      data: user,
    };
  }

  @Get("sessions")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "List active sessions for current user" })
  async getSessions(@CurrentUser() user: any) {
    const sessions = await this.prisma.refreshSession.findMany({
      where: {
        userId: user.id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    return {
      success: true,
      data: sessions,
    };
  }

  @Delete("sessions/:id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Revoke an active session" })
  async revokeSession(@CurrentUser() user: any, @Param("id") id: string) {
    const session = await this.prisma.refreshSession.findFirst({
      where: { id, userId: user.id, revokedAt: null },
    });

    if (!session) {
      throw new UnauthorizedException("Session not found or already revoked");
    }

    await this.prisma.refreshSession.update({
      where: { id },
      data: { revokedAt: new Date() },
    });

    return { success: true };
  }
}

// Exception Helper definition locally to support clean compile
import { BadRequestException } from "@nestjs/common";
