import { PrismaClient } from "@/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

import { seedTestData } from "./seed-test-data"

const pool = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: pool })

async function main() {
  console.log("🌱 Starting test database seeding...\n")
  console.log("⚠️  This will seed ONLY test data\n")

  await seedTestData(prisma)

  console.log("\n" + "─".repeat(50))
  console.log("✅ Test seeding completed!")
  console.log("─".repeat(50))
  console.log("\n📝 Test credentials:")
  console.log("   Admin:  admin@test.com / Password123!")
  console.log("   User:   user@test.com / Password123!")
  console.log("   Sales:  sales@test.com / Password123!")
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
