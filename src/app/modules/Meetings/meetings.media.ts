import { ParticipantRole, ParticipantStatus } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { TrackSource } from "livekit-server-sdk";
import { generateLiveKitToken } from "../../../helpers/livekitToken";
import { clientes } from "../../../helpers/s3";
import prisma from "../../../lib/prisma";
import { logger } from "../../../shared/logger";
import ApiError from "../../errors/ApiError";

type RoomConfig = {
  id: string;
  livekit_room_name: string;
  max_participants: number;
};

type TokenMeeting = RoomConfig & {
  allow_screenshare: boolean;
  screenshare_needs_approval: boolean;
};

type TokenParticipant = {
  id: string;
  user_id: string;
  role: ParticipantRole;
};

const errorMessage = (error: unknown) => error instanceof Error ? error.message : String(error);
const includesError = (error: unknown, text: string) => errorMessage(error).toLowerCase().includes(text);

export const ensureRoomExists = async (meeting: RoomConfig): Promise<void> => {
  try {
    await clientes.roomServiceClient.createRoom({
      name: meeting.livekit_room_name,
      maxParticipants: meeting.max_participants,
      emptyTimeout: 600,
      departureTimeout: 60,
    });
  } catch (error) {
    if (includesError(error, "already exists")) return;

    if (includesError(error, "invalid token") || includesError(error, "unauthorized")) {
      throw new ApiError(
        StatusCodes.SERVICE_UNAVAILABLE,
        "LiveKit rejected the configured server credentials",
      );
    }

    throw error;
  }
};

export const provisionRoom = async (meeting: RoomConfig): Promise<boolean> => {
  try {
    await ensureRoomExists(meeting);
    return true;
  } catch (error) {
    logger.warn("livekit_room_provisioning_failed", {
      meetingId: meeting.id,
      message: errorMessage(error),
    });
    return false;
  }
};

export const issueParticipantToken = async (
  meeting: TokenMeeting,
  participant: TokenParticipant,
): Promise<string> => {
  const user = await prisma.user.findUnique({
    where: { id: participant.user_id },
    select: { name: true },
  });
  const token = await generateLiveKitToken({
    userId: participant.user_id,
    roomName: meeting.livekit_room_name,
    role: participant.role,
    allowScreenShare: meeting.allow_screenshare && (
      participant.role !== ParticipantRole.guest || !meeting.screenshare_needs_approval
    ),
    participantName: user?.name,
  });

  await prisma.meetingParticipant.update({
    where: { id: participant.id },
    data: {
      livekit_token: null,
      joined_at: new Date(),
      left_at: null,
      status: ParticipantStatus.admitted,
    },
  });

  return token;
};

export const removeLiveKitParticipant = async (
  meeting: RoomConfig,
  userId: string,
): Promise<void> => {
  try {
    await clientes.roomServiceClient.removeParticipant(meeting.livekit_room_name, userId);
  } catch (error) {
    if (!includesError(error, "participant does not exist")) {
      logger.warn("livekit_participant_remove_failed", {
        meetingId: meeting.id,
        userId,
        message: errorMessage(error),
      });
    }
  }
};

export const deleteLiveKitRoom = async (meeting: RoomConfig): Promise<void> => {
  try {
    await clientes.roomServiceClient.deleteRoom(meeting.livekit_room_name);
  } catch (error) {
    if (!includesError(error, "room does not exist")) {
      logger.warn("livekit_room_delete_failed", {
        meetingId: meeting.id,
        message: errorMessage(error),
      });
    }
  }
};

export const muteLiveKitParticipant = async (
  meeting: RoomConfig,
  userId: string,
): Promise<void> => {
  try {
    const participant = await clientes.roomServiceClient.getParticipant(
      meeting.livekit_room_name,
      userId,
    );
    const microphoneTracks = participant.tracks.filter(
      (track) => track.source === TrackSource.MICROPHONE,
    );

    await Promise.all(microphoneTracks.map((track) =>
      clientes.roomServiceClient.mutePublishedTrack(
        meeting.livekit_room_name,
        userId,
        track.sid,
        true,
      ),
    ));
  } catch (error) {
    if (!includesError(error, "participant does not exist")) {
      logger.warn("livekit_participant_mute_failed", {
        meetingId: meeting.id,
        userId,
        message: errorMessage(error),
      });
    }
  }
};
