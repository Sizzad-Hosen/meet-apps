import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import app from "./app";
import config from "./app/config";
import { registerSocketServer } from "./app/sockets";
import prisma from "./lib/prisma";
import { logger } from "./shared/logger";

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: config.cors_origins.length ? config.cors_origins : config.env !== "production",
    credentials: true,
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 120_000,
  },
});

registerSocketServer(io);

let shuttingDown = false;

const shutdown = async (reason: string, exitCode: number) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("server_shutdown_started", { reason });

  try {
    await new Promise<void>((resolve) => io.close(() => resolve()));

    if (httpServer.listening) {
      await new Promise<void>((resolve, reject) => {
        httpServer.close((error) => (error ? reject(error) : resolve()));
      });
    }

    await prisma.$disconnect();
  } catch (error) {
    logger.error("server_shutdown_failed", { reason, error });
    exitCode = 1;
  }

  logger.info("server_shutdown_completed", { reason });
  process.exit(exitCode);
};

process.on("SIGINT", () => void shutdown("SIGINT", 0));
process.on("SIGTERM", () => void shutdown("SIGTERM", 0));
process.on("uncaughtException", (error) => {
  logger.error("uncaught_exception", { error });
  void shutdown("uncaughtException", 1);
});
process.on("unhandledRejection", (error) => {
  logger.error("unhandled_rejection", { error });
  void shutdown("unhandledRejection", 1);
});

httpServer.listen(config.port, () => {
  logger.info("server_started", { port: config.port, environment: config.env });
});
