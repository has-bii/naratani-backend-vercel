import { PrismaClient } from "@/generated/prisma/client"
import { hashPassword } from "@/utils/password"
import { PrismaPg } from "@prisma/adapter-pg"
import { uuidv7 } from "uuidv7"

const pool = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: pool })

async function main() {
  console.log("🌱 Starting database seeding...\n")

  const name = process.env.SEED_NAME
  const email = process.env.SEED_EMAIL
  const phone = process.env.SEED_PHONE
  const password = process.env.SEED_PASSWORD

  if (!name || !email || !phone || !password)
    throw new Error("Name, email, phone, or password are not detected in env file")

  // Check if admin exists
  const isExist = await prisma.user.findFirst({
    where: {
      role: "admin",
    },
  })

  if (isExist) throw new Error("Admin password already exists")

  // Seed User
  const id = uuidv7()
  const hashedPassword = await hashPassword(password)

  const user = await prisma.user.create({
    data: {
      id,
      name,
      email,
      role: "admin",
      emailVerified: true,
      phoneNumber: phone,
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

  console.log("✅ Admin created:")
  console.log(`   - Name: ${user.name}`)
  console.log(`   - Email: ${user.email}`)
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
