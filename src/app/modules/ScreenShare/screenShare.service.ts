import { StatusCodes } from 'http-status-codes';
import { TrackSource } from 'livekit-server-sdk';
import prisma from '../../../lib/prisma';
import { clientes } from '../../../helpers/s3';
import ApiError from '../../errors/ApiError';

const getMeetingAndParticipant = async (code: string, currentUserId: string) => {
  const meeting = await prisma.meeting.findUnique({
    where: { join_code: code }
  });

  if (!meeting) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Meeting not found');
  }

  const participant = await prisma.meetingParticipant.findFirst({
    where: { meeting_id: meeting.id, user_id: currentUserId, status: 'admitted' }
  });

  if (!participant) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Participant not found');
  }

  return { meeting, participant };
};

const getActiveShare = async (meetingId: string) => {
  const sharingParticipant = await prisma.meetingParticipant.findFirst({
    where: { meeting_id: meetingId, status: 'admitted', is_screen_sharing: true }
  });

  if (!sharingParticipant) {
    return null;
  }

  return prisma.screenShare.findFirst({
  where: { meeting_id: meetingId, user_id: sharingParticipant.user_id },
  include: {
    user: {
      select: { id: true, name: true, email: true }
    }
  }
});
};

const getShareRequests = async (meetingId: string) => {
  const requests = await prisma.screenShare.findMany({
    where: { meeting_id: meetingId },
    include: {
      user: {
        select: { id: true, name: true, email: true }
      }
    }
  });
  const activeShare = await getActiveShare(meetingId);

  return {
    activeShare,
    pending: requests.filter((request) => request.user_id !== activeShare?.user_id)
  };
};

const screenSharePermission = (enabled: boolean) => ({
  canPublish: true,
  canSubscribe: true,
  canPublishData: true,
  canPublishSources: enabled
    ? [TrackSource.CAMERA, TrackSource.MICROPHONE, TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO]
    : [TrackSource.CAMERA, TrackSource.MICROPHONE]
});

const startScreenShare = async (code: string, currentUserId: string) => {
  const { meeting, participant } = await getMeetingAndParticipant(code, currentUserId);

  if (!meeting.allow_screenshare) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Screenshare is disabled');
  }

  const activeShare = await getActiveShare(meeting.id);
  if (activeShare && activeShare.user_id !== currentUserId) {
    throw new ApiError(StatusCodes.CONFLICT, 'Another participant is already sharing their screen');
  }

  if (meeting.screenshare_needs_approval && participant.role === 'guest') {
    await prisma.screenShare.upsert({
      where: {
        meeting_id_user_id: {
          meeting_id: meeting.id,
          user_id: currentUserId
        }
      },
      update: {},
      create: {
        meeting_id: meeting.id,
        user_id: currentUserId
      }
    });
    await prisma.meetingParticipant.update({
      where: { id: participant.id },
      data: { is_screen_sharing: false }
    });

    return {
      status: 'pending_approval',
      activeShare
    };
  }

  await prisma.screenShare.upsert({
    where: {
      meeting_id_user_id: {
        meeting_id: meeting.id,
        user_id: currentUserId
      }
    },
    update: {},
    create: {
      meeting_id: meeting.id,
      user_id: currentUserId
    }
  });

  await prisma.meetingParticipant.updateMany({
    where: { meeting_id: meeting.id },
    data: { is_screen_sharing: false }
  });

  return prisma.meetingParticipant.update({
    where: { id: participant.id },
    data: { is_screen_sharing: true }
  });
};

const stopScreenShare = async (code: string, currentUserId: string) => {
  const { meeting, participant } = await getMeetingAndParticipant(code, currentUserId);

  await prisma.screenShare.deleteMany({
    where: {
      meeting_id: meeting.id,
      user_id: currentUserId
    }
  });

  if (meeting.screenshare_needs_approval && participant.role === 'guest') {
    await clientes.roomServiceClient.updateParticipant(
      meeting.livekit_room_name,
      currentUserId,
      { permission: screenSharePermission(false) }
    );
  }

  return prisma.meetingParticipant.update({
    where: { id: participant.id },
    data: { is_screen_sharing: false }
  });
};

const getScreenShareStatus = async (code: string, currentUserId: string) => {
  const { meeting } = await getMeetingAndParticipant(code, currentUserId);
  const { activeShare, pending } = await getShareRequests(meeting.id);

  return {
    total_sharing: activeShare ? 1 : 0,
    participant: activeShare,
    pending
  };
};

const approveScreenShare = async (code: string, targetUserId: string, currentUserId: string) => {
  const meeting = await prisma.meeting.findUnique({
    where: { join_code: code }
  });

  if (!meeting) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Meeting not found');
  }

  const requester = await prisma.meetingParticipant.findFirst({
    where: { meeting_id: meeting.id, user_id: currentUserId }
  });

  if (!requester) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Not a participant');
  }

  if (!['host', 'cohost'].includes(requester.role)) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only host or cohost can approve screenshare');
  }

  const participant = await prisma.meetingParticipant.findFirst({
    where: { meeting_id: meeting.id, user_id: targetUserId, status: 'admitted' }
  });

  if (!participant) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Participant not found');
  }

  const activeShare = await getActiveShare(meeting.id);
  if (activeShare && activeShare.user_id !== targetUserId) {
    throw new ApiError(StatusCodes.CONFLICT, 'Another participant is already sharing their screen');
  }


  const request = await prisma.screenShare.findFirst({
    where: { meeting_id: meeting.id, user_id: targetUserId }
  });
  if (!request) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Screenshare request not found');
  }

  await clientes.roomServiceClient.updateParticipant(
    meeting.livekit_room_name,
    targetUserId,
    { permission: screenSharePermission(true) }
  );

  await prisma.screenShare.upsert({
    where: {
      meeting_id_user_id: {
        meeting_id: meeting.id,
        user_id: targetUserId
      }
    },
    update: {},
    create: {
      meeting_id: meeting.id,
      user_id: targetUserId
    }
  });

  await prisma.meetingParticipant.updateMany({
    where: { meeting_id: meeting.id },
    data: { is_screen_sharing: false }
  });

  return prisma.meetingParticipant.update({
    where: { id: participant.id },
    data: { is_screen_sharing: true }
  });
};

const denyScreenShare = async (code: string, targetUserId: string, currentUserId: string) => {
  const meeting = await prisma.meeting.findUnique({
    where: { join_code: code }
  });

  if (!meeting) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Meeting not found');
  }

  const requester = await prisma.meetingParticipant.findFirst({
    where: { meeting_id: meeting.id, user_id: currentUserId }
  });

  if (!requester) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Not a participant');
  }

  if (!['host', 'cohost'].includes(requester.role)) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only host or cohost can deny screenshare');
  }

  const participant = await prisma.meetingParticipant.findFirst({
    where: { meeting_id: meeting.id, user_id: targetUserId }
  });

  if (!participant) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Participant not found');
  }

  await prisma.screenShare.deleteMany({
    where: {
      meeting_id: meeting.id,
      user_id: targetUserId
    }
  });

  if (meeting.screenshare_needs_approval && participant.role === 'guest') {
    await clientes.roomServiceClient.updateParticipant(
      meeting.livekit_room_name,
      targetUserId,
      { permission: screenSharePermission(false) }
    );
  }

  return prisma.meetingParticipant.update({
    where: { id: participant.id },
    data: { is_screen_sharing: false }
  });
};

export const ScreenShareServices = {
  startScreenShare,
  stopScreenShare,
  approveScreenShare,
  denyScreenShare,
  getScreenShareStatus
};
