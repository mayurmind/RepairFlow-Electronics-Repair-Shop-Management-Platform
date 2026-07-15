import { Transform } from "class-transformer";
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

export class CreateDeviceDto {
  @ApiProperty({ example: "Smartphone", minLength: 2, maxLength: 80 })
  @Transform(trimString)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  category!: string;

  @ApiProperty({ example: "Samsung", maxLength: 80 })
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  brand!: string;

  @ApiProperty({ example: "Galaxy S24", maxLength: 120 })
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  model!: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 120 })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(120)
  serialNumber?: string | null;

  @ApiPropertyOptional({ example: "356789012345678", nullable: true })
  @IsOptional()
  @Transform(trimString)
  @Matches(/^\d{15}$/, { message: "imeiNumber must contain exactly 15 digits" })
  imeiNumber?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 50 })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(50)
  colour?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 100 })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(100)
  variant?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 2000 })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}
