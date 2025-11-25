import { Server } from "socket.io"

import { verifyToken as verifyJwt } from "../utils/jwt.js"

let io
const userSockets = new Map()

const getTokenFromHandshake = (socket) => socket.handshake.auth?.token || socket.handshake.query?.token
const RECONNECT_ATTEMPTS = Number(process.env.SOCKET_RECONNECT_ATTEMPTS || 5)
const RECONNECT_DELAY = Number(process.env.SOCKET_RECONNECT_DELAY_MS || 2000)

const removeSocket = (userId, socketId) => {
  const sockets = userSockets.get(userId)
  if (!sockets) return
  sockets.delete(socketId)
  if (sockets.size === 0) {
    userSockets.delete(userId)
  }
}

export const initNotificationChannel = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.NOTIFICATION_ORIGIN || "*",
      methods: ["GET", "POST"],
    },
    connectionStateRecovery: {},
  })

  io.use((socket, next) => {
    const token = getTokenFromHandshake(socket)
    if (!token) {
      return next(new Error("Unauthorized"))
    }
    try {
      const payload = verifyJwt(token)
      socket.user = { id: payload.id }
      return next()
    } catch (error) {
      console.error("Socket auth failed:", error.message)
      return next(new Error("Unauthorized"))
    }
  })

  io.on("connection", (socket) => {
    const userId = socket.user.id
    const sockets = userSockets.get(userId) || new Set()
    sockets.add(socket.id)
    userSockets.set(userId, sockets)

    console.log(`✅ User connected: ${userId} (socket ${socket.id})`)
    socket.emit("notification_channel_ready", {
      reconnectionAttempts: RECONNECT_ATTEMPTS,
      reconnectionDelay: RECONNECT_DELAY,
    })

    socket.on("disconnect", (reason) => {
      removeSocket(userId, socket.id)
      console.log(`❌ User disconnected: ${userId} (reason: ${reason})`)
    })
  })

  console.log("✅ Notification channel initialized")
}

export const broadcastNotification = (userId, notification) => {
  if (!io) {
    return
  }

  const sockets = userSockets.get(userId)
  if (!sockets) {
    return
  }

  sockets.forEach((socketId) => {
    io.to(socketId).emit("new_notification", notification)
  })
}
