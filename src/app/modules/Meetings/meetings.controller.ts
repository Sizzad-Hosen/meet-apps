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


const  joinMeeting = catchAsync(async (req: Request, res: Response) => {
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
    message:    'Meeting has been joined successfully',
    data: {
      meeting
    }
    },
  )
    
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  })

const getWaitingRoom = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const hostId = req.user?.userId;

    const waitingList = await MeetingServices.getWaitingRoom(code, hostId as string);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Waiting room fetched',
      data: waitingList
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
const admitParticipant = async (req: Request, res: Response) => {
  try {
    const { code, userId: targetUserId } = req.params;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const result = await MeetingServices.admitParticipant(code, targetUserId, currentUserId);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Participant admitted successfully',
      data: result
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const admitAll = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const result = await MeetingServices.admitAll(code, currentUserId);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'All participants admitted successfully',
      data: result
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


const denyParticipant =catchAsync( async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
const currentUserId = req.user?.userId;

    if (!currentUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const result = await MeetingServices.denyParticipant(code, currentUserId);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Participant denied successfully',
      data: result
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

const kickParticipant =catchAsync( async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
const currentUserId = req.user?.userId;

    if (!currentUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const result = await MeetingServices.kickParticipant(code, currentUserId);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Participant kicked successfully',
      data: result
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

const endMeeting =catchAsync( async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const result = await MeetingServices.endMeeting(code, currentUserId);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Meeting ended successfully',
      data: result
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

const muteParticipant = async (req: Request, res: Response) => {
  try {
    const { code, userId: targetUserId } = req.params;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const result = await MeetingServices.muteParticipant(code, targetUserId, currentUserId);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Participant muted successfully',
      data: result
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const muteAll = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const result = await MeetingServices.muteAll(code, currentUserId);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'All participants muted successfully',
      data: result
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getParticipants = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const result = await MeetingServices.getParticipants(code, currentUserId);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Participants fetched successfully',
      data: result
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const assignCohost = async (req: Request, res: Response) => {
  try {
    const { code, userId: targetUserId } = req.params;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const result = await MeetingServices.assignCohost(code, targetUserId, currentUserId);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Co-host assigned successfully',
      data: result
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const MeetingsControllers = {
  createMeeting,
  joinMeeting,
  admitParticipant,
  admitAll,
  denyParticipant,
  kickParticipant,
  endMeeting,
  getWaitingRoom,
  muteParticipant,
  muteAll,
  getParticipants,
  assignCohost
};
