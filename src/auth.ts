import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { compareSync } from 'bcryptjs'
import { db } from '@/lib/db'
import type { UserRole } from '@/generated/prisma/enums'
import { writeAuditEvent } from '@/lib/audit'

declare module 'next-auth' {
  interface User {
    role: UserRole
  }
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: UserRole
    }
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    role: UserRole
    id: string
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (
          !credentials?.email ||
          !credentials?.password ||
          typeof credentials.email !== 'string' ||
          typeof credentials.password !== 'string'
        ) {
          return null
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            passwordHash: true,
          },
        })

        if (!user) return null

        const isValid = compareSync(credentials.password, user.passwordHash)
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.role = (user as { role: UserRole }).role
      }
      return token
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id
        session.user.role = token.role
      }
      return session
    },
  },
  pages: {
    signIn: '/sign-in',
  },
  events: {
    async signIn({ user }) {
      if (user?.id) {
        await writeAuditEvent({
          action: 'LOGIN',
          entityType: 'User',
          entityId: user.id,
          actorId: user.id,
          meta: { email: user.email ?? undefined },
        })
      }
    },
    async signOut(message) {
      // NextAuth v5: signOut event may receive { token } or { session }
      const id =
        (message as { token?: { id?: string } }).token?.id ??
        (message as { session?: { user?: { id?: string } } }).session?.user?.id
      if (id) {
        await writeAuditEvent({
          action: 'LOGOUT',
          entityType: 'User',
          entityId: id,
          actorId: id,
        })
      }
    },
  },
})
