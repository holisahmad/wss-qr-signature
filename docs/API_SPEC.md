# API Specification — WSS QR Signature

## 1. Conventions

All endpoints follow these conventions:

**Authentication**: Protected endpoints require a valid NextAuth.js session (admin role). Include session cookie automatically for browser clients. For API clients use the session token.

**Request Content-Type**: `application/json` unless noted.

**Response format (success)**:
```json
{ "data": <payload> }
```

**Response format (error)**:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": [{ "field": "title", "message": "Required" }]
  }
}
```

**Common error codes**:
| Code | HTTP Status | Meaning |
|---|---|---|
| `UNAUTHORIZED` | 401 | No valid session |
| `FORBIDDEN` | 403 | Session exists but insufficient role |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 422 | Invalid request body |
| `CONFLICT` | 409 | Duplicate or invalid state transition |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## 2. Endpoints

### POST /api/issuances
Create a new DRAFT issuance record.  
**Auth**: Required (ADMIN)

**Request body**:
```json
{
  "orgId": "string",
  "unitId": "string | null",
  "signerId": "string",
  "title": "string (1–200 chars)",
  "docNumber": "string (1–100 chars)",
  "docType": "string (1–100 chars)",
  "description": "string | null",
  "docDate": "ISO 8601 date string",
  "issuanceTimestamp": "ISO 8601 datetime string",
  "expiresAt": "ISO 8601 datetime string | null",
  "adminNotes": "string | null"
}
```

**Response 201**:
```json
{
  "data": {
    "id": "clxxx...",
    "ref": "nanoid21chars",
    "status": "DRAFT",
    "title": "...",
    ...
  }
}
```

**Errors**: 401, 422 (validation), 409 (duplicate docNumber + orgId)

---

### GET /api/issuances
List issuances with pagination, search, and filters.  
**Auth**: Required (ADMIN)

**Query parameters**:
| Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Max 100 |
| `search` | string | | Searches title, docNumber, signer name, ref |
| `status` | string | | DRAFT, ISSUED, REVOKED, EXPIRED |
| `orgId` | string | | Filter by organization |
| `unitId` | string | | Filter by unit |
| `dateFrom` | ISO date | | Minimum docDate |
| `dateTo` | ISO date | | Maximum docDate |
| `sort` | string | newest | newest, oldest, title, docNumber |

**Response 200**:
```json
{
  "data": {
    "items": [...],
    "total": 42,
    "page": 1,
    "limit": 20
  }
}
```

---

### GET /api/issuances/:id
Get issuance detail by internal ID.  
**Auth**: Required (ADMIN)

**Response 200**: Full issuance with org, unit, signer, assets, status history.  
**Errors**: 401, 404

---

### PATCH /api/issuances/:id
Update metadata. Only allowed when status is DRAFT.  
**Auth**: Required (ADMIN)

**Request body** (all fields optional):
```json
{
  "title": "string",
  "docNumber": "string",
  "docType": "string",
  "description": "string | null",
  "docDate": "ISO 8601",
  "issuanceTimestamp": "ISO 8601",
  "expiresAt": "ISO 8601 | null",
  "adminNotes": "string | null"
}
```

**Response 200**: Updated issuance.  
**Errors**: 401, 404, 409 (status not DRAFT), 422

---

### POST /api/issuances/:id/issue
Transition DRAFT → ISSUED and generate QR + signature block PNG.  
**Auth**: Required (ADMIN)

**Request body**: (empty)

**Response 200**:
```json
{
  "data": {
    "issuance": { "id": "...", "status": "ISSUED", "ref": "..." },
    "assets": [
      { "id": "...", "type": "QR_PNG", "filePath": "..." },
      { "id": "...", "type": "SIGNATURE_BLOCK", "filePath": "..." }
    ]
  }
}
```

**Errors**: 401, 404, 409 (not DRAFT or already ISSUED)

---

### POST /api/issuances/:id/revoke
Transition ISSUED → REVOKED. Reason is mandatory.  
**Auth**: Required (ADMIN)

**Request body**:
```json
{
  "reason": "string (minimum 10 chars)"
}
```

**Response 200**: Updated issuance with REVOKED status.  
**Errors**: 401, 404, 400 (reason missing), 409 (status not ISSUED)

---

### GET /api/verify/:ref
**PUBLIC** — no authentication required.  
Rate-limited: 30 requests/minute per IP.

**Response 200** (safe public fields only):
```json
{
  "data": {
    "ref": "...",
    "status": "ISSUED",
    "title": "...",
    "docNumber": "...",
    "docType": "...",
    "docDate": "ISO 8601",
    "issuanceTimestamp": "ISO 8601",
    "expiresAt": "ISO 8601 | null",
    "org": { "name": "...", "logoPath": "..." },
    "unit": { "name": "..." } | null,
    "signer": { "fullName": "...", "title": "..." }
  }
}
```

**Never included**: `adminNotes`, `createdById`, creator email, internal IDs, IP addresses.

**Errors**: 404 (unknown ref — no information leakage), 429 (rate limited)

---

### POST /api/organizations
Create a new organization.  
**Auth**: Required (ADMIN)

**Request body**:
```json
{
  "name": "string",
  "slug": "string (unique)",
  "address": "string | null",
  "website": "string | null"
}
```

**Response 201**: Created organization.

---

### GET /api/organizations
List all organizations.  
**Auth**: Required (ADMIN)

**Response 200**: Array of organizations.

---

### POST /api/organizations/:id/logo
Upload and normalize the organization logo.  
**Auth**: Required (ADMIN)  
**Content-Type**: `multipart/form-data`

**File constraints**:
- Field name: `logo`
- MIME: `image/png`, `image/jpeg`, `image/svg+xml`
- Max size: 2 MB
- Normalized to ≤ 300×300 px by server

**Response 200**: Updated organization with new `logoPath`.  
**Errors**: 401, 404, 422 (MIME/size violation)

---

### GET /api/issuances/:id/assets/:assetId
Download a generated asset (admin only).  
**Auth**: Required (ADMIN)

**Response 200**: PNG file stream with `Content-Type: image/png` and `Content-Disposition: attachment`.  
**Errors**: 401, 404

---

## 3. Rate Limiting

The in-memory sliding window limiter applies per-IP:
- `/api/verify/*`: 30 requests per minute
- All other endpoints: not rate-limited in MVP

The limiter resets on server restart. Production deployments should use a persistent store (Redis) for distributed rate limiting.
