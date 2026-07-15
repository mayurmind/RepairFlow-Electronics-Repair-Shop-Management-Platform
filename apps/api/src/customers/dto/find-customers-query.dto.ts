import { Transform } from "class-transformer";
import { IsOptional, IsString, MaxLength } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

export class FindCustomersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "Search name, phone, or email", maxLength: 120 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @MaxLength(120)
  search?: string;
}
