import { query } from "../db/connection.js"

export const getNotifications = async (req, res) => {
  const limit = Math.max(1, Math.min(50, parseInt(req.query.limit, 10) || 10))
  const offset = Math.max(0, parseInt(req.query.offset, 10) || 0)
  const filter = (req.query.filter || "all").toLowerCase()

  let filterClause = ""
  if (filter === "unread") {
    filterClause = "AND is_read = false"
  } else if (filter === "read") {
    filterClause = "AND is_read = true"
  }

  try {
    const { rows } = await query(
      `SELECT id,
              type,
              reference_id AS "referenceId",
              message,
              payload,
              is_read AS "isRead",
              created_at AS "createdAt",
              read_at AS "readAt"
         FROM notifications
        WHERE user_id = $1
          ${filterClause}
        ORDER BY created_at DESC
        LIMIT $2
        OFFSET $3`,
      [req.user.id, limit, offset]
    )

    const {
      rows: totalRows,
    } = await query(
      `SELECT COUNT(*) AS total
         FROM notifications
        WHERE user_id = $1
          ${filterClause}`,
      [req.user.id]
    )

    const total = Number(totalRows[0]?.total || 0)

    return res.json({
      data: rows,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error("GetNotifications error:", error)
    return res.status(500).json({ message: "알림을 불러오지 못했습니다." })
  }
}

export const markNotificationAsRead = async (req, res) => {
  const { id } = req.params

  try {
    const {
      rows,
    } = await query(
      `UPDATE notifications
          SET is_read = true,
              read_at = NOW()
        WHERE id = $1
          AND user_id = $2
        RETURNING id`,
      [id, req.user.id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: "알림을 찾을 수 없습니다." })
    }

    return res.json({ message: "알림이 읽음 처리되었습니다." })
  } catch (error) {
    console.error("MarkNotificationAsRead error:", error)
    return res.status(500).json({ message: "알림 읽음 처리 중 오류가 발생했습니다." })
  }
}
