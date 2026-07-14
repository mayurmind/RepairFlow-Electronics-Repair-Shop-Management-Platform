import { IsString, IsEmail, IsOptional, IsEnum, MinLength } from "class-validator";
import { UserRole, UserStatus } from "@repairflow/shared-types";

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsEnum(["SYSTEM_ADMIN", "OWNER", "BRANCH_MANAGER", "FRONT_DESK", "TECHNICIAN"])
  role!: UserRole;

  @IsOptional()
  @IsEnum(["ACTIVE", "SUSPENDED", "INVITED", "DISABLED"])
  status?: UserStatus;
}
