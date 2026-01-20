import { handleApiError, requirePermission, successResponse } from "@/lib/api-utils"
import { BadRequestException, NotFoundException } from "@/lib/exceptions"
import prisma from "@/lib/prisma"
import { z } from "zod"

const acceptOrderSchema = z.object({
  items: z.array(
    z.object({
      orderItemId: z.string().uuid(),
      allocations: z.array(
        z.object({
          stockEntryId: z.string().uuid(),
          quantity: z.number().int().positive(),
        })
      ),
    })
  ),
})

async function findOrder(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      orderItems: {
        include: {
          product: {
            select: { id: true, name: true },
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

    // Only allow accepting pending orders
    if (existingOrder.status !== "PENDING") {
      return new BadRequestException("Hanya pesanan dengan status PENDING yang dapat diproses").toResponse()
    }

    const body = await request.json()
    const { items } = acceptOrderSchema.parse(body)

    // Validate all allocations
    for (const item of items) {
      const orderItem = existingOrder.orderItems.find(oi => oi.id === item.orderItemId)
      if (!orderItem) {
        return new BadRequestException(`Order item ${item.orderItemId} tidak ditemukan`).toResponse()
      }

      // Check total allocated quantity matches order item quantity
      const totalAllocated = item.allocations.reduce((sum, a) => sum + a.quantity, 0)
      if (totalAllocated !== orderItem.quantity) {
        return new BadRequestException(
          `Jumlah alokasi untuk ${orderItem.product.name} tidak sesuai`
        ).toResponse()
      }

      // Validate each stock entry has enough quantity
      for (const allocation of item.allocations) {
        const stockEntry = await prisma.stockEntry.findUnique({
          where: { id: allocation.stockEntryId },
        })

        if (!stockEntry) {
          return new BadRequestException(`Stock entry ${allocation.stockEntryId} tidak ditemukan`).toResponse()
        }

        if (stockEntry.productId !== orderItem.productId) {
          return new BadRequestException(
            `Stock entry tidak sesuai dengan produk ${orderItem.product.name}`
          ).toResponse()
        }

        if (stockEntry.remainingQty < allocation.quantity) {
          return new BadRequestException(
            `Stok tidak mencukupi untuk stock entry ${stockEntry.id}`
          ).toResponse()
        }
      }
    }

    // Process order acceptance in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update order status to PROCESSING
      const updatedOrder = await tx.order.update({
        where: { id },
        data: { status: "PROCESSING" },
        include: {
          shop: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true, email: true, role: true } },
          orderItems: {
            include: {
              product: {
                select: { id: true, name: true, price: true },
              },
            },
          },
        },
      })

      // Process each order item
      for (const item of items) {
        const orderItem = existingOrder.orderItems.find(oi => oi.id === item.orderItemId)!
        const unitPrice = orderItem.price

        let totalCost = 0
        let totalMargin = 0
        let weightedMarginRate = 0
        let avgMarginRate = 0

        // Create allocations and update stock entries
        for (const allocation of item.allocations) {
          const stockEntry = await tx.stockEntry.findUnique({
            where: { id: allocation.stockEntryId },
          })

          const unitCost = stockEntry!.unitCost
          const marginAmount = (unitPrice - unitCost) * allocation.quantity
          const marginRate = ((unitPrice - unitCost) / unitPrice) * 100

          totalCost += unitCost * allocation.quantity
          totalMargin += marginAmount
          weightedMarginRate += marginRate * allocation.quantity

          // Create OrderItemStockEntry
          await tx.orderItemStockEntry.create({
            data: {
              orderItemId: item.orderItemId,
              stockEntryId: allocation.stockEntryId,
              quantity: allocation.quantity,
              unitCost,
              unitPrice,
              marginAmount,
              marginRate,
            },
          })

          // Update StockEntry remaining quantity
          await tx.stockEntry.update({
            where: { id: allocation.stockEntryId },
            data: {
              remainingQty: {
                decrement: allocation.quantity,
              },
            },
          })
        }

        // Calculate average margin rate
        avgMarginRate = weightedMarginRate / orderItem.quantity

        // Update OrderItem with cost data
        await tx.orderItem.update({
          where: { id: item.orderItemId },
          data: {
            totalCost,
            totalMargin,
            avgMarginRate,
          },
        })

        // Release reserved stock (stock was already deducted during order creation)
        await tx.product.update({
          where: { id: orderItem.productId },
          data: {
            reservedStock: {
              decrement: orderItem.quantity,
            },
          },
        })
      }

      return updatedOrder
    })

    return successResponse(result, "Pesanan sedang diproses")
  } catch (error) {
    return handleApiError(error, "PUT /orders/[id]/accept")
  }
}
