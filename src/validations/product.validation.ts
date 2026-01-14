import z from "zod"

export const createProductSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  price: z.number().int().min(0, "Price must be non-negative").default(0),
  stock: z.number().int().min(0, "Stock must be non-negative").default(0),
  categoryId: z.uuid("Invalid category ID").optional(),
})

export const updateProductSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(255, "Name too long").optional(),
    price: z.number().int().min(0, "Price must be non-negative").optional(),
    stock: z.number().int().min(0, "Stock must be non-negative").optional(),
    categoryId: z.uuid("Invalid category ID").optional().nullable(),
  })
  .partial()

export const getProductQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 0)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10)),
  sortBy: z
    .enum(["id", "name", "price", "stock", "createdAt", "updatedAt"])
    .optional()
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  category: z.uuid("Invalid category ID").optional(),
  search: z.string().optional(),
  minPrice: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined)),
  maxPrice: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined)),
  inStock: z
    .string()
    .optional()
    .transform((val) => val === "true"),
})

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type GetProductQuery = z.infer<typeof getProductQuerySchema>
