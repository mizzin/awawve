import logger from "../utils/logger.js"

export const errorHandler = (err, _req, res, _next) => {
  logger.error(err)
  const status = err.status || 500
  res.status(status).json({
    message: err.message || "서버에서 오류가 발생했습니다.",
  })
}
