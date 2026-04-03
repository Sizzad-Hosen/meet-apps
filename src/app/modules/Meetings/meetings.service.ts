import { generateJoinCode } from '../../../helpers/generateJoinCode';
import { generateLiveKitToken, generateRoomName } from '../../../helpers/livekitToken';
import prisma from '../../../lib/prisma';
import ApiError from '../../errors/ApiError';

const createMeetings = async (payload: any, userId: string) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const roomName = generateRoomName();
    const joinCode = generateJoinCode();

    // Extract only allowed fields
    const { title, type, max_participants = 50, waiting_room_on = true, is_recorded = false } = payload;

    const meeting = await prisma.meeting.create({
        data: {
            title,
            type,
            max_participants,
            waiting_room_on,
            is_recorded,
            host_id: userId,
            join_code: joinCode,
            livekit_room_name: roomName
        }
    });

    // Add host as participant
    await prisma.meetingParticipant.create({
        data: {
            meeting_id: meeting.id,
            user_id: userId,
            role: 'host',
            status: 'admitted'
        }
    });

    console.log('Meeting created:', meeting);
    return meeting;
};

const getMeetingByJoinCode = async (joinCode: string, userId: string) => {
  const meeting = await prisma.meeting.findUnique({
    where: { join_code: joinCode },
    include: { meetingParticipants: true }
  });

  if (!meeting) return null;

  const isHost = meeting.host_id === userId;

  // participant already exists?
  let participant = meeting.meetingParticipants.find(p => p.user_id === userId);

  if (!participant) {
    participant = await prisma.meetingParticipant.create({
      data: {
        meeting_id: meeting.id,
        user_id: userId,
        role: isHost ? 'host' : 'guest',
        status: isHost ? 'admitted' : 'waiting'
      }
    });
  }

  // ✅ শুধু host বা waiting_room_on=false হলে token দাও
  let livekitToken = null;
  if (isHost || !meeting.waiting_room_on) {
    livekitToken = await generateLiveKitToken({
      userId,
      roomName: meeting.livekit_room_name,
      role: isHost ? 'host' : 'guest'
    });
  }

  return {
    id: meeting.id,
    title: meeting.title,
    join_code: meeting.join_code,
    livekit_room_name: meeting.livekit_room_name,
    livekitToken,                  // host: token ✅  guest: null ❌
    role: isHost ? 'host' : 'guest',
    status: participant.status,    // host: 'admitted'  guest: 'waiting'
    participants: meeting.meetingParticipants
  };
};

const getWaitingRoom = async (code: string, hostId: string) => {
  const meeting = await prisma.meeting.findUnique({
    where: { join_code: code }
  });

  if (!meeting) throw new Error('Meeting not found');
  if (meeting.host_id !== hostId) throw new Error('Only host can view');

  return await prisma.meetingParticipant.findMany({
    where: {
      meeting_id: meeting.id,
      status: 'waiting'
    },
    include: { user: true }
  });
};

const admitParticipant = async (code: string, targetUserId: string, currentUserId: string) => {
  const meeting = await prisma.meeting.findUnique({
    where: { join_code: code }
  });

  if (!meeting) throw new Error('Meeting not found');
  if (meeting.host_id !== currentUserId) throw new Error('Only host can admit');

  const participant = await prisma.meetingParticipant.findFirst({
    where: { 
      meeting_id: meeting.id, 
      user_id: targetUserId,
      status: 'waiting'
    }
  });

  if (!participant) throw new Error('Participant not found in waiting room');

  const livekitToken = await generateLiveKitToken({
    userId: targetUserId,
    roomName: meeting.livekit_room_name,
    role: 'guest'
  });

  const updated = await prisma.meetingParticipant.update({
    where: { id: participant.id },
    data: {
      status: 'admitted',
      livekit_token: livekitToken,
      joined_at: new Date()
    }
  });

  return { 
    participant: updated, 
    livekitToken  // ✅ frontend কে পাঠাও, participant এটা দিয়ে LiveKit-এ connect করবে
  };
};

const admitAll = async (code: string, hostId: string) => {
  const meeting = await prisma.meeting.findUnique({
    where: { join_code: code }
  });

  if (!meeting) throw new Error('Meeting not found');
  if (meeting.host_id !== hostId) throw new Error('Only host can admit');

  // waiting সবাইকে পাও
  const waitingList = await prisma.meetingParticipant.findMany({
    where: { meeting_id: meeting.id, status: 'waiting' }
  });

  // প্রতিজনের token generate করো
  const results = await Promise.all(
    waitingList.map(async (participant) => {
      const livekitToken = await generateLiveKitToken({
        userId: participant.user_id,
        roomName: meeting.livekit_room_name,
        role: 'guest'
      });

      await prisma.meetingParticipant.update({
        where: { id: participant.id },
        data: {
          status: 'admitted',
          livekit_token: livekitToken,
          joined_at: new Date()
        }
      });

      return { userId: participant.user_id, livekitToken };
    })
  );

  return results;
};

