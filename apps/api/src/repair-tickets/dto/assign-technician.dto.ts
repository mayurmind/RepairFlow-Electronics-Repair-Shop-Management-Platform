import { IsUUID } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class AssignTechnicianDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  technicianId!: string;
}
