import { Transform } from "class-transformer";
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

export class CreateCustomerDto {
  @ApiProperty({ example: "Aarav Sharma", minLength: 2, maxLength: 120 })
  @Transform(trimString)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @ApiProperty({ example: "+919876543210", minLength: 7, maxLength: 20 })
  @Transform(trimString)
  @IsString()
  @Matches(/^\+?[0-9][0-9\s()-]{6,19}$/, {
    message: "phone must be a valid phone number",
  })
  phone!: string;

  @ApiPropertyOptional({ example: "+919123456789", nullable: true })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @Matches(/^\+?[0-9][0-9\s()-]{6,19}$/, {
    message: "alternatePhone must be a valid phone number",
  })
  alternatePhone?: string | null;

  @ApiPropertyOptional({ example: "aarav@example.com" })
  @IsOptional()
  @Transform(trimString)
  @ValidateIf((_object: object, value: unknown) => value !== "")
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 500 })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(500)
  address?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 2000 })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}
