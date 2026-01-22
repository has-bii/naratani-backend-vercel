import { NextRequest, NextResponse } from "next/server"

const allowedOrigins = [
  process.env.ADMIN_APP_ORIGIN,
  process.env.USER_APP_ORIGIN,
  process.env.SALES_APP_ORIGIN,
]

const corsOptions = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true",
}

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin") ?? ""
  const isAllowedOrigin = allowedOrigins.includes(origin)

  const isPreflight = request.method === "OPTIONS"

  if (isPreflight) {
    const preflightHeaders = {
      ...(isAllowedOrigin && { "Access-Control-Allow-Origin": origin }),
      ...corsOptions,
    }
    return NextResponse.json({}, { headers: preflightHeaders })
  }

  const response = NextResponse.next()

  if (isAllowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", origin)
  }

  Object.entries(corsOptions).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  return response
}

export const config = {
  matcher: "/:path*",
}
