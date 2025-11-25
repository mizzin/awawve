import { query } from "../db/connection.js"
import { logActivity } from "../utils/activityLogger.js"

export const blockUser = async (req, res) => {
  const { userId } = req.params

  try {
    const {
      rows,
    } = await query(
      `UPDATE users
          SET status = 'blocked'
        WHERE id = $1
        RETURNING id, email, status`,
      [userId]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: "차단할 사용자를 찾을 수 없습니다." })
    }

    await logActivity({
      actorId: req.user.id,
      action: "ADMIN_USER_BLOCK",
      targetType: "user",
      targetId: userId,
      metadata: { email: rows[0].email },
    })

    return res.json({ message: "사용자가 차단되었습니다.", user: rows[0] })
  } catch (error) {
    console.error("AdminBlockUser error:", error)
    return res.status(500).json({ message: "사용자 차단 중 오류가 발생했습니다." })
  }
}

