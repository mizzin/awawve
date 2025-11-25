import bcrypt from "bcrypt"

import { query } from "../db/connection.js"
import { signToken } from "../utils/jwt.js"

const SALT_ROUNDS = 10

export const signup = async (req, res) => {
  const { email, password, nickname } = req.body

  if (!email || !password || !nickname) {
    return res.status(400).json({ message: "이메일, 비밀번호, 닉네임을 모두 입력해주세요." })
  }

  try {
    const { rows: duplicates } = await query("SELECT email, nickname FROM users WHERE email = $1 OR nickname = $2", [
      email,
      nickname,
    ])

    const emailTaken = duplicates.some((row) => row.email === email)
    const nicknameTaken = duplicates.some((row) => row.nickname === nickname)

    if (emailTaken || nicknameTaken) {
      return res.status(409).json({
        message: emailTaken ? "이미 가입한 이메일입니다." : "이미 사용 중인 닉네임입니다.",
      })
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
    const { rows } = await query(
      `INSERT INTO users (email, password_hash, nickname, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, email, nickname`,
      [email, passwordHash, nickname]
    )

    return res.status(201).json({ message: "회원가입 완료", user: rows[0] })
  } catch (error) {
    console.error("Signup error:", error)
    return res.status(500).json({ message: "회원가입 중 오류가 발생했습니다." })
  }
}

export const login = async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: "이메일과 비밀번호를 입력해주세요." })
  }

  try {
    const { rows } = await query("SELECT id, email, password_hash, nickname FROM users WHERE email = $1", [email])
    if (rows.length === 0) {
      return res.status(401).json({ message: "이메일 또는 비밀번호가 올바르지 않습니다." })
    }

    const user = rows[0]
    const isMatch = await bcrypt.compare(password, user.password_hash)
    if (!isMatch) {
      return res.status(401).json({ message: "이메일 또는 비밀번호가 올바르지 않습니다." })
    }

    const token = signToken({ id: user.id, email: user.email, role: "user" })

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    return res.status(500).json({ message: "로그인 중 오류가 발생했습니다." })
  }
}

export const getMe = async (req, res) => {
  try {
    const { rows } = await query("SELECT id, email, nickname FROM users WHERE id = $1", [req.user.id])
    if (rows.length === 0) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." })
    }

    return res.json(rows[0])
  } catch (error) {
    console.error("GetMe error:", error)
    return res.status(500).json({ message: "내 정보 조회 중 오류가 발생했습니다." })
  }
}
