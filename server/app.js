import express from "express"
import cors from "cors"
import morgan from "morgan"
import dotenv from "dotenv"
import { createServer } from "http"
import cron from "node-cron"

import { authRoutes, feedRoutes, reactionRoutes, commentRoutes, notificationRoutes, reportRoutes, adminRoutes } from "./routes/index.js"
import { errorHandler } from "./middleware/errorHandler.js"
import { initNotificationChannel } from "./realtime/notificationChannel.js"
import { cleanupOldNotifications } from "./jobs/cleanupOldNotifications.js"
import logger from "./utils/logger.js"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())
app.use(morgan("combined"))

app.use("/api/auth", authRoutes)
app.use("/api/feed", feedRoutes)
app.use("/api/reaction", reactionRoutes)
app.use("/api/comment", commentRoutes)
app.use("/api/notifications", notificationRoutes)
app.use("/api/report", reportRoutes)
app.use("/api/admin", adminRoutes)

app.get("/health", (_req, res) => {
  res.json({ status: "ok" })
})

app.use(errorHandler)

const server = createServer(app)

if (process.env.NODE_ENV !== "test") {
  initNotificationChannel(server)
  const cleanupSchedule = process.env.NOTIFICATION_CLEANUP_CRON || "0 3 * * *"
  cron.schedule(cleanupSchedule, cleanupOldNotifications, {
    timezone: process.env.NOTIFICATION_CLEANUP_TZ || "UTC",
  })

  server.listen(PORT, () => {
    logger.info(`✅ Server running on port ${PORT}`)
  })
}

export { app, server }
