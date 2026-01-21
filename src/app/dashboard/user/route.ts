import { cacheLife, cacheTag } from "next/cache"
import { handleApiError, requirePermission, successResponse } from "@/lib/api-utils"
import { getDateRangeFromQuery, dashboardPeriodSchema } from "@/validations/dashboard.validation"
import prisma from "@/lib/prisma"

// Cached data fetcher function
async function getUserCount(startDate: Date, endDate: Date) {
  "use cache"
  cacheLife("hours")
  cacheTag("dashboard-user")

  const totalUsers = await prisma.user.count({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  })

  return { totalUsers }
}

export async function GET(request: Request) {
  try {
    await requirePermission({ dashboard: ["read"] })

    const { searchParams } = new URL(request.url)
    const query = Object.fromEntries(searchParams.entries())
    const validatedQuery = dashboardPeriodSchema.parse(query)

    const { startDate, endDate } = getDateRangeFromQuery(validatedQuery)

    const data = await getUserCount(startDate, endDate)

    return successResponse(data)
  } catch (error) {
    return handleApiError(error, "GET /dashboard/user")
  }
}
