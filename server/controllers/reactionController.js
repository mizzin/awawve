import { query } from "../db/connection.js"
import { broadcastNotification } from "../realtime/notificationChannel.js"

const notifyFeedOwner = async ({ feedOwnerId, actorId, feedId, reactionType }) => {
  if (feedOwnerId === actorId) return

  const message = "새로운 반응이 달렸습니다."

  const {
    rows,
  } = await query(
    `INSERT INTO notifications (user_id, type, reference_id, message, payload, is_read, created_at)
     VALUES ($1, 'reaction', $2, $3, $4, false, NOW())
     ON CONFLICT (user_id, reference_id, type) DO NOTHING
     RETURNING id,
               user_id AS "userId",
               type,
               reference_id AS "referenceId",
               message,
               payload,
               is_read AS "isRead",
               created_at AS "createdAt"`,
    [feedOwnerId, feedId, message, JSON.stringify({ actorId, reactionType })]
  )

  if (rows[0]) {
    broadcastNotification(feedOwnerId, rows[0])
  }
}

export const upsertReaction = async (req, res) => {
  const { feedId } = req.params
  const { reactionType } = req.body

  if (!reactionType) {
    return res.status(400).json({ message: "reactionType을 전달해주세요." })
  }

  try {
    const {
      rows: feedRows,
    } = await query(
      `SELECT id, user_id AS "userId"
         FROM feeds
        WHERE id = $1`,
      [feedId]
    )

    if (feedRows.length === 0) {
      return res.status(404).json({ message: "피드를 찾을 수 없습니다." })
    }

    const feedOwnerId = feedRows[0].userId

    const {
      rows,
    } = await query(
      `INSERT INTO feed_reactions (feed_id, user_id, reaction_type, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (feed_id, user_id)
       DO UPDATE SET reaction_type = EXCLUDED.reaction_type, updated_at = NOW()
       RETURNING id, reaction_type AS "reactionType"`,
      [feedId, req.user.id, reactionType]
    )

    await notifyFeedOwner({
      feedOwnerId,
      actorId: req.user.id,
      feedId,
      reactionType,
    })

    return res.status(200).json({ message: "반응이 저장되었습니다.", reaction: rows[0] })
  } catch (error) {
    console.error("UpsertReaction error:", error)
    return res.status(500).json({ message: "반응 저장 중 오류가 발생했습니다." })
  }
}

export const removeReaction = async (req, res) => {
  const { feedId } = req.params

  try {
    const { rowCount } = await query("DELETE FROM feed_reactions WHERE feed_id = $1 AND user_id = $2", [
      feedId,
      req.user.id,
    ])

    if (rowCount === 0) {
      return res.status(404).json({ message: "삭제할 반응이 없습니다." })
    }

    return res.status(204).send()
  } catch (error) {
    console.error("RemoveReaction error:", error)
    return res.status(500).json({ message: "반응 삭제 중 오류가 발생했습니다." })
  }
}
