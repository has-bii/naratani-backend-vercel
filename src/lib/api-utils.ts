import { UserRole } from "@/generated/prisma/enums"
import { auth } from "@/lib/auth"
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  InternalServerException,
  UnauthorizedException,
} from "@/lib/exceptions"
import { headers } from "next/headers"
import { NextResponse } from "next/server"
import z, { ZodError } from "zod"

export type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>

export async function getSession() {
  const data = await auth.api.getSession({
    headers: await headers(),
  })

  return data
}

export async function requireAuth() {
  const session = await getSession()

  if (!session) {
    throw new UnauthorizedException()
  }

  return session
}

export async function requirePermission(permission: Record<string, string[]>) {
  const currentSession = await getSession()

  if (!currentSession) {
    throw new UnauthorizedException()
  }

  const hasPermission = await auth.api.userHasPermission({
    body: {
      role: currentSession.user.role as UserRole,
      permission,
    },
  })

  if (!hasPermission?.success) {
    throw new ForbiddenException()
  }

  return currentSession
}

export function successResponse(data: unknown, message = "ok", status = 200) {
  return NextResponse.json(
    {
      data,
      message,
      error: null,
    },
    { status },
  )
}

export function createdResponse(data: unknown, message = "Resource created successfully") {
  return NextResponse.json(
    {
      data,
      message,
      error: null,
    },
    { status: 201 },
  )
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export function getPaginationInfo(page: number, limit: number, total: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: (page + 1) * limit < total,
    hasPrev: page > 0,
  }
}

export function handleApiError(error: unknown, path: string) {
  if (error instanceof HttpException) return error.toResponse()

  if (error instanceof ZodError) {
    return new BadRequestException(z.prettifyError(error), "VALIDATION_ERROR").toResponse()
  }

  console.error(`Unhandled error on ${path}`, error)
  return new InternalServerException().toResponse()
}
