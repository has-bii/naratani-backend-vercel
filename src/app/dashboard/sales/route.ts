import { cacheLife, cacheTag } from "next/cache"
import { handleApiError, requirePermission, successResponse } from "@/lib/api-utils"
import { getDateRangeFromQuery, dashboardPeriodSchema } from "@/validations/dashboard.validation"
import prisma from "@/lib/prisma"

// Cached data fetcher function
async function getSalesData(startDate: Date, endDate: Date) {
  "use cache"
  cacheLife("hours")
  cacheTag("dashboard-sales")

  const [totalRevenueResult, orderCount] = await Promise.all([
    prisma.order.aggregate({
      where: {
        status: "COMPLETED",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        totalAmount: true,
      },
    }),
    prisma.order.count({
      where: {
        status: "COMPLETED",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    }),
  ])

  const totalRevenue = totalRevenueResult._sum.totalAmount || 0

  return { totalRevenue, orderCount }
}

export async function GET(request: Request) {
  try {
    await requirePermission({ dashboard: ["read"] })

    const { searchParams } = new URL(request.url)
    const query = Object.fromEntries(searchParams.entries())
    const validatedQuery = dashboardPeriodSchema.parse(query)

    const { startDate, endDate } = getDateRangeFromQuery(validatedQuery)

    const data = await getSalesData(startDate, endDate)

    return successResponse(data)
  } catch (error) {
    return handleApiError(error, "GET /dashboard/sales")
  }
}
