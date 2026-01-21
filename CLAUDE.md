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
│   ├── orders/
│   │   ├── route.ts                   # Order CRUD (GET, POST)
│   │   └── [id]/
│   │       ├── route.ts               # Get order by ID (GET)
│   │       ├── accept/route.ts        # Accept order → PROCESSING (PUT)
│   │       ├── cancel/route.ts        # Cancel order → CANCELLED (PUT)
│   │       └── complete/route.ts      # Complete order → COMPLETED (PUT)
│   ├── suppliers/
│   │   ├── route.ts                   # Supplier CRUD (GET, POST)
│   │   └── [id]/route.ts              # Supplier by ID (GET, PUT, DELETE)
│   └── stock-entries/
│       ├── route.ts                   # Stock Entry list/create (GET, POST)
│       ├── [id]/route.ts              # Delete Stock Entry (DELETE)
│       └── product/[productId]/route.ts # Get Stock Entries by Product (GET)
│   └── dashboard/
│       ├── user/route.ts              # Total users count (GET)
│       ├── sales/route.ts             # Sales revenue + order count (GET)
│       ├── orders/route.ts            # Order count by status (GET)
│       ├── gross-profit/route.ts      # Margin breakdown (GET)
│       ├── total-avg-margin/route.ts  # Weighted average margin rate (GET)
│       ├── shops/route.ts             # Shops ranked by revenue (GET)
│       └── product-left-value/route.ts # Current stock value (GET)
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
    ├── shop.validation.ts             # Shop-related Zod schemas
    ├── order.validation.ts            # Order-related Zod schemas
    ├── supplier.validation.ts         # Supplier-related Zod schemas
    ├── stock-entry.validation.ts      # Stock Entry-related Zod schemas
    └── dashboard.validation.ts        # Dashboard period filter schemas

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
- **Product**: Products with slug, price, stock, reservedStock, category relation
- **Supplier**: Product suppliers (name, email, phone, address)
- **StockEntry**: Stock purchases from suppliers with quantity, unitCost, remainingQty, purchaseDate
- **Order**: Orders with shop, status, total amount
- **OrderItem**: Order items with product, quantity, price, margin tracking (totalCost, totalMargin, avgMarginRate)
- **OrderItemStockEntry**: Join table tracking which stock entries were used for each order item, with per-allocation margin calculations

All tables use `uuid(7)` for IDs and are mapped to lowercase snake_case names.

### Order Statuses

Orders support four statuses:
- `PENDING` - Initial state, stock reserved but not yet allocated
- `PROCESSING` - Order accepted, stock allocated from specific suppliers, stock entries deducted
- `COMPLETED` - Order fulfilled
- `CANCELLED` - Order cancelled, stock restored (can cancel from PENDING or PROCESSING)

### Stock Management System

**Product Stock Levels:**
- `stock` - Actual available stock (already excludes reserved quantities)
- `reservedStock` - Stock held for pending/processing orders

**Stock Entry Tracking:**
- `StockEntry` tracks purchases from suppliers with `remainingQty` for FIFO allocation
- When an order is accepted, admin manually allocates which stock entries to use
- `OrderItemStockEntry` tracks which stock entries were used for each order item

**Stock Flow:**

| Stage | Product.stock | Product.reservedStock | StockEntry.remainingQty |
|-------|---------------|----------------------|-------------------------|
| Create Order | `-` | `+` | (unchanged) |
| Accept Order | (no change) | `-` | `-` |
| Cancel (PENDING) | `+` | `-` | (unchanged) |
| Cancel (PROCESSING) | `+` | (no change) | `+` |
| Complete Order | (no change) | (no change) | (unchanged) |

**Frontend Benefit:** `Product.stock` directly shows available stock - no calculation needed.

### Margin Tracking

When an order is accepted:
1. Admin allocates stock from specific `StockEntry` records
2. `OrderItemStockEntry` records are created with per-allocation margin data:
   - `unitCost` - Cost from stock entry
   - `unitPrice` - Selling price from order item
   - `marginAmount` - (unitPrice - unitCost) × quantity
   - `marginRate` - ((unitPrice - unitCost) / unitPrice) × 100
3. `OrderItem` gets aggregated totals:
   - `totalCost` - Sum of all allocation costs
   - `totalMargin` - Sum of all margin amounts
   - `avgMarginRate` - Weighted average margin rate

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

| Role | Product | Category | Shop | Order | Supplier | StockEntry | Dashboard |
|------|---------|----------|-------|-------|----------|------------|-----------|
| Admin | create, read, update, delete | create, read, update, delete | create, read, update, delete | create, read, update, delete | create, read, update, delete | create, read, delete | read, revalidate |
| User | read | read | read | - | - | - | - |
| Sales | read | read | read | create, read, update, delete | read | read | - |

