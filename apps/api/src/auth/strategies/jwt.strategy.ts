import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET,
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        userBranches: {
          include: { branch: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException("Authentication credentials invalid.");
    }

    if (user.status === "SUSPENDED" || user.status === "DISABLED") {
      throw new UnauthorizedException("User account is inactive or suspended.");
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      branches: user.userBranches.map((ub) => ub.branch),
    };
  }
}
