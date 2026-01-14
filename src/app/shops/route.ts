import { createdResponse, getPaginationInfo, handleApiError, requirePermission, successResponse } from "@/lib/api-utils"
import { ConflictException } from "@/lib/exceptions"
import prisma from "@/lib/prisma"
import { createShopSchema, getShopQuerySchema } from "@/validations/shop.validation"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
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

    return successResponse({
      data: shops,
      pagination: getPaginationInfo(page, limit, total),
    })
  } catch (error) {
    return handleApiError(error, "GET /shops")
  }
}

export async function POST(request: Request) {
  try {
    await requirePermission({ shop: ["create"] })

    const body = await request.json()
    const validatedData = createShopSchema.parse(body)

    const shop = await prisma.shop.create({
      data: validatedData,
    })

    return createdResponse(shop, "Toko berhasil dibuat")
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2002") {
      return new ConflictException("Toko dengan nama ini sudah ada").toResponse()
    }
    return handleApiError(error, "POST /shops")
  }
}
