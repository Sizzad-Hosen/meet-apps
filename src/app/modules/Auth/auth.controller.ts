import type { CookieOptions, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import config from "../../config";
import ApiError from "../../errors/ApiError";
import { catchAsync } from "../../../shared/catchAsync";
import { sendResponse } from "../../../shared/sendResponse";
import { AuthServices } from "./auth.service";

const refreshCookieOptions: CookieOptions = {
  secure: config.env === "production",
  httpOnly: true,
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const setRefreshCookie = (res: Response, token: string) => {
  res.cookie("refreshToken", token, refreshCookieOptions);
};

const clearRefreshCookie = (res: Response) => {
  const { maxAge: _maxAge, ...clearOptions } = refreshCookieOptions;
  res.clearCookie("refreshToken", clearOptions);
};

const sessionResponse = <T extends { refreshToken: string }>(result: T) => {
  const { refreshToken: _refreshToken, ...response } = result;
  return response;
};

const register = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthServices.registerUser(req.body);
  setRefreshCookie(res, result.refreshToken);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "User registered successfully",
    data: sessionResponse(result),
  });
});

const login = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthServices.loginUser(req.body);
  setRefreshCookie(res, result.refreshToken);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Login successful",
    data: sessionResponse(result),
  });
});

const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthServices.forgotPasswordUser(req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "If that account exists, a password reset link has been sent",
    data: result,
  });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthServices.resetPassword(req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Password reset successfully",
    data: result,
  });
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Refresh token cookie is missing");
  }

  const result = await AuthServices.refreshToken(token);
  setRefreshCookie(res, result.refreshToken);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Session refreshed successfully",
    data: sessionResponse(result),
  });
});

const logout = catchAsync(async (req: Request, res: Response) => {
  clearRefreshCookie(res);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Logged out successfully",
    data: null,
  });
});

export const AuthControllers = {
  register,
  login,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout,
};
