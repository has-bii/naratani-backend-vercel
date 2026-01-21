import { cacheLife, cacheTag } from "next/cache"

// Dashboard cache tags for on-demand revalidation
export const DASHBOARD_CACHE_TAGS = {
  USER: "dashboard-user",
  SALES: "dashboard-sales",
  ORDERS: "dashboard-orders",
  GROSS_PROFIT: "dashboard-gross-profit",
  AVG_MARGIN: "dashboard-avg-margin",
  SHOPS: "dashboard-shops",
  PRODUCT_VALUE: "dashboard-product-value",
} as const

/**
 * Cache configuration for dashboard endpoints.
 *
 * In Next.js 16, cacheLife() and cacheTag() must be called directly
 * inside a "use cache" function - they cannot be called at module level.
 *
 * Example pattern for dashboard data fetchers:
 * ```ts
 * async function getUserCount(startDate: Date, endDate: Date) {
 *   "use cache"
 *   cacheLife("hours")  // Must be called here, not at module level
 *   cacheTag(DASHBOARD_CACHE_TAGS.USER)
 *
 *   const count = await prisma.user.count({ ... })
 *   return count
 * }
 * ```
 */

/**
 * Revalidate all dashboard cache entries
 * Call this when orders are created/updated/completed/cancelled
 */
export async function revalidateAllDashboard() {
  const { revalidateTag } = await import("next/cache")
  const tags = Object.values(DASHBOARD_CACHE_TAGS)

  for (const tag of tags) {
    revalidateTag(tag, "max")
  }
}

/**
 * Revalidate specific dashboard cache entries
 */
export async function revalidateDashboardCache(...tags: string[]) {
  const { revalidateTag } = await import("next/cache")

  for (const tag of tags) {
    revalidateTag(tag, "max")
  }
}
