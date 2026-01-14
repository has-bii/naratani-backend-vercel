import { PrismaClient, Prisma } from "@/generated/prisma/client"
import { hashPassword } from "@/utils/password"
import { uuidv7 } from "uuidv7"

const DEFAULT_PASSWORD = "Password123!"

/**
 * Comprehensive test data seed file
 * Creates 3 users (admin/user/sales), 30 categories, 30 shops, and 40 products
 */

export async function seedTestData(prisma: PrismaClient) {
  console.log("🌱 Starting test data seeding...")

  // ============================================
  // 1. Create 3 Users with different roles
  // ============================================
  await seedUsers(prisma)

  // ============================================
  // 2. Create 30 Categories
  // ============================================
  const categories = await seedCategories(prisma)

  // ============================================
  // 3. Create 30 Shops
  // ============================================
  const shops = await seedShops(prisma)

  // ============================================
  // 4. Create 40 Products (linked to categories & shops)
  // ============================================
  await seedProducts(prisma, categories, shops)

  console.log("✅ Test data seeding completed!")
}

async function seedUsers(prisma: PrismaClient) {
  console.log("\n📝 Seeding users...")

  const users = [
    {
      name: "Admin User",
      email: "admin@test.com",
      phoneNumber: "+628111111111",
      role: "admin" as const,
    },
    {
      name: "Regular User",
      email: "user@test.com",
      phoneNumber: "+628222222222",
      role: "user" as const,
    },
    {
      name: "Sales Staff",
      email: "sales@test.com",
      phoneNumber: "+628333333333",
      role: "sales" as const,
    },
  ]

  const hashedPassword = await hashPassword(DEFAULT_PASSWORD)

  for (const userData of users) {
    const existingUser = await prisma.user.findFirst({
      where: { email: userData.email },
    })

    if (existingUser) {
      console.log(`   ⏭️  User ${userData.email} already exists, skipping...`)
      continue
    }

    const id = uuidv7()

    await prisma.user.create({
      data: {
        id,
        name: userData.name,
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        role: userData.role,
        emailVerified: true,
        phoneNumberVerified: true,
        accounts: {
          create: {
            accountId: id,
            providerId: "credential",
            password: hashedPassword,
          },
        },
      },
    })

    console.log(`   ✅ Created ${userData.role} user: ${userData.email}`)
  }
}

async function seedCategories(prisma: PrismaClient) {
  console.log("\n📂 Seeding categories...")

  const categoryNames = [
    "Category 01",
    "Category 02",
    "Category 03",
    "Category 04",
    "Category 05",
    "Category 06",
    "Category 07",
    "Category 08",
    "Category 09",
    "Category 10",
    "Category 11",
    "Category 12",
    "Category 13",
    "Category 14",
    "Category 15",
    "Category 16",
    "Category 17",
    "Category 18",
    "Category 19",
    "Category 20",
    "Category 21",
    "Category 22",
    "Category 23",
    "Category 24",
    "Category 25",
    "Category 26",
    "Category 27",
    "Category 28",
    "Category 29",
    "Category 30",
  ]

  const categories = await prisma.productCategory.createMany({
    data: categoryNames.map((name) => ({ name })),
    skipDuplicates: true,
  })

  console.log(`   ✅ Created ${categories.count} categories`)

  // Return all categories for product linking
  return await prisma.productCategory.findMany()
}

async function seedShops(prisma: PrismaClient) {
  console.log("\n🏪 Seeding shops...")

  const shopNames = [
    "Shop Alpha",
    "Shop Beta",
    "Shop Gamma",
    "Shop Delta",
    "Shop Epsilon",
    "Shop Zeta",
    "Shop Eta",
    "Shop Theta",
    "Shop Iota",
    "Shop Kappa",
    "Shop Lambda",
    "Shop Mu",
    "Shop Nu",
    "Shop Xi",
    "Shop Omicron",
    "Shop Pi",
    "Shop Rho",
    "Shop Sigma",
    "Shop Tau",
    "Shop Upsilon",
    "Shop Phi",
    "Shop Chi",
    "Shop Psi",
    "Shop Omega",
    "Shop Alpha One",
    "Shop Beta Two",
    "Shop Gamma Three",
    "Shop Delta Four",
    "Shop Epsilon Five",
    "Shop Zeta Six",
  ]

  const shops = await prisma.shop.createMany({
    data: shopNames.map((name) => ({ name })),
    skipDuplicates: true,
  })

  console.log(`   ✅ Created ${shops.count} shops`)

  // Return all shops for product linking
  return await prisma.shop.findMany()
}

async function seedProducts(
  prisma: PrismaClient,
  categories: Prisma.ProductCategoryGetPayload<{}>[],
  shops: Prisma.ShopGetPayload<{}>[],
) {
  console.log("\n📦 Seeding products...")

  // Generate 40 products with varying prices and stock
  const products = Array.from({ length: 40 }, (_, i) => {
    const categoryIndex = i % categories.length
    const shopIndex = i % shops.length
    const category = categories[categoryIndex]
    const shop = shops[shopIndex]

    const price = (i + 1) * 10000 + Math.floor(Math.random() * 5000)
    const stock = Math.floor(Math.random() * 200) + 10

    return {
      name: `Product ${String(i + 1).padStart(2, "0")}`,
      slug: `product-${String(i + 1).padStart(2, "0")}`,
      price,
      stock,
      categoryId: category.id,
    }
  })

  const created = await prisma.product.createMany({
    data: products,
    skipDuplicates: true,
  })

  console.log(`   ✅ Created ${created.count} products`)
  console.log(`   📊 Products distributed across ${categories.length} categories and ${shops.length} shops`)
}
