import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class DeviceResponseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ format: "uuid" })
  customerId!: string;

  @ApiProperty({ example: "Smartphone" })
  category!: string;

  @ApiProperty({ example: "Samsung" })
  brand!: string;

  @ApiProperty({ example: "Galaxy S24" })
  model!: string;

  @ApiPropertyOptional({ nullable: true })
  serialNumber!: string | null;

  @ApiPropertyOptional({ nullable: true, example: "356789012345678" })
  imeiNumber!: string | null;

  @ApiPropertyOptional({ nullable: true })
  colour!: string | null;

  @ApiPropertyOptional({ nullable: true })
  variant!: string | null;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt!: Date;
}
