import { BreakoutRoomStatus, ParticipantRole, ParticipantStatus } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import prisma from "../../../lib/prisma";
import ApiError from "../../errors/ApiError";
import { ensureHost, getMeetingByCodeOrThrow, getParticipantOrThrow } from "../Meetings/meetings.helpers";
import type { BroadcastBreakoutInput, CreateBreakoutInput } from "./breakout.validation";

type NormalizedRoom = { name: string; participantIds: string[] };

const createBreakoutRooms = async (code: string, payload: CreateBreakoutInput, currentUserId: string) => {
    const meeting = await getMeetingByCodeOrThrow(code);
    await ensureHost(meeting.id, currentUserId);

    const admittedParticipants = await prisma.meetingParticipant.findMany({
        where: {
            meeting_id: meeting.id,
            status: ParticipantStatus.admitted,
            role: { not: ParticipantRole.host },
        },
    });

    if (admittedParticipants.length === 0) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "No participants available for breakout rooms");
    }

    const roomsPayload: NormalizedRoom[] = payload.rooms?.length
        ? payload.rooms.map((room, index) => ({
            name: room.name?.trim() || `Room ${index + 1}`,
            participantIds: room.participantIds ?? [],
        }))
        : [{ name: "Room 1", participantIds: [] }, { name: "Room 2", participantIds: [] }];

    const rooms = await Promise.all(
        roomsPayload.map((room) => prisma.breakoutRoom.create({
            data: {
                meeting_id: meeting.id,
                name: room.name,
            },
        }))
    );

    const participantsToAssign = admittedParticipants.filter((participant) => participant.user_id !== meeting.host_id);
    const assignments: Array<{ participantId: string; roomId: string }> = [];

    if (roomsPayload.some((room) => room.participantIds.length > 0)) {
        for (let i = 0; i < roomsPayload.length; i++) {
            const roomPayload = roomsPayload[i];
            const room = rooms[i];
            if (!room) continue;

            const selected = participantsToAssign.filter((participant) => roomPayload.participantIds.includes(participant.user_id));
            for (const participant of selected) {
                assignments.push({ participantId: participant.id, roomId: room.id });
            }
        }
    }

    const remainingParticipants = participantsToAssign.filter((participant) => !assignments.some((assign) => assign.participantId === participant.id));
    remainingParticipants.forEach((participant, index) => {
        const room = rooms[index % rooms.length];
        assignments.push({ participantId: participant.id, roomId: room.id });
    });

    await Promise.all(assignments.map((assignment) =>
        prisma.meetingParticipant.update({
            where: { id: assignment.participantId },
            data: { breakout_room_id: assignment.roomId },
        })
    ));

    return {
        rooms,
        assignments,
    };
};

const listBreakoutRooms = async (code: string, currentUserId: string) => {
    const meeting = await getMeetingByCodeOrThrow(code);
    await getParticipantOrThrow(meeting.id, currentUserId);

    const rooms = await prisma.breakoutRoom.findMany({
        where: { meeting_id: meeting.id },
        include: {
            participants: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            avatarUrl: true,
                        },
                    },
                },
            },
        },
    });

    const currentParticipant = await prisma.meetingParticipant.findFirst({
        where: {
            meeting_id: meeting.id,
            user_id: currentUserId,
        },
        include: {
            breakoutRoom: true,
        },
    });

    return {
        rooms,
        myAssignment: currentParticipant?.breakoutRoom
            ? {
                roomId: currentParticipant.breakoutRoom.id,
                roomName: currentParticipant.breakoutRoom.name,
            }
            : null,
    };
};

const joinBreakoutRoom = async (code: string, roomId: string, currentUserId: string) => {
    const meeting = await getMeetingByCodeOrThrow(code);
    const participant = await getParticipantOrThrow(meeting.id, currentUserId);

    if (!participant.breakout_room_id || participant.breakout_room_id !== roomId) {
        throw new ApiError(StatusCodes.FORBIDDEN, "You are not assigned to this breakout room");
    }

    const room = await prisma.breakoutRoom.findFirst({
        where: { id: roomId, meeting_id: meeting.id },
    });

    if (!room) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Breakout room not found");
    }

    if (room.status === BreakoutRoomStatus.closed) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "This breakout room is closed");
    }

    return {
        joined: true,
        roomId: room.id,
        roomName: room.name,
    };
};

const endAllBreakoutRooms = async (code: string, currentUserId: string) => {
    const meeting = await getMeetingByCodeOrThrow(code);
    await ensureHost(meeting.id, currentUserId);

    await prisma.breakoutRoom.updateMany({
        where: { meeting_id: meeting.id },
        data: { status: BreakoutRoomStatus.closed },
    });

    await prisma.meetingParticipant.updateMany({
        where: { meeting_id: meeting.id },
        data: { breakout_room_id: null },
    });

    return { ended: true };
};

const broadcastBreakoutMessage = async (code: string, payload: BroadcastBreakoutInput, currentUserId: string) => {
    const meeting = await getMeetingByCodeOrThrow(code);
    await ensureHost(meeting.id, currentUserId);

    return prisma.breakoutMessage.create({
        data: {
            meeting_id: meeting.id,
            sender_id: currentUserId,
            content: payload.message.trim(),
        },
    });
};

export const BreakoutServices = {
    createBreakoutRooms,
    listBreakoutRooms,
    joinBreakoutRoom,
    endAllBreakoutRooms,
    broadcastBreakoutMessage,
};
