import { query } from "../db/connection.js"

export const logActivity = async ({ actorId, action, targetType, targetId, metadata }) => {
  try {
    await query(
      `INSERT INTO activity_logs (actor_id, action, target_type, target_id, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [actorId, action, targetType, targetId, metadata ? JSON.stringify(metadata) : null]
    )
  } catch (error) {
    console.error("❌ Failed to log activity:", error.message)
  }
}

