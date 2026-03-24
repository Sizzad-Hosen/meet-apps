import { NextFunction, Request, Response } from "express";
import status from "http-status";
import ApiError from "../errors/ApiError";
import { verifyToken } from "../../helpers/jwtHelpers";
import { UserRole } from "@prisma/client";

export const checkAuth = (...authRoles: UserRole[]) => async (req: Request, res: Response, next: NextFunction) => {
  try {

    const accessToken = req.cookies?.["accessToken"] 
      || req.headers?.authorization?.split(" ")[1]; // Bearer <token>

    if (!accessToken) {
      throw new ApiError(status.UNAUTHORIZED, 'Unauthorized! No access token provided.');
    }

    const decoded = await verifyToken(accessToken, process.env.JWT_SECRET as string);

    if (!decoded) {
      throw new ApiError(status.UNAUTHORIZED, 'Unauthorized! Invalid access token.');
    }

    if (authRoles.length > 0 && !authRoles.includes(decoded.role as UserRole)) {
      throw new ApiError(status.FORBIDDEN, 'Forbidden! You do not have permission.');
    }

    req.user = {
      userId: decoded.userId as string,
      role:   decoded.role   as UserRole,
      email:  decoded.email  as string,
    };

    next();

  } catch (error: any) {
    next(error);
  }
};