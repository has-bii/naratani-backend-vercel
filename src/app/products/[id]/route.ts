import { requirePermission, successResponse, withErrorHandler } from "@/lib/api-utils"
import { ConflictException, NotFoundException } from "@/lib/exceptions"
import prisma from "@/lib/prisma"
import { slugify } from "@/utils/slugify"
import { updateProductSchema } from "@/validations/product.validation"

async function findProduct(id: string) {
  const product = await prisma.product.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
    },
    include: {
      category: {
        select: { id: true, name: true },
      },
    },
  })

  if (!product) {
    throw new NotFoundException("Product not found")
  }

  return product
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandler(async () => {
    await requirePermission({ product: ["read"] })

    const { id } = await params
    const product = await findProduct(id)

    return successResponse(product)
  })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandler(async () => {
    await requirePermission({ product: ["update"] })

    const { id } = await params
    const existingProduct = await findProduct(id)

    const body = await request.json()
    const validatedData = updateProductSchema.parse(body)

    try {
      const product = await prisma.product.update({
        where: { id: existingProduct.id },
        data: {
          ...validatedData,
          ...(validatedData.name && { slug: slugify(validatedData.name) }),
        },
        include: {
          category: {
            select: { id: true, name: true },
          },
        },
      })

      return successResponse(product, "Product updated successfully")
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "P2002") {
        throw new ConflictException("Product with this slug already exists")
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
    await requirePermission({ product: ["delete"] })

    const { id } = await params
    const existingProduct = await findProduct(id)

    await prisma.product.delete({
      where: { id: existingProduct.id },
    })

    return successResponse(null, "Product deleted successfully")
  })
}
