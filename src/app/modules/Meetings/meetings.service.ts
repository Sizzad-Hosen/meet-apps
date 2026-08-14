import { MeetingStatus, ParticipantRole, ParticipantStatus } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { generateJoinCode } from "../../../helpers/generateJoinCode";
import { generateRoomName } from "../../../helpers/livekitToken";
import prisma from "../../../lib/prisma";
import ApiError from "../../errors/ApiError";
import type { CreateMeetingInput, UpdateMeetingInput } from "./meetings.validation";
import { ensureModerator, getMeetingByCodeOrThrow, getParticipantOrThrow } from "./meetings.helpers";
import {
  deleteLiveKitRoom,
  ensureRoomExists,
  issueParticipantToken,
  muteLiveKitParticipant,
  provisionRoom,
  removeLiveKitParticipant,
} from "./meetings.media";

const createUniqueJoinCode = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const joinCode = generateJoinCode();
    const existingMeeting = await prisma.meeting.findUnique({
      where: { join_code: joinCode },
      select: { id: true },
    });

    if (!existingMeeting) {
      return joinCode;
    }
  }

  throw new ApiError(StatusCodes.CONFLICT, "Unable to generate a unique join code");
};

const countActiveParticipants = async (meetingId: string) => prisma.meetingParticipant.count({
  where: {
    meeting_id: meetingId,
    status: ParticipantStatus.admitted,
    left_at: null,
  },
});

const markMeetingActive = async (meetingId: string) => {
  await prisma.meeting.update({
    where: { id: meetingId },
    data: {
      status: MeetingStatus.active,
      started_at: new Date(),
    },
  });
};

const normalizeParticipantState = async (meetingId: string, userId: string, status: ParticipantStatus) => {
  await prisma.screenShare.deleteMany({
    where: {
      meeting_id: meetingId,
      user_id: userId,
    },
  });

  await prisma.meetingParticipant.updateMany({
    where: {
      meeting_id: meetingId,
      user_id: userId,
    },
    data: {
      status,
      left_at: new Date(),
      is_screen_sharing: false,
    },
  });
};

const createMeetings = async (payload: CreateMeetingInput, userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  const joinCode = await createUniqueJoinCode();
  const meeting = await prisma.$transaction(async (transaction) => {
    const createdMeeting = await transaction.meeting.create({
      data: {
        title: payload.title,
        type: payload.type,
        max_participants: payload.max_participants ?? 50,
        waiting_room_on: payload.waiting_room_on ?? true,
        allow_screenshare: payload.allow_screenshare ?? true,
        screenshare_needs_approval: payload.screenshare_needs_approval ?? false,
        is_recorded: payload.is_recorded ?? false,
        scheduled_at: payload.scheduled_at ? new Date(payload.scheduled_at) : null,
        host_id: userId,
        join_code: joinCode,
        livekit_room_name: generateRoomName(),
      },
    });

    await transaction.meetingParticipant.create({
      data: {
        meeting_id: createdMeeting.id,
        user_id: userId,
        role: ParticipantRole.host,
        status: ParticipantStatus.admitted,
        joined_at: new Date(),
      },
    });

    return createdMeeting;
  });

  return {
    meeting,
  };
};

const joinMeeting = async (joinCode: string, userId: string) => {
  const meeting = await prisma.meeting.findUnique({
    where: { join_code: joinCode },
    include: { meetingParticipants: true },
  });

  if (!meeting) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Meeting not found");
  }

  if (meeting.status === MeetingStatus.ended) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Meeting has already ended");
  }

  const isHost = meeting.host_id === userId;
  const existingParticipant = meeting.meetingParticipants.find((participant) => participant.user_id === userId);

  if (existingParticipant?.status === ParticipantStatus.denied) {
    throw new ApiError(StatusCodes.FORBIDDEN, "You are not allowed to join this meeting");
  }

  if (!existingParticipant) {
    const activeParticipants = await countActiveParticipants(meeting.id);
    if (activeParticipants >= meeting.max_participants) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Meeting has reached the participant limit");
    }
  }

  const alreadyAdmitted = existingParticipant?.status === ParticipantStatus.admitted;
  const nextStatus = isHost || !meeting.waiting_room_on || alreadyAdmitted
    ? ParticipantStatus.admitted
    : ParticipantStatus.waiting;
  const participant = existingParticipant
    ? await prisma.meetingParticipant.update({
      where: { id: existingParticipant.id },
      data: {
        status: nextStatus,
        left_at: null,
        role: isHost ? ParticipantRole.host : existingParticipant.role,
      },
    })
    : await prisma.meetingParticipant.create({
      data: {
        meeting_id: meeting.id,
        user_id: userId,
        role: isHost ? ParticipantRole.host : ParticipantRole.guest,
        status: nextStatus,
      },
    });

  let livekitToken: string | null = null;
  let mediaAvailable = true;
  if (participant.status === ParticipantStatus.admitted) {
    mediaAvailable = await provisionRoom(meeting);
    if (mediaAvailable) {
      livekitToken = await issueParticipantToken(meeting, participant);
      await markMeetingActive(meeting.id);
    }
  }

  return {
    meeting: {
      id: meeting.id,
      title: meeting.title,
      join_code: meeting.join_code,
      livekit_room_name: meeting.livekit_room_name,
      waiting_room_on: meeting.waiting_room_on,
      allow_screenshare: meeting.allow_screenshare,
      screenshare_needs_approval: meeting.screenshare_needs_approval,
      status: meeting.status,
    },
    participant: {
      id: participant.id,
      role: participant.role,
      status: participant.status,
    },
    livekitToken,
    mediaAvailable,
  };
};

