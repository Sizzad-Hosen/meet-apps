import { generateJoinCode } from '../../../helpers/generateJoinCode';
import { generateLiveKitToken, generateRoomName } from '../../../helpers/livekitToken';
import prisma from '../../../lib/prisma';

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

const  getMeetingByJoinCode= async (joinCode: string, userId: string) => {

    console.log('Looking for meeting with join code:', joinCode);

const meeting = await prisma.meeting.findUnique({
  where: {
    join_code: joinCode 
  },
  include: {
    meetingParticipants: true
  }
});
    if (!meeting) return null;

    // Generate LiveKit token for this user
    const livekitToken = generateLiveKitToken({
      userId,
      roomName: meeting.livekit_room_name,
      role: 'guest'
    });

    return {
      id: meeting.id,
      title: meeting.title,
      join_code: meeting.join_code,
      livekit_room_name: meeting.livekit_room_name,
      livekitToken,
      participants: meeting.meetingParticipants
    };
  }
export const MeetingServices = {
    createMeetings,
    getMeetingByJoinCode
}
