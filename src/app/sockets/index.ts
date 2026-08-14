import { Server, Socket } from "socket.io";
import { verifyToken } from "../../helpers/jwtHelpers";
import config from "../config";
import { logger } from "../../shared/logger";
import prisma from "../../lib/prisma";

interface SocketAuthPayload {
  userId: string;
  role: string;
  email: string;
}

type SocketAck = (response: { success: boolean; message?: string; room?: string }) => void;

const handleSocketAction = async (
  socket: Socket,
  event: string,
  ack: SocketAck | undefined,
  action: () => Promise<void>,
): Promise<void> => {
  try {
    await action();
  } catch (error) {
    logger.error("socket_event_failed", {
      socketId: socket.id,
      userId: socket.data.user?.userId ?? null,
      event,
      error: error instanceof Error ? error.message : "unknown_error",
    });
    ack?.({ success: false, message: "Unable to process the socket event" });
  }
};

const getToken = (socket: Socket): string | undefined => {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === "string" && authToken.length > 0) {
    return authToken;
  }

  const header = socket.handshake.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    return header.split(" ")[1];
  }

  return undefined;
};

export const registerSocketServer = (io: Server): void => {
  io.use(async (socket, next) => {
    try {
      const token = getToken(socket);
      if (!token) {
        return next(new Error("Unauthorized"));
      }

      const payload = await verifyToken(token, config.jwt.jwt_secret) as SocketAuthPayload;
      socket.data.user = payload;
      return next();
    } catch (error) {
      logger.warn("socket_auth_failed", {
        socketId: socket.id,
        error: error instanceof Error ? error.message : "unknown_error",
      });
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    logger.info("socket_connected", {
      socketId: socket.id,
      userId: socket.data.user?.userId ?? null,
    });

    socket.on("meeting:join", (meetingCode: string, ack?: SocketAck) => {
      void handleSocketAction(socket, "meeting:join", ack, async () => {
        const code = meetingCode.replace(/[^a-z0-9]/gi, "").toUpperCase();
        const participant = await prisma.meetingParticipant.findFirst({
          where: {
            user_id: socket.data.user.userId,
            status: "admitted",
            meeting: { join_code: code },
          },
        });

        if (!participant) {
          ack?.({ success: false, message: "Meeting access denied" });
          return;
        }

        const room = `meeting:${code}`;
        await socket.join(room);
        ack?.({ success: true, room });
      });
    });

    socket.on("breakout:join", (roomId: string, ack?: SocketAck) => {
      void handleSocketAction(socket, "breakout:join", ack, async () => {
        const participant = await prisma.meetingParticipant.findFirst({
          where: {
            user_id: socket.data.user.userId,
            breakout_room_id: roomId,
            status: "admitted",
          },
        });

        if (!participant) {
          ack?.({ success: false, message: "Breakout room access denied" });
          return;
        }

        const room = `breakout:${roomId}`;
        await socket.join(room);
        ack?.({ success: true, room });
      });
    });

    socket.on("disconnect", (reason) => {
      logger.info("socket_disconnected", {
        socketId: socket.id,
        reason,
      });
    });
  });
};
