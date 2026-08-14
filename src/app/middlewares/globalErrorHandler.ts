import { NextFunction, Request, Response } from "express";
import status from "http-status";
import z from "zod";
import ApiError from "../errors/ApiError";
import config from "../config";
import { handleZodError } from "../errors/zodError";
import { TErrorResponse, TErrorSources } from "../types/error.types";
import { logger } from "../../shared/logger";


export const globalErrorHandler = async (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) => {


  // ✅ Defaults
  let statusCode: number = status.INTERNAL_SERVER_ERROR;
  let message    = "Something went wrong";
  let errorSources: TErrorSources[] = [];
  let stack: string | undefined;

  // ✅ Zod validation error
  if (err instanceof z.ZodError) {
    const simplified = handleZodError(err);
    statusCode   = simplified.statusCode ?? status.BAD_REQUEST;
    message      = simplified.message;
    errorSources = simplified.errorSources;
    stack        = err.stack;

  // ✅ Known API error (thrown manually)
  } else if (err instanceof ApiError) {
    statusCode   = err.statusCode;
    message      = err.message;
    stack        = err.stack;
    errorSources = [{ path: "", message: err.message }];

  // ✅ Prisma errors
  } else if (err instanceof Error && err.constructor.name === "PrismaClientKnownRequestError") {
    statusCode = status.BAD_REQUEST;
    message    = "Database operation failed";
    errorSources = [{ path: "", message: err.message }];
    stack = err.stack;

  // ✅ Generic JS error
  } else if (err instanceof Error) {
    statusCode   = status.INTERNAL_SERVER_ERROR;
    message      = err.message;
    stack        = err.stack;
    errorSources = [{ path: "", message: err.message }];
  }

  // ✅ Dev logging
  logger.error("request_error", {
    path: req.originalUrl,
    method: req.method,
    message,
    statusCode,
    stack,
  });

  const isDev = config.env === "development";

  const errorResponse: TErrorResponse & { data?: { errors: TErrorSources[] } } = {
    success:      false,
    message,
    errorSources,
    data: {
      errors: errorSources,
    },
    ...(isDev && { stack }),
  };

  res.status(statusCode).json(errorResponse);
};
