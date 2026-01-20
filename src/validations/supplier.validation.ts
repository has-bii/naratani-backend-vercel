import z from "zod"

export const createSupplierSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(255, "Nama terlalu panjang"),
  email: z.email("Email tidak valid").optional().nullable(),
  phone: z.string().max(50, "Nomor telepon terlalu panjang").optional().nullable(),
  address: z.string().max(500, "Alamat terlalu panjang").optional().nullable(),
})

export const updateSupplierSchema = z
  .object({
    name: z.string().min(1, "Nama wajib diisi").max(255, "Nama terlalu panjang").optional(),
    email: z.email("Email tidak valid").optional().nullable(),
    phone: z.string().max(50, "Nomor telepon terlalu panjang").optional().nullable(),
    address: z.string().max(500, "Alamat terlalu panjang").optional().nullable(),
  })
  .partial()

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>
