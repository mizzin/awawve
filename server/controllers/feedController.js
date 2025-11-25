import { query } from "../db/connection.js"

export const getFeeds = async (_req, res) => {
  try {
    const { rows } = await query(
      `SELECT f.id,
              f.content,
              f.image_url AS "imageUrl",
              f.created_at AS "createdAt",
              u.nickname,
              u.id AS "authorId"
         FROM feeds f
         JOIN users u ON u.id = f.user_id
        ORDER BY f.created_at DESC`
    )
    return res.json(rows)
  } catch (error) {
    console.error("GetFeeds error:", error)
    return res.status(500).json({ message: "피드 목록을 가져오지 못했습니다." })
  }
}

export const createFeed = async (req, res) => {
  const { content } = req.body
  const imageUrl = req.body.imageUrl ?? req.body.image_url ?? null
  if (!content) {
    return res.status(400).json({ message: "내용을 입력해주세요." })
  }

  try {
    const { rows } = await query(
      `INSERT INTO feeds (user_id, content, image_url, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id`,
      [req.user.id, content, imageUrl]
    )
    return res.status(201).json({ message: "등록 완료", id: rows[0].id })
  } catch (error) {
    console.error("CreateFeed error:", error)
    return res.status(500).json({ message: "피드 등록 중 오류가 발생했습니다." })
  }
}

export const getFeedById = async (req, res) => {
  const { id } = req.params
  try {
    const { rows } = await query(
      `SELECT f.id,
              f.content,
              f.image_url AS "imageUrl",
              f.created_at AS "createdAt",
              u.id AS "authorId",
              u.nickname
         FROM feeds f
         JOIN users u ON u.id = f.user_id
        WHERE f.id = $1`,
      [id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: "해당 피드를 찾을 수 없습니다." })
    }

    return res.json(rows[0])
  } catch (error) {
    console.error("GetFeedById error:", error)
    return res.status(500).json({ message: "피드 상세 조회 중 오류가 발생했습니다." })
  }
}

export const deleteFeed = async (req, res) => {
  const { id } = req.params
  try {
    const { rowCount } = await query("DELETE FROM feeds WHERE id = $1 AND user_id = $2", [id, req.user.id])

    if (rowCount === 0) {
      return res.status(404).json({ message: "삭제할 피드를 찾을 수 없습니다." })
    }

    return res.status(204).send()
  } catch (error) {
    console.error("DeleteFeed error:", error)
    return res.status(500).json({ message: "피드 삭제 중 오류가 발생했습니다." })
  }
}
