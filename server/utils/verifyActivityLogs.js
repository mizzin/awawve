import dotenv from "dotenv"

import { query, pool } from "../db/connection.js"

dotenv.config()

const fetchRecentLogs = async () => {
  const { rows } = await query(
    `SELECT id,
            actor_id AS "actorId",
            action,
            target_type AS "targetType",
            target_id AS "targetId",
            metadata,
            created_at AS "createdAt"
       FROM activity_logs
      ORDER BY created_at DESC
      LIMIT 10`
  )

  return rows
}

const formatLog = (log) => {
  const metadata = log.metadata ? JSON.stringify(log.metadata) : "-"
  return `[${log.createdAt}] actor=${log.actorId} action=${log.action} target=${log.targetType}:${log.targetId} metadata=${metadata}`
}

async function main() {
  try {
    const logs = await fetchRecentLogs()
    if (logs.length === 0) {
      console.log("ℹ️ activity_logs 테이블에 기록이 없습니다.")
      return
    }

    console.log("📋 Recent activity logs:")
    logs.forEach((log) => {
      console.log(formatLog(log))
    })
  } catch (error) {
    console.error("❌ Failed to fetch activity logs:", error.message)
  } finally {
    await pool.end()
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { fetchRecentLogs }

