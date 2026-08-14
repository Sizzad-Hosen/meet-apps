import { Router } from "express";
import { auth } from "../../middlewares/auth";
import { ScreenShareControllers } from "./screenShare.controller";
import { validateRequest } from "../../middlewares/validateRequest";
import { ScreenShareValidation } from "./screenShare.validation";


const router = Router();

router.get("/:code/screenshare/status", validateRequest(ScreenShareValidation.codeOnlySchema), auth(), ScreenShareControllers.getScreenShareStatus);
router.post("/:code/screenshare/start", validateRequest(ScreenShareValidation.codeOnlySchema), auth(), ScreenShareControllers.startScreenShare);
router.post("/:code/screenshare/stop", validateRequest(ScreenShareValidation.codeOnlySchema), auth(), ScreenShareControllers.stopScreenShare);
router.post("/:code/screenshare/approve/:userId", validateRequest(ScreenShareValidation.userActionSchema), auth(), ScreenShareControllers.approveScreenShare);
router.post("/:code/screenshare/deny/:userId", validateRequest(ScreenShareValidation.userActionSchema), auth(), ScreenShareControllers.denyScreenShare);

export const ScreenShareRoutes = router;
