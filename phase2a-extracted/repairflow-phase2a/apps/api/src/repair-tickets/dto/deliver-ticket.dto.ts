import { Transform } from "class-transformer";
import { IsOptional, IsString, MaxLength } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class DeliverTicketDto {
  @ApiPropertyOptional({
    description: "Customer-visible handover confirmation or delivery note",
    maxLength: 4000,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @MaxLength(4000)
  publicNote?: string;

  @ApiPropertyOptional({
    description: "Staff-only delivery note; never expose through customer APIs",
    maxLength: 4000,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @MaxLength(4000)
  internalNote?: string;
}
