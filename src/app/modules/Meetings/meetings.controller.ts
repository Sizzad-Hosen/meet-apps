import { Request, Response } from "express";
import { catchAsync } from "../../../shared/catchAsync";
import { sendResponse } from "../../../shared/sendResponse";
import { MeetingServices } from "./meetings.service";
import { StatusCodes } from "http-status-codes";


const createMeeting = catchAsync(async (req: Request, res: Response) => {

    const user = req.user;

    console.log('Authenticated user:', user);

    if (!req.user) {
      return sendResponse(res, {
        statusCode: StatusCodes.UNAUTHORIZED,
        success: false,
        message: 'User not authenticated',
        data: null,
      });
    }

    const result = await MeetingServices.createMeetings(req.body, req.user.userId);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success:    true,
    message:    'Meeting created successfully',
    data: {
      meeting: result
    }
    },
  );
});


const  joinMeeting = async (req: Request, res: Response) => {
    try {
       const { joinCode } = req.body
      console.log('Join code received:', {joinCode});
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const meeting = await MeetingServices.getMeetingByJoinCode(joinCode, userId);

      if (!meeting) {
        return res.status(404).json({ success: false, message: 'Meeting not found' });
      }

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success:    true,
    message:    'Meeting created successfully',
    data: {
      meeting
    }
    },
  )
    
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

export const MeetingsControllers = {
    createMeeting,
    joinMeeting
}