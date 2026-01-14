import { createdResponse, getPaginationInfo, requirePermission, withErrorHandler } from "@/lib/api-utils"
import { ConflictException } from "@/lib/exceptions"
import prisma from "@/lib/prisma"
import { createShopSchema, getShopQuerySchema } from "@/validations/shop.validation"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  return withErrorHandler(async () => {
    await requirePermission({ shop: ["read"] })

    const query = getShopQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams))
    const { page, limit, sortBy, sortOrder, search } = query

    const where = {
      ...(search && {
        OR: [{ name: { contains: search, mode: "insensitive" as const } }],
      }),
    }

    const [shops, total] = await Promise.all([
      prisma.shop.findMany({
        where,
        skip: page * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.shop.count({ where }),
    ])

    return NextResponse.json({
      error: null,
      message: "ok",
      data: {
        data: shops,
        pagination: getPaginationInfo(page, limit, total),
      },
    })
  })
}

export async function POST(request: Request) {
  return withErrorHandler(async () => {
    await requirePermission({ shop: ["create"] })

    const body = await request.json()
    const validatedData = createShopSchema.parse(body)

    try {
      const shop = await prisma.shop.create({
        data: validatedData,
      })

      return createdResponse(shop, "Shop created successfully")
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "P2002") {
        throw new ConflictException("Shop with this name already exists")
      }
      throw error
    }
  })
}
