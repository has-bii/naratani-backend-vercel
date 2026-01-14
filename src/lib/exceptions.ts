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
  constructor(message: string = "Terjadi kesalahan pada server", code: string = "INTERNAL_SERVER_ERROR") {
    super(message, code, 500)
  }
}

export class UnauthorizedException extends HttpException {
  constructor(message: string = "Anda belum diautentikasi", code: string = "UNAUTHORIZED") {
    super(message, code, 401)
  }
}

export class ForbiddenException extends HttpException {
  constructor(message: string = "Anda tidak memiliki izin untuk mengakses", code: string = "FORBIDDEN") {
    super(message, code, 403)
  }
}

export class NotFoundException extends HttpException {
  constructor(message: string = "Sumber daya tidak ditemukan", code: string = "NOT_FOUND") {
    super(message, code, 404)
  }
}

export class BadRequestException extends HttpException {
  constructor(message: string = "Permintaan tidak valid", code: string = "BAD_REQUEST") {
    super(message, code, 400)
  }
}

export class ConflictException extends HttpException {
  constructor(message: string = "Sumber daya sudah ada", code: string = "CONFLICT") {
    super(message, code, 409)
  }
}

export class ValidationException extends HttpException {
  constructor(public errors: unknown, message: string = "Validasi gagal", code: string = "VALIDATION_ERROR") {
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
