import { cacheLife, cacheTag } from "next/cache"
import { handleApiError, requirePermission, successResponse } from "@/lib/api-utils"
import { getDateRangeFromQuery, dashboardPeriodSchema } from "@/validations/dashboard.validation"
import prisma from "@/lib/prisma"

// Cached data fetcher function
async function getAvgMarginData(startDate: Date, endDate: Date) {
  "use cache"
  cacheLife("hours")
  cacheTag("dashboard-avg-margin", "dashboard-sales", "dashboard-gross-profit")

  // Get total margin and total revenue from OrderItems
  const [marginData, revenueData] = await Promise.all([
    prisma.orderItem.aggregate({
      where: {
        order: {
          status: {
            in: ["PROCESSING", "COMPLETED"],
          },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      _sum: {
        totalMargin: true,
      },
    }),
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
  ])

  const totalMargin = marginData._sum.totalMargin || 0
  const totalRevenue = revenueData._sum.totalAmount || 0

  // Weighted average margin rate = (totalMargin / totalRevenue) * 100
  const avgMarginRate = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0

  return {
    avgMarginRate: Math.round(avgMarginRate * 100) / 100, // Round to 2 decimal places
  }
}

export async function GET(request: Request) {
  try {
    await requirePermission({ dashboard: ["read"] })

    const { searchParams } = new URL(request.url)
    const query = Object.fromEntries(searchParams.entries())
    const validatedQuery = dashboardPeriodSchema.parse(query)

    const { startDate, endDate } = getDateRangeFromQuery(validatedQuery)

    const data = await getAvgMarginData(startDate, endDate)

    return successResponse(data)
  } catch (error) {
    return handleApiError(error, "GET /dashboard/total-avg-margin")
  }
}
