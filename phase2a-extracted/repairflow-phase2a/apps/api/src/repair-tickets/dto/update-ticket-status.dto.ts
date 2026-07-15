import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { TicketStatus } from "@repairflow/shared-types";

const TICKET_STATUSES: TicketStatus[] = [
  "RECEIVED",
  "DIAGNOSING",
  "WAITING_FOR_APPROVAL",
  "APPROVED",
  "REPAIR_IN_PROGRESS",
  "READY_FOR_COLLECTION",
  "DELIVERED",
  "REJECTED",
  "UNREPAIRABLE",
  "PARTS_REQUIRED",
  "CANCELLED",
];

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

export class UpdateTicketStatusDto {
  @ApiProperty({ enum: TICKET_STATUSES })
  @IsIn(TICKET_STATUSES)
  status!: TicketStatus;

  @ApiPropertyOptional({ maxLength: 4000 })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(4000)
  publicNote?: string;

  @ApiPropertyOptional({ maxLength: 4000 })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(4000)
  internalNote?: string;
}
