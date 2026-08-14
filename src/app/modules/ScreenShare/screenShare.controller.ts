import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../../shared/catchAsync";
import { requireUserId } from "../../../shared/request";
import { sendResponse } from "../../../shared/sendResponse";
import { ScreenShareServices } from "./screenShare.service";

const startScreenShare = catchAsync(async (req: Request, res: Response) => {
  const result = await ScreenShareServices.startScreenShare(req.params.code, requireUserId(req));
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Screenshare started successfully",
    data: result,
  });
});

const stopScreenShare = catchAsync(async (req: Request, res: Response) => {
  const result = await ScreenShareServices.stopScreenShare(req.params.code, requireUserId(req));
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Screenshare stopped successfully",
    data: result,
  });
});

const approveScreenShare = catchAsync(async (req: Request, res: Response) => {
  const result = await ScreenShareServices.approveScreenShare(
    req.params.code,
    req.params.userId,
    requireUserId(req),
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Screenshare approved successfully",
    data: result,
  });
});

const denyScreenShare = catchAsync(async (req: Request, res: Response) => {
  const result = await ScreenShareServices.denyScreenShare(
    req.params.code,
    req.params.userId,
    requireUserId(req),
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Screenshare denied successfully",
    data: result,
  });
});

const getScreenShareStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await ScreenShareServices.getScreenShareStatus(req.params.code, requireUserId(req));
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Screenshare status fetched successfully",
    data: result,
  });
});

export const ScreenShareControllers = {
  startScreenShare,
  stopScreenShare,
  approveScreenShare,
  denyScreenShare,
  getScreenShareStatus,
};
