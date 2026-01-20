import {
  createdResponse,
  getPaginationInfo,
  handleApiError,
  requirePermission,
  successResponse,
} from "@/lib/api-utils"
import { BadRequestException, NotFoundException } from "@/lib/exceptions"
import prisma from "@/lib/prisma"
import { createStockEntrySchema, getStockEntryQuerySchema } from "@/validations/stock-entry.validation"

export async function GET(request: Request) {
  try {
    await requirePermission({ supplier: ["read"] })

    const query = getStockEntryQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams))
    const { page, limit, productId, supplierId, hasStock } = query

    const where = {
      ...(productId && { productId }),
      ...(supplierId && { supplierId }),
      ...(hasStock !== undefined && { remainingQty: hasStock ? { gt: 0 } : { lte: 0 } }),
    }

    const [stockEntries, total] = await Promise.all([
      prisma.stockEntry.findMany({
        where,
        skip: page * limit,
        take: limit,
        orderBy: {
          purchaseDate: "desc",
        },
        include: {
          product: {
            select: { id: true, name: true, slug: true },
          },
          supplier: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.stockEntry.count({ where }),
    ])

    return successResponse({
      data: stockEntries,
      pagination: getPaginationInfo(page, limit, total),
    })
  } catch (error) {
    return handleApiError(error, "GET /stock-entries")
  }
}

export async function POST(request: Request) {
  try {
    await requirePermission({ supplier: ["create"] })

    const body = await request.json()
    const validatedData = createStockEntrySchema.parse(body)

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: validatedData.productId },
    })

    if (!product) {
      throw new NotFoundException("Produk tidak ditemukan")
    }

    // Verify supplier exists
    const supplier = await prisma.supplier.findUnique({
      where: { id: validatedData.supplierId },
    })

    if (!supplier) {
      throw new NotFoundException("Supplier tidak ditemukan")
    }

    // Calculate total cost
    const totalCost = validatedData.quantity * validatedData.unitCost

    // Create stock entry and update product stock in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create stock entry
      const stockEntry = await tx.stockEntry.create({
        data: {
          ...validatedData,
          totalCost,
          remainingQty: validatedData.quantity,
        },
        include: {
          product: {
            select: { id: true, name: true, slug: true },
          },
          supplier: {
            select: { id: true, name: true },
          },
        },
      })

      // Update product stock
      await tx.product.update({
        where: { id: validatedData.productId },
        data: {
          stock: {
            increment: validatedData.quantity,
          },
        },
      })

      return stockEntry
    })

    return createdResponse(result, "Stok berhasil ditambahkan")
  } catch (error) {
    return handleApiError(error, "POST /stock-entries")
  }
}
