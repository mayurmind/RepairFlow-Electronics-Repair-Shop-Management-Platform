import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TICKET_STATUSES } from "@repairflow/shared-types";
import type { TicketStatus } from "@repairflow/shared-types";

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
