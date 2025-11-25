import { Router } from "express"

import { createComment, getComments } from "../controllers/commentController.js"
import { createFeed, deleteFeed, getFeedById, getFeeds } from "../controllers/feedController.js"
import { removeReaction, upsertReaction } from "../controllers/reactionController.js"
import { verifyToken } from "../middleware/authRoles.js"

const router = Router()

router.get("/", getFeeds)
router.post("/", verifyToken, createFeed)
router.get("/:id", getFeedById)
router.delete("/:id", verifyToken, deleteFeed)
router.get("/:feedId/comments", getComments)
router.post("/:feedId/comments", verifyToken, createComment)
router.post("/:feedId/reaction", verifyToken, upsertReaction)
router.delete("/:feedId/reaction", verifyToken, removeReaction)

export default router
