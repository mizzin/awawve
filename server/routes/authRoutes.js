import { Router } from "express"

import { getMe, login, signup } from "../controllers/authController.js"
import { verifyToken } from "../middleware/authRoles.js"

const router = Router()

router.post("/signup", signup)
router.post("/login", login)
router.get("/me", verifyToken, getMe)

export default router
