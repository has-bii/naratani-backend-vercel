import { cacheLife, cacheTag } from "next/cache"
import { handleApiError, requirePermission, successResponse } from "@/lib/api-utils"
import { getDateRangeFromQuery, dashboardPeriodSchema } from "@/validations/dashboard.validation"
import prisma from "@/lib/prisma"

// Cached data fetcher function
async function getShopsByRevenue(startDate: Date, endDate: Date) {
  "use cache"
  cacheLife("hours")
  cacheTag("dashboard-shops", "dashboard-sales")

  // Get shops ranked by their total order revenue
  const shopsByRevenue = await prisma.shop.findMany({
    select: {
      id: true,
      name: true,
      createdAt: true,
      _count: {
        select: {
          orders: {
            where: {
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            },
          },
        },
      },
      orders: {
        where: {
          status: "COMPLETED",
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          totalAmount: true,
        },
      },
    },
    orderBy: {
      orders: {
        _count: "desc",
      },
    },
  })

  // Calculate total revenue per shop
  const shopsWithRevenue = shopsByRevenue.map((shop) => {
    const totalRevenue = shop.orders.reduce((sum, order) => sum + order.totalAmount, 0)
    return {
      id: shop.id,
      name: shop.name,
      createdAt: shop.createdAt,
      orderCount: shop._count.orders,
      totalRevenue,
    }
  })

  // Sort by revenue descending
  shopsWithRevenue.sort((a, b) => b.totalRevenue - a.totalRevenue)

  return shopsWithRevenue
}

export async function GET(request: Request) {
  try {
    await requirePermission({ dashboard: ["read"] })

    const { searchParams } = new URL(request.url)
    const query = Object.fromEntries(searchParams.entries())
    const validatedQuery = dashboardPeriodSchema.parse(query)

    const { startDate, endDate } = getDateRangeFromQuery(validatedQuery)

    const data = await getShopsByRevenue(startDate, endDate)

    return successResponse(data)
  } catch (error) {
    return handleApiError(error, "GET /dashboard/shops")
  }
}
