import { handleApiError, requirePermission, successResponse } from "@/lib/api-utils"
import { NotFoundException } from "@/lib/exceptions"
import prisma from "@/lib/prisma"

export async function GET(request: Request, { params }: { params: Promise<{ productId: string }> }) {
  try {
    await requirePermission({ supplier: ["read"] })

    const { productId } = await params

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true },
    })

    if (!product) {
      throw new NotFoundException("Produk tidak ditemukan")
    }

    // Get all stock entries for this product that have available stock
    const stockEntries = await prisma.stockEntry.findMany({
      where: {
        productId,
        remainingQty: { gt: 0 }, // Only show entries with available stock
      },
      include: {
        supplier: {
          select: { id: true, name: true },
        },
      },
      orderBy: {
        purchaseDate: "asc", // Oldest stock first (FIFO)
      },
    })

    return successResponse(
      stockEntries.map((entry) => ({
        id: entry.id,
        supplier: {
          id: entry.supplier.id,
          name: entry.supplier.name,
        },
        quantity: entry.quantity,
        unitCost: entry.unitCost,
        totalCost: entry.totalCost,
        remainingQty: entry.remainingQty,
        purchaseDate: entry.purchaseDate,
        notes: entry.notes,
      }))
    )
  } catch (error) {
    return handleApiError(error, "GET /stock-entries/product/[productId]")
  }
}
