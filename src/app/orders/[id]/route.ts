import { handleApiError, requirePermission, successResponse } from "@/lib/api-utils"
import { NotFoundException } from "@/lib/exceptions"
import prisma from "@/lib/prisma"

async function findOrder(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      shop: {
        select: { id: true, name: true },
      },
      creator: {
        select: { id: true, name: true, email: true, role: true },
      },
      orderItems: {
        include: {
          product: {
            select: { id: true, name: true, price: true },
          },
        },
      },
    },
  })

  if (!order) {
    throw new NotFoundException("Pesanan tidak ditemukan")
  }

  return order
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission({ order: ["read"] })

    const { id } = await params
    const order = await findOrder(id)

    return successResponse(order)
  } catch (error) {
    return handleApiError(error, "GET /orders/[id]")
  }
}