const denyParticipant = async (code: string, currentUserId: string) => {
  const meeting = await prisma.meeting.findUnique({
    where: { join_code: code }
  });

  if (!meeting) throw new Error('Meeting not found');
  if (meeting.host_id !== currentUserId) throw new Error('Only host can deny participants');

  const participant = await prisma.meetingParticipant.findFirst({
    where: { meeting_id: meeting.id, user_id: currentUserId }
  });

  if (!participant) throw new Error('Participant not found');

  const updated = await prisma.meetingParticipant.update({
    where: { id: participant.id },
    data: { status: 'denied' }
  });

  return updated;
};

const kickParticipant = async (code: string, currentUserId: string) => {
  const meeting = await prisma.meeting.findUnique({
    where: { join_code: code }
  });

  if (!meeting) throw new Error('Meeting not found');
  if (meeting.host_id !== currentUserId) throw new Error('Only host can kick participants');

  const participant = await prisma.meetingParticipant.findFirst({
    where: { meeting_id: meeting.id, user_id: currentUserId }
  });

  if (!participant) throw new Error('Participant not found');

  const updated = await prisma.meetingParticipant.update({
    where: { id: participant.id },
    data: {
      status: 'left',
      left_at: new Date()
    }
  });

  return updated;
};

const endMeeting = async (code: string, currentUserId: string) => {
  const meeting = await prisma.meeting.findUnique({
    where: { join_code: code }
  });

  if (!meeting) throw new Error('Meeting not found');
  if (meeting.host_id !== currentUserId) throw new Error('Only host can end the meeting');

  const updated = await prisma.meeting.update({
    where: { id: meeting.id },
    data: {
      status: 'ended',
      ended_at: new Date()
    }
  });

  // Mark all participants as left
  await prisma.meetingParticipant.updateMany({
    where: { meeting_id: meeting.id, left_at: null },
    data: { left_at: new Date() }
  });

  return updated;
};

const muteParticipant = async (code: string, targetUserId: string, currentUserId: string) => {
  const meeting = await prisma.meeting.findUnique({
    where: { join_code: code }
  });

  if (!meeting) throw new Error('Meeting not found');
  if (meeting.host_id !== currentUserId) throw new Error('Only host can mute');

  const participant = await prisma.meetingParticipant.findFirst({
    where: { meeting_id: meeting.id, user_id: targetUserId }
  });

  if (!participant) throw new Error('Participant not found');

  return await prisma.meetingParticipant.update({
    where: { id: participant.id },
    data: { is_muted: true }
  });
};

const muteAll = async (code: string, currentUserId: string) => {
  const meeting = await prisma.meeting.findUnique({
    where: { join_code: code }
  });

  if (!meeting) throw new Error('Meeting not found');
  if (meeting.host_id !== currentUserId) throw new Error('Only host can mute all');

  await prisma.meetingParticipant.updateMany({
    where: {
      meeting_id: meeting.id,
      role: { not: 'host' }  
    },
    data: { is_muted: true }
  });

  return { message: 'All participants muted' };
};

const getParticipants = async (code: string, currentUserId: string) => {
  const meeting = await prisma.meeting.findUnique({
    where: { join_code: code }
  });

  if (!meeting) throw new Error('Meeting not found');

  return await prisma.meetingParticipant.findMany({
    where: { meeting_id: meeting.id },
    include: { user: { select: { id: true, name: true, email: true } } }
  });
};

const assignCohost = async (code: string, targetUserId: string, currentUserId: string) => {
  const meeting = await prisma.meeting.findUnique({
    where: { join_code: code }
  });

  if (!meeting) throw new Error('Meeting not found');
  if (meeting.host_id !== currentUserId) throw new Error('Only host can assign co-host');

  const participant = await prisma.meetingParticipant.findFirst({
    where: { meeting_id: meeting.id, user_id: targetUserId }
  });

  if (!participant) throw new Error('Participant not found');
  if (participant.role === 'host') throw new Error('Cannot change host role');

  return await prisma.meetingParticipant.update({
    where: { id: participant.id },
    data: { role: 'cohost' }
  });
};

export const MeetingServices = {
  createMeetings,
  getMeetingByJoinCode,
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
