import { query } from "../db/connection.js"
import { broadcastNotification } from "../realtime/notificationChannel.js"

const notifyFeedOwner = async ({ feedOwnerId, actorId, feedId, commentId }) => {
  if (feedOwnerId === actorId) return

  const message = "새로운 댓글이 달렸습니다."

  const {
    rows,
  } = await query(
    `INSERT INTO notifications (user_id, type, reference_id, message, payload, is_read, created_at)
     VALUES ($1, 'comment', $2, $3, $4, false, NOW())
     ON CONFLICT (user_id, reference_id, type) DO NOTHING
     RETURNING id,
               user_id AS "userId",
               type,
               reference_id AS "referenceId",
               message,
               payload,
               is_read AS "isRead",
               created_at AS "createdAt"`,
    [feedOwnerId, feedId, message, JSON.stringify({ actorId, commentId })]
  )

  if (rows[0]) {
    broadcastNotification(feedOwnerId, rows[0])
  }
}

export const getComments = async (req, res) => {
  const { feedId } = req.params

  try {
    const { rows } = await query(
      `SELECT c.id,
              c.content,
              c.created_at AS "createdAt",
              c.user_id AS "authorId",
              u.nickname
         FROM comments c
         JOIN users u ON u.id = c.user_id
        WHERE c.feed_id = $1
        ORDER BY c.created_at ASC`,
      [feedId]
    )

    return res.json(rows)
  } catch (error) {
    console.error("GetComments error:", error)
    return res.status(500).json({ message: "댓글을 불러오지 못했습니다." })
  }
}

export const createComment = async (req, res) => {
  const { feedId } = req.params
  const { content } = req.body

  if (!content) {
    return res.status(400).json({ message: "댓글 내용을 입력해주세요." })
  }

  try {
    const {
      rows: feedRows,
    } = await query("SELECT user_id AS \"userId\" FROM feeds WHERE id = $1", [feedId])

    if (feedRows.length === 0) {
      return res.status(404).json({ message: "피드를 찾을 수 없습니다." })
    }

    const {
      rows,
    } = await query(
      `INSERT INTO comments (feed_id, user_id, content, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id`,
      [feedId, req.user.id, content]
    )

    await notifyFeedOwner({
      feedOwnerId: feedRows[0].userId,
      actorId: req.user.id,
      feedId,
      commentId: rows[0].id,
    })

    return res.status(201).json({ message: "댓글이 등록되었습니다.", id: rows[0].id })
  } catch (error) {
    console.error("CreateComment error:", error)
    return res.status(500).json({ message: "댓글 등록 중 오류가 발생했습니다." })
  }
}

export const deleteComment = async (req, res) => {
  const { commentId } = req.params

  try {
    const { rowCount } = await query("DELETE FROM comments WHERE id = $1 AND user_id = $2", [commentId, req.user.id])

    if (rowCount === 0) {
      return res.status(404).json({ message: "삭제할 댓글을 찾을 수 없습니다." })
    }

    return res.status(204).send()
  } catch (error) {
    console.error("DeleteComment error:", error)
    return res.status(500).json({ message: "댓글 삭제 중 오류가 발생했습니다." })
  }
}
