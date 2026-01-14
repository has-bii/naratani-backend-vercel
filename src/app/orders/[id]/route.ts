import { handleApiError, requirePermission, successResponse } from "@/lib/api-utils"
import { BadRequestException, NotFoundException } from "@/lib/exceptions"
import prisma from "@/lib/prisma"
import { updateOrderSchema } from "@/validations/order.validation"

async function findOrder(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      shop: {
        select: { id: true, name: true },
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

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission({ order: ["update"] })

    const { id } = await params
    const existingOrder = await findOrder(id)

    const body = await request.json()
    const validatedData = updateOrderSchema.parse(body)

    // Handle status changes that affect stock
    if (validatedData.status === "CANCELLED" && existingOrder.status !== "CANCELLED") {
      // Restore stock when order is cancelled
      await prisma.$transaction(async (tx) => {
        // Update order status
        await tx.order.update({
          where: { id },
          data: validatedData,
        })

        // Restore product stock
        for (const item of existingOrder.orderItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          })
        }
      })

      // Fetch updated order
      const order = await findOrder(id)
      return successResponse(order, "Status pesanan berhasil diperbarui")
    }

    // For other status updates or no status change
    const order = await prisma.order.update({
      where: { id },
      data: validatedData,
      include: {
        shop: {
          select: { id: true, name: true },
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

    return successResponse(order, "Status pesanan berhasil diperbarui")
  } catch (error) {
    return handleApiError(error, "PUT /orders/[id]")
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return PUT(request, { params })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission({ order: ["delete"] })

    const { id } = await params
    const existingOrder = await findOrder(id)

    // Only allow deletion of pending orders
    if (existingOrder.status !== "PENDING") {
      return new BadRequestException("Hanya pesanan yang masih pending yang dapat dihapus").toResponse()
    }

    // Delete order and restore stock in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete order (cascade will delete order items)
      await tx.order.delete({
        where: { id },
      })

      // Restore product stock
      for (const item of existingOrder.orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        })
      }
    })

    return successResponse(null, "Pesanan berhasil dihapus")
  } catch (error) {
    return handleApiError(error, "DELETE /orders/[id]")
  }
}
