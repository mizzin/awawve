import { query } from "../db/connection.js"
import { logActivity } from "../utils/activityLogger.js"
import { broadcastNotification } from "../realtime/notificationChannel.js"

export const createReport = async (req, res) => {
  const { targetType, targetId, reason } = req.body

  if (!targetType || !targetId || !reason) {
    return res.status(400).json({ message: "targetType, targetId, reason을 모두 전달해주세요." })
  }

  try {
    const {
      rows,
    } = await query(
      `INSERT INTO reports (reporter_id, target_type, target_id, reason, status, created_at)
       VALUES ($1, $2, $3, $4, 'pending', NOW())
       RETURNING id, status`,
      [req.user.id, targetType, targetId, reason]
    )

    return res.status(201).json({ message: "신고가 접수되었습니다.", report: rows[0] })
  } catch (error) {
    console.error("CreateReport error:", error)
    return res.status(500).json({ message: "신고 접수 중 오류가 발생했습니다." })
  }
}

export const updateReportStatus = async (req, res) => {
  const { id } = req.params
  const { status } = req.body

  if (!status) {
    return res.status(400).json({ message: "변경할 상태를 입력해주세요." })
  }

  try {
    const {
      rows,
    } = await query(
      `UPDATE reports
          SET status = $1,
              reviewed_by = $2,
              reviewed_at = NOW()
        WHERE id = $3
        RETURNING id, status, reporter_id AS "reporterId"`,
      [status, req.user.id, id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: "신고를 찾을 수 없습니다." })
    }

    const report = rows[0]

    await logActivity({
      actorId: req.user.id,
      action: "ADMIN_REPORT_UPDATE",
      targetType: "report",
      targetId: id,
      metadata: { newStatus: status },
    })

    if (report.reporterId) {
      const message = "당신의 신고가 처리되었습니다."
      const {
        rows: notificationRows,
      } = await query(
        `INSERT INTO notifications (user_id, type, reference_id, message, payload, is_read, created_at)
         VALUES ($1, 'report_update', $2, $3, $4, false, NOW())
         ON CONFLICT (user_id, reference_id, type) DO NOTHING
         RETURNING id,
                   user_id AS "userId",
                   type,
                   reference_id AS "referenceId",
                   message,
                   payload,
                   is_read AS "isRead",
                   created_at AS "createdAt"`,
        [report.reporterId, id, message, JSON.stringify({ status })]
      )

      if (notificationRows[0]) {
        broadcastNotification(report.reporterId, notificationRows[0])
      }
    }

    return res.json({ message: "신고 상태가 업데이트되었습니다.", report })
  } catch (error) {
    console.error("UpdateReportStatus error:", error)
    return res.status(500).json({ message: "신고 상태 변경 중 오류가 발생했습니다." })
  }
}
