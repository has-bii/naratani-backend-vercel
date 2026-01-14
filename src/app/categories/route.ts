import {
  createdResponse,
  handleApiError,
  requirePermission,
  successResponse,
} from "@/lib/api-utils"
import { ConflictException } from "@/lib/exceptions"
import prisma from "@/lib/prisma"
import { createCategorySchema } from "@/validations/category.validation"

export async function GET(request: Request) {
  try {
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

    return successResponse(categories)
  } catch (error) {
    return handleApiError(error, "GET /categories")
  }
}

export async function POST(request: Request) {
  try {
    await requirePermission({ category: ["create"] })

    const body = await request.json()
    const validatedData = createCategorySchema.parse(body)
    const category = await prisma.productCategory.create({
      data: validatedData,
    })

    return createdResponse(category, "Kategori berhasil dibuat")
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2002") {
      return new ConflictException("Kategori dengan nama ini sudah ada").toResponse()
    }

    return handleApiError(error, "POST /categories")
  }
}
