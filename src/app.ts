import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import { AuthRoutes } from "./app/modules/Auth/auth.routes";
import { MeetingsRoutes } from "./app/modules/Meetings/meetings.routes";
import { ScreenShareRoutes } from "./app/modules/ScreenShare/screenShare.route";
import { RecordingRoutes } from "./app/modules/Record/record.routes";
import { LiveKitRoutes } from "./app/modules/LiveKit/livekit.routes";
import config from "./app/config";
import { apiRateLimiter } from "./app/middlewares/rateLimit";
import { requestLogger } from "./app/middlewares/requestLogger";
import { notFound } from "./app/middlewares/notFound";
import { globalErrorHandler } from "./app/middlewares/globalErrorHandler";
const app = express();

// middlewares
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: config.cors_origins.length ? config.cors_origins : config.env !== "production",
  credentials: true,
}));
app.use(cookieParser());
app.use(apiRateLimiter);
app.use(requestLogger);
// LiveKit webhook signatures require the untouched raw request body.
app.use("/api/v1/livekit", LiveKitRoutes);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Service is healthy",
    data: {
      status: "ok",
      uptime: process.uptime(),
    },
  });
});

// api routes
app.use("/api/v1/auth", AuthRoutes);
app.use("/api/v1/meetings", MeetingsRoutes);
app.use("/api/v1/screen-share", ScreenShareRoutes);
app.use("/api/v1/recordings", RecordingRoutes);

// Global Error Handler and Not FOund Middleware
app.use("*", notFound);
app.use(globalErrorHandler);
export default app;
