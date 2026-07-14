import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import { hash, verify } from "@node-rs/argon2";
import * as crypto from "crypto";
import { User, UserRole, UserStatus } from "@repairflow/shared-types";
import type { Prisma } from "@prisma/client";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private auditLogs: AuditLogsService,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (user.status === "SUSPENDED") {
      throw new ForbiddenException("Your account has been suspended.");
    }

    if (user.status === "DISABLED") {
      throw new ForbiddenException("Your account has been disabled.");
    }

    if (user.status === "INVITED") {
      throw new ForbiddenException("Your account has not been activated yet.");
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const waitTime = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000,
      );
      throw new ForbiddenException(
        `Account is temporarily locked. Try again in ${waitTime} minutes.`,
      );
    }

    const isPasswordValid = await verify(user.passwordHash, password);

    if (!isPasswordValid) {
      // Increment failed attempts
      const attempts = user.failedLoginAttempts + 1;
      let lockedUntil: Date | null = null;
      if (attempts >= 5) {
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lockout
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil,
        },
      });

      // Audit Log failed attempt
      await this.auditLogs.createLog(
        null,
        null,
        null,
        "FAILED_LOGIN",
        "User",
        user.id,
        null,
        { email, failedAttempts: attempts, locked: !!lockedUntil },
      );

      throw new UnauthorizedException("Invalid credentials");
    }

    // Reset failed attempts
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    return user;
  }

  async login(
    userId: string,
    email: string,
    role: string,
    ipAddress: string,
    userAgent: string,
  ) {
    const payload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    });

    // Create a rotating refresh token
    const refreshTokenRaw = crypto.randomBytes(40).toString("hex");
    const refreshTokenHash = this.hashToken(refreshTokenRaw);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store in DB
    await this.prisma.refreshSession.create({
      data: {
        userId,
        tokenHash: refreshTokenHash,
        ipAddress,
        userAgent,
        expiresAt,
      },
    });

    // Audit Log success
    await this.auditLogs.createLog(
      null,
      userId,
      null,
      "USER_LOGIN",
      "User",
      userId,
      null,
      { ipAddress, userAgent },
    );

    return {
      accessToken,
      refreshToken: refreshTokenRaw,
      user: {
        id: userId,
        email,
        role,
      },
    };
  }

  async refresh(refreshTokenRaw: string, ipAddress: string, userAgent: string) {
    const tokenHash = this.hashToken(refreshTokenRaw);

    const session = await this.prisma.refreshSession.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session) {
      throw new UnauthorizedException("Invalid refresh session");
    }

    if (session.revokedAt) {
      // Security warning: refresh token reuse detected!
      // Revoke all sessions for this user for safety
      await this.prisma.refreshSession.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await this.auditLogs.createLog(
        null,
        session.userId,
        null,
        "SECURITY_REFRESH_TOKEN_REUSE",
        "User",
        session.userId,
        null,
        {
          ipAddress,
          userAgent,
          message: "Detected reuse of revoked refresh token.",
        },
      );

      throw new UnauthorizedException(
        "Security alert: Token reuse detected. Please re-authenticate.",
      );
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException("Refresh token has expired");
    }

    if (
      session.user.status === "SUSPENDED" ||
      session.user.status === "DISABLED" ||
      session.user.status === "INVITED"
    ) {
      throw new ForbiddenException("Account inactive, suspended or disabled");
    }

    // Generate new pair
    const payload = {
      sub: session.user.id,
      email: session.user.email,
      role: session.user.role,
    };
    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    });

    const newRefreshTokenRaw = crypto.randomBytes(40).toString("hex");
    const newRefreshTokenHash = this.hashToken(newRefreshTokenRaw);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Write new session and revoke old one in transaction
    const newSession = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const created = await tx.refreshSession.create({
          data: {
            userId: session.userId,
            tokenHash: newRefreshTokenHash,
            ipAddress,
            userAgent,
            expiresAt,
          },
        });

        await tx.refreshSession.update({
          where: { id: session.id },
          data: {
            revokedAt: new Date(),
            replacedBySessionId: created.id,
          },
        });

        return created;
      },
    );

    return {
      accessToken,
      refreshToken: newRefreshTokenRaw,
    };
  }

  async logout(refreshTokenRaw: string) {
    const tokenHash = this.hashToken(refreshTokenRaw);
    const session = await this.prisma.refreshSession.findUnique({
      where: { tokenHash },
    });

    if (session) {
      await this.prisma.refreshSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });

      // Audit Log logout
      await this.auditLogs.createLog(
        null,
        session.userId,
        null,
        "USER_LOGOUT",
        "User",
        session.userId,
      );
    }
  }

  async revokeAllSessions(userId: string) {
    await this.prisma.refreshSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Privacy security: do not leak whether user exists
    if (!user) {
      console.log(`Password reset requested for non-existent email: ${email}`);
      return;
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = this.hashToken(resetToken);
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour expiry

    // Delete old active reset tokens for this user
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: resetTokenHash,
        expiresAt,
      },
    });

    // Logging/simulation of reset link
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[DEV EMAIL SIMULATION] Password Reset Link for ${user.fullName}: http://localhost:3000/reset-password?token=${resetToken}`,
      );
    }
  }

  async resetPassword(token: string, newPasswordHash: string) {
    const tokenHash = this.hashToken(token);

    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetToken || resetToken.expiresAt < new Date()) {
      throw new BadRequestException(
        "Password reset token is invalid or has expired.",
      );
    }

    const hashedPassword = await hash(newPasswordHash);

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Update password
      await tx.user.update({
        where: { id: resetToken.userId },
        data: {
          passwordHash: hashedPassword,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      // Delete the reset token
      await tx.passwordResetToken.delete({
        where: { id: resetToken.id },
      });

      // Revoke all refresh sessions (force logout all devices)
      await tx.refreshSession.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    // Audit log reset
    await this.auditLogs.createLog(
      null,
      resetToken.userId,
      null,
      "PASSWORD_RESET",
      "User",
      resetToken.userId,
    );
  }
}
