import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { REPAIR_FEASIBILITIES } from "@repairflow/shared-types";
import type { RepairFeasibility } from "@repairflow/shared-types";

export class DiagnosisResponseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ format: "uuid" })
  repairTicketId!: string;

  @ApiProperty({ format: "uuid" })
  technicianId!: string;

  @ApiProperty()
  faultCategory!: string;

  @ApiProperty()
  diagnosticFindings!: string;

  @ApiProperty()
  recommendedRepair!: string;

  @ApiPropertyOptional({ nullable: true })
  partsRequired!: string | null;

  @ApiPropertyOptional({ nullable: true })
  labourDescription!: string | null;

  @ApiProperty({ enum: REPAIR_FEASIBILITIES })
  repairFeasibility!: RepairFeasibility;

  @ApiPropertyOptional({ nullable: true })
  publicExplanation!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: "Staff-only note; exclude from customer-facing projections",
  })
  internalNotes!: string | null;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt!: Date;
}
