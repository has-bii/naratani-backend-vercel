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
│   ├── api/auth/[...all]/route.ts    # Better Auth catch-all handler
│   └── products/route.ts              # Product API endpoints
├── lib/
│   ├── auth.ts                        # Better Auth configuration
│   └── prisma.ts                      # Prisma client with pg adapter
├── utils/
│   └── password.ts                    # Argon2 hashing utilities
├── validations/                       # Zod schemas
└── generated/prisma/                  # Auto-generated Prisma client
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

## Adding New Features

1. **API Routes**: Add to `src/app/` following Next.js App Router conventions
2. **Database Models**: Modify `prisma/schema.prisma`, run `prisma migrate dev`
3. **Validation**: Add Zod schemas to `src/validations/`
4. **Auth Changes**: Modify `src/lib/auth.ts`

## Conventional Commit Style

This repository uses conventional commits. When using `/commit`:
- Format: `type(scope): description`
- Types: feat, fix, chore, docs, refactor, style, test, perf, ci
- Examples: `feat(auth): add OAuth login`, `fix(api): resolve race condition`
