import { handleApiError, requirePermission, successResponse } from "@/lib/api-utils"
import { revalidateAllDashboard } from "@/lib/dashboard-cache"

export async function POST() {
  try {
    await requirePermission({ dashboard: ["revalidate"] })

    await revalidateAllDashboard()

    return successResponse({ revalidated: true }, "Dashboard cache revalidated successfully")
  } catch (error) {
    return handleApiError(error, "POST /dashboard/revalidate")
  }
}
