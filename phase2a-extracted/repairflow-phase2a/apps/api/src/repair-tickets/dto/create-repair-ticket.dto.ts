import { Transform } from "class-transformer";
import {
  IsISO8601,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { TicketPriority } from "@repairflow/shared-types";

const TICKET_PRIORITIES: TicketPriority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];
const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

export class CreateRepairTicketDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  customerId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  deviceId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  branchId!: string;

  @ApiProperty({ minLength: 5, maxLength: 4000 })
  @Transform(trimString)
  @IsString()
  @MinLength(5)
  @MaxLength(4000)
  reportedProblem!: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 4000 })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(4000)
  existingDamage?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 4000 })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(4000)
  conditionNotes?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 2000 })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(2000)
  accessories?: string | null;

  @ApiPropertyOptional({ enum: TICKET_PRIORITIES, default: "NORMAL" })
  @IsOptional()
  @IsIn(TICKET_PRIORITIES)
  priority: TicketPriority = "NORMAL";

  @ApiPropertyOptional({ type: String, format: "date-time", nullable: true })
  @IsOptional()
  @IsISO8601({ strict: true })
  expectedCompletionAt?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 4000 })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(4000)
  initialPublicNote?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 4000 })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(4000)
  initialInternalNote?: string | null;
}
