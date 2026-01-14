# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Next.js 16 backend API** deployed on Vercel, providing authentication and product management for an Indonesian agricultural business (Naratani). The project uses the App Router pattern exclusively for API routes - there is no frontend.

**Tech Stack**: Next.js 16, TypeScript, Prisma ORM, PostgreSQL, Better Auth

## Development Commands

```bash
# Install dependencies (uses pnpm)
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Generate Prisma client (runs automatically after install)
pnpm postinstall  # or: prisma generate

# Run database migrations
prisma migrate dev

# Seed database (uses tsx runtime)
npx tsx prisma/seed-user.ts
npx tsx prisma/seed-shop.ts
npx tsx prisma/seed-product.ts
```

## Environment Variables

Required environment variables (see `.env.example`):

- `BETTER_AUTH_SECRET` - Secret key for Better Auth
- `BETTER_AUTH_URL` - Base URL for auth endpoints
- `DATABASE_URL` - PostgreSQL connection string (use `postgresql://` protocol with Prisma pg adapter)
- `SEED_NAME`, `SEED_EMAIL`, `SEED_PHONE`, `SEED_PASSWORD` - For seeding initial user

## Architecture

### Request Flow
```
Client → Next.js API Routes (src/app/) → Better Auth Middleware → Prisma ORM → PostgreSQL
```

### Directory Structure

```
src/
├── app/
│   ├── api/
│   │   └── auth/[...all]/route.ts    # Better Auth catch-all handler
│   ├── products/
│   │   ├── route.ts                   # Product CRUD (GET, POST)
│   │   └── [id]/route.ts              # Product by ID (GET, PATCH, DELETE)
│   ├── categories/
│   │   ├── route.ts                   # Category CRUD (GET, POST)
│   │   └── [id]/route.ts              # Category by ID (GET, PATCH, DELETE)
│   ├── shops/
│   │   ├── route.ts                   # Shop CRUD (GET, POST)
│   │   └── [id]/route.ts              # Shop by ID (GET, PATCH, DELETE)
│   └── generated/prisma/              # Auto-generated Prisma client
│
├── lib/
│   ├── auth.ts                        # Better Auth configuration
│   ├── prisma.ts                      # Prisma client with pg adapter
│   ├── api-utils.ts                   # API response helpers, error handlers, pagination
│   ├── exceptions.ts                  # Custom exception classes
│   └── permissions.ts                 # Role-based access control constants
│
├── utils/
│   ├── password.ts                    # Argon2 hashing utilities
│   └── slugify.ts                     # URL slug generation
│
└── validations/
    ├── auth.validation.ts             # Auth-related Zod schemas
    ├── product.validation.ts          # Product-related Zod schemas
    ├── category.validation.ts         # Category-related Zod schemas
    └── shop.validation.ts             # Shop-related Zod schemas

prisma/
├── schema.prisma                      # Database schema definition
├── migrations/                        # Database migration files
└── seed-*.ts                          # Database seeders (user, shop, product)

Root Config Files:
- next.config.ts      # Next.js configuration (external packages)
- tsconfig.json       # TypeScript configuration
- prisma.config.ts    # Prisma configuration
```

### Key Architecture Decisions

1. **API-Only Project**: This is a headless backend. No pages, only API routes in `src/app/`.

2. **Prisma with PostgreSQL Adapter**: Uses `@prisma/adapter-pg` with the `pg` driver instead of the default Prisma connection pooling. The Prisma client is configured in `src/lib/prisma.ts`.

3. **Custom Prisma Output**: Generated client is output to `src/generated/prisma/` instead of `node_modules`.

4. **Better Auth Integration**: Authentication is centralized in `src/lib/auth.ts` with:
   - Email/password authentication via argon2
   - Phone number OTP verification
   - Expo plugin for mobile app support
   - Admin plugin for role management
   - 7-day session expiration

5. **External Package Configuration**: `@node-rs/argon2` is marked as external in `next.config.ts` for proper Vercel deployment.

## Database Schema

Core models (defined in `prisma/schema.prisma`):

- **User**: Email/phone auth, roles, banning system
- **Session**: 7-day expiration, IP/userAgent tracking
- **Account**: OAuth credentials, password storage
- **Verification**: Email/phone verification tokens
- **Shop**: Shop entities
- **ProductCategory**: Categorization for products
- **Product**: Products with slug, price, stock, category relation

