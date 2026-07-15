import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "@repairflow/shared-types";
import type { TicketPriority, TicketStatus } from "@repairflow/shared-types";

export class RepairTicketResponseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "RF-BR-A-2026-000012" })
  ticketNumber!: string;

  @ApiProperty({ format: "uuid" })
  branchId!: string;

  @ApiProperty({ format: "uuid" })
  customerId!: string;

  @ApiProperty({ format: "uuid" })
  deviceId!: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  assignedTechnicianId!: string | null;

  @ApiProperty({ format: "uuid" })
  createdById!: string;

  @ApiProperty({ enum: TICKET_PRIORITIES })
  priority!: TicketPriority;

  @ApiProperty({ enum: TICKET_STATUSES })
  status!: TicketStatus;

  @ApiProperty()
  reportedProblem!: string;

  @ApiPropertyOptional({ nullable: true })
  existingDamage!: string | null;

  @ApiPropertyOptional({ nullable: true })
  conditionNotes!: string | null;

  @ApiPropertyOptional({ nullable: true })
  accessories!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: "Staff-only note; exclude from customer-facing projections",
  })
  internalNotes!: string | null;

  @ApiPropertyOptional({ nullable: true })
  publicNotes!: string | null;

  @ApiPropertyOptional({ type: String, format: "date-time", nullable: true })
  expectedCompletionAt!: Date | null;

  @ApiPropertyOptional({ type: String, format: "date-time", nullable: true })
  diagnosisStartedAt!: Date | null;

  @ApiPropertyOptional({ type: String, format: "date-time", nullable: true })
  repairStartedAt!: Date | null;

  @ApiPropertyOptional({ type: String, format: "date-time", nullable: true })
  readyAt!: Date | null;

  @ApiPropertyOptional({ type: String, format: "date-time", nullable: true })
  completedAt!: Date | null;

  @ApiPropertyOptional({ type: String, format: "date-time", nullable: true })
  deliveredAt!: Date | null;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  deliveredById!: string | null;

  @ApiPropertyOptional({ nullable: true })
  deliveryNotes!: string | null;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt!: Date;
}

export class TicketStatusHistoryResponseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ format: "uuid" })
  repairTicketId!: string;

  @ApiProperty({ enum: TICKET_STATUSES })
  previousStatus!: TicketStatus;

  @ApiProperty({ enum: TICKET_STATUSES })
  newStatus!: TicketStatus;

  @ApiPropertyOptional({ nullable: true })
  publicNote!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: "Staff-only note; exclude from customer-facing projections",
  })
  internalNote!: string | null;

  @ApiProperty({ format: "uuid" })
  changedById!: string;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;
}
