import { AccessToken, TrackSource } from 'livekit-server-sdk';
import config from '../app/config';

export async function generateLiveKitToken({
  userId,
  roomName,
  role,
  allowScreenShare = true,
  participantName,
}: {
  userId: string;
  roomName: string;
  role: "host" | "cohost" | "guest" | string;
  allowScreenShare?: boolean;
  participantName?: string;
}) {
  const apiKey = config.livekit.api_key;
  const apiSecret = config.livekit.api_secret;

  const at = new AccessToken(apiKey, apiSecret, {
    identity: userId,
    name: participantName,
    ttl: config.livekit.token_ttl,
  });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    roomAdmin: role === "host" || role === "cohost",
    canPublish: true,
    canPublishSources: allowScreenShare
      ? [TrackSource.CAMERA, TrackSource.MICROPHONE, TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO]
      : [TrackSource.CAMERA, TrackSource.MICROPHONE],
    canSubscribe: true,
    canPublishData: true,
  });

  return at.toJwt();
}

export const  generateRoomName= () => {
  return `room_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}
