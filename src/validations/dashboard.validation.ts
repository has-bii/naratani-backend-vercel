import z from "zod"

export const periodEnum = z.enum(["daily", "monthly", "yearly"])

// Daily: period=daily&date=2025-01-21
// Monthly: period=monthly&month=1&year=2025
// Yearly: period=yearly&year=2025
export const dashboardPeriodSchema = z.object({
  period: periodEnum,
  date: z.string().optional(),
  month: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .pipe(z.number().int().min(1).max(12).optional()),
  year: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .pipe(z.number().int().min(2000).max(2100).optional()),
})

export type DashboardPeriodInput = z.infer<typeof dashboardPeriodSchema>

/**
 * Helper function to get date range from period query
 */
export function getDateRangeFromQuery(input: DashboardPeriodInput): { startDate: Date; endDate: Date } {
  const now = new Date()
  const year = input.year ?? now.getFullYear()
  const month = input.month ?? now.getMonth() + 1

  if (input.period === "daily") {
    if (input.date) {
      const date = new Date(input.date)
      return {
        startDate: new Date(date.setHours(0, 0, 0, 0)),
        endDate: new Date(date.setHours(23, 59, 59, 999)),
      }
    }
    // Default to today
    return {
      startDate: new Date(now.setHours(0, 0, 0, 0)),
      endDate: new Date(now.setHours(23, 59, 59, 999)),
    }
  }

  if (input.period === "monthly") {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59, 999)
    return { startDate, endDate }
  }

  // Yearly
  const startDate = new Date(year, 0, 1)
  const endDate = new Date(year, 11, 31, 23, 59, 59, 999)
  return { startDate, endDate }
}
