import z from "zod"

export const createProductSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(255, "Nama terlalu panjang"),
  price: z.number().int().min(0, "Harga tidak boleh negatif").default(0),
  stock: z.number().int().min(0, "Stok tidak boleh negatif").default(0),
  categoryId: z.uuid("ID kategori tidak valid").optional(),
})

export const updateProductSchema = z
  .object({
    name: z.string().min(1, "Nama wajib diisi").max(255, "Nama terlalu panjang").optional(),
    price: z.number().int().min(0, "Harga tidak boleh negatif").optional(),
    stock: z.number().int().min(0, "Stok tidak boleh negatif").optional(),
    categoryId: z.uuid("ID kategori tidak valid").optional().nullable(),
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
  category: z.uuid("ID kategori tidak valid").optional(),
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
    .transform((val) => (val ? val === "true" : undefined)),
})

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type GetProductQuery = z.infer<typeof getProductQuerySchema>
