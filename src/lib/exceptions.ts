import { NextResponse } from "next/server"

export class HttpException extends Error {
  public readonly code: string
  public readonly status: number

  constructor(message: string, code: string, status: number) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.status = status
    Error.captureStackTrace(this, this.constructor)
  }

  toResponse() {
    return NextResponse.json(
      {
        data: null,
        message: this.message,
        error: {
          code: this.code,
        },
      },
      { status: this.status },
    )
  }
}

export class InternalServerException extends HttpException {
  constructor(message: string = "Internal server error", code: string = "INTERNAL_SERVER_ERROR") {
    super(message, code, 500)
  }
}

export class UnauthorizedException extends HttpException {
  constructor(message: string = "You are not authenticated", code: string = "UNAUTHORIZED") {
    super(message, code, 401)
  }
}

export class ForbiddenException extends HttpException {
  constructor(message: string = "You don't have permission to access", code: string = "FORBIDDEN") {
    super(message, code, 403)
  }
}

export class NotFoundException extends HttpException {
  constructor(message: string = "Resource not found", code: string = "NOT_FOUND") {
    super(message, code, 404)
  }
}

export class BadRequestException extends HttpException {
  constructor(message: string = "Bad request", code: string = "BAD_REQUEST") {
    super(message, code, 400)
  }
}

export class ConflictException extends HttpException {
  constructor(message: string = "Resource already exists", code: string = "CONFLICT") {
    super(message, code, 409)
  }
}

export class ValidationException extends HttpException {
  constructor(public errors: unknown, message: string = "Validation error", code: string = "VALIDATION_ERROR") {
    super(message, code, 400)
  }

  override toResponse() {
    return NextResponse.json(
      {
        data: null,
        message: this.message,
        error: this.errors,
      },
      { status: this.status },
    ) as ReturnType<HttpException["toResponse"]>
  }
}
