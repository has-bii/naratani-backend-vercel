import { handleApiError, requirePermission, successResponse } from "@/lib/api-utils"
import { UserRole } from "@/generated/prisma/enums"
import prisma from "@/lib/prisma"
import { salesPerformanceFilterSchema } from "@/validations/sales-performance.validation"
import { NextRequest } from "next/server"

/**
 * GET /api/sales-performance/leaderboard
 *
 * Get sales leaderboard ranking by revenue.
 *
 * Query params:
 * - No params: all-time leaderboard
 * - month=1&year=2026: specific month leaderboard
 *
 * Permissions: sales, admin
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requirePermission({ "sales-performance": ["read"] })

    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get("month")
    const yearParam = searchParams.get("year")

    const filters = salesPerformanceFilterSchema.parse({
      month: monthParam,
      year: yearParam,
    })

    const currentUserId = session.user.id

    // Build date filter
    let startDate: Date | undefined
    let endDate: Date

    if (filters.month !== undefined && filters.year !== undefined) {
      // Specific month
      startDate = new Date(filters.year, filters.month - 1, 1)
      endDate = new Date(filters.year, filters.month, 1) // First day of next month
    } else {
      // All-time: no start date filter
      endDate = new Date()
    }

    // Get all sales users with their order stats
    const salesUsers = await prisma.user.findMany({
      where: {
        role: UserRole.sales,
        banned: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        orders: {
          where: {
            ...(startDate && {
              createdAt: {
                gte: startDate,
                lt: endDate,
              },
            }),
            ...(startDate === undefined && {
              createdAt: {
                lt: endDate,
              },
            }),
          },
          select: {
            totalAmount: true,
            status: true,
          },
        },
      },
    })

    // Calculate metrics for each sales person
    const leaderboard = salesUsers
      .map((user) => {
        const revenue = user.orders.reduce((sum, order) => sum + order.totalAmount, 0)
        const orderCount = user.orders.length
        const completedOrders = user.orders.filter((o) => o.status === "COMPLETED").length

        return {
          userId: user.id,
          name: user.name,
          email: user.email,
          totalRevenue: revenue,
          orderCount,
          completedOrders,
          completionRate: orderCount > 0 ? (completedOrders / orderCount) * 100 : 0,
        }
      })
      .filter((item) => item.orderCount > 0) // Only include users with orders
      .sort((a, b) => b.totalRevenue - a.totalRevenue) // Sort by revenue descending
      .map((item, index) => ({
        ...item,
        rank: index + 1,
        completionRate: Math.round(item.completionRate * 10) / 10, // Round to 1 decimal
      }))

    // Find current user's position
    const currentUserRank = leaderboard.find((item) => item.userId === currentUserId)

    const period =
      filters.month !== undefined && filters.year !== undefined
        ? { type: "monthly" as const, month: filters.month, year: filters.year }
        : { type: "all-time" as const }

    return successResponse({
      leaderboard,
      currentUser: currentUserRank || null,
      period,
    })
  } catch (error) {
    return handleApiError(error, "GET /sales-performance/leaderboard")
  }
}
