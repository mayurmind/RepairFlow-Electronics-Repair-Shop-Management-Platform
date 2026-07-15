import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "@repairflow/shared-types";
import type { TicketPriority, TicketStatus } from "@repairflow/shared-types";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

export class FindRepairTicketsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: TICKET_STATUSES })
  @IsOptional()
  @IsIn(TICKET_STATUSES)
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: TICKET_PRIORITIES })
  @IsOptional()
  @IsIn(TICKET_PRIORITIES)
  priority?: TicketPriority;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  technicianId?: string;
}
