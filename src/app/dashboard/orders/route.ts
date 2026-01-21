import { cacheLife, cacheTag } from "next/cache"
import { handleApiError, requirePermission, successResponse } from "@/lib/api-utils"
import { getDateRangeFromQuery, dashboardPeriodSchema } from "@/validations/dashboard.validation"
import prisma from "@/lib/prisma"

// Cached data fetcher function
async function getOrdersByStatus(startDate: Date, endDate: Date) {
  "use cache"
  cacheLife("hours")
  cacheTag("dashboard-orders")

  const ordersByStatus = await prisma.order.groupBy({
    by: ["status"],
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    _count: {
      id: true,
    },
  })

  const result = {
    PENDING: 0,
    PROCESSING: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  }

  for (const item of ordersByStatus) {
    result[item.status] = item._count.id
  }

  return result
}

export async function GET(request: Request) {
  try {
    await requirePermission({ dashboard: ["read"] })

    const { searchParams } = new URL(request.url)
    const query = Object.fromEntries(searchParams.entries())
    const validatedQuery = dashboardPeriodSchema.parse(query)

    const { startDate, endDate } = getDateRangeFromQuery(validatedQuery)

    const data = await getOrdersByStatus(startDate, endDate)

    return successResponse(data)
  } catch (error) {
    return handleApiError(error, "GET /dashboard/orders")
  }
}
