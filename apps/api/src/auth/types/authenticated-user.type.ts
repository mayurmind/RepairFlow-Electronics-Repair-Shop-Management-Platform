import type { UserRole } from "@repairflow/shared-types";

export interface AuthenticatedBranch {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  branches: AuthenticatedBranch[];
}

export interface JwtAccessTokenPayload {
  sub: string;
  email?: string;
  role?: UserRole;
  iat?: number;
  exp?: number;
}
