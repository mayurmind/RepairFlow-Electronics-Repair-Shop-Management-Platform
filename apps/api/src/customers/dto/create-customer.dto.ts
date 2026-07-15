import { Transform } from "class-transformer";
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

const normalizePhone = ({ value }: { value: unknown }): unknown => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    const digitsOnly = trimmed.replace(/\D/g, "");
    return trimmed.startsWith("+") ? "+" + digitsOnly : digitsOnly;
  }
  return value;
};

const normalizeOptionalPhone = ({ value }: { value: unknown }): unknown => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  return normalizePhone({ value });
};

export class CreateCustomerDto {
  @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000" })
  @IsUUID()
  @IsString()
  branchId!: string;

  @ApiProperty({ example: "Aarav Sharma", minLength: 2, maxLength: 120 })
  @Transform(trimString)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @ApiProperty({ example: "+919876543210", minLength: 7, maxLength: 20 })
  @Transform(normalizePhone)
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: "phone must be a valid E.164 phone number",
  })
  phone!: string;

  @ApiPropertyOptional({ example: "+919123456789", nullable: true })
  @IsOptional()
  @Transform(normalizeOptionalPhone)
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: "alternatePhone must be a valid E.164 phone number",
  })
  alternatePhone?: string;

  @ApiPropertyOptional({ example: "aarav@example.com" })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
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
