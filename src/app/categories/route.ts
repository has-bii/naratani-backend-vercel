import { createdResponse, requirePermission, successResponse, withErrorHandler } from "@/lib/api-utils"
import { ConflictException } from "@/lib/exceptions"
import prisma from "@/lib/prisma"
import { createCategorySchema } from "@/validations/category.validation"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  return withErrorHandler(async () => {
    await requirePermission({ category: ["read"] })

    const searchParams = new URL(request.url).searchParams
    const search = searchParams.get("search")
    const includeCount = searchParams.get("includeCount") === "true"

    const where = {
      ...(search && {
        OR: [{ name: { contains: search, mode: "insensitive" as const } }],
      }),
    }

    const categories = await prisma.productCategory.findMany({
      where,
      ...(includeCount && {
        include: {
          _count: {
            select: { products: true },
          },
        },
      }),
    })

    return NextResponse.json({
      error: null,
      message: "ok",
      data: categories,
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
