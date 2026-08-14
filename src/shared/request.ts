import type { Request } from "express";
import { StatusCodes } from "http-status-codes";
import ApiError from "../app/errors/ApiError";

/** Returns the authenticated identity established by the auth middleware. */
export const requireUserId = (req: Request): string => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Authentication required");
  }

  return userId;
};
