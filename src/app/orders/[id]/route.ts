import { getSession, handleApiError, requirePermission, successResponse } from "@/lib/api-utils"
import { BadRequestException, ForbiddenException, NotFoundException } from "@/lib/exceptions"
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

    const session = await getSession()
    const { id } = await params
    const order = await findOrder(id)

    // Calculate if order can be deleted
    const canDelete =
      (order.status === "PENDING" || order.status === "CANCELLED") &&
      (session?.user.role === "admin" || order.createdBy === session?.user.id)

    return successResponse({ ...order, canDelete })
  } catch (error) {
    return handleApiError(error, "GET /orders/[id]")
  }
}

async function findOrderForDelete(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
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

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission({ order: ["delete"] })

    const session = await getSession()
    const { id } = await params
    const order = await findOrderForDelete(id)

    // Validation 1: Status must be PENDING or CANCELLED
    if (order.status !== "PENDING" && order.status !== "CANCELLED") {
      return new BadRequestException("Hanya pesanan dengan status PENDING atau CANCELLED yang dapat dihapus").toResponse()
    }

    // Validation 2: Sales can only delete their own orders, Admin can delete any
    if (session?.user.role === "sales" && order.createdBy !== session.user.id) {
      return new ForbiddenException("Anda hanya dapat menghapus pesanan yang Anda buat").toResponse()
    }

    // Delete order in transaction
    await prisma.$transaction(async (tx) => {
      // For PENDING orders: restore product stock (release reserved stock)
      // For CANCELLED orders: stock already restored during cancel, skip stock updates
      if (order.status === "PENDING") {
        await Promise.all(
          order.orderItems.map((item) =>
            tx.product.update({
              where: { id: item.productId },
              data: {
                stock: { increment: item.quantity },
                reservedStock: { decrement: item.quantity },
              },
            })
          )
        )
      }

      // Delete order (Prisma will cascade delete orderItems)
      await tx.order.delete({ where: { id } })
    })

    return successResponse(null, "Pesanan berhasil dihapus")
  } catch (error) {
    return handleApiError(error, "DELETE /orders/[id]")
  }
}
