import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { hashSync } from 'bcryptjs'
import { nanoid } from 'nanoid'
import { PrismaClient } from '../src/generated/prisma/client'
import path from 'path'

// Resolve the database path from DATABASE_URL env var (strip the "file:" prefix)
const dbUrl = process.env.DATABASE_URL ?? 'file:./prisma/dev.db'
const rawPath = dbUrl.replace(/^file:/, '')
const dbPath = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath)

const adapter = new PrismaBetterSqlite3({ url: dbPath })
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0])

async function main(): Promise<void> {
  console.log('🌱 Seeding database...')

  // Clean existing seed data (order matters due to FK constraints)
  await prisma.auditEvent.deleteMany({})
  await prisma.issuanceStatusHistory.deleteMany({})
  await prisma.generatedAsset.deleteMany({})
  await prisma.documentIssuance.deleteMany({})
  await prisma.signer.deleteMany({})
  await prisma.organizationalUnit.deleteMany({})
  await prisma.organization.deleteMany({})
  await prisma.user.deleteMany({})

  // 1. Create admin user
  const passwordHash = hashSync('Admin1234!', 12)
  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'System Administrator',
      passwordHash,
      role: 'ADMIN',
    },
  })
  console.log(`✅ Created admin user: ${admin.email}`)

  // 2. Create organization
  const org = await prisma.organization.create({
    data: {
      name: 'PT Wahana Solusi Sejahtera',
      slug: 'wss',
      address: 'Jl. Contoh No. 1, Jakarta Selatan, DKI Jakarta 12345',
      website: 'https://example.com',
    },
  })
  console.log(`✅ Created organization: ${org.name}`)

  // 3. Create organizational unit
  const unit = await prisma.organizationalUnit.create({
    data: {
      orgId: org.id,
      name: 'Human Resources',
      code: 'HR',
    },
  })
  console.log(`✅ Created unit: ${unit.name}`)

  // 4. Create signers
  await prisma.signer.create({
    data: {
      orgId: org.id,
      fullName: 'Dr. Budi Santoso, M.M.',
      title: 'Direktur Utama',
      employeeId: 'DIR-001',
      isActive: true,
    },
  })

  const signer2 = await prisma.signer.create({
    data: {
      orgId: org.id,
      fullName: 'Siti Rahayu, S.H.',
      title: 'Kepala Divisi SDM',
      employeeId: 'HR-001',
      isActive: true,
    },
  })
  console.log(`✅ Created 2 signers`)

  // Find signer1 by employee ID for use below
  const signer1 = await prisma.signer.findFirstOrThrow({ where: { employeeId: 'DIR-001' } })

  // 5. Create DRAFT issuance
  const draftIssuance = await prisma.documentIssuance.create({
    data: {
      ref: nanoid(21),
      orgId: org.id,
      unitId: unit.id,
      signerId: signer2.id,
      createdById: admin.id,
      title: 'Surat Keterangan Kerja — Ahmad Fauzi',
      docNumber: 'SKK/HR/2024/001',
      docType: 'Surat Keterangan',
      description: 'Surat keterangan aktif bekerja untuk keperluan permohonan kredit.',
      docDate: new Date('2024-10-01'),
      issuanceTimestamp: new Date('2024-10-01T08:00:00Z'),
      status: 'DRAFT',
    },
  })

  await prisma.auditEvent.create({
    data: {
      actorId: admin.id,
      issuanceId: draftIssuance.id,
      action: 'ISSUANCE_CREATED',
      entityType: 'DocumentIssuance',
      entityId: draftIssuance.id,
      meta: JSON.stringify({ title: draftIssuance.title, docNumber: draftIssuance.docNumber }),
    },
  })
  console.log(`✅ Created DRAFT issuance: ${draftIssuance.docNumber}`)

  // 6. Create ISSUED issuance
  const issuedRef = nanoid(21)
  const issuedIssuance = await prisma.documentIssuance.create({
    data: {
      ref: issuedRef,
      orgId: org.id,
      unitId: unit.id,
      signerId: signer1.id,
      createdById: admin.id,
      title: 'Sertifikat Penghargaan Karyawan Terbaik 2024',
      docNumber: 'SERT/DIR/2024/047',
      docType: 'Sertifikat',
      description: 'Penghargaan karyawan terbaik tahun 2024 kategori inovasi.',
      docDate: new Date('2024-09-15'),
      issuanceTimestamp: new Date('2024-09-15T09:30:00Z'),
      status: 'ISSUED',
    },
  })

  await prisma.issuanceStatusHistory.create({
    data: {
      issuanceId: issuedIssuance.id,
      fromStatus: 'DRAFT',
      toStatus: 'ISSUED',
      actorId: admin.id,
    },
  })

  await prisma.auditEvent.create({
    data: {
      actorId: admin.id,
      issuanceId: issuedIssuance.id,
      action: 'ISSUANCE_ISSUED',
      entityType: 'DocumentIssuance',
      entityId: issuedIssuance.id,
      meta: JSON.stringify({ ref: issuedRef }),
    },
  })
  console.log(`✅ Created ISSUED issuance: ${issuedIssuance.docNumber} (ref: ${issuedRef})`)

  // 7. Create REVOKED issuance
  const revokedRef = nanoid(21)
  const revokedIssuance = await prisma.documentIssuance.create({
    data: {
      ref: revokedRef,
      orgId: org.id,
      signerId: signer2.id,
      createdById: admin.id,
      title: 'Surat Tugas Proyek Alpha',
      docNumber: 'ST/HR/2024/012',
      docType: 'Surat Tugas',
      description: 'Penugasan tim pengembang untuk proyek Alpha.',
      docDate: new Date('2024-08-01'),
      issuanceTimestamp: new Date('2024-08-01T07:00:00Z'),
      status: 'REVOKED',
    },
  })

  await prisma.issuanceStatusHistory.create({
    data: {
      issuanceId: revokedIssuance.id,
      fromStatus: 'DRAFT',
      toStatus: 'ISSUED',
      actorId: admin.id,
    },
  })

  await prisma.issuanceStatusHistory.create({
    data: {
      issuanceId: revokedIssuance.id,
      fromStatus: 'ISSUED',
      toStatus: 'REVOKED',
      reason: 'Proyek dibatalkan. Surat tugas tidak lagi berlaku.',
      actorId: admin.id,
    },
  })

  await prisma.auditEvent.create({
    data: {
      actorId: admin.id,
      issuanceId: revokedIssuance.id,
      action: 'ISSUANCE_REVOKED',
      entityType: 'DocumentIssuance',
      entityId: revokedIssuance.id,
      meta: JSON.stringify({ reason: 'Proyek dibatalkan. Surat tugas tidak lagi berlaku.' }),
    },
  })
  console.log(`✅ Created REVOKED issuance: ${revokedIssuance.docNumber}`)

  console.log('\n🎉 Seed complete!')
  console.log('\nAdmin credentials:')
  console.log('  Email: admin@example.com')
  console.log('  Password: Admin1234!')
  console.log(`\nSample verification URL: /verify/${issuedRef}`)
}

main()
  .catch((e: unknown) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
