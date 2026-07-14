import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { UserRole } from "@repairflow/shared-types";

export class FindAllUsersQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

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
  @IsString()
  branchId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
