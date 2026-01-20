import { handleApiError, requirePermission, successResponse } from "@/lib/api-utils"
import { ConflictException, NotFoundException } from "@/lib/exceptions"
import prisma from "@/lib/prisma"
import { updateSupplierSchema } from "@/validations/supplier.validation"

async function findSupplier(id: string) {
  const supplier = await prisma.supplier.findUnique({
    where: { id },
  })

  if (!supplier) {
    throw new NotFoundException("Supplier tidak ditemukan")
  }

  return supplier
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission({ supplier: ["read"] })

    const { id } = await params
    const supplier = await findSupplier(id)

    return successResponse(supplier)
  } catch (error) {
    return handleApiError(error, "GET /suppliers/[id]")
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission({ supplier: ["update"] })

    const { id } = await params
    await findSupplier(id)

    const body = await request.json()
    const validatedData = updateSupplierSchema.parse(body)

    const supplier = await prisma.supplier.update({
      where: { id },
      data: validatedData,
    })

    return successResponse(supplier, "Supplier berhasil diperbarui")
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2002") {
      return new ConflictException("Supplier dengan nama ini sudah ada").toResponse()
    }
    return handleApiError(error, "PUT /suppliers/[id]")
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission({ supplier: ["delete"] })

    const { id } = await params
    await findSupplier(id)

    await prisma.supplier.delete({
      where: { id },
    })

    return successResponse(null, "Supplier berhasil dihapus")
  } catch (error) {
    return handleApiError(error, "DELETE /suppliers/[id]")
  }
}
