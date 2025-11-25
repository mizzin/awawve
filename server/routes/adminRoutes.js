import { Router } from "express"

import { adminLogin, getFeedsForAdmin, getReportsForAdmin, getUsersForAdmin } from "../controllers/adminController.js"
import { deleteFeed } from "../controllers/adminFeedController.js"
import { blockUser } from "../controllers/adminUserController.js"
import { verifyToken, adminOnly } from "../middleware/authRoles.js"

const router = Router()

router.post("/login", adminLogin)
router.get("/users", verifyToken, adminOnly, getUsersForAdmin)
router.get("/feeds", verifyToken, adminOnly, getFeedsForAdmin)
router.get("/reports", verifyToken, adminOnly, getReportsForAdmin)
router.delete("/feeds/:feedId", verifyToken, adminOnly, deleteFeed)
router.post("/users/:userId/block", verifyToken, adminOnly, blockUser)

export default router
