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

router.post("/:code/admit",  auth(), MeetingsControllers.admitParticipant);
router.post("/:code/deny",   auth(), MeetingsControllers.denyParticipant);
router.post("/:code/kick",   auth(), MeetingsControllers.kickParticipant);
router.post("/:code/end",            auth(), MeetingsControllers.endMeeting);


export const MeetingsRoutes = router ;
