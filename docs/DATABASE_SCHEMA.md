# Database Schema — WSS QR Signature

## 1. Entity Relationship Overview

```
User ──────────────────────────────────────────────────────────────────┐
  │ (createdBy)                                                         │
  │                                                                     │
Organization ─────────────┐                                            │
  │ (org)                 │                                            │
  │                       ▼                                            │
OrganizationalUnit   Signer                                            │
  │ (unit)          (signer)                                           │
  │                       │                                            │
  └───────────────────────┼─────────────────────── DocumentIssuance ◄─┘
                          │                               │
                          │                               ├── GeneratedAsset[]
                          │                               ├── IssuanceStatusHistory[]
                          │                               └── AuditEvent[]
                          │
                     AuditEvent (actor)
```

## 2. Entities

### User
Represents an administrator account.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | String | @id @default(cuid()) | Internal primary key |
| email | String | @unique | Login identifier |
| name | String | | Display name |
| passwordHash | String | | bcrypt hash |
| role | UserRole | @default(ADMIN) | Currently only ADMIN |
| createdAt | DateTime | @default(now()) | UTC |
| updatedAt | DateTime | @updatedAt | UTC |

### Organization
The issuing institution.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | String | @id @default(cuid()) | |
| name | String | | Display name |
| slug | String | @unique | URL-safe identifier |
| logoPath | String? | | Relative path in UPLOAD_DIR |
| address | String? | | Postal address |
| website | String? | | Organization URL |
| createdAt | DateTime | @default(now()) | UTC |
| updatedAt | DateTime | @updatedAt | UTC |

### OrganizationalUnit
A department or division within an organization.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | String | @id @default(cuid()) | |
| orgId | String | FK → Organization | |
| name | String | | e.g., "Human Resources" |
| code | String? | | Departmental code |
| createdAt | DateTime | @default(now()) | UTC |

### Signer
An authorized signatory for an organization.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | String | @id @default(cuid()) | |
| orgId | String | FK → Organization | |
| fullName | String | | Official full name |
| title | String | | Official title/position |
| employeeId | String? | | Optional staff ID |
| isActive | Boolean | @default(true) | Soft-disable signers |
| createdAt | DateTime | @default(now()) | UTC |
| updatedAt | DateTime | @updatedAt | UTC |

### DocumentIssuance
The core entity: a record of an official document issuance.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | String | @id @default(cuid()) | Internal ID |
| ref | String | @unique | `nanoid(21)` — used in public URLs |
| orgId | String | FK → Organization | |
| unitId | String? | FK → OrganizationalUnit (optional) | |
| signerId | String | FK → Signer | |
| title | String | | Document title |
| docNumber | String | | Document number |
| docType | String | | Category/type |
| description | String? | | Subject matter |
| docDate | DateTime | | Official document date |
| issuanceTimestamp | DateTime | | Official signing timestamp |
| expiresAt | DateTime? | | Optional expiry |
| status | DocumentStatus | @default(DRAFT) | State machine |
| adminNotes | String? | | NEVER shown publicly |
| createdById | String | FK → User | |
| createdAt | DateTime | @default(now()) | UTC |
| updatedAt | DateTime | @updatedAt | UTC |

### GeneratedAsset
A file generated for an issuance (QR PNG or signature block PNG).

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | String | @id @default(cuid()) | |
| issuanceId | String | FK → DocumentIssuance | |
| type | AssetType | | QR_PNG or SIGNATURE_BLOCK |
| filePath | String | | Relative path in UPLOAD_DIR |
| fileSize | Int | | Bytes |
| mimeType | String | | "image/png" |
| createdAt | DateTime | @default(now()) | UTC |

### IssuanceStatusHistory
Append-only log of status transitions.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | String | @id @default(cuid()) | |
| issuanceId | String | FK → DocumentIssuance | |
| fromStatus | DocumentStatus | | Previous status |
| toStatus | DocumentStatus | | New status |
| reason | String? | | Required for REVOKED |
| actorId | String? | FK → User (nullable) | |
| createdAt | DateTime | @default(now()) | UTC |

### AuditEvent
Append-only audit log for all significant actions.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | String | @id @default(cuid()) | |
| actorId | String? | FK → User (nullable) | Null for system events |
| action | String | | e.g., "ISSUANCE_CREATED" |
| entityType | String | | e.g., "DocumentIssuance" |
| entityId | String | | The affected entity's ID |
| meta | Json? | | Change details (sanitized) |
| ipAddress | String? | | Request IP (NEVER in public responses) |
| createdAt | DateTime | @default(now()) | UTC |

**Constraint:** AuditEvent rows must never be updated or deleted. The `audit.ts` helper enforces this by exposing only `writeAuditEvent()` with no update/delete operations.

## 3. Enums

```prisma
enum UserRole {
  ADMIN
}

enum DocumentStatus {
  DRAFT
  ISSUED
  REVOKED
  EXPIRED
}

enum AssetType {
  QR_PNG
  SIGNATURE_BLOCK
}
```

## 4. Key Design Decisions

- **nanoid(21) refs**: public URLs use `ref`, never `id`. This prevents sequential ID enumeration.
- **UTC timestamps**: all `DateTime` fields default to UTC. Display uses `Intl.DateTimeFormat`.
- **SQLite → PostgreSQL**: all field types are compatible. Only `DATABASE_URL` changes.
- **Soft deletes**: no hard deletes on issuance records. Revoked = status change only.
- **Audit append-only**: no UPDATE/DELETE operations on `AuditEvent` anywhere in the codebase.
