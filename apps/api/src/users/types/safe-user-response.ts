import { UserRole, UserStatus } from "@repairflow/shared-types";

export interface SafeUserResponse {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  branches?: any[];
}