const getLiveKitToken = async (code: string, userId: string) => {
  const meeting = await getMeetingByCodeOrThrow(code);

  if (meeting.status === MeetingStatus.ended) {
    throw new ApiError(StatusCodes.GONE, "Meeting has ended");
  }

  const participant = await getParticipantOrThrow(meeting.id, userId);

  if (participant.status !== ParticipantStatus.admitted) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Participant is not admitted yet");
  }

  await ensureRoomExists(meeting);
  const token = await issueParticipantToken(meeting, participant);
  await markMeetingActive(meeting.id);

  return {
    roomName: meeting.livekit_room_name,
    token,
    participant: {
      role: participant.role,
      status: ParticipantStatus.admitted,
    },
  };
};

const leaveMeeting = async (code: string, currentUserId: string) => {
  const meeting = await getMeetingByCodeOrThrow(code);
  await getParticipantOrThrow(meeting.id, currentUserId);
  await normalizeParticipantState(meeting.id, currentUserId, ParticipantStatus.left);

  await removeLiveKitParticipant(meeting, currentUserId);

  return { left: true };
};

const getWaitingRoom = async (code: string, hostId: string) => {
  const meeting = await getMeetingByCodeOrThrow(code);
  await ensureModerator(meeting.id, hostId);

  return prisma.meetingParticipant.findMany({
    where: {
      meeting_id: meeting.id,
      status: ParticipantStatus.waiting,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  });
};

const admitParticipant = async (code: string, targetUserId: string, currentUserId: string) => {
  const meeting = await getMeetingByCodeOrThrow(code);
  await ensureModerator(meeting.id, currentUserId);

  if (await countActiveParticipants(meeting.id) >= meeting.max_participants) {
    throw new ApiError(StatusCodes.CONFLICT, "Meeting has reached the participant limit");
  }

  const participant = await prisma.meetingParticipant.findFirst({
    where: {
      meeting_id: meeting.id,
      user_id: targetUserId,
      status: ParticipantStatus.waiting,
    },
  });

  if (!participant) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Participant not found in waiting room");
  }

  const updatedParticipant = await prisma.meetingParticipant.update({
    where: { id: participant.id },
    data: {
      status: ParticipantStatus.admitted,
      left_at: null,
      is_muted: false,
      livekit_token: null,
    },
  });

  return {
    participantId: participant.id,
    userId: targetUserId,
    status: updatedParticipant.status,
  };
};

const admitAll = async (code: string, hostId: string) => {
  const meeting = await getMeetingByCodeOrThrow(code);
  await ensureModerator(meeting.id, hostId);

  const waitingParticipants = await prisma.meetingParticipant.findMany({
    where: {
      meeting_id: meeting.id,
      status: ParticipantStatus.waiting,
    },
  });

  const activeParticipants = await countActiveParticipants(meeting.id);
  if (activeParticipants + waitingParticipants.length > meeting.max_participants) {
    throw new ApiError(StatusCodes.CONFLICT, "Not enough room to admit every waiting participant");
  }

  const results = await Promise.all(waitingParticipants.map(async (participant) => {
    const updatedParticipant = await prisma.meetingParticipant.update({
      where: { id: participant.id },
      data: {
        status: ParticipantStatus.admitted,
        left_at: null,
        is_muted: false,
        livekit_token: null,
      },
    });

    return {
      userId: participant.user_id,
      status: updatedParticipant.status,
    };
  }));

  return results;
};

