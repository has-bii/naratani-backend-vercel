import { cacheLife, cacheTag } from "next/cache"
import { handleApiError, requirePermission, successResponse } from "@/lib/api-utils"
import prisma from "@/lib/prisma"

// Cached data fetcher function
async function getProductStockValue() {
  "use cache"
  cacheLife("hours")
  cacheTag("dashboard-product-value")

  // Get all products with their stock and price
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      price: true,
      stock: true,
    },
  })

  // Calculate total stock value (sum of stock × price)
  let totalStockValue = 0
  const productValues = products.map((product) => {
    const value = product.stock * product.price
    totalStockValue += value
    return {
      id: product.id,
      name: product.name,
      stock: product.stock,
      price: product.price,
      value,
    }
  })

  return {
    totalStockValue,
    products: productValues.sort((a, b) => b.value - a.value),
  }
}

export async function GET(request: Request) {
  try {
    await requirePermission({ dashboard: ["read"] })

    const data = await getProductStockValue()

    return successResponse(data)
  } catch (error) {
    return handleApiError(error, "GET /dashboard/product-left-value")
  }
}
