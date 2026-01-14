import { Prisma, PrismaClient } from "@/generated/prisma/client"

import productJson from "../data/product.json"

export async function seedProducts(prisma: PrismaClient) {
  const categories = await prisma.productCategory.createManyAndReturn({
    skipDuplicates: true,
    data: productJson.map(
      (product): Prisma.ProductCategoryCreateManyInput => ({
        name: product.category ?? "Tanpa Kategori",
      }),
    ),
  })

  const products = await prisma.product.createMany({
    skipDuplicates: true,
    data: productJson.map(
      (product): Prisma.ProductCreateManyInput => ({
        name: product.name.toLowerCase(),
        slug: product.name.toLowerCase().replaceAll(" ", " "),
        price: product.price ?? undefined,
        stock: product.stock,
        categoryId: categories.find(({ name }) => name === product.category)?.id,
      }),
    ),
  })

  console.log(`${categories.length} categories inserted ✅`)
  console.log(`${products.count} products inserted ✅`)
}