const denyParticipant = async (code: string, targetUserId: string, currentUserId: string) => {
  const meeting = await getMeetingByCodeOrThrow(code);
  await ensureModerator(meeting.id, currentUserId);
  const participant = await getParticipantOrThrow(meeting.id, targetUserId);

  await prisma.screenShare.deleteMany({
    where: {
      meeting_id: meeting.id,
      user_id: targetUserId,
    },
  });

  return prisma.meetingParticipant.update({
    where: { id: participant.id },
    data: {
      status: ParticipantStatus.denied,
      is_screen_sharing: false,
      left_at: new Date(),
    },
  });
};

const kickParticipant = async (code: string, targetUserId: string, currentUserId: string) => {
  const meeting = await getMeetingByCodeOrThrow(code);
  await ensureModerator(meeting.id, currentUserId);

  if (meeting.host_id === targetUserId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Host cannot be kicked");
  }

  await normalizeParticipantState(meeting.id, targetUserId, ParticipantStatus.left);

  await removeLiveKitParticipant(meeting, targetUserId);

  return { removed: true };
};

const endMeeting = async (code: string, currentUserId: string) => {
  const meeting = await getMeetingByCodeOrThrow(code);
  if (meeting.host_id !== currentUserId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only host can end the meeting");
  }

  const now = new Date();

  await prisma.screenShare.deleteMany({
    where: { meeting_id: meeting.id },
  });

  await prisma.meetingParticipant.updateMany({
    where: { meeting_id: meeting.id },
    data: {
      status: ParticipantStatus.left,
      left_at: now,
      is_screen_sharing: false,
    },
  });

  const updatedMeeting = await prisma.meeting.update({
    where: { id: meeting.id },
    data: {
      status: MeetingStatus.ended,
      ended_at: now,
    },
  });

  await deleteLiveKitRoom(meeting);

  return updatedMeeting;
};

const muteParticipant = async (code: string, targetUserId: string, currentUserId: string) => {
  const meeting = await getMeetingByCodeOrThrow(code);
  await ensureModerator(meeting.id, currentUserId);
  const participant = await getParticipantOrThrow(meeting.id, targetUserId);
  if (participant.role === ParticipantRole.host || participant.status !== ParticipantStatus.admitted) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Only an admitted non-host participant can be muted");
  }

  await muteLiveKitParticipant(meeting, targetUserId);

  return prisma.meetingParticipant.update({
    where: { id: participant.id },
    data: { is_muted: true },
  });
};

const muteAll = async (code: string, currentUserId: string) => {
  const meeting = await getMeetingByCodeOrThrow(code);
  await ensureModerator(meeting.id, currentUserId);

  const targets = await prisma.meetingParticipant.findMany({
    where: {
      meeting_id: meeting.id,
      role: { not: ParticipantRole.host },
      status: ParticipantStatus.admitted,
    },
    select: { user_id: true },
  });

  await Promise.all(targets.map(({ user_id }) => muteLiveKitParticipant(meeting, user_id)));

  await prisma.meetingParticipant.updateMany({
    where: {
      meeting_id: meeting.id,
      role: { not: ParticipantRole.host },
      status: ParticipantStatus.admitted,
    },
    data: { is_muted: true },
  });

  return { muted: true };
};

const getParticipants = async (code: string, callerId: string) => {
  const meeting = await getMeetingByCodeOrThrow(code);

  const callerParticipant = await prisma.meetingParticipant.findFirst({
    where: {
      meeting_id: meeting.id,
      user_id: callerId,
      status: ParticipantStatus.admitted,
    },
  });

  if (!callerParticipant) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Access denied');
  }

  return prisma.meetingParticipant.findMany({
    where: { meeting_id: meeting.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  });
};

const assignCohost = async (code: string, targetUserId: string, currentUserId: string) => {
  const meeting = await getMeetingByCodeOrThrow(code);
  if (meeting.host_id !== currentUserId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only host can assign co-host");
  }

  const participant = await getParticipantOrThrow(meeting.id, targetUserId);
  if (participant.role === ParticipantRole.host) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Cannot change host role");
  }

  return prisma.meetingParticipant.update({
    where: { id: participant.id },
    data: { role: ParticipantRole.cohost },
  });
};

const getMeetingByCode = async (code: string, currentUserId: string) => {
  const meeting = await prisma.meeting.findUnique({
    where: { join_code: code },
    include: {
      meetingParticipants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      },
      screenShares: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!meeting) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Meeting not found");
  }

  const currentParticipant = meeting.meetingParticipants.find(
    (participant) => participant.user_id === currentUserId,
  );
  if (!currentParticipant) {
    throw new ApiError(StatusCodes.FORBIDDEN, "You are not a participant in this meeting");
  }

  if (currentParticipant.status !== ParticipantStatus.admitted) {
    return {
      ...meeting,
      meetingParticipants: [currentParticipant],
      screenShares: [],
      currentParticipant,
    };
  }

  return {
    ...meeting,
    currentParticipant,
  };
};

