import { PrismaClient } from "@/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

import { seedProducts } from "./seed-product"
import { seedShop } from "./seed-shop"
import { seedUser } from "./seed-user"

const pool = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: pool })

async function main() {
  console.log("🌱 Starting database seeding...\n")

  await seedUser(prisma)
  await seedShop(prisma)
  await seedProducts(prisma)

  console.log("\n✅ Seeding completed!")
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
