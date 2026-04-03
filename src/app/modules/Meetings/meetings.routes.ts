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
router.get("/:code/waiting-room", auth(), MeetingsControllers.getWaitingRoom);
router.post("/:code/admit/:userId",  auth(), MeetingsControllers.admitParticipant);
router.post("/:code/admit-all", auth(), MeetingsControllers.admitAll);

router.post("/:code/deny",   auth(), MeetingsControllers.denyParticipant);
router.post("/:code/kick",   auth(), MeetingsControllers.kickParticipant);
router.post("/:code/end",            auth(), MeetingsControllers.endMeeting);

router.post("/:code/mute/:userId",   auth(), MeetingsControllers.muteParticipant);
router.post("/:code/mute-all",       auth(), MeetingsControllers.muteAll);
router.post("/:code/cohost/:userId", auth(), MeetingsControllers.assignCohost);

export const MeetingsRoutes = router ;
