import { ac, admin as adminRole, sales, user } from "@/lib/permissions"
import prisma from "@/lib/prisma"
import { hashPassword, verifyPassword } from "@/utils/password"
import { phoneSchema } from "@/validations/auth.validation"
import { expo } from "@better-auth/expo"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { APIError, createAuthMiddleware } from "better-auth/api"
import { betterAuth } from "better-auth/minimal"
import { admin, openAPI, phoneNumber } from "better-auth/plugins"

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    password: {
      hash: hashPassword,
      verify: verifyPassword,
    },
    requireEmailVerification: false,
    sendResetPassword: async (data, request) => {
      console.log(`Requesting reset password for ${data.user.email}: ${data.token}`)
    },
  },
  plugins: [
    openAPI(),
    expo(),
    admin({
      ac,
      defaultRole: "user",
      roles: {
        admin: adminRole,
        user,
        sales,
      },
    }),
    phoneNumber({
      sendOTP: ({ phoneNumber, code }) => {
        console.log(`Sending OTP to ${phoneNumber}: ${code}`)
      },
      phoneNumberValidator: (phoneNumber) => {
        const { success } = phoneSchema.safeParse(phoneNumber)

        return success
      },
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day (every 1 day the session expiration is updated)
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
      strategy: "compact",
    },
  },
  advanced: {
    database: {
      generateId: false,
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const origin = ctx.headers?.get("origin") || ""

      // Block non-admin users from signing in to admin app
      if (ctx.path === "/sign-in/email") {
        const email = ctx.body?.email

        if (email && origin === process.env.ADMIN_APP_ORIGIN) {
          const userRecord = await prisma.user.findUnique({
            where: { email },
            select: { role: true },
          })

          if (userRecord && userRecord.role !== "admin") {
            throw new APIError("FORBIDDEN", {
              message: "You don't have permission to access the admin app",
            })
          }
        }
      }
    }),
  },
  trustedOrigins: [
    process.env.ADMIN_APP_ORIGIN,
    process.env.USER_APP_ORIGIN,
    process.env.SALES_APP_ORIGIN,
  ].filter(Boolean) as string[],
})
