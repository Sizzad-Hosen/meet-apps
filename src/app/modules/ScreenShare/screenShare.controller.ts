import { StatusCodes } from "http-status-codes";
import { sendResponse } from "../../../shared/sendResponse";
import { ScreenShareServices } from "./screenShare.service";
import { Request, Response } from "express";
import { catchAsync } from "../../../shared/catchAsync";

const startScreenShare =catchAsync(async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const result = await ScreenShareServices.startScreenShare(code, currentUserId);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Screenshare started successfully',
      data: result
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

const stopScreenShare =catchAsync( async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const result = await ScreenShareServices.stopScreenShare(code, currentUserId);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Screenshare stopped successfully',
      data: result
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

const approveScreenShare = async (req: Request, res: Response) => {
  try {
    const { code, userId: targetUserId } = req.params;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const result = await ScreenShareServices.approveScreenShare(code, targetUserId, currentUserId);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Screenshare approved successfully',
      data: result
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const denyScreenShare = async (req: Request, res: Response) => {
  try {
    const { code, userId: targetUserId } = req.params;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const result = await ScreenShareServices.denyScreenShare(code, targetUserId, currentUserId);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Screenshare denied successfully',
      data: result
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const ScreenShareControllers = {
    startScreenShare,
    stopScreenShare,
    denyScreenShare,
    approveScreenShare

}
