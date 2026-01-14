import { createdResponse, getPaginationInfo, requirePermission, withErrorHandler } from "@/lib/api-utils"
import { ConflictException } from "@/lib/exceptions"
import prisma from "@/lib/prisma"
import { slugify } from "@/utils/slugify"
import { createProductSchema, getProductQuerySchema } from "@/validations/product.validation"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  return withErrorHandler(async () => {
    await requirePermission({ product: ["read"] })

    const query = getProductQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams))
    const { page, limit, sortBy, sortOrder, category, search, minPrice, maxPrice, inStock } = query

    const where = {
      ...(category && { categoryId: category }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { slug: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? {
            price: {
              ...(minPrice !== undefined && { gte: minPrice }),
              ...(maxPrice !== undefined && { lte: maxPrice }),
            },
          }
        : {}),
      ...(inStock !== undefined && { stock: inStock ? { gt: 0 } : { lte: 0 } }),
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: page * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          category: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.product.count({ where }),
    ])

    return NextResponse.json({
      error: null,
      message: "ok",
      data: {
        data: products,
        pagination: getPaginationInfo(page, limit, total),
      },
    })
  })
}

export async function POST(request: Request) {
  return withErrorHandler(async () => {
    await requirePermission({ product: ["create"] })

    const body = await request.json()
    const validatedData = createProductSchema.parse(body)

    try {
      const product = await prisma.product.create({
        data: {
          ...validatedData,
          slug: slugify(validatedData.name),
        },
        include: {
          category: {
            select: { id: true, name: true },
          },
        },
      })

      return createdResponse(product, "Product created successfully")
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "P2002") {
        throw new ConflictException("Product with this slug already exists")
      }
      throw error
    }
  })
}
