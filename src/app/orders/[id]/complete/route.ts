import { handleApiError, requirePermission, successResponse } from "@/lib/api-utils"
import { BadRequestException, NotFoundException } from "@/lib/exceptions"
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

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission({ order: ["update"] })

    const { id } = await params
    const existingOrder = await findOrder(id)

    // Only allow completing processing orders
    if (existingOrder.status !== "PROCESSING") {
      return new BadRequestException("Hanya pesanan dengan status PROCESSING yang dapat diselesaikan").toResponse()
    }

    // Complete order in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update order status to COMPLETED
      const order = await tx.order.update({
        where: { id },
        data: { status: "COMPLETED" },
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

      return order
    })

    return successResponse(result, "Pesanan berhasil diselesaikan")
  } catch (error) {
    return handleApiError(error, "PUT /orders/[id]/complete")
  }
}
