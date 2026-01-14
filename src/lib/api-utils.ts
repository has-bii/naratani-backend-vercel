import { UserRole } from "@/generated/prisma/enums"
import { auth } from "@/lib/auth"
import {
  ForbiddenException,
  HttpException,
  InternalServerException,
  UnauthorizedException,
} from "@/lib/exceptions"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

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

export async function withErrorHandler<T>(handler: () => Promise<T>): Promise<T | NextResponse> {
  try {
    return await handler()
  } catch (error) {
    if (error instanceof HttpException) {
      return error.toResponse()
    }

    console.error("Unhandled error:", error)
    return new InternalServerException().toResponse()
  }
}
