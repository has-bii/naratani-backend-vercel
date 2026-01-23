import { handleApiError, requirePermission, successResponse } from "@/lib/api-utils"
import prisma from "@/lib/prisma"
import { salesPerformanceFilterSchema } from "@/validations/sales-performance.validation"
import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/sales-performance/me
 *
 * Get current sales person's performance metrics.
 *
 * Query params:
 * - No params: all-time performance (from user's createdAt)
 * - month=1&year=2026: specific month performance
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

    const userId = session.user.id

    // Get user info with createdAt
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, createdAt: true },
    })

    if (!user) {
      return NextResponse.json({ error: "Not found", message: "User not found" }, { status: 404 })
    }

    // Build date filter
    let startDate: Date
    let endDate: Date

    if (filters.month !== undefined && filters.year !== undefined) {
      // Specific month
      startDate = new Date(filters.year, filters.month - 1, 1)
      endDate = new Date(filters.year, filters.month, 1) // First day of next month
    } else {
      // All-time: from user's createdAt
      startDate = user.createdAt
      endDate = new Date()
    }

    // Get order summary data
    const orders = await prisma.order.findMany({
      where: {
        createdBy: userId,
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        orderItems: {
          select: {
            totalCost: true,
            totalMargin: true,
            avgMarginRate: true,
          },
        },
      },
    })

    // Calculate metrics
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0)
    const orderCount = orders.length
    const completedOrders = orders.filter((o) => o.status === "COMPLETED").length
    const completionRate = orderCount > 0 ? (completedOrders / orderCount) * 100 : 0
    const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0

    // Status breakdown
    const statusBreakdown = {
      PENDING: orders.filter((o) => o.status === "PENDING").length,
      PROCESSING: orders.filter((o) => o.status === "PROCESSING").length,
      COMPLETED: orders.filter((o) => o.status === "COMPLETED").length,
      CANCELLED: orders.filter((o) => o.status === "CANCELLED").length,
    }

    // Margin metrics (only from orders with cost data)
    const ordersWithMargin = orders.filter((o) => o.orderItems.some((i) => i.totalCost !== null))
    const totalMargin = ordersWithMargin.reduce((sum, order) => {
      return sum + order.orderItems.reduce((itemSum, item) => itemSum + (item.totalMargin || 0), 0)
    }, 0)

    // Calculate weighted average margin rate
    let weightedMarginRate = 0
    const ordersWithRevenue = ordersWithMargin.filter((o) => o.totalAmount > 0)
    if (ordersWithRevenue.length > 0) {
      let totalWeightedRate = 0
      ordersWithRevenue.forEach((order) => {
        const orderMargin = order.orderItems.reduce((sum, item) => sum + (item.totalMargin || 0), 0)
        const orderRate = (orderMargin / order.totalAmount) * 100
        totalWeightedRate += orderRate
      })
      weightedMarginRate = totalWeightedRate / ordersWithRevenue.length
    }

    const period =
      filters.month !== undefined && filters.year !== undefined
        ? { type: "monthly" as const, month: filters.month, year: filters.year }
        : { type: "all-time" as const, since: user.createdAt }

    return successResponse({
      user,
      summary: {
        totalRevenue,
        orderCount,
        completedOrders,
        completionRate: Math.round(completionRate * 10) / 10, // Round to 1 decimal
        averageOrderValue: Math.round(averageOrderValue),
      },
      statusBreakdown,
      marginMetrics: {
        totalMargin,
        avgMarginRate: Math.round(weightedMarginRate * 10) / 10, // Round to 1 decimal
      },
      period,
    })
  } catch (error) {
    console.log(error)
    return handleApiError(error, "GET /sales-performance/me")
  }
}
