import { query } from "../db/connection.js"

export async function cleanupOldNotifications() {
  try {
    const result = await query("DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '30 days'")
    console.log(`🧹 Deleted ${result.rowCount} old notifications`)
  } catch (error) {
    console.error("❌ Failed to cleanup notifications:", error.message)
  }
}

