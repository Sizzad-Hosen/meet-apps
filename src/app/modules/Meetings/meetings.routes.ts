import { auth } from "../../middlewares/auth";
import { validateRequest } from "../../middlewares/validateRequest";
import { MeetingsControllers } from "./meetings.controller";

const router = require("express").Router();

router.post("/create",
    // validateRequest(),
    auth(), MeetingsControllers.createMeeting);

router.post("/join",
    // validateRequest(),
    auth(), MeetingsControllers.joinMeeting);



export const MeetingsRoutes = router ;
