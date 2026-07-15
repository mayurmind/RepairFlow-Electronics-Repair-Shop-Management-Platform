import { applyDecorators, type Type } from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from "@nestjs/swagger";

export class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;
}

export class ApiSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: Object })
  data!: unknown;

  @ApiPropertyOptional({ type: PaginationMetaDto })
  meta?: PaginationMetaDto;
}

export class ValidationErrorDetailDto {
  @ApiProperty({ example: "phone" })
  field!: string;

  @ApiProperty({
    type: [String],
    example: ["phone must be a valid phone number"],
  })
  constraints!: string[];
}

export class ApiErrorBodyDto {
  @ApiProperty({ example: "VALIDATION_ERROR" })
  code!: string;

  @ApiProperty({ example: "The submitted data is invalid." })
  message!: string;

  @ApiProperty({ type: [ValidationErrorDetailDto] })
  details!: ValidationErrorDetailDto[];

  @ApiPropertyOptional({ description: "Included only outside production" })
  stack?: string;
}

export class ApiValidationErrorDto {
  @ApiProperty({ example: false })
  success!: false;

  @ApiProperty({ type: ApiErrorBodyDto })
  error!: ApiErrorBodyDto;

  @ApiProperty({ format: "uuid" })
  requestId!: string;
}

function responseSchema(
  model: Type<unknown>,
  options: { isArray?: boolean; paginated?: boolean; nullable?: boolean } = {},
) {
  const itemSchema = { $ref: getSchemaPath(model) };
  const dataSchema = options.isArray
    ? { type: "array", items: itemSchema }
    : { ...itemSchema, nullable: options.nullable ?? false };

  return {
    allOf: [
      { $ref: getSchemaPath(ApiSuccessResponseDto) },
      {
        properties: {
          success: { type: "boolean", example: true },
          data: dataSchema,
          ...(options.paginated
            ? { meta: { $ref: getSchemaPath(PaginationMetaDto) } }
            : {}),
        },
        required: options.paginated
          ? ["success", "data", "meta"]
          : ["success", "data"],
      },
    ],
  };
}

export const ApiOkDataResponse = (model: Type<unknown>) =>
  applyDecorators(
    ApiExtraModels(ApiSuccessResponseDto, model),
    ApiOkResponse({ schema: responseSchema(model) }),
  );

export const ApiOkNullableDataResponse = (model: Type<unknown>) =>
  applyDecorators(
    ApiExtraModels(ApiSuccessResponseDto, model),
    ApiOkResponse({ schema: responseSchema(model, { nullable: true }) }),
  );

export const ApiArrayDataResponse = (model: Type<unknown>) =>
  applyDecorators(
    ApiExtraModels(ApiSuccessResponseDto, model),
    ApiOkResponse({ schema: responseSchema(model, { isArray: true }) }),
  );

export const ApiPaginatedDataResponse = (model: Type<unknown>) =>
  applyDecorators(
    ApiExtraModels(ApiSuccessResponseDto, PaginationMetaDto, model),
    ApiOkResponse({
      schema: responseSchema(model, { isArray: true, paginated: true }),
    }),
  );

export const ApiCreatedDataResponse = (model: Type<unknown>) =>
  applyDecorators(
    ApiExtraModels(ApiSuccessResponseDto, model),
    ApiCreatedResponse({ schema: responseSchema(model) }),
  );

export const ApiStandardErrors = () =>
  applyDecorators(
    ApiUnauthorizedResponse({
      type: ApiValidationErrorDto,
      description: "Authentication required",
    }),
    ApiForbiddenResponse({
      type: ApiValidationErrorDto,
      description: "Insufficient permissions or wrong branch",
    }),
    ApiNotFoundResponse({
      type: ApiValidationErrorDto,
      description: "Resource not found",
    }),
    ApiConflictResponse({
      type: ApiValidationErrorDto,
      description: "Business rule violation or state conflict",
    }),
  );
