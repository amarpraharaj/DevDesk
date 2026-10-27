import { Router } from "express";

import authMiddleware from "../../middlewares/auth.middleware.js";
import { listActivities } from "./activity.controller.js";

const router = Router();

router.get("/", authMiddleware, listActivities);

export default router;