import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

/**
 * Cron Job: Cleanup expired sessions
 * Schedule: Run daily via Vercel Cron
 *
 * Expected headers:
 * - x-vercel-cron: Required for Vercel Cron authentication
 * - x-vercel-cron-secret: Optional secret for additional security
 */
export async function GET(request: Request) {
  try {
    // Verify this is a Vercel Cron job request
    const cronHeader = request.headers.get("x-vercel-cron")
    if (!cronHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Optional: Verify cron secret for additional security
    const cronSecret = request.headers.get("x-vercel-cron-secret")
    if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Delete expired sessions
    const result = await prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    })

    return NextResponse.json({
      success: true,
      deleted: result.count,
      message: `Cleaned up ${result.count} expired session(s)`,
    })
  } catch (error) {
    console.error("Session cleanup error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to cleanup sessions",
      },
      { status: 500 }
    )
  }
}

// Vercel Cron configuration
// This route should be configured in vercel.json with:
// {
//   "crons": [{
//     "path": "/api/cron/cleanup-sessions",
//     "schedule": "0 2 * * *"  // Run daily at 2 AM UTC
//   }]
// }
