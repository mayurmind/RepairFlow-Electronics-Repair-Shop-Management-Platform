import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  MinLength,
} from "class-validator";
import { UserRole, UserStatus } from "@repairflow/shared-types";

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum([
    "SYSTEM_ADMIN",
    "OWNER",
    "BRANCH_MANAGER",
    "FRONT_DESK",
    "TECHNICIAN",
  ])
  role?: UserRole;

  @IsOptional()
  @IsEnum(["ACTIVE", "SUSPENDED", "INVITED", "DISABLED"])
  status?: UserStatus;
}
