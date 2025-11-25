import { Router } from "express"

import { getNotifications, markNotificationAsRead } from "../controllers/notificationController.js"
import { verifyToken } from "../middleware/authRoles.js"

const router = Router()

router.get("/", verifyToken, getNotifications)
router.patch("/:id/read", verifyToken, markNotificationAsRead)

export default router
