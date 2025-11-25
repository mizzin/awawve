import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { createLogger, format, transports } from "winston"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const logDir = path.resolve(__dirname, "../logs")

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true })
}

const logFormat = format.printf(({ level, message, timestamp, stack }) => {
  const logMessage = stack || message
  return `[${timestamp}] ${level}: ${logMessage}`
})

const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: format.combine(format.timestamp(), format.errors({ stack: true }), logFormat),
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), format.timestamp(), format.errors({ stack: true }), logFormat),
    }),
    new transports.File({
      filename: path.join(logDir, "app.log"),
    }),
  ],
})

export default logger

