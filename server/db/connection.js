import pkg from "pg"
import dotenv from "dotenv"

dotenv.config()

const { Pool } = pkg
const { DATABASE_URL } = process.env

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Please define it in your .env file.")
}

export const pool = new Pool({
  connectionString: DATABASE_URL,
})

export const query = (text, params) => pool.query(text, params)

pool
  .connect()
  .then((client) => {
    client.release()
    console.log("✅ Database connected")
  })
  .catch((err) => console.error("❌ DB connection error:", err))

export default pool
