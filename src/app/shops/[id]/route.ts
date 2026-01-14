import { requirePermission, successResponse, withErrorHandler } from "@/lib/api-utils"
import { ConflictException, NotFoundException } from "@/lib/exceptions"
import prisma from "@/lib/prisma"
import { updateShopSchema } from "@/validations/shop.validation"

async function findShop(id: string) {
  const shop = await prisma.shop.findUnique({
    where: { id },
  })

  if (!shop) {
    throw new NotFoundException("Shop not found")
  }

  return shop
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandler(async () => {
    await requirePermission({ shop: ["read"] })

    const { id } = await params
    const shop = await findShop(id)

    return successResponse(shop)
  })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandler(async () => {
    await requirePermission({ shop: ["update"] })

    const { id } = await params
    await findShop(id)

    const body = await request.json()
    const validatedData = updateShopSchema.parse(body)

    try {
      const shop = await prisma.shop.update({
        where: { id },
        data: validatedData,
      })

      return successResponse(shop, "Shop updated successfully")
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "P2002") {
        throw new ConflictException("Shop with this name already exists")
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
    await requirePermission({ shop: ["delete"] })

    const { id } = await params
    await findShop(id)

    await prisma.shop.delete({
      where: { id },
    })

    return successResponse(null, "Shop deleted successfully")
  })
}
