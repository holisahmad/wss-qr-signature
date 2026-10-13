import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { auth } from '@/auth'
import { AdminLayout } from '@/components/layout/AdminLayout'

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await connection()
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/sign-in')
  }

  return (
    <AdminLayout
      userEmail={session.user.email}
      userName={session.user.name}
    >
      {children}
    </AdminLayout>
  )
}
