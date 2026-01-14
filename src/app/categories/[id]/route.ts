import { requirePermission, successResponse, withErrorHandler } from "@/lib/api-utils"
import { ConflictException, NotFoundException } from "@/lib/exceptions"
import prisma from "@/lib/prisma"
import { updateCategorySchema } from "@/validations/category.validation"

async function findCategory(id: string) {
  const category = await prisma.productCategory.findUnique({
    where: { id },
    include: {
      _count: {
        select: { products: true },
      },
    },
  })

  if (!category) {
    throw new NotFoundException("Category not found")
  }

  return category
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandler(async () => {
    await requirePermission({ category: ["read"] })

    const { id } = await params
    const category = await findCategory(id)

    return successResponse(category)
  })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandler(async () => {
    await requirePermission({ category: ["update"] })

    const { id } = await params
    await findCategory(id)

    const body = await request.json()
    const validatedData = updateCategorySchema.parse(body)

    try {
      const category = await prisma.productCategory.update({
        where: { id },
        data: validatedData,
        include: {
          _count: {
            select: { products: true },
          },
        },
      })

      return successResponse(category, "Category updated successfully")
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "P2002") {
        throw new ConflictException("Category with this name already exists")
      }
      throw error
    }
  })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return PUT(request, { params })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandler(async () => {
    await requirePermission({ category: ["delete"] })

    const { id } = await params
    await findCategory(id)

    await prisma.productCategory.delete({
      where: { id },
    })

    return successResponse(null, "Category deleted successfully")
  })
}
