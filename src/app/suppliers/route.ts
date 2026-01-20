import {
  createdResponse,
  handleApiError,
  requirePermission,
  successResponse,
} from "@/lib/api-utils"
import { ConflictException } from "@/lib/exceptions"
import prisma from "@/lib/prisma"
import { createSupplierSchema } from "@/validations/supplier.validation"

export async function GET(request: Request) {
  try {
    await requirePermission({ supplier: ["read"] })

    const searchParams = new URL(request.url).searchParams
    const search = searchParams.get("search")

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { phone: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: {
        name: "asc",
      },
    })

    return successResponse(suppliers)
  } catch (error) {
    return handleApiError(error, "GET /suppliers")
  }
}

export async function POST(request: Request) {
  try {
    await requirePermission({ supplier: ["create"] })

    const body = await request.json()
    const validatedData = createSupplierSchema.parse(body)
    const supplier = await prisma.supplier.create({
      data: validatedData,
    })

    return createdResponse(supplier, "Supplier berhasil dibuat")
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2002") {
      return new ConflictException("Supplier dengan nama ini sudah ada").toResponse()
    }

    return handleApiError(error, "POST /suppliers")
  }
}
