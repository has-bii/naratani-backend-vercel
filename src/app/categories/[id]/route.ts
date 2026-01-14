import { handleApiError, requirePermission, successResponse } from "@/lib/api-utils"
import { ConflictException, NotFoundException } from "@/lib/exceptions"
import prisma from "@/lib/prisma"
import { updateCategorySchema } from "@/validations/category.validation"

async function findCategory(id: string) {
  const category = await prisma.productCategory.findUnique({
    where: { id },
  })

  if (!category) {
    throw new NotFoundException("Kategori tidak ditemukan")
  }

  return category
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission({ category: ["read"] })

    const { id } = await params
    const category = await findCategory(id)

    return successResponse(category)
  } catch (error) {
    return handleApiError(error, "GET /categories/[id]")
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission({ category: ["update"] })

    const { id } = await params
    await findCategory(id)

    const body = await request.json()
    const validatedData = updateCategorySchema.parse(body)

    const category = await prisma.productCategory.update({
      where: { id },
      data: validatedData,
    })

    return successResponse(category, "Kategori berhasil diperbarui")
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2002") {
      return new ConflictException("Kategori dengan nama ini sudah ada").toResponse()
    }
    return handleApiError(error, "PUT /categories/[id]")
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission({ category: ["delete"] })

    const { id } = await params
    await findCategory(id)

    await prisma.productCategory.delete({
      where: { id },
    })

    return successResponse(null, "Kategori berhasil dihapus")
  } catch (error) {
    return handleApiError(error, "DELETE /categories/[id]")
  }
}
