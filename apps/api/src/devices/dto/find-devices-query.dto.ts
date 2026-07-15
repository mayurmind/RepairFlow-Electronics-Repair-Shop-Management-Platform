import { Transform } from "class-transformer";
import { IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

export class FindDevicesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "Search brand, model, serial number, or IMEI",
    maxLength: 120,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @MaxLength(120)
  search?: string;
}
