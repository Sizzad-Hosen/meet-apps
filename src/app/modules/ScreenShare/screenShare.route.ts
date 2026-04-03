import { auth } from "../../middlewares/auth";
import { ScreenShareControllers } from "./screenShare.controller";


const router = require("express").Router();


router.post("/:code/start",           auth(), ScreenShareControllers.startScreenShare);
router.post("/:code/stop",            auth(), ScreenShareControllers.stopScreenShare);
router.post("/:code/approve/:userId", auth(), ScreenShareControllers.approveScreenShare);
router.post("/:code/deny/:userId",    auth(), ScreenShareControllers.denyScreenShare);

export const ScreenShareRoutes = router;
