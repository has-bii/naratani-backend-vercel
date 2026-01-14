import z from "zod"

export const orderItemSchema = z.object({
  productId: z.uuid("ID produk tidak valid"),
  quantity: z.int().positive("Jumlah harus lebih dari 0"),
})

export const createOrderSchema = z.object({
  shopId: z.uuid("ID toko tidak valid"),
  items: z.array(orderItemSchema).min(1, "Pesanan harus memiliki minimal 1 item"),
})

export const updateOrderSchema = z
  .object({
    status: z.enum(["PENDING", "COMPLETED", "CANCELLED"], {
      errorMap: () => ({ message: "Status tidak valid" }),
    }),
  })
  .partial()

export const getOrderQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 0)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10)),
  sortBy: z
    .enum(["id", "status", "totalAmount", "createdAt", "updatedAt"])
    .optional()
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  status: z.enum(["PENDING", "COMPLETED", "CANCELLED"]).optional(),
  shopId: z.uuid("ID toko tidak valid").optional(),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>
export type GetOrderQuery = z.infer<typeof getOrderQuerySchema>
export type OrderItemInput = z.infer<typeof orderItemSchema>
