import { NestFactory } from "@nestjs/core";
import { ValidationPipe, BadRequestException } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger:
      process.env.NODE_ENV === "development"
        ? ["log", "error", "warn", "debug", "verbose"]
        : ["error", "warn", "log"],
  });

  // Global prefixes and versioning
  app.setGlobalPrefix("api/v1");

  // Security Headers
  app.use(helmet());

  // Parsers
  app.use(cookieParser());

  // CORS Settings
  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || "").split(",");
  app.enableCors({
    origin:
      allowedOrigins.length > 0 && allowedOrigins[0] ? allowedOrigins : true,
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  });

  // Global Pipes: class-validator validation with custom formatting
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        const details = errors.map((err) => ({
          field: err.property,
          constraints: Object.values(err.constraints || {}),
        }));
        return new BadRequestException({
          code: "VALIDATION_ERROR",
          message: "The submitted data is invalid.",
          details,
        });
      },
    }),
  );

  // Global Exception Filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger Documentation Setup
  if (process.env.NODE_ENV !== "production") {
    const config = new DocumentBuilder()
      .setTitle("RepairFlow API")
      .setDescription(
        "RepairFlow Electronics Repair Shop Management Platform API",
      )
      .setVersion("1.0")
      .addBearerAuth()
      .addCookieAuth("refreshToken")
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/v1/docs", app, document);
  }

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(
    `RepairFlow Backend API is running on: http://localhost:${port}/api/v1`,
  );
  if (process.env.NODE_ENV !== "production") {
    console.log(
      `Swagger documentation is available at: http://localhost:${port}/api/v1/docs`,
    );
  }
}
bootstrap();
