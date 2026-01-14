import z from "zod"

export const createCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
})

export const updateCategorySchema = z
  .object({
    name: z.string().min(1, "Name is required").max(255, "Name too long").optional(),
  })
  .partial()

export const getCategoryQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 0)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10)),
  sortBy: z.enum(["id", "name", "createdAt"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  search: z.string().optional(),
})

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
export type GetCategoryQuery = z.infer<typeof getCategoryQuerySchema>
