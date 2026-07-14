import { IsEnum } from "class-validator";
import { UserRole } from "@repairflow/shared-types";

export class UpdateUserRoleDto {
  @IsEnum(["SYSTEM_ADMIN", "OWNER", "BRANCH_MANAGER", "FRONT_DESK", "TECHNICIAN"])
  role!: UserRole;
}
