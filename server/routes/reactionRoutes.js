import { Router } from "express"

import { upsertReaction, removeReaction } from "../controllers/reactionController.js"
import { verifyToken } from "../middleware/authRoles.js"

const router = Router()

router.post("/:feedId", verifyToken, upsertReaction)
router.delete("/:feedId", verifyToken, removeReaction)

export default router
