import { PrismaClient } from "@/generated/prisma/client"
import { hashPassword } from "@/utils/password"
import { uuidv7 } from "uuidv7"

export async function seedUser(prisma: PrismaClient) {
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
}
