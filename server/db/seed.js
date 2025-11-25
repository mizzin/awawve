import bcrypt from "bcrypt"
import dotenv from "dotenv"

import { query, pool } from "./connection.js"

dotenv.config()

const SALT_ROUNDS = 10

const adminAccounts = [
  { email: "admin@awave.com", password: "123456", name: "Admin" },
  { email: "moderator@awave.com", password: "123456", name: "Moderator" },
]

const userAccounts = [
  { email: "alice@awave.com", password: "123456", nickname: "Alice" },
  { email: "bob@awave.com", password: "123456", nickname: "Bob" },
  { email: "charlie@awave.com", password: "123456", nickname: "Charlie" },
]

const feedSeed = [
  { authorEmail: "alice@awave.com", content: "첫 번째 피드입니다!", imageUrl: null },
  { authorEmail: "bob@awave.com", content: "오늘의 영감을 공유합니다.", imageUrl: null },
  { authorEmail: "charlie@awave.com", content: "새로운 프로젝트가 시작됐어요.", imageUrl: null },
  { authorEmail: "alice@awave.com", content: "주말 여행 사진 공유", imageUrl: "https://picsum.photos/300" },
  { authorEmail: "bob@awave.com", content: "좋아하는 음악 플레이리스트 추천", imageUrl: null },
]

const commentSeed = [
  { commenter: "bob@awave.com", feedIndex: 0, content: "축하해요!" },
  { commenter: "charlie@awave.com", feedIndex: 0, content: "좋은 소식이네요." },
  { commenter: "alice@awave.com", feedIndex: 1, content: "영감을 받았어요." },
  { commenter: "alice@awave.com", feedIndex: 2, content: "프로젝트 기대돼요!" },
  { commenter: "bob@awave.com", feedIndex: 2, content: "도움 필요하면 말해주세요." },
  { commenter: "charlie@awave.com", feedIndex: 3, content: "사진 너무 좋아요." },
  { commenter: "alice@awave.com", feedIndex: 3, content: "고마워요 :)" },
  { commenter: "charlie@awave.com", feedIndex: 4, content: "들어보고 싶어요." },
  { commenter: "bob@awave.com", feedIndex: 4, content: "추천 감사합니다!" },
  { commenter: "alice@awave.com", feedIndex: 4, content: "좋아하는 곡이 많네요." },
]

const reactionSeed = [
  { reactor: "alice@awave.com", feedIndex: 1, reactionType: "like" },
  { reactor: "bob@awave.com", feedIndex: 0, reactionType: "clap" },
  { reactor: "charlie@awave.com", feedIndex: 0, reactionType: "like" },
  { reactor: "alice@awave.com", feedIndex: 2, reactionType: "love" },
  { reactor: "bob@awave.com", feedIndex: 2, reactionType: "wow" },
  { reactor: "charlie@awave.com", feedIndex: 4, reactionType: "like" },
]

const getExistingId = async (table, email) => {
  const { rows } = await query(`SELECT id FROM ${table} WHERE email = $1`, [email])
  return rows[0]?.id
}

const ensureAdmin = async ({ email, password, name }) => {
  const existingId = await getExistingId("admins", email)
  if (existingId) {
    console.log(`ℹ️ Admin already exists: ${email}`)
    return existingId
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
  const {
    rows,
  } = await query(
    `INSERT INTO admins (email, password_hash, name)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [email, passwordHash, name]
  )
  console.log(`✅ Created admin: ${email}`)
  return rows[0].id
}

const ensureUser = async ({ email, password, nickname }) => {
  const existingId = await getExistingId("users", email)
  if (existingId) {
    console.log(`ℹ️ User already exists: ${email}`)
    return existingId
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
  const {
    rows,
  } = await query(
    `INSERT INTO users (email, password_hash, nickname, created_at)
     VALUES ($1, $2, $3, NOW())
     RETURNING id`,
    [email, passwordHash, nickname]
  )
  console.log(`✅ Created user: ${email}`)
  return rows[0].id
}

const ensureFeed = async ({ userId, content, imageUrl }) => {
  const {
    rows: existing,
  } = await query(
    `SELECT id FROM feeds WHERE user_id = $1 AND content = $2 LIMIT 1`,
    [userId, content]
  )

  if (existing.length > 0) {
    return existing[0].id
  }

  const {
    rows,
  } = await query(
    `INSERT INTO feeds (user_id, content, image_url, created_at)
     VALUES ($1, $2, $3, NOW())
     RETURNING id`,
    [userId, content, imageUrl || null]
  )
  return rows[0].id
}

const ensureComment = async ({ feedId, userId, content }) => {
  const {
    rows: existing,
  } = await query(
    `SELECT id FROM comments WHERE feed_id = $1 AND user_id = $2 AND content = $3 LIMIT 1`,
    [feedId, userId, content]
  )
  if (existing.length > 0) {
    return existing[0].id
  }

  const {
    rows,
  } = await query(
    `INSERT INTO comments (feed_id, user_id, content, created_at)
     VALUES ($1, $2, $3, NOW())
     RETURNING id`,
    [feedId, userId, content]
  )
  return rows[0].id
}

const ensureReaction = async ({ feedId, userId, reactionType }) => {
  await query(
    `INSERT INTO feed_reactions (feed_id, user_id, reaction_type, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())
     ON CONFLICT (feed_id, user_id)
     DO UPDATE SET reaction_type = EXCLUDED.reaction_type, updated_at = NOW()`,
    [feedId, userId, reactionType]
  )
}

async function runSeed() {
  console.log("🌱 Starting seed...")
  for (const admin of adminAccounts) {
    await ensureAdmin(admin)
  }

  const userIdMap = {}
  for (const user of userAccounts) {
    const id = await ensureUser(user)
    userIdMap[user.email] = id
  }

  const feedIds = []
  for (const feed of feedSeed) {
    const userId = userIdMap[feed.authorEmail]
    if (!userId) continue
    const feedId = await ensureFeed({
      userId,
      content: feed.content,
      imageUrl: feed.imageUrl,
    })
    feedIds.push(feedId)
  }

  for (const comment of commentSeed) {
    const userId = userIdMap[comment.commenter]
    const feedId = feedIds[comment.feedIndex]
    if (!userId || !feedId) continue
    await ensureComment({ feedId, userId, content: comment.content })
  }

  for (const reaction of reactionSeed) {
    const userId = userIdMap[reaction.reactor]
    const feedId = feedIds[reaction.feedIndex]
    if (!userId || !feedId) continue
    await ensureReaction({ feedId, userId, reactionType: reaction.reactionType })
  }

  console.log("✅ Seed completed successfully.")
}

runSeed()
  .catch((error) => {
    console.error("❌ Seed failed:", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })

