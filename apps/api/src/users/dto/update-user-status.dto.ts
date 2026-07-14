import { IsEnum } from "class-validator";
import { UserStatus } from "@repairflow/shared-types";

export class UpdateUserStatusDto {
  @IsEnum(["ACTIVE", "SUSPENDED", "INVITED", "DISABLED"])
  status!: UserStatus;
}
