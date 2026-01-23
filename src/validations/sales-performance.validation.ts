import z from "zod"

/**
 * Query parameters for sales performance filtering
 * - No params: all-time performance (from user's createdAt)
 * - month + year: specific month
 */
export const salesPerformanceFilterSchema = z.object({
  month: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .pipe(z.number().int().min(1).max(12).optional()),
  year: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .pipe(z.number().int().min(2000).max(2100).optional()),
})

export type SalesPerformanceFilter = z.infer<typeof salesPerformanceFilterSchema>
