import z from "zod"

export const createStockEntrySchema = z.object({
  productId: z.uuid("Product ID tidak valid"),
  supplierId: z.uuid("Supplier ID tidak valid"),
  quantity: z.number().int("Jumlah harus bilangan bulat").positive("Jumlah harus lebih dari 0"),
  unitCost: z
    .number()
    .int("Harga satuan harus bilangan bulat")
    .positive("Harga satuan harus lebih dari 0"),
  notes: z.string().max(500, "Catatan terlalu panjang").optional().nullable(),
})

export const getStockEntryQuerySchema = z.object({
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  productId: z.uuid().optional(),
  supplierId: z.uuid().optional(),
  hasStock: z
    .string()
    .optional()
    .transform((val) => (val ? val === "true" : undefined)),
})

export type CreateStockEntryInput = z.infer<typeof createStockEntrySchema>
export type GetStockEntryQueryInput = z.infer<typeof getStockEntryQuerySchema>
