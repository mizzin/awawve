import { query } from "../db/connection.js"
import { logActivity } from "../utils/activityLogger.js"

export const deleteFeed = async (req, res) => {
  const { feedId } = req.params

  try {
    const {
      rows,
    } = await query(
      `DELETE FROM feeds
        WHERE id = $1
      RETURNING id`,
      [feedId]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: "삭제할 피드를 찾을 수 없습니다." })
    }

    await logActivity({
      actorId: req.user.id,
      action: "ADMIN_FEED_DELETE",
      targetType: "feed",
      targetId: feedId,
    })

    return res.json({ message: "피드가 삭제되었습니다." })
  } catch (error) {
    console.error("AdminDeleteFeed error:", error)
    return res.status(500).json({ message: "피드 삭제 중 오류가 발생했습니다." })
  }
}