Use `requirePermission({ resource: ["action"] })` in route handlers to enforce permissions.

### Order Endpoints

**List & Create:**
- `GET /orders` - List all orders with pagination, filters (status, shopId)
- `POST /orders` - Create new PENDING order (reserves stock, checks availability)

**Order Details:**
- `GET /orders/:id` - Get order by ID with items and margin data

**Order Status Changes:**
- `PUT /orders/:id/accept` - Accept PENDING order → PROCESSING
  - Allocates stock from specific StockEntry records (manual selection)
  - Creates OrderItemStockEntry records with margin calculations
  - Deducts from Product.reservedStock and StockEntry.remainingQty
- `PUT /orders/:id/complete` - Complete PROCESSING order → COMPLETED
  - No stock changes (already done during accept)
- `PUT /orders/:id/cancel` - Cancel order → CANCELLED
  - If PENDING: restores Product.stock, releases Product.reservedStock
  - If PROCESSING: restores Product.stock and StockEntry.remainingQty

### Dashboard Endpoints

**Admin-only endpoints** for analytics and reporting. All endpoints support period filtering via query parameters:

**Period Filter Parameters:**
- `period=daily` - Filter by specific day. Optional: `date=YYYY-MM-DD` (defaults to today)
- `period=monthly` - Filter by month. Optional: `month=1-12&year=YYYY` (defaults to current month)
- `period=yearly` - Filter by year. Optional: `year=YYYY` (defaults to current year)

**Available Endpoints:**
- `GET /dashboard/user` - Total users created in period
  - Response: `{ totalUsers: number }`

- `GET /dashboard/sales` - Sales revenue and order count
  - Response: `{ totalRevenue: number, orderCount: number }`
  - Only includes COMPLETED orders

- `GET /dashboard/orders` - Order count by status
  - Response: `{ PENDING: number, PROCESSING: number, COMPLETED: number, CANCELLED: number }`

- `GET /dashboard/gross-profit` - Margin breakdown
  - Response: `{ totalCost: number, totalRevenue: number, totalMargin: number, profitPercentage: number }`
  - Only includes PROCESSING and COMPLETED orders

- `GET /dashboard/total-avg-margin` - Weighted average margin rate
  - Response: `{ avgMarginRate: number }`
  - Calculated as: (totalMargin / totalRevenue) × 100

- `GET /dashboard/shops` - Shops ranked by revenue
  - Response: Array of `{ id, name, createdAt, orderCount, totalRevenue }`
  - Sorted by totalRevenue descending

- `GET /dashboard/product-left-value` - Current stock value
  - Response: `{ totalStockValue: number, products: [...] }`
  - Not period-filtered (shows current state)

- `POST /dashboard/revalidate` - Revalidate all dashboard cache
  - Response: `{ revalidated: true }`
  - Admin-only, clears all dashboard cache tags for fresh data

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

## Custom Agents

This project uses custom specialist agents defined in `.claude/agents/` to handle different aspects of development.

### Project Manager Agent

**Location**: `.claude/agents/project-manager.md`

**When to use**: For complex, multi-disciplinary features that require coordination across multiple specialists.

**How it works**:
1. Analyzes requirements and breaks them down
2. Identifies which specialist agents are needed
3. Delegates tasks to appropriate specialists
4. Compiles 2-3 implementation options with pros/cons
5. Presents options for approval before implementation

**Available specialists**:
- **Backend Logic Engineer** (`backend-logic-engineer.md`): Business logic, workflows, order processing, validations
- **Database Engineer** (`database-engineer.md`): Schema design, Prisma models, migrations, query optimization
- **API Integration Engineer** (`api-integration-engineer.md`): External APIs, webhooks, third-party integrations
- **Security & Auth Engineer** (`security-auth-engineer.md`): Authentication, authorization, permissions, security

**Launch example**:
```bash
# Launch the Project Manager agent for a new feature
# It will coordinate the appropriate specialists
```

### Using Specialist Agents Directly

For focused tasks within a single domain, you can launch specialist agents directly:

| Agent | Use Case |
|-------|----------|
| Backend Logic Engineer | New endpoints, business rules, workflows |
| Database Engineer | Schema changes, migrations, query optimization |
| API Integration Engineer | Payment gateways, shipping APIs, webhooks |
| Security & Auth Engineer | Auth flows, RBAC, security middleware |

**When to use Project Manager vs. Direct Specialist**:
- **Use Project Manager**: Complex features touching multiple domains (e.g., "add payment processing with webhooks")
- **Use Direct Specialist**: Focused tasks within one domain (e.g., "add a new API endpoint for products")
