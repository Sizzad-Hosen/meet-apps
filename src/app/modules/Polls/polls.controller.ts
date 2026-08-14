import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../../shared/catchAsync";
import { sendResponse } from "../../../shared/sendResponse";
import { PollServices } from "./polls.service";
import { requireUserId } from "../../../shared/request";

const createPoll = catchAsync(async (req: Request, res: Response) => {
    const result = await PollServices.createPoll(req.params.code, req.body, requireUserId(req));

    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "Poll created successfully",
        data: result,
    });
});

const listPolls = catchAsync(async (req: Request, res: Response) => {
    const result = await PollServices.listPolls(req.params.code, requireUserId(req));

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Polls fetched successfully",
        data: result,
    });
});

const submitPollVote = catchAsync(async (req: Request, res: Response) => {
    const result = await PollServices.submitPollVote(req.params.code, req.params.pollId, req.body, requireUserId(req));

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Vote submitted successfully",
        data: result,
    });
});

const getPollResults = catchAsync(async (req: Request, res: Response) => {
    const result = await PollServices.getPollResults(req.params.code, req.params.pollId, requireUserId(req));

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Poll results fetched successfully",
        data: result,
    });
});

const closePoll = catchAsync(async (req: Request, res: Response) => {
    const result = await PollServices.closePoll(req.params.code, req.params.pollId, requireUserId(req));

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Poll closed successfully",
        data: result,
    });
});

export const PollControllers = {
    createPoll,
    listPolls,
    submitPollVote,
    getPollResults,
    closePoll,
};
