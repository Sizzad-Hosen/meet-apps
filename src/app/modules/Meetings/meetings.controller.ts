import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../../shared/catchAsync";
import { sendResponse } from "../../../shared/sendResponse";
import { MeetingServices } from "./meetings.service";
import { requireUserId } from "../../../shared/request";

const createMeeting = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.createMeetings(req.body, requireUserId(req));

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Meeting created successfully",
    data: result,
  });
});

const joinMeeting = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.joinMeeting(req.body.joinCode, requireUserId(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Meeting joined successfully",
    data: result,
  });
});

const leaveMeeting = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.leaveMeeting(req.params.code, requireUserId(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Meeting left successfully",
    data: result,
  });
});

const getWaitingRoom = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.getWaitingRoom(req.params.code, requireUserId(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Waiting room fetched",
    data: result,
  });
});

const admitParticipant = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.admitParticipant(req.params.code, req.params.userId, requireUserId(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Participant admitted successfully",
    data: result,
  });
});

const admitAll = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.admitAll(req.params.code, requireUserId(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "All participants admitted successfully",
    data: result,
  });
});

const denyParticipant = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.denyParticipant(req.params.code, req.params.userId, requireUserId(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Participant denied successfully",
    data: result,
  });
});

const kickParticipant = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.kickParticipant(req.params.code, req.params.userId, requireUserId(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Participant kicked successfully",
    data: result,
  });
});

const endMeeting = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.endMeeting(req.params.code, requireUserId(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Meeting ended successfully",
    data: result,
  });
});

const muteParticipant = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.muteParticipant(req.params.code, req.params.userId, requireUserId(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Participant muted successfully",
    data: result,
  });
});

const muteAll = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.muteAll(req.params.code, requireUserId(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "All participants muted successfully",
    data: result,
  });
});

const getParticipants = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.getParticipants(req.params.code, requireUserId(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Participants fetched successfully",
    data: result,
  });
});

const assignCohost = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.assignCohost(req.params.code, req.params.userId, requireUserId(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Co-host assigned successfully",
    data: result,
  });
});

const getMeetingByCode = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.getMeetingByCode(req.params.code, requireUserId(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Meeting fetched successfully",
    data: result,
  });
});

const updateMeeting = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.updateMeeting(req.params.code, req.body, requireUserId(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Meeting updated successfully",
    data: result,
  });
});

const deleteMeeting = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.deleteMeeting(req.params.code, requireUserId(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Meeting deleted successfully",
    data: result,
  });
});

export const MeetingsControllers = {
  createMeeting,
  joinMeeting,
  leaveMeeting,
  getMeetingByCode,
  updateMeeting,
  deleteMeeting,
  admitParticipant,
  admitAll,
  denyParticipant,
  kickParticipant,
  endMeeting,
  getWaitingRoom,
  muteParticipant,
  muteAll,
  getParticipants,
  assignCohost,
};
