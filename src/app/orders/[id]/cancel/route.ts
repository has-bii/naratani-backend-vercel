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
          stockEntryAllocations: {
            include: {
              stockEntry: {
                select: { id: true, remainingQty: true },
              },
            },
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

    // Only allow cancelling pending or processing orders
    if (existingOrder.status !== "PENDING" && existingOrder.status !== "PROCESSING") {
      return new BadRequestException("Hanya pesanan dengan status PENDING atau PROCESSING yang dapat dibatalkan").toResponse()
    }

    // Cancel order and release reserved stock in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update order status to CANCELLED
      const order = await tx.order.update({
        where: { id },
        data: { status: "CANCELLED" },
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

      if (existingOrder.status === "PENDING") {
        // For PENDING orders: restore product stock and release reserved stock
        await Promise.all(
          existingOrder.orderItems.map((item) =>
            tx.product.update({
              where: { id: item.productId },
              data: {
                stock: {
                  increment: item.quantity,
                },
                reservedStock: {
                  decrement: item.quantity,
                },
              },
            })
          )
        )
      } else if (existingOrder.status === "PROCESSING") {
        // For PROCESSING orders: restore product stock and stock entry remaining quantities
        for (const item of existingOrder.orderItems) {
          // Restore product stock
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          })

          // Restore stock entry remaining quantities
          for (const allocation of item.stockEntryAllocations) {
            await tx.stockEntry.update({
              where: { id: allocation.stockEntryId },
              data: {
                remainingQty: {
                  increment: allocation.quantity,
                },
              },
            })
          }
        }
      }

      return order
    })

    return successResponse(result, "Pesanan berhasil dibatalkan")
  } catch (error) {
    return handleApiError(error, "PUT /orders/[id]/cancel")
  }
}
