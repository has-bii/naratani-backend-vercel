import z from "zod"

export const createShopSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
})

export const updateShopSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(255, "Name too long").optional(),
  })
  .partial()

export const getShopQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 0)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10)),
  sortBy: z.enum(["id", "name", "createdAt", "updatedAt"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  search: z.string().optional(),
})

export type CreateShopInput = z.infer<typeof createShopSchema>
export type UpdateShopInput = z.infer<typeof updateShopSchema>
export type GetShopQuery = z.infer<typeof getShopQuerySchema>
