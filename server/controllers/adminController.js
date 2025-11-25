import bcrypt from "bcrypt"

import { query } from "../db/connection.js"
import { signToken } from "../utils/jwt.js"

export const adminLogin = async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: "이메일과 비밀번호를 입력해주세요." })
  }

  try {
    const {
      rows,
    } = await query("SELECT id, email, password_hash, name FROM admins WHERE email = $1", [email])

    if (rows.length === 0) {
      return res.status(401).json({ message: "관리자 정보를 확인해주세요." })
    }

    const admin = rows[0]
    const isMatch = await bcrypt.compare(password, admin.password_hash)
    if (!isMatch) {
      return res.status(401).json({ message: "관리자 정보를 확인해주세요." })
    }

    const token = signToken({ id: admin.id, email: admin.email, role: "admin" })

    return res.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
      },
    })
  } catch (error) {
    console.error("AdminLogin error:", error)
    return res.status(500).json({ message: "관리자 로그인 중 오류가 발생했습니다." })
  }
}

export const getUsersForAdmin = async (_req, res) => {
  try {
    const { rows } = await query(
      `SELECT id,
              email,
              nickname,
              created_at AS "createdAt"
         FROM users
        ORDER BY created_at DESC`
    )
    return res.json(rows)
  } catch (error) {
    console.error("GetUsersForAdmin error:", error)
    return res.status(500).json({ message: "사용자 목록을 불러오지 못했습니다." })
  }
}

export const getFeedsForAdmin = async (_req, res) => {
  try {
    const { rows } = await query(
      `SELECT f.id,
              f.content,
              f.created_at AS "createdAt",
              u.nickname AS "authorNickname"
         FROM feeds f
         JOIN users u ON u.id = f.user_id
        ORDER BY f.created_at DESC`
    )

    return res.json(rows)
  } catch (error) {
    console.error("GetFeedsForAdmin error:", error)
    return res.status(500).json({ message: "피드 목록을 불러오지 못했습니다." })
  }
}

export const getReportsForAdmin = async (_req, res) => {
  try {
    const { rows } = await query(
      `SELECT r.id,
              r.target_type AS "targetType",
              r.target_id AS "targetId",
              r.reason,
              r.status,
              r.created_at AS "createdAt",
              u.nickname AS "reporterNickname"
         FROM reports r
         JOIN users u ON u.id = r.reporter_id
        ORDER BY r.created_at DESC`
    )

    return res.json(rows)
  } catch (error) {
    console.error("GetReportsForAdmin error:", error)
    return res.status(500).json({ message: "신고 목록을 불러오지 못했습니다." })
  }
}

