import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

// Force Next.js NFT tracer to bundle the SQLite database file
try {
  fs.readFileSync(path.join(process.cwd(), 'db', 'custom.db'));
} catch {
  // Ignore trace error
}

// If we are in Vercel/serverless and using SQLite, copy the db to /tmp so it's writeable
if (process.env.VERCEL === '1') {
  const originalDbPath = path.join(process.cwd(), 'db', 'custom.db')
  const tempDbDir = '/tmp'
  const tempDbPath = path.join(tempDbDir, 'custom.db')

  if (!fs.existsSync(tempDbPath)) {
    try {
      if (!fs.existsSync(tempDbDir)) {
        fs.mkdirSync(tempDbDir, { recursive: true })
      }
      
      if (fs.existsSync(originalDbPath)) {
        fs.copyFileSync(originalDbPath, tempDbPath)
        console.log(`Successfully copied SQLite DB from ${originalDbPath} to ${tempDbPath}`)
      } else {
        console.warn(`Original SQLite DB not found at ${originalDbPath}`)
      }
    } catch (err) {
      console.error('Failed to copy SQLite database to /tmp:', err)
    }
  }
  
  process.env.DATABASE_URL = `file:${tempDbPath}`
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db