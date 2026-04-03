import express from "express";
import cors from "cors";
import cookieParser from 'cookie-parser';
import { AuthRoutes } from "./app/modules/Auth/auth.routes";
import { MeetingsRoutes } from "./app/modules/Meetings/meetings.routes";
import { ScreenShareRoutes } from "./app/modules/ScreenShare/screenShare.route";
const app = express();

// middlewares
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req,res)=>{
    console.log("Hello World");
    res.send("Hello World");
})

// api routes
app.use("/api/v1/auth", AuthRoutes);
app.use("/api/v1/meetings", MeetingsRoutes);
app.use("/api/v1/screen-share", ScreenShareRoutes);


app.use("*", require("./app/middlewares/notFound").notFound);
app.use(require("./app/middlewares/globalErrorHandler").globalErrorHandler);
export default app;