All tables use `uuid(7)` for IDs and are mapped to lowercase snake_case names.

## API Response Conventions

### Single Resource Response
```json
{
  "error": null,
  "message": "ok",
  "data": { ... }
}
```

### Paginated List Response
```json
{
  "error": null,
  "message": "ok",
  "data": {
    "data": [...],
    "pagination": {
      "page": 0,
      "limit": 10,
      "total": 100,
      "totalPages": 10,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

Use `getPaginationInfo(page, limit, total)` from `@/lib/api-utils` for consistent pagination metadata.

## Error Handling Pattern

All API routes use a consistent error handling pattern:

```typescript
import { handleApiError, requirePermission, successResponse } from "@/lib/api-utils"

export async function GET(request: Request) {
  try {
    await requirePermission({ resource: ["read"] })

    // ... route logic

    return successResponse(data)
  } catch (error) {
    return handleApiError(error, "GET /route")
  }
}
```

### Handling Unique Constraint Violations (P2002)

For Prisma unique constraint errors (like duplicate names/slugs), use this pattern:

```typescript
export async function POST(request: Request) {
  try {
    await requirePermission({ resource: ["create"] })

    const body = await request.json()
    const validatedData = schema.parse(body)

    const resource = await prisma.resource.create({ data: validatedData })

    return createdResponse(resource, "Resource created successfully")
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2002") {
      return new ConflictException("Resource with this name already exists").toResponse()
    }
    return handleApiError(error, "POST /resource")
  }
}
```

### Available Response Helpers

| Helper | Usage | Status |
|--------|-------|--------|
| `successResponse(data, message?)` | Successful GET/PUT/PATCH/DELETE | 200 |
| `createdResponse(data, message?)` | Successful POST | 201 |
| `handleApiError(error, path)` | Error handling in catch blocks | - |

### Available Exception Classes

```typescript
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerException,
  NotFoundException,
  UnauthorizedException,
} from "@/lib/exceptions"
```

All exceptions have a `.toResponse()` method that returns a `NextResponse`.

## Role-Based Permissions

Defined in `src/lib/permissions.ts`:

| Role | Product | Category | Shop |
|------|---------|----------|-------|
| Admin | create, read, update, delete | create, read, update, delete | create, read, update, delete |
| User | read | read | read |
| Sales | read | read | read |

Use `requirePermission({ resource: ["action"] })` in route handlers to enforce permissions.

## Adding New Features

1. **API Routes**: Add to `src/app/` following Next.js App Router conventions
2. **Database Models**: Modify `prisma/schema.prisma`, run `prisma migrate dev`
3. **Validation**: Add Zod schemas to `src/validations/`
4. **Auth Changes**: Modify `src/lib/auth.ts`
5. **Permissions**: Update `src/lib/permissions.ts` and the permissions table in this file
6. **Error Handling**: Follow the standard error handling pattern (try-catch + `handleApiError`)
7. **Documentation**: **Always update this CLAUDE.md file when adding new features**

### Route Handler Template

```typescript
import { createdResponse, handleApiError, requirePermission, successResponse } from "@/lib/api-utils"
import { ConflictException } from "@/lib/exceptions"
import prisma from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    await requirePermission({ resource: ["read"] })

    const resources = await prisma.resource.findMany()

    return successResponse(resources)
  } catch (error) {
    return handleApiError(error, "GET /resource")
  }
}

export async function POST(request: Request) {
  try {
    await requirePermission({ resource: ["create"] })

    const body = await request.json()
    const validatedData = schema.parse(body)

    const resource = await prisma.resource.create({ data: validatedData })

    return createdResponse(resource, "Resource created successfully")
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2002") {
      return new ConflictException("Resource already exists").toResponse()
    }
    return handleApiError(error, "POST /resource")
  }
}
```

## Conventional Commit Style

This repository uses conventional commits. When using `/commit`:
- Format: `type(scope): description`
- Types: feat, fix, chore, docs, refactor, style, test, perf, ci
- Examples: `feat(auth): add OAuth login`, `fix(api): resolve race condition`
