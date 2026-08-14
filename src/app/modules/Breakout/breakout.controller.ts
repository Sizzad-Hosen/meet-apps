import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../../shared/catchAsync";
import { sendResponse } from "../../../shared/sendResponse";
import { BreakoutServices } from "./breakout.service";
import { requireUserId } from "../../../shared/request";

const createBreakoutRooms = catchAsync(async (req: Request, res: Response) => {
    const result = await BreakoutServices.createBreakoutRooms(req.params.code, req.body, requireUserId(req));

    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "Breakout rooms created successfully",
        data: result,
    });
});

const listBreakoutRooms = catchAsync(async (req: Request, res: Response) => {
    const result = await BreakoutServices.listBreakoutRooms(req.params.code, requireUserId(req));

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Breakout rooms fetched successfully",
        data: result,
    });
});

const joinBreakoutRoom = catchAsync(async (req: Request, res: Response) => {
    const result = await BreakoutServices.joinBreakoutRoom(req.params.code, req.params.roomId, requireUserId(req));

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Joined breakout room successfully",
        data: result,
    });
});

const endAllBreakoutRooms = catchAsync(async (req: Request, res: Response) => {
    const result = await BreakoutServices.endAllBreakoutRooms(req.params.code, requireUserId(req));

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "All breakout rooms closed successfully",
        data: result,
    });
});

const broadcastBreakoutMessage = catchAsync(async (req: Request, res: Response) => {
    const result = await BreakoutServices.broadcastBreakoutMessage(req.params.code, req.body, requireUserId(req));

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Broadcast message sent to breakout rooms",
        data: result,
    });
});

export const BreakoutControllers = {
    createBreakoutRooms,
    listBreakoutRooms,
    joinBreakoutRoom,
    endAllBreakoutRooms,
    broadcastBreakoutMessage,
};
