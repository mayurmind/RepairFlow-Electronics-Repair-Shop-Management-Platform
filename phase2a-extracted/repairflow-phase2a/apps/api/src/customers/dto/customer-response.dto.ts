import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CustomerResponseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "Aarav Sharma" })
  fullName!: string;

  @ApiProperty({ example: "+919876543210" })
  phone!: string;

  @ApiPropertyOptional({ nullable: true })
  alternatePhone!: string | null;

  @ApiPropertyOptional({ nullable: true, format: "email" })
  email!: string | null;

  @ApiPropertyOptional({ nullable: true })
  address!: string | null;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt!: Date;
}
