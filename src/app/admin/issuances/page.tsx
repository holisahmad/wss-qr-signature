import { Suspense } from 'react'
import Link from 'next/link'
import { db } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { IssuanceFilters } from './IssuanceFilters'
import { IssuanceTable } from './IssuanceTable'
import type { DocumentStatus } from '@/generated/prisma/enums'
import type { Prisma } from '@/generated/prisma/client'

export const metadata = {
  title: 'Issuances — WSS QR Signature',
}

export const instant = false

const PAGE_SIZE = 20

interface SearchParams {
  page?: string
  search?: string
  status?: string
  orgId?: string
  dateFrom?: string
  dateTo?: string
  sort?: string
}

async function getIssuances(params: SearchParams) {
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const search = params.search?.trim() ?? ''
  const status = params.status as DocumentStatus | undefined
  const orgId = params.orgId ?? ''
  const dateFrom = params.dateFrom ?? ''
  const dateTo = params.dateTo ?? ''
  const sort = params.sort ?? 'newest'

  const where: Prisma.DocumentIssuanceWhereInput = {}

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { docNumber: { contains: search } },
      { ref: { contains: search } },
      { signer: { fullName: { contains: search } } },
    ]
  }

  if (status && ['DRAFT', 'ISSUED', 'REVOKED', 'EXPIRED'].includes(status)) {
    where.status = status
  }

  if (orgId) {
    where.orgId = orgId
  }

  if (dateFrom || dateTo) {
    where.createdAt = {}
    if (dateFrom) where.createdAt.gte = new Date(dateFrom)
    if (dateTo) {
      const end = new Date(dateTo)
      end.setHours(23, 59, 59, 999)
      where.createdAt.lte = end
    }
  }

  let orderBy: Prisma.DocumentIssuanceOrderByWithRelationInput = { createdAt: 'desc' }
  if (sort === 'oldest') orderBy = { createdAt: 'asc' }
  else if (sort === 'title') orderBy = { title: 'asc' }
  else if (sort === 'docNumber') orderBy = { docNumber: 'asc' }

  const [issuances, total] = await db.$transaction([
    db.documentIssuance.findMany({
      where,
      orderBy,
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      select: {
        id: true,
        ref: true,
        title: true,
        docNumber: true,
        status: true,
        createdAt: true,
        signer: { select: { fullName: true } },
        org: { select: { name: true } },
      },
    }),
    db.documentIssuance.count({ where }),
  ])

  return { issuances, total, page }
}

export default async function IssuancesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const orgs = await db.organization.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })

  const { issuances, total, page } = await getIssuances(params)

  return (
    <>
      <PageHeader
        title="Issuances"
        subtitle={`${total} total issuances across all organizations`}
        action={
          <Link href="/admin/issuances/new">
            <Button variant="primary" size="sm">
              + New Issuance
            </Button>
          </Link>
        }
      />

      <div className="flex flex-col gap-4">
        <Suspense fallback={null}>
          <IssuanceFilters
            orgs={orgs}
            currentSearch={params.search ?? ''}
            currentStatus={params.status ?? ''}
            currentOrgId={params.orgId ?? ''}
            currentDateFrom={params.dateFrom ?? ''}
            currentDateTo={params.dateTo ?? ''}
            currentSort={params.sort ?? 'newest'}
          />
        </Suspense>

        <IssuanceTable
          issuances={issuances}
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
        />
      </div>
    </>
  )
}
