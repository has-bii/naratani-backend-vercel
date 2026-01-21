import { cacheLife, cacheTag } from "next/cache"
import { handleApiError, requirePermission, successResponse } from "@/lib/api-utils"
import { getDateRangeFromQuery, dashboardPeriodSchema } from "@/validations/dashboard.validation"
import prisma from "@/lib/prisma"

// Cached data fetcher function
async function getGrossProfitData(startDate: Date, endDate: Date) {
  "use cache"
  cacheLife("hours")
  cacheTag("dashboard-gross-profit", "dashboard-sales", "dashboard-avg-margin")

  // Get margin data from OrderItems (only PROCESSING and COMPLETED orders have margin data)
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
        totalCost: true,
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

  const totalCost = marginData._sum.totalCost || 0
  const totalMargin = marginData._sum.totalMargin || 0
  const totalRevenue = revenueData._sum.totalAmount || 0

  // Calculate profit percentage
  const profitPercentage = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0

  return {
    totalCost,
    totalRevenue,
    totalMargin,
    profitPercentage: Math.round(profitPercentage * 100) / 100, // Round to 2 decimal places
  }
}

export async function GET(request: Request) {
  try {
    await requirePermission({ dashboard: ["read"] })

    const { searchParams } = new URL(request.url)
    const query = Object.fromEntries(searchParams.entries())
    const validatedQuery = dashboardPeriodSchema.parse(query)

    const { startDate, endDate } = getDateRangeFromQuery(validatedQuery)

    const data = await getGrossProfitData(startDate, endDate)

    return successResponse(data)
  } catch (error) {
    return handleApiError(error, "GET /dashboard/gross-profit")
  }
}
