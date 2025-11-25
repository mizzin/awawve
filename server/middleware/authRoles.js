import jwt from "jsonwebtoken"
import dotenv from "dotenv"

dotenv.config()

const { JWT_SECRET } = process.env

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not configured. Please set it in your .env file.")
}

const unauthorized = (res) => res.status(401).json({ message: "로그인이 필요합니다." })

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null

  if (!token) {
    return unauthorized(res)
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = {
      ...decoded,
      role: decoded.role || "user",
    }
    return next()
  } catch (error) {
    console.error("Token verification failed:", error.message)
    return unauthorized(res)
  }
}

export const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "관리자만 접근 가능합니다." })
  }
  return next()
}

export const moderatorOnly = (req, res, next) => {
  const allowed = new Set(["admin", "moderator"])
  if (!req.user || !allowed.has(req.user.role)) {
    return res.status(403).json({ message: "해당 권한으로 접근할 수 없습니다." })
  }
  return next()
}

