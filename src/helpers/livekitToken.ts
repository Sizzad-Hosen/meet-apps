import { AccessToken } from 'livekit-server-sdk';

export function generateLiveKitToken({
  userId,
  roomName,
  role
}: {
  userId: string;
  roomName: string;
  role: "host" | "cohost" | "guest";
}) {
  const apiKey = process.env.LIVEKIT_API_KEY!;
  const apiSecret = process.env.LIVEKIT_API_SECRET!;

  const at = new AccessToken(apiKey, apiSecret, {
    identity: userId,
  });

  console.log('Generating LiveKit token for user:', userId, 'in room:', roomName, 'with role:', role)

  console.log(at);
  // Permissions
  at.addGrant({
    room: roomName,
    roomJoin: true,

    canPublish: role !== "guest",
    canSubscribe: true,

    canPublishData: true,
  });

  return at.toJwt();
}

export const  generateRoomName= () => {
  return `room_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}