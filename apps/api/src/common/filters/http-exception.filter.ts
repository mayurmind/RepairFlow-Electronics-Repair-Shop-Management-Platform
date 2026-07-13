import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Response, Request } from "express";
import { v4 as uuidv4 } from "uuid";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = (request.headers["x-request-id"] as string) || uuidv4();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = "INTERNAL_SERVER_ERROR";
    let message = "An unexpected error occurred.";
    let details: any[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resBody: any = exception.getResponse();

      if (typeof resBody === "object" && resBody !== null) {
        code =
          resBody.code || exception.name.replace("Exception", "").toUpperCase();
        message = resBody.message || exception.message;
        details = resBody.details || [];
      } else {
        message = exception.message;
      }
    } else {
      // Log non-HTTP errors to console for debug
      console.error("Unhandled Exception in Request:", exception);

      // Map common database/Prisma errors to clean API codes
      if (exception?.code === "P2002") {
        status = HttpStatus.CONFLICT;
        code = "DUPLICATE_RESOURCE";
        message = `A resource with this identifier already exists. (${exception.meta?.target})`;
      } else if (exception?.code === "P2025") {
        status = HttpStatus.NOT_FOUND;
        code = "RESOURCE_NOT_FOUND";
        message = "The requested resource could not be found.";
      }
    }

    // Hide trace information in production environments
    const isProduction = process.env.NODE_ENV === "production";
    const errorResponse = {
      success: false,
      error: {
        code,
        message,
        details,
        ...(isProduction ? {} : { stack: exception?.stack }),
      },
      requestId,
    };

    response.status(status).json(errorResponse);
  }
}
