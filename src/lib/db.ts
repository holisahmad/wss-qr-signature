import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@/generated/prisma/client'
import path from 'path'

// Resolve DB path from DATABASE_URL (strip "file:" prefix and resolve relative paths)
function getDbPath(): string {
  const url = process.env.DATABASE_URL ?? 'file:./prisma/dev.db'
  const filePath = url.replace(/^file:/, '')
  if (!path.isAbsolute(filePath)) {
    return path.resolve(/*turbopackIgnore: true*/ process.cwd(), filePath)
  }
  return filePath
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({ url: getDbPath() })
  return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0])
}

// Prevent multiple instances during Next.js hot-reload in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db: PrismaClient = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

export type { PrismaClient }
