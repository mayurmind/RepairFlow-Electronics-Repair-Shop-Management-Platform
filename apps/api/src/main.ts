import { NestFactory } from "@nestjs/core";
import { ValidationPipe, BadRequestException } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import * as express from "express";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { validateEnvironment } from "./config/environment.schema";

async function bootstrap() {
  validateEnvironment();

  const app = await NestFactory.create(AppModule, {
    logger:
      process.env.NODE_ENV === "development"
        ? ["log", "error", "warn", "debug", "verbose"]
        : ["error", "warn", "log"],
  });

  // Enable Shutdown Hooks
  app.enableShutdownHooks();

  // Global prefixes and versioning
  app.setGlobalPrefix("api/v1");

  // Security Headers
  app.use(helmet());

  // Parsers with limits
  app.use(cookieParser());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // CORS Settings
  // CORS Settings (Fail closed)
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(",")
    : [];

  if (allowedOrigins.length === 0 && process.env.NODE_ENV === "production") {
    console.error(
      "❌ CORS_ALLOWED_ORIGINS is not configured for production. Failing closed.",
    );
    process.exit(1);
  }

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
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
