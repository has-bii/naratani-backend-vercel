import { createdResponse, getPaginationInfo, requirePermission, withErrorHandler } from "@/lib/api-utils"
import { ConflictException } from "@/lib/exceptions"
import prisma from "@/lib/prisma"
import { createCategorySchema, getCategoryQuerySchema } from "@/validations/category.validation"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  return withErrorHandler(async () => {
    await requirePermission({ category: ["read"] })

    const query = getCategoryQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams))
    const { page, limit, sortBy, sortOrder, search } = query

    const where = {
      ...(search && {
        OR: [{ name: { contains: search, mode: "insensitive" as const } }],
      }),
    }

    const [categories, total] = await Promise.all([
      prisma.productCategory.findMany({
        where,
        skip: page * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: { products: true },
          },
        },
      }),
      prisma.productCategory.count({ where }),
    ])

    return NextResponse.json({
      error: null,
      message: "ok",
      data: {
        data: categories,
        pagination: getPaginationInfo(page, limit, total),
      },
    })
  })
}

export async function POST(request: Request) {
  return withErrorHandler(async () => {
    await requirePermission({ category: ["create"] })

    const body = await request.json()
    const validatedData = createCategorySchema.parse(body)

    try {
      const category = await prisma.productCategory.create({
        data: validatedData,
        include: {
          _count: {
            select: { products: true },
          },
        },
      })

      return createdResponse(category, "Category created successfully")
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "P2002") {
        throw new ConflictException("Category with this name already exists")
      }
      throw error
    }
  })
}
