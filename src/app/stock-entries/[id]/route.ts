import { handleApiError, requirePermission, successResponse } from "@/lib/api-utils"
import { BadRequestException, NotFoundException } from "@/lib/exceptions"
import prisma from "@/lib/prisma"

async function findStockEntry(id: string) {
  const stockEntry = await prisma.stockEntry.findUnique({
    where: { id },
    include: {
      product: {
        select: { id: true, name: true, slug: true },
      },
      supplier: {
        select: { id: true, name: true },
      },
    },
  })

  if (!stockEntry) {
    throw new NotFoundException("Stock entry tidak ditemukan")
  }

  return stockEntry
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission({ supplier: ["delete"] })

    const { id } = await params
    const stockEntry = await findStockEntry(id)

    // Check if stock has been used in any orders
    const allocationCount = await prisma.orderItemStockEntry.count({
      where: { stockEntryId: id },
    })

    if (allocationCount > 0) {
      return new BadRequestException(
        "Tidak dapat menghapus stock entry yang sudah digunakan dalam pesanan"
      ).toResponse()
    }

    // Check if remaining quantity matches original quantity
    if (stockEntry.remainingQty !== stockEntry.quantity) {
      return new BadRequestException(
        "Tidak dapat menghapus stock entry yang stoknya sudah berkurang"
      ).toResponse()
    }

    // Delete stock entry and restore product stock in transaction
    await prisma.$transaction(async (tx) => {
      // Delete stock entry
      await tx.stockEntry.delete({
        where: { id },
      })

      // Restore product stock
      await tx.product.update({
        where: { id: stockEntry.productId },
        data: {
          stock: {
            decrement: stockEntry.quantity,
          },
        },
      })
    })

    return successResponse(null, "Stock entry berhasil dihapus")
  } catch (error) {
    return handleApiError(error, "DELETE /stock-entries/[id]")
  }
}
