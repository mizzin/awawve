import { Router } from "express"

import { createComment, deleteComment, getComments } from "../controllers/commentController.js"
import { verifyToken } from "../middleware/authRoles.js"

const router = Router()

router.get("/:feedId", getComments)
router.post("/:feedId", verifyToken, createComment)
router.delete("/:commentId", verifyToken, deleteComment)

export default router