const updateMeeting = async (code: string, payload: UpdateMeetingInput, currentUserId: string) => {
  const meeting = await getMeetingByCodeOrThrow(code);
  if (meeting.host_id !== currentUserId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only host can update meeting");
  }

  return prisma.meeting.update({
    where: { id: meeting.id },
    data: {
      ...(payload.title !== undefined ? { title: payload.title } : {}),
      ...(payload.waiting_room_on !== undefined ? { waiting_room_on: payload.waiting_room_on } : {}),
      ...(payload.max_participants !== undefined ? { max_participants: payload.max_participants } : {}),
      ...(payload.allow_screenshare !== undefined ? { allow_screenshare: payload.allow_screenshare } : {}),
      ...(payload.screenshare_needs_approval !== undefined ? { screenshare_needs_approval: payload.screenshare_needs_approval } : {}),
      ...(payload.is_recorded !== undefined ? { is_recorded: payload.is_recorded } : {}),
      ...(payload.scheduled_at !== undefined ? { scheduled_at: payload.scheduled_at ? new Date(payload.scheduled_at) : null } : {}),
    },
  });
};

const deleteMeeting = async (code: string, currentUserId: string) => {
  const meeting = await getMeetingByCodeOrThrow(code);
  if (meeting.host_id !== currentUserId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only host can delete meeting");
  }

  await prisma.$transaction(async (transaction) => {
    const polls = await transaction.poll.findMany({
      where: { meeting_id: meeting.id },
      select: { id: true },
    });
    const pollIds = polls.map(({ id }) => id);

    if (pollIds.length) {
      await transaction.pollVote.deleteMany({ where: { poll_id: { in: pollIds } } });
      await transaction.pollOption.deleteMany({ where: { poll_id: { in: pollIds } } });
    }

    await transaction.poll.deleteMany({ where: { meeting_id: meeting.id } });
    await transaction.breakoutMessage.deleteMany({ where: { meeting_id: meeting.id } });
    await transaction.meetingParticipant.updateMany({
      where: { meeting_id: meeting.id },
      data: { breakout_room_id: null },
    });
    await transaction.breakoutRoom.deleteMany({ where: { meeting_id: meeting.id } });
    await transaction.screenShare.deleteMany({ where: { meeting_id: meeting.id } });
    await transaction.recording.deleteMany({ where: { meeting_id: meeting.id } });
    await transaction.meetingParticipant.deleteMany({ where: { meeting_id: meeting.id } });
    await transaction.meeting.delete({ where: { id: meeting.id } });
  });

  await deleteLiveKitRoom(meeting);

  return { deleted: true };
};

const handleWebhookEvent = async (event: { event: string; room?: { name?: string }; participant?: { identity?: string } }) => {
  const roomName = event.room?.name;
  const participantIdentity = event.participant?.identity;

  if (!roomName) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Webhook event missing room name");
  }

  const meeting = await prisma.meeting.findUnique({
    where: { livekit_room_name: roomName },
  });

  if (!meeting) {
    return { ignored: true };
  }

  if (event.event === "room_started") {
    await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        status: MeetingStatus.active,
        started_at: new Date(),
      },
    });
  }

  if (event.event === "room_finished") {
    const now = new Date();

    await prisma.screenShare.deleteMany({
      where: { meeting_id: meeting.id },
    });

    await prisma.meetingParticipant.updateMany({
      where: { meeting_id: meeting.id },
      data: {
        status: ParticipantStatus.left,
        left_at: now,
        is_screen_sharing: false,
      },
    });

    await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        status: MeetingStatus.ended,
        ended_at: now,
      },
    });
  }

  if (participantIdentity && ["participant_joined", "participant_left", "participant_connection_aborted"].includes(event.event)) {
    await prisma.meetingParticipant.updateMany({
      where: {
        meeting_id: meeting.id,
        user_id: participantIdentity,
      },
      data: event.event === "participant_joined" ? {
        status: ParticipantStatus.admitted,
        joined_at: new Date(),
        left_at: null,
      } : {
        status: ParticipantStatus.left,
        left_at: new Date(),
        is_screen_sharing: false,
      },
    });

    if (event.event !== "participant_joined") {
      await prisma.screenShare.deleteMany({
        where: {
          meeting_id: meeting.id,
          user_id: participantIdentity,
        },
      });
    }
  }

  return { processed: true };
};

export const MeetingServices = {
  createMeetings,
  joinMeeting,
  getLiveKitToken,
  leaveMeeting,
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
  getMeetingByCode,
  deleteMeeting,
  updateMeeting,
  handleWebhookEvent,
};
