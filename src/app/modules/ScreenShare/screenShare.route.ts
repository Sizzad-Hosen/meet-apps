import { auth } from "../../middlewares/auth";
import { ScreenShareControllers } from "./screenShare.controller";


const router = require("express").Router();

router.post("/:code/screenshare/start",           auth(), ScreenShareControllers.startScreenShare);
router.post("/:code/screenshare/stop",            auth(), ScreenShareControllers.stopScreenShare);
router.post("/:code/screenshare/approve/:userId", auth(), ScreenShareControllers.approveScreenShare);
router.post("/:code/screenshare/deny/:userId",    auth(), ScreenShareControllers.denyScreenShare);

export const ScreenShareRoutes = router;
