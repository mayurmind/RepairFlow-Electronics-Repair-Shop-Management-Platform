import { Transform } from "class-transformer";
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { REPAIR_FEASIBILITIES } from "@repairflow/shared-types";
import type { RepairFeasibility } from "@repairflow/shared-types";
const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

export class UpsertDiagnosisDto {
  @ApiProperty({ minLength: 2, maxLength: 120 })
  @Transform(trimString)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  faultCategory!: string;

  @ApiProperty({ minLength: 5, maxLength: 8000 })
  @Transform(trimString)
  @IsString()
  @MinLength(5)
  @MaxLength(8000)
  diagnosticFindings!: string;

  @ApiProperty({ minLength: 5, maxLength: 8000 })
  @Transform(trimString)
  @IsString()
  @MinLength(5)
  @MaxLength(8000)
  recommendedRepair!: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 4000 })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(4000)
  partsRequired?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 4000 })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(4000)
  labourDescription?: string | null;

  @ApiProperty({ enum: REPAIR_FEASIBILITIES })
  @IsIn(REPAIR_FEASIBILITIES)
  repairFeasibility!: RepairFeasibility;

  @ApiPropertyOptional({ nullable: true, maxLength: 4000 })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(4000)
  publicExplanation?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 4000 })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(4000)
  internalNotes?: string | null;
}
