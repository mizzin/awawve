import { Router } from "express"

import { createReport, updateReportStatus } from "../controllers/reportController.js"
import { verifyToken, moderatorOnly } from "../middleware/authRoles.js"

const router = Router()

router.post("/", verifyToken, createReport)
router.patch("/:id", verifyToken, moderatorOnly, updateReportStatus)

export default router
