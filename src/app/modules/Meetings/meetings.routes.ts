import { Router } from "express";
import { auth } from "../../middlewares/auth";
import { validateRequest } from "../../middlewares/validateRequest";
import { MeetingsControllers } from "./meetings.controller";
import { MeetingsValidation } from "./meetings.validation";
import { BreakoutRoutes } from "../Breakout/breakout.routes";
import { PollRoutes } from "../Polls/polls.routes";

const router = Router();

router.post("/create",
    validateRequest(MeetingsValidation.createMeetingSchema),
    auth(), MeetingsControllers.createMeeting);
router.get("/:code", validateRequest(MeetingsValidation.meetingCodeSchema), auth(), MeetingsControllers.getMeetingByCode);
router.put("/:code", validateRequest(MeetingsValidation.updateMeetingSchema), auth(), MeetingsControllers.updateMeeting);
router.delete("/:code", validateRequest(MeetingsValidation.meetingCodeSchema), auth(), MeetingsControllers.deleteMeeting);

router.post("/join",
    validateRequest(MeetingsValidation.joinMeetingSchema),
    auth(), MeetingsControllers.joinMeeting);
router.post("/:code/leave", validateRequest(MeetingsValidation.meetingCodeSchema), auth(), MeetingsControllers.leaveMeeting);
router.get("/:code/waiting-room", validateRequest(MeetingsValidation.meetingCodeSchema), auth(), MeetingsControllers.getWaitingRoom);
router.post("/:code/admit/:userId", validateRequest(MeetingsValidation.participantActionSchema), auth(), MeetingsControllers.admitParticipant);
router.post("/:code/admit-all", validateRequest(MeetingsValidation.meetingCodeSchema), auth(), MeetingsControllers.admitAll);

router.post("/:code/deny/:userId", validateRequest(MeetingsValidation.participantActionSchema), auth(), MeetingsControllers.denyParticipant);
router.post("/:code/kick/:userId", validateRequest(MeetingsValidation.participantActionSchema), auth(), MeetingsControllers.kickParticipant);
router.post("/:code/end", validateRequest(MeetingsValidation.meetingCodeSchema), auth(), MeetingsControllers.endMeeting);

router.use("/:code/breakout", BreakoutRoutes);
router.use("/:code/polls", PollRoutes);

router.post("/:code/mute/:userId", validateRequest(MeetingsValidation.participantActionSchema), auth(), MeetingsControllers.muteParticipant);
router.post("/:code/mute-all", validateRequest(MeetingsValidation.meetingCodeSchema), auth(), MeetingsControllers.muteAll);
router.post("/:code/cohost/:userId", validateRequest(MeetingsValidation.participantActionSchema), auth(), MeetingsControllers.assignCohost);
router.get("/:code/participants", validateRequest(MeetingsValidation.meetingCodeSchema), auth(), MeetingsControllers.getParticipants);

export const MeetingsRoutes = router;
