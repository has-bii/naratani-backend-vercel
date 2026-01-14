import {
  createdResponse,
  getPaginationInfo,
  handleApiError,
  requirePermission,
  successResponse,
} from "@/lib/api-utils"
import { BadRequestException, ConflictException } from "@/lib/exceptions"
import prisma from "@/lib/prisma"
import { createOrderSchema, getOrderQuerySchema } from "@/validations/order.validation"

export async function GET(request: Request) {
  try {
    await requirePermission({ order: ["read"] })

    const query = getOrderQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams))
    const { page, limit, sortBy, sortOrder, status, shopId } = query

    const where = {
      ...(status && { status }),
      ...(shopId && { shopId }),
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip: page * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
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
      }),
      prisma.order.count({ where }),
    ])

    return successResponse({
      data: orders,
      pagination: getPaginationInfo(page, limit, total),
    })
  } catch (error) {
    return handleApiError(error, "GET /orders")
  }
}

export async function POST(request: Request) {
  try {
    await requirePermission({ order: ["create"] })

    const body = await request.json()
    const { shopId, items } = createOrderSchema.parse(body)

    // Verify shop exists
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
    })

    if (!shop) {
      return new BadRequestException("Toko tidak ditemukan").toResponse()
    }

    // Verify all products exist and have enough stock
    const productIds = items.map((item) => item.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    })

    if (products.length !== productIds.length) {
      return new BadRequestException("Salah satu produk tidak ditemukan").toResponse()
    }

    // Check stock availability
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId)
      if (!product || product.stock < item.quantity) {
        return new ConflictException("Stok produk tidak mencukupi").toResponse()
      }
    }

    // Calculate total amount
    let totalAmount = 0
    const orderItemsData = items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!
      const itemTotal = product.price * item.quantity
      totalAmount += itemTotal
      return {
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
      }
    })

    // Create order with items and update stock in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create order with order items
      const order = await tx.order.create({
        data: {
          shopId,
          status: "PENDING",
          totalAmount,
          orderItems: {
            create: orderItemsData,
          },
        },
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

      // Update product stock
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        })
      }

      return order
    })

    return createdResponse(result, "Pesanan berhasil dibuat")
  } catch (error) {
    return handleApiError(error, "POST /orders")
  }
}
