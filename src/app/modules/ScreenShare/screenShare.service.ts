import prisma from '../../../lib/prisma';

const startScreenShare = async (code: string, currentUserId: string) => {
  const meeting = await prisma.meeting.findUnique({
    where: { join_code: code }
  });

  if (!meeting) throw new Error('Meeting not found');
  if (!meeting.allow_screenshare) throw new Error('Screenshare is disabled');

  const participant = await prisma.meetingParticipant.findFirst({
    where: { meeting_id: meeting.id, user_id: currentUserId, status: 'admitted' }
  });

  if (!participant) throw new Error('Participant not found');

  // screenshare needs approval check
  if (meeting.screenshare_needs_approval && participant.role === 'guest') {
    return await prisma.meetingParticipant.update({
      where: { id: participant.id },
      data: { is_screen_sharing: false }  // pending approval
    });
  }

  return await prisma.meetingParticipant.update({
    where: { id: participant.id },
    data: { is_screen_sharing: true }
  });
};

const stopScreenShare = async (code: string, currentUserId: string) => {
  const meeting = await prisma.meeting.findUnique({
    where: { join_code: code }
  });

  if (!meeting) throw new Error('Meeting not found');

  const participant = await prisma.meetingParticipant.findFirst({
    where: { meeting_id: meeting.id, user_id: currentUserId, status: 'admitted' }
  });

  if (!participant) throw new Error('Participant not found');

  return await prisma.meetingParticipant.update({
    where: { id: participant.id },
    data: { is_screen_sharing: false }
  });
};

const approveScreenShare = async (code: string, targetUserId: string, currentUserId: string) => {
  const meeting = await prisma.meeting.findUnique({
    where: { join_code: code }
  });

  if (!meeting) throw new Error('Meeting not found');

  // শুধু host বা cohost approve করতে পারবে
  const requester = await prisma.meetingParticipant.findFirst({
    where: { meeting_id: meeting.id, user_id: currentUserId }
  });

  if (!requester) throw new Error('Not a participant');
  if (!['host', 'cohost'].includes(requester.role)) {
    throw new Error('Only host or cohost can approve screenshare');
  }

  const participant = await prisma.meetingParticipant.findFirst({
    where: { meeting_id: meeting.id, user_id: targetUserId, status: 'admitted' }
  });

  if (!participant) throw new Error('Participant not found');

  return await prisma.meetingParticipant.update({
    where: { id: participant.id },
    data: { is_screen_sharing: true }
  });
};

const denyScreenShare = async (code: string, targetUserId: string, currentUserId: string) => {
  const meeting = await prisma.meeting.findUnique({
    where: { join_code: code }
  });

  if (!meeting) throw new Error('Meeting not found');

  const requester = await prisma.meetingParticipant.findFirst({
    where: { meeting_id: meeting.id, user_id: currentUserId }
  });

  if (!requester) throw new Error('Not a participant');
  if (!['host', 'cohost'].includes(requester.role)) {
    throw new Error('Only host or cohost can deny screenshare');
  }

  const participant = await prisma.meetingParticipant.findFirst({
    where: { meeting_id: meeting.id, user_id: targetUserId }
  });

  if (!participant) throw new Error('Participant not found');

  return await prisma.meetingParticipant.update({
    where: { id: participant.id },
    data: { is_screen_sharing: false }
  });
};

export const ScreenShareServices = {
  startScreenShare,
  stopScreenShare,
  approveScreenShare,
  denyScreenShare
};