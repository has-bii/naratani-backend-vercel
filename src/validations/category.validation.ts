import z from "zod"

export const createCategorySchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(255, "Nama terlalu panjang"),
})

export const updateCategorySchema = z
  .object({
    name: z.string().min(1, "Nama wajib diisi").max(255, "Nama terlalu panjang").optional(),
  })
  .partial()

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
